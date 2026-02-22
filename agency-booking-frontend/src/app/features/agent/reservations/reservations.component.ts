import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { environment } from '../../../../environments/environment';
import {
  Reservation,
  ReservationConfirmationRequest,
  ReservationCancellationRequest,
  ReservationCompletionRequest,
  LockStatusDTO,
  ApiResponse,
} from '../../../shared/models';
import { NotificationService } from '../../../core/services/notification.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DateFrPipe } from '../../../shared/pipes/date-fr.pipe';
import { ReservationConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { ReservationCancelDialogComponent } from './cancel-dialog/cancel-dialog.component';
import { ReservationCompleteDialogComponent } from './complete-dialog/complete-dialog.component';

@Component({
  selector: 'app-agent-reservations',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule,
    LoadingSpinnerComponent,
    StatusBadgeComponent,
    DateFrPipe,
  ],
  template: `
    <div class="reservations-container">
      <div class="page-header">
        <div class="header-bg">
          <div class="float-shape s1"></div>
          <div class="float-shape s2"></div>
          <div class="float-shape s3"></div>
        </div>
        <h1>Gestion des réservations</h1>
        <p class="header-subtitle">Gérez et traitez les réservations de votre agence</p>
      </div>

      <mat-tab-group (selectedTabChange)="onTabChange($event.index)" animationDuration="200ms">
        <!-- Pending Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">pending_actions</mat-icon>
            En attente
          </ng-template>
          <div class="tab-content">
            @if (loadingPending) {
              <app-loading-spinner message="Chargement..."></app-loading-spinner>
            } @else if (pendingReservations.length === 0) {
              <div class="empty-state">
                <div class="empty-state-icon-wrap">
                  <mat-icon>inbox</mat-icon>
                </div>
                <p>Aucune réservation en attente.</p>
              </div>
            } @else {
              @for (reservation of pendingReservations; track reservation.id) {
                <mat-card class="reservation-card" [class.locked]="isLockedByOther(reservation.id)">
                  @if (isLockedByOther(reservation.id)) {
                    <div class="lock-banner">
                      <mat-icon>lock</mat-icon>
                      <span>Verrouillée par {{ getLockInfo(reservation.id)?.agentName }}
                        @if (getLockInfo(reservation.id)?.agentEmail) {
                          ({{ getLockInfo(reservation.id)?.agentEmail }})
                        }
                      </span>
                    </div>
                  }
                  <mat-card-header>
                    <div mat-card-avatar class="card-avatar">
                      <mat-icon>person</mat-icon>
                    </div>
                    <mat-card-title>{{ reservation.user.username }}</mat-card-title>
                    <mat-card-subtitle>{{ reservation.user.email }}</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="reservation-details">
                      <div class="detail-row">
                        <mat-icon>category</mat-icon>
                        <span><strong>Service:</strong> {{ reservation.service }}</span>
                      </div>
                      <div class="detail-row">
                        <mat-icon>description</mat-icon>
                        <span><strong>Description:</strong> {{ reservation.description }}</span>
                      </div>
                      <div class="detail-row">
                        <mat-icon>calendar_today</mat-icon>
                        <span><strong>Date souhaitée:</strong> {{ reservation.preferredDate | dateFr:'long' }}</span>
                      </div>
                      <div class="detail-row">
                        <mat-icon>schedule</mat-icon>
                        <span><strong>Soumise le:</strong> {{ reservation.createdAt | dateFr:'datetime' }}</span>
                      </div>
                    </div>
                  </mat-card-content>
                  <mat-card-actions align="end">
                    <button mat-button class="btn-cancel"
                            [disabled]="isLockedByOther(reservation.id)"
                            (click)="openCancelDialog(reservation)">
                      <mat-icon>close</mat-icon>
                      Annuler
                    </button>
                    <button mat-flat-button class="btn-confirm"
                            [disabled]="isLockedByOther(reservation.id)"
                            (click)="openConfirmDialog(reservation)">
                      <mat-icon>check</mat-icon>
                      Confirmer
                    </button>
                  </mat-card-actions>
                </mat-card>
              }
            }
          </div>
        </mat-tab>

        <!-- Confirmed Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">event_available</mat-icon>
            Confirmées
          </ng-template>
          <div class="tab-content">
            @if (loadingConfirmed) {
              <app-loading-spinner message="Chargement..."></app-loading-spinner>
            } @else if (confirmedReservations.length === 0) {
              <div class="empty-state">
                <div class="empty-state-icon-wrap">
                  <mat-icon>event_available</mat-icon>
                </div>
                <p>Aucune réservation confirmée.</p>
              </div>
            } @else {
              @for (reservation of confirmedReservations; track reservation.id) {
                <mat-card class="reservation-card">
                  <mat-card-header>
                    <div mat-card-avatar class="card-avatar">
                      <mat-icon>person</mat-icon>
                    </div>
                    <mat-card-title>{{ reservation.user.username }}</mat-card-title>
                    <mat-card-subtitle>{{ reservation.service }}</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="reservation-details">
                      <div class="detail-row">
                        <mat-icon>description</mat-icon>
                        <span>{{ reservation.description }}</span>
                      </div>
                      <div class="detail-row">
                        <mat-icon>event</mat-icon>
                        <span>
                          <strong>Début:</strong> {{ reservation.startDateTime | dateFr:'datetime' }}
                        </span>
                      </div>
                      <div class="detail-row">
                        <mat-icon>event</mat-icon>
                        <span>
                          <strong>Fin:</strong> {{ reservation.endDateTime | dateFr:'datetime' }}
                        </span>
                      </div>
                      @if (reservation.handledByAgent) {
                        <div class="detail-row">
                          <mat-icon>support_agent</mat-icon>
                          <span><strong>Agent:</strong> {{ reservation.handledByAgent.username }}</span>
                        </div>
                      }
                    </div>
                  </mat-card-content>
                  <mat-card-actions align="end">
                    <app-status-badge [status]="reservation.status"></app-status-badge>
                    <span class="spacer"></span>
                    <button mat-flat-button class="btn-complete"
                            [disabled]="!canComplete(reservation)"
                            [matTooltip]="canComplete(reservation) ? 'Marquer comme terminée' : 'Disponible après la fin du créneau (' + (reservation.endDateTime | dateFr:'datetime') + ')'"
                            (click)="openCompleteDialog(reservation)">
                      <mat-icon>task_alt</mat-icon>
                      Compléter
                    </button>
                  </mat-card-actions>
                </mat-card>
              }
            }
          </div>
        </mat-tab>

        <!-- Completed Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">task_alt</mat-icon>
            Terminées
          </ng-template>
          <div class="tab-content">
            @if (loadingCompleted) {
              <app-loading-spinner message="Chargement..."></app-loading-spinner>
            } @else if (completedReservations.length === 0) {
              <div class="empty-state">
                <div class="empty-state-icon-wrap">
                  <mat-icon>task_alt</mat-icon>
                </div>
                <p>Aucune réservation terminée.</p>
              </div>
            } @else {
              @for (reservation of completedReservations; track reservation.id) {
                <mat-card class="reservation-card">
                  <mat-card-header>
                    <div mat-card-avatar class="card-avatar">
                      <mat-icon>person</mat-icon>
                    </div>
                    <mat-card-title>{{ reservation.user.username }}</mat-card-title>
                    <mat-card-subtitle>{{ reservation.service }}</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="reservation-details">
                      <div class="detail-row">
                        <mat-icon>event</mat-icon>
                        <span>
                          {{ reservation.startDateTime | dateFr:'datetime' }}
                          - {{ reservation.endDateTime | dateFr:'time' }}
                        </span>
                      </div>
                      <div class="detail-row">
                        <mat-icon>description</mat-icon>
                        <span>{{ reservation.description }}</span>
                      </div>
                    </div>
                  </mat-card-content>
                  <mat-card-actions align="end">
                    <app-status-badge [status]="reservation.status"></app-status-badge>
                  </mat-card-actions>
                </mat-card>
              }
            }
          </div>
        </mat-tab>

        <!-- Canceled Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">block</mat-icon>
            Annulées
          </ng-template>
          <div class="tab-content">
            @if (loadingCanceled) {
              <app-loading-spinner message="Chargement..."></app-loading-spinner>
            } @else if (canceledReservations.length === 0) {
              <div class="empty-state">
                <div class="empty-state-icon-wrap">
                  <mat-icon>block</mat-icon>
                </div>
                <p>Aucune réservation annulée.</p>
              </div>
            } @else {
              @for (reservation of canceledReservations; track reservation.id) {
                <mat-card class="reservation-card">
                  <mat-card-header>
                    <div mat-card-avatar class="card-avatar">
                      <mat-icon>person</mat-icon>
                    </div>
                    <mat-card-title>{{ reservation.user.username }}</mat-card-title>
                    <mat-card-subtitle>{{ reservation.service }}</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="reservation-details">
                      <div class="detail-row">
                        <mat-icon>calendar_today</mat-icon>
                        <span>
                          <strong>Date souhaitée:</strong> {{ reservation.preferredDate | dateFr:'long' }}
                        </span>
                      </div>
                      <div class="detail-row">
                        <mat-icon>description</mat-icon>
                        <span>{{ reservation.description }}</span>
                      </div>
                    </div>
                  </mat-card-content>
                  <mat-card-actions align="end">
                    <app-status-badge [status]="reservation.status"></app-status-badge>
                  </mat-card-actions>
                </mat-card>
              }
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background: var(--bg-main);
      min-height: 100%;
    }

    .reservations-container {
      padding: 32px 24px;
      max-width: 900px;
      margin: 0 auto;
    }

    .page-header {
      position: relative;
      overflow: hidden;
      padding: 28px 32px;
      margin-bottom: 28px;
      border-radius: var(--radius-xl);
      background:
        radial-gradient(ellipse at 20% 50%, rgba(91, 108, 240, 0.9) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 20%, rgba(67, 56, 202, 0.8) 0%, transparent 50%),
        radial-gradient(ellipse at 60% 80%, rgba(56, 189, 248, 0.3) 0%, transparent 50%),
        linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
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
        font-weight: 700;
        font-family: var(--font-heading);
        color: white;
        position: relative;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      .header-subtitle {
        margin: 0;
        color: rgba(255,255,255,0.8);
        font-size: 14px;
        font-family: var(--font-body);
        position: relative;
      }
    }

    .header-bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .float-shape {
      position: absolute;
      border-radius: 50%;
      animation: floatShape 12s ease-in-out infinite;
    }
    .float-shape.s1 { width: 80px; height: 80px; top: -20px; right: 10%; background: rgba(255,255,255,0.07); }
    .float-shape.s2 { width: 50px; height: 50px; bottom: -10px; left: 25%; background: rgba(255,255,255,0.05); animation-delay: -4s; }
    .float-shape.s3 { width: 30px; height: 30px; top: 50%; right: 30%; background: rgba(255,255,255,0.04); animation-delay: -8s; }

    @keyframes floatShape {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-10px) rotate(5deg); }
    }

    /* ── Tab styling ── */
    ::ng-deep .mat-mdc-tab-group {
      .mat-mdc-tab-header {
        background: var(--bg-card);
        border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        border: 1px solid var(--border-light);
        border-bottom: none;
      }

      .mat-mdc-tab-labels {
        gap: 4px;
        padding: 4px 8px 0;
      }

      .mat-mdc-tab {
        font-family: var(--font-body), sans-serif;
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--text-secondary);
        letter-spacing: 0.01em;
        border-radius: var(--radius-md) var(--radius-md) 0 0;
        min-width: 120px;
        opacity: 1;
        transition: color var(--transition-fast), background var(--transition-fast);

        &:hover {
          color: var(--primary);
          background: var(--bg-subtle);
        }

        &.mdc-tab--active {
          color: var(--primary);
        }
      }

      .mdc-tab-indicator__content--underline {
        border-color: var(--primary);
        border-width: 3px;
        border-radius: 3px 3px 0 0;
      }
    }

    .tab-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-right: 6px;
      vertical-align: middle;
    }

    .tab-content {
      padding: 20px 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* ── Reservation card ── */
    .reservation-card {
      position: relative;
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      transition: box-shadow var(--transition-base), transform var(--transition-base);
      overflow: hidden;

      &:hover {
        box-shadow: var(--shadow-md);
        transform: translateY(-1px);
      }

      &.locked {
        opacity: 0.75;
        border-left: 4px solid var(--amber);
      }

      mat-card-header {
        padding: 20px 20px 12px;
      }

      mat-card-content {
        padding: 0 20px 8px;
      }

      mat-card-actions {
        padding: 8px 20px 16px;
      }
    }

    /* ── Lock banner ── */
    .lock-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: rgba(245, 158, 66, 0.1);
      color: var(--amber);
      font-family: var(--font-body), sans-serif;
      font-size: 0.84rem;
      font-weight: 600;
      border-bottom: 1px solid rgba(245, 158, 66, 0.18);

      mat-icon {
        font-size: 17px;
        width: 17px;
        height: 17px;
      }
    }

    /* ── Card avatar ── */
    .card-avatar {
      background: var(--primary-light);
      color: var(--primary);
      border-radius: var(--radius-full);
      width: 42px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    /* ── Card title / subtitle ── */
    ::ng-deep mat-card-title.mat-mdc-card-title {
      font-family: var(--font-heading), sans-serif;
      font-weight: 600;
      font-size: 1rem;
      color: var(--text-primary);
    }

    ::ng-deep mat-card-subtitle.mat-mdc-card-subtitle {
      font-family: var(--font-body), sans-serif;
      color: var(--text-secondary);
      font-size: 0.84rem;
    }

    /* ── Detail rows ── */
    .reservation-details {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 8px 0;
    }

    .detail-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;

      mat-icon {
        font-size: 19px;
        width: 19px;
        height: 19px;
        color: var(--text-muted);
        margin-top: 2px;
        flex-shrink: 0;
      }

      span {
        font-family: var(--font-body), sans-serif;
        font-size: 0.885rem;
        color: var(--text-secondary);
        line-height: 1.5;

        strong {
          color: var(--text-primary);
          font-weight: 600;
        }
      }
    }

    /* ── Card actions ── */
    mat-card-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .spacer { flex: 1; }

    /* ── Buttons ── */
    .btn-confirm {
      background: var(--primary) !important;
      color: #fff !important;
      border-radius: var(--radius-md) !important;
      font-family: var(--font-body), sans-serif;
      font-weight: 600;
      letter-spacing: 0.01em;
      transition: background var(--transition-fast), box-shadow var(--transition-fast);

      &:hover:not(:disabled) {
        background: var(--primary-dark) !important;
        box-shadow: var(--shadow-sm);
      }

      &:disabled {
        opacity: 0.5;
      }
    }

    .btn-cancel {
      color: var(--warn) !important;
      border-radius: var(--radius-md) !important;
      font-family: var(--font-body), sans-serif;
      font-weight: 600;
      letter-spacing: 0.01em;
      transition: background var(--transition-fast);

      &:hover:not(:disabled) {
        background: rgba(244, 63, 94, 0.08) !important;
      }

      &:disabled {
        opacity: 0.5;
      }
    }

    .btn-complete {
      background: var(--success) !important;
      color: #fff !important;
      border-radius: var(--radius-md) !important;
      font-family: var(--font-body), sans-serif;
      font-weight: 600;
      letter-spacing: 0.01em;
      transition: background var(--transition-fast), box-shadow var(--transition-fast);

      &:hover:not(:disabled) {
        background: #059669 !important;
        box-shadow: var(--shadow-sm);
      }

      &:disabled {
        opacity: 0.45;
      }
    }

    /* ── Empty state ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 56px 24px;
      color: var(--text-muted);

      .empty-state-icon-wrap {
        width: 72px;
        height: 72px;
        border-radius: var(--radius-full);
        background: var(--bg-subtle);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;
      }

      mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: var(--text-muted);
      }

      p {
        font-family: var(--font-body), sans-serif;
        font-size: 1.05rem;
        font-weight: 500;
        color: var(--text-muted);
        margin: 0;
      }
    }
  `],
})
export class AgentReservationsComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
  private ws = inject(WebSocketService);
  private apiUrl = environment.apiUrl;
  private destroy$ = new Subject<void>();

  pendingReservations: Reservation[] = [];
  confirmedReservations: Reservation[] = [];
  completedReservations: Reservation[] = [];
  canceledReservations: Reservation[] = [];
  lockStatuses = new Map<number, LockStatusDTO>();

  loadingPending = false;
  loadingConfirmed = false;
  loadingCompleted = false;
  loadingCanceled = false;

  private activeTab = 0;

  ngOnInit(): void {
    this.loadPending();
    this.setupWebSocket();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTabChange(index: number): void {
    this.activeTab = index;

    switch (index) {
      case 0:
        this.loadPending();
        break;
      case 1:
        this.loadConfirmed();
        break;
      case 2:
        this.loadCompleted();
        break;
      case 3:
        this.loadCanceled();
        break;
    }
  }

  isLockedByOther(reservationId: number): boolean {
    const lock = this.lockStatuses.get(reservationId);
    return lock !== undefined && lock.locked;
  }

  getLockInfo(reservationId: number): LockStatusDTO | undefined {
    return this.lockStatuses.get(reservationId);
  }

  canComplete(reservation: Reservation): boolean {
    if (!reservation.endDateTime) return false;
    return new Date(reservation.endDateTime) <= new Date();
  }

  openConfirmDialog(reservation: Reservation): void {
    this.acquireLock(reservation.id).then((acquired) => {
      if (!acquired) return;

      const dialogRef = this.dialog.open(ReservationConfirmDialogComponent, {
        width: '500px',
        data: { reservation },
      });

      dialogRef.afterClosed().subscribe((result: ReservationConfirmationRequest | undefined) => {
        this.releaseLock(reservation.id);
        if (!result) return;

        this.http.post<ApiResponse>(
          `${this.apiUrl}/api/agent/reservation/confirm/${reservation.id}`,
          result
        ).subscribe({
          next: (response) => {
            this.notification.success(response.message || 'Réservation confirmée avec succès.');
            this.loadPending();
          },
          error: () => {
            this.notification.error('Erreur lors de la confirmation de la réservation.');
          },
        });
      });
    });
  }

  openCancelDialog(reservation: Reservation): void {
    this.acquireLock(reservation.id).then((acquired) => {
      if (!acquired) return;

      const dialogRef = this.dialog.open(ReservationCancelDialogComponent, {
        width: '450px',
        data: { reservation },
      });

      dialogRef.afterClosed().subscribe((result: ReservationCancellationRequest | undefined) => {
        this.releaseLock(reservation.id);
        if (!result) return;

        this.http.post<ApiResponse>(
          `${this.apiUrl}/api/agent/reservation/cancel/${reservation.id}`,
          result
        ).subscribe({
          next: (response) => {
            this.notification.success(response.message || 'Réservation annulée.');
            this.loadPending();
          },
          error: () => {
            this.notification.error('Erreur lors de l\'annulation de la réservation.');
          },
        });
      });
    });
  }

  openCompleteDialog(reservation: Reservation): void {
    const dialogRef = this.dialog.open(ReservationCompleteDialogComponent, {
      width: '450px',
      data: { reservation },
    });

    dialogRef.afterClosed().subscribe((result: ReservationCompletionRequest | undefined) => {
      if (!result) return;

      this.http.post<ApiResponse>(
        `${this.apiUrl}/api/agent/reservation/complete/${reservation.id}`,
        result
      ).subscribe({
        next: (response) => {
          this.notification.success(response.message || 'Réservation terminée.');
          this.loadConfirmed();
        },
        error: () => {
          this.notification.error('Erreur lors de la complétion de la réservation.');
        },
      });
    });
  }

  private loadPending(): void {
    this.loadingPending = true;
    this.http.get<Reservation[]>(`${this.apiUrl}/api/agent/reservations/pending`).subscribe({
      next: (reservations) => {
        this.pendingReservations = reservations;
        this.loadingPending = false;
      },
      error: () => {
        this.notification.error('Erreur lors du chargement des réservations en attente.');
        this.loadingPending = false;
      },
    });
  }

  private loadConfirmed(): void {
    this.loadingConfirmed = true;
    this.http.get<Reservation[]>(`${this.apiUrl}/api/agent/reservations/confirmed`).subscribe({
      next: (reservations) => {
        this.confirmedReservations = reservations;
        this.loadingConfirmed = false;
      },
      error: () => {
        this.notification.error('Erreur lors du chargement des réservations confirmées.');
        this.loadingConfirmed = false;
      },
    });
  }

  private loadCompleted(): void {
    this.loadingCompleted = true;
    this.http.get<Reservation[]>(`${this.apiUrl}/api/agent/reservations/completed`).subscribe({
      next: (reservations) => {
        this.completedReservations = reservations;
        this.loadingCompleted = false;
      },
      error: () => {
        this.notification.error('Erreur lors du chargement des réservations terminées.');
        this.loadingCompleted = false;
      },
    });
  }

  private loadCanceled(): void {
    this.loadingCanceled = true;
    this.http.get<Reservation[]>(`${this.apiUrl}/api/agent/reservations/canceled`).subscribe({
      next: (reservations) => {
        this.canceledReservations = reservations;
        this.loadingCanceled = false;
      },
      error: () => {
        this.notification.error('Erreur lors du chargement des réservations annulées.');
        this.loadingCanceled = false;
      },
    });
  }

  private async acquireLock(reservationId: number): Promise<boolean> {
    return new Promise((resolve) => {
      this.http.post<ApiResponse>(
        `${this.apiUrl}/api/agent/lock/acquire/${reservationId}`,
        {}
      ).subscribe({
        next: () => {
          resolve(true);
        },
        error: (err) => {
          const message = err.error?.message || 'Cette réservation est verrouillée par un autre agent.';
          this.notification.warn(message);
          resolve(false);
        },
      });
    });
  }

  private releaseLock(reservationId: number): void {
    this.http.post<ApiResponse>(
      `${this.apiUrl}/api/agent/lock/release/${reservationId}`,
      {}
    ).subscribe({
      next: () => {
        this.lockStatuses.delete(reservationId);
      },
    });
  }

  private setupWebSocket(): void {
    this.ws.connect();
    this.ws.subscribe<Reservation>('/topic/reservations')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.activeTab === 0) {
          this.loadPending();
        }
      });

    // Listen for real-time lock status updates from other agents
    this.ws.subscribe<LockStatusDTO>('/topic/reservation-lock-status')
      .pipe(takeUntil(this.destroy$))
      .subscribe((lockStatus) => {
        if (lockStatus.locked) {
          this.lockStatuses.set(lockStatus.reservationId, lockStatus);
        } else {
          this.lockStatuses.delete(lockStatus.reservationId);
        }
      });
  }
}
