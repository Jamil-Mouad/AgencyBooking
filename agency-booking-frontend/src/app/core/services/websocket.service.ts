import { Injectable, inject, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private storage = inject(StorageService);
  private client: Client | null = null;
  private subscriptions = new Map<string, StompSubscription>();
  private activeCallbacks = new Map<string, (message: IMessage) => void>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private hasConnectedBefore = false;

  private connectionState = new BehaviorSubject<ConnectionState>('disconnected');
  connectionState$ = this.connectionState.asObservable();

  connect(): void {
    if (this.client?.connected) return;

    this.connectionState.next('connecting');
    const token = this.storage.getAccessToken();

    const wsUrl = environment.wsUrl;

    this.client = new Client({
      brokerURL: wsUrl,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      reconnectDelay: 0, // We handle reconnection manually
      onConnect: () => {
        const isReconnect = this.hasConnectedBefore;
        this.hasConnectedBefore = true;
        this.connectionState.next('connected');
        this.reconnectAttempts = 0;
        // Only re-subscribe on reconnect, not on first connect
        // (first connect subscriptions are handled by the deferred doSubscribe)
        if (isReconnect) {
          this.resubscribeAll();
        }
      },
      onStompError: () => {
        this.connectionState.next('error');
        this.scheduleReconnect();
      },
      onWebSocketClose: () => {
        this.connectionState.next('disconnected');
        this.scheduleReconnect();
      }
    });

    this.client.activate();
  }

  disconnect(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.clear();
    this.client?.deactivate();
    this.client = null;
    this.connectionState.next('disconnected');
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
  }

  subscribe<T>(destination: string): Observable<T> {
    return new Observable<T>(observer => {
      const callback = (message: IMessage) => {
        try {
          observer.next(JSON.parse(message.body));
        } catch {
          observer.next(message.body as unknown as T);
        }
      };

      const doSubscribe = () => {
        if (!this.client?.connected) {
          // Wait for connection
          const stateSub = this.connectionState$.subscribe(state => {
            if (state === 'connected') {
              stateSub.unsubscribe();
              doSubscribe();
            }
          });
          return;
        }

        // Unsubscribe existing STOMP subscription for this destination if any
        const existingSub = this.subscriptions.get(destination);
        if (existingSub) {
          try { existingSub.unsubscribe(); } catch { /* ignore */ }
        }

        const sub = this.client.subscribe(destination, callback);
        this.subscriptions.set(destination, sub);
        this.activeCallbacks.set(destination, callback);
      };

      doSubscribe();

      return () => {
        const sub = this.subscriptions.get(destination);
        if (sub) {
          try { sub.unsubscribe(); } catch { /* ignore */ }
          this.subscriptions.delete(destination);
        }
        this.activeCallbacks.delete(destination);
      };
    });
  }

  send(destination: string, body: unknown): void {
    if (this.client?.connected) {
      this.client.publish({
        destination,
        body: JSON.stringify(body)
      });
    }
  }

  private resubscribeAll(): void {
    if (!this.client?.connected) return;

    // Re-establish all active subscriptions after reconnection
    this.activeCallbacks.forEach((callback, destination) => {
      const sub = this.client!.subscribe(destination, callback);
      this.subscriptions.set(destination, sub);
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    setTimeout(() => {
      if (this.connectionState.value !== 'connected') {
        this.connect();
      }
    }, delay);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
