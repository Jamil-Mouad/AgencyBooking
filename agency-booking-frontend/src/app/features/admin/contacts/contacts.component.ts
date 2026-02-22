import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { DateFrPipe } from '../../../shared/pipes/date-fr.pipe';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ContactMessage, ApiResponse } from '../../../shared/models';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatBadgeModule,
    LoadingSpinnerComponent, DateFrPipe
  ],
  template: `
    <div class="contacts-container">
      <div class="page-header">
        <div class="header-float header-float-1"></div>
        <div class="header-float header-float-2"></div>
        <div>
          <h1>Messages de contact</h1>
          <p>
            {{ messages.length }} message{{ messages.length > 1 ? 's' : '' }}
            @if (unreadCount > 0) {
              <span class="unread-badge">{{ unreadCount }} non lu{{ unreadCount > 1 ? 's' : '' }}</span>
            }
          </p>
        </div>
      </div>

      @if (loading) {
        <app-loading-spinner message="Chargement des messages..."></app-loading-spinner>
      } @else if (messages.length === 0) {
        <div class="empty-state">
          <mat-icon>mail_outline</mat-icon>
          <h3>Aucun message</h3>
          <p>Vous n'avez recu aucun message de contact pour le moment.</p>
        </div>
      } @else {
        <mat-accordion multi>
          @for (message of messages; track message.id) {
            <mat-expansion-panel (opened)="onPanelOpened(message)"
                                 [class.unread]="!message.read">
              <mat-expansion-panel-header>
                <mat-panel-title>
                  @if (!message.read) {
                    <mat-icon class="unread-icon">fiber_new</mat-icon>
                  }
                  <span class="sender-name">{{ message.user.username }}</span>
                </mat-panel-title>
                <mat-panel-description>
                  <span class="message-subject">{{ message.subject }}</span>
                  <span class="message-date">{{ message.createdAt | dateFr:'datetime' }}</span>
                </mat-panel-description>
              </mat-expansion-panel-header>

              <div class="message-content">
                <div class="message-meta">
                  <div class="meta-item">
                    <mat-icon>person</mat-icon>
                    <span>{{ message.user.username }}</span>
                  </div>
                  <div class="meta-item">
                    <mat-icon>email</mat-icon>
                    <span>{{ message.user.email }}</span>
                  </div>
                  <div class="meta-item">
                    <mat-icon>schedule</mat-icon>
                    <span>{{ message.createdAt | dateFr:'datetime' }}</span>
                  </div>
                  <div class="meta-item">
                    <mat-icon>{{ message.read ? 'drafts' : 'mail' }}</mat-icon>
                    <mat-chip [class]="message.read ? 'status-read' : 'status-unread'" highlighted>
                      {{ message.read ? 'Lu' : 'Non lu' }}
                    </mat-chip>
                  </div>
                </div>

                <div class="message-body">
                  <h4>{{ message.subject }}</h4>
                  <p>{{ message.message }}</p>
                </div>

                <div class="message-actions">
                  @if (!message.read) {
                    <button mat-stroked-button color="primary" (click)="markAsRead(message)">
                      <mat-icon>done</mat-icon>
                      Marquer comme lu
                    </button>
                  }
                  <button mat-stroked-button color="warn" (click)="confirmDelete(message)">
                    <mat-icon>delete</mat-icon>
                    Supprimer
                  </button>
                </div>
              </div>
            </mat-expansion-panel>
          }
        </mat-accordion>
      }
    </div>
  `,
  styles: [`
    .contacts-container {
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 32px;
      padding: 28px 32px;
      background:
        radial-gradient(ellipse at 20% 50%, rgba(91, 108, 240, 0.9) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 20%, rgba(67, 56, 202, 0.8) 0%, transparent 50%),
        radial-gradient(ellipse at 60% 80%, rgba(56, 189, 248, 0.3) 0%, transparent 50%),
        linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      border-radius: var(--radius-xl);
      color: white;
      position: relative;
      overflow: hidden;
      &::before {
        content: '';
        position: absolute;
        top: -30px;
        right: -30px;
        width: 120px;
        height: 120px;
        border-radius: 50%;
        background: rgba(255,255,255,0.08);
      }
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background-image: radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
        background-size: 24px 24px;
        pointer-events: none;
      }
      h1 {
        margin: 0 0 4px;
        font-size: 24px;
        font-family: var(--font-heading);
        font-weight: 700;
        color: white;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      p {
        margin: 0;
        font-family: var(--font-body);
        color: rgba(255,255,255,0.8);
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    .header-float {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      animation: adminFloat 12s ease-in-out infinite;
    }
    .header-float-1 {
      width: 70px;
      height: 70px;
      top: -15px;
      right: 12%;
      background: rgba(255,255,255,0.06);
    }
    .header-float-2 {
      width: 40px;
      height: 40px;
      bottom: -8px;
      left: 30%;
      background: rgba(255,255,255,0.04);
      animation-delay: -4s;
    }

    .unread-badge {
      background: rgba(255,255,255,0.2);
      backdrop-filter: blur(4px);
      color: white;
      padding: 2px 12px;
      border-radius: var(--radius-full);
      font-size: 12px;
      font-weight: 600;
      font-family: var(--font-body);
      border: 1px solid rgba(255,255,255,0.3);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px 24px;
      color: var(--text-muted);
      font-style: italic;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: var(--radius-xl);
      border: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: var(--shadow-sm);
      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
        color: var(--border);
      }
      h3 {
        margin: 0 0 8px;
        font-size: 20px;
        font-family: var(--font-heading);
        font-weight: 600;
        color: var(--text-secondary);
      }
      p {
        margin: 0;
        font-family: var(--font-body);
      }
    }

    mat-expansion-panel {
      margin-bottom: 8px;
      border-radius: var(--radius-xl) !important;
      border: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: var(--shadow-xs) !important;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: all var(--transition-fast);
      &:hover {
        box-shadow: var(--shadow-sm) !important;
      }
      &.unread {
        border-left: 4px solid var(--primary);
        background: rgba(245, 243, 255, 0.7);
      }
    }

    .unread-icon {
      color: var(--primary);
      margin-right: 8px;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .sender-name {
      font-weight: 600;
      font-family: var(--font-heading);
      color: var(--text-primary);
    }

    mat-panel-description {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .message-subject {
      color: var(--text-secondary);
      font-size: 14px;
      font-family: var(--font-body);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 300px;
    }

    .message-date {
      font-size: 12px;
      font-family: var(--font-body);
      color: var(--text-muted);
      white-space: nowrap;
      margin-left: 16px;
    }

    .message-content {
      padding: 8px 0;
    }

    .message-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 16px;
      padding: 12px 16px;
      background: var(--bg-subtle);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-light);
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-family: var(--font-body);
      color: var(--text-secondary);
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--primary);
      }
    }

    .status-read {
      --mdc-chip-elevated-container-color: var(--success-light);
      --mdc-chip-label-text-color: var(--success-dark);
      font-weight: 600;
      font-family: var(--font-body);
    }

    .status-unread {
      --mdc-chip-elevated-container-color: var(--amber-light);
      --mdc-chip-label-text-color: var(--amber-dark);
      font-weight: 600;
      font-family: var(--font-body);
    }

    .message-body {
      margin-bottom: 16px;
      h4 {
        margin: 0 0 8px;
        font-size: 16px;
        font-family: var(--font-heading);
        font-weight: 600;
        color: var(--text-primary);
      }
      p {
        margin: 0;
        font-family: var(--font-body);
        color: var(--text-secondary);
        line-height: 1.6;
        white-space: pre-wrap;
      }
    }

    .message-actions {
      display: flex;
      gap: 8px;
      padding-top: 8px;
      button {
        border-radius: var(--radius-md) !important;
        font-family: var(--font-body) !important;
        font-weight: 600 !important;
      }
      button[color="primary"] {
        border-color: var(--primary) !important;
        color: var(--primary) !important;
        position: relative;
        overflow: hidden;
        &::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(91,108,240,0.1) 50%, transparent 100%);
          background-size: 200% 100%;
          opacity: 0;
          transition: opacity var(--transition-fast);
        }
        &:hover::after {
          opacity: 1;
          animation: shimmerMove 1.5s ease-in-out infinite;
        }
      }
      button[color="warn"] {
        border-color: var(--warn) !important;
        color: var(--warn) !important;
      }
      button mat-icon {
        margin-right: 8px;
      }
    }
  `]
})
export class ContactsComponent implements OnInit {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);

  messages: ContactMessage[] = [];
  loading = false;

  get unreadCount(): number {
    return this.messages.filter(m => !m.read).length;
  }

  ngOnInit(): void {
    this.loadMessages();
  }

  onPanelOpened(message: ContactMessage): void {
    if (!message.read) {
      this.markAsRead(message);
    }
  }

  markAsRead(message: ContactMessage): void {
    this.http.post<ApiResponse>(
      `${environment.apiUrl}/api/admin/contact/${message.id}/read`,
      {}
    ).subscribe({
      next: () => {
        message.read = true;
        this.notification.success('Message marque comme lu');
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors de la mise a jour du message');
      }
    });
  }

  confirmDelete(message: ContactMessage): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Supprimer le message',
        message: `Etes-vous sur de vouloir supprimer le message de "${message.user.username}" ?`,
        confirmText: 'Supprimer',
        color: 'warn'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.deleteMessage(message);
      }
    });
  }

  private deleteMessage(message: ContactMessage): void {
    this.http.delete<ApiResponse>(
      `${environment.apiUrl}/api/admin/contact/${message.id}`
    ).subscribe({
      next: () => {
        this.messages = this.messages.filter(m => m.id !== message.id);
        this.notification.success('Message supprime');
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors de la suppression du message');
      }
    });
  }

  private loadMessages(): void {
    this.loading = true;
    this.http.get<ContactMessage[]>(`${environment.apiUrl}/api/admin/contact`).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.loading = false;
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors du chargement des messages');
        this.loading = false;
      }
    });
  }
}
