import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { environment } from '../../../../environments/environment';
import { AgentInfoDTO, AgentStatsDTO, Reservation } from '../../../shared/models';
import { NotificationService } from '../../../core/services/notification.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DateFrPipe } from '../../../shared/pipes/date-fr.pipe';
import { fadeIn, staggerList } from '../../../shared/animations';

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatDividerModule,
    MatChipsModule,
    LoadingSpinnerComponent,
    StatusBadgeComponent,
    DateFrPipe,
  ],
  animations: [fadeIn, staggerList],
  template: `
    @if (loading) {
      <app-loading-spinner message="Chargement du tableau de bord..."></app-loading-spinner>
    } @else {
      <div class="dashboard-container">
        <div class="dashboard-header">
          <div class="header-bg">
            <div class="float-shape s1"></div>
            <div class="float-shape s2"></div>
            <div class="float-shape s3"></div>
          </div>
          <div class="header-text">
            <h1>Tableau de bord</h1>
            <p class="header-subtitle">Vue d'ensemble de votre activité</p>
          </div>
          @if (agentInfo) {
            <div class="agent-info">
              <div class="agent-avatar">
                <mat-icon>person</mat-icon>
              </div>
              <div class="agent-details">
                <span class="agent-name">{{ agentInfo.username }}</span>
                <span class="agent-agency">{{ agentInfo.agencyName }}</span>
              </div>
              <mat-chip [class]="agentInfo.available ? 'status-available' : 'status-unavailable'" highlighted>
                {{ agentInfo.available ? 'Disponible' : 'Indisponible' }}
              </mat-chip>
            </div>
          }
        </div>

        <div class="stats-grid" @staggerList>
          <mat-card class="stat-card pending" @fadeIn>
            <mat-card-content>
              <div class="stat-icon">
                <mat-icon>hourglass_empty</mat-icon>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ stats?.last24Hours ?? 0 }}</span>
                <span class="stat-label">En attente (24h)</span>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card confirmed" @fadeIn>
            <mat-card-content>
              <div class="stat-icon">
                <mat-icon>check_circle</mat-icon>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ stats?.totalConfirmed ?? 0 }}</span>
                <span class="stat-label">Confirmées</span>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card completed" @fadeIn>
            <mat-card-content>
              <div class="stat-icon">
                <mat-icon>task_alt</mat-icon>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ stats?.totalCompleted ?? 0 }}</span>
                <span class="stat-label">Terminées</span>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card canceled" @fadeIn>
            <mat-card-content>
              <div class="stat-icon">
                <mat-icon>cancel</mat-icon>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ stats?.totalCanceled ?? 0 }}</span>
                <span class="stat-label">Annulées</span>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <mat-card class="recent-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon class="section-icon">schedule</mat-icon>
              Réservations en attente récentes
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (recentReservations.length === 0) {
              <div class="empty-state">
                <mat-icon class="empty-icon">inbox</mat-icon>
                <p class="empty-message">Aucune réservation en attente.</p>
              </div>
            } @else {
              <mat-list>
                @for (reservation of recentReservations; track reservation.id; let last = $last) {
                  <mat-list-item class="reservation-item">
                    <mat-icon matListItemIcon class="reservation-icon">event_note</mat-icon>
                    <div matListItemTitle class="reservation-title">
                      {{ reservation.user.username }} - {{ reservation.service }}
                    </div>
                    <div matListItemLine class="reservation-desc">
                      {{ reservation.description | slice:0:60 }}{{ reservation.description.length > 60 ? '...' : '' }}
                    </div>
                    <div matListItemMeta>
                      <span class="reservation-date">{{ reservation.preferredDate | dateFr:'short' }}</span>
                    </div>
                  </mat-list-item>
                  @if (!last) {
                    <mat-divider></mat-divider>
                  }
                }
              </mat-list>
              <div class="view-all">
                <a mat-button routerLink="../reservations" class="view-all-link">
                  Voir toutes les réservations
                  <mat-icon>arrow_forward</mat-icon>
                </a>
              </div>
            }
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      background: var(--bg-main);
      min-height: 100%;
    }

    .dashboard-container {
      padding: 32px 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* ── Header ── */
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      flex-wrap: wrap;
      gap: 20px;
      padding: 28px 32px;
      border-radius: var(--radius-xl);
      position: relative;
      overflow: hidden;
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

      .header-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
        position: relative;
      }

      h1 {
        margin: 0;
        font-family: var(--font-heading);
        font-size: 1.85rem;
        font-weight: 700;
        color: white;
        letter-spacing: -0.02em;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .header-subtitle {
        margin: 0;
        font-family: var(--font-body);
        font-size: 0.95rem;
        color: rgba(255, 255, 255, 0.8);
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

    /* ── Agent Info Chip ── */
    .agent-info {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: var(--radius-xl);
      padding: 8px 16px 8px 8px;
      position: relative;

      .agent-avatar {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-full);
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          color: white;
          font-size: 22px;
          width: 22px;
          height: 22px;
        }
      }

      .agent-details {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }

      .agent-name {
        font-family: var(--font-heading);
        font-weight: 600;
        font-size: 0.9rem;
        color: white;
      }

      .agent-agency {
        font-family: var(--font-body);
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.75);
      }
    }

    .status-available {
      --mdc-chip-elevated-container-color: rgba(16, 185, 129, 0.12);
      --mdc-chip-label-text-color: var(--success);
      --mdc-chip-label-text-font: var(--font-body);
      --mdc-chip-label-text-size: 0.8rem;
    }

    .status-unavailable {
      --mdc-chip-elevated-container-color: rgba(244, 63, 94, 0.12);
      --mdc-chip-label-text-color: var(--warn);
      --mdc-chip-label-text-font: var(--font-body);
      --mdc-chip-label-text-size: 0.8rem;
    }

    /* ── Stats Grid ── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .stat-card {
      --mdc-elevated-card-container-color: var(--bg-card);
      border-radius: var(--radius-xl) !important;
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-xs) !important;
      transition: box-shadow var(--transition-base), transform var(--transition-base);
      overflow: hidden;

      &:hover {
        box-shadow: var(--shadow-md) !important;
        transform: translateY(-2px);
      }

      mat-card-content {
        display: flex;
        align-items: center;
        gap: 18px;
        padding: 24px !important;
      }

      .stat-icon {
        width: 56px;
        height: 56px;
        border-radius: var(--radius-lg);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        mat-icon {
          font-size: 26px;
          width: 26px;
          height: 26px;
        }
      }

      .stat-info {
        display: flex;
        flex-direction: column;
      }

      .stat-value {
        font-family: var(--font-heading);
        font-size: 2rem;
        font-weight: 700;
        line-height: 1;
        color: var(--text-primary);
      }

      .stat-label {
        font-family: var(--font-body);
        font-size: 0.85rem;
        color: var(--text-secondary);
        margin-top: 6px;
      }

      /* Pending – amber tones */
      &.pending .stat-icon {
        background: rgba(245, 158, 66, 0.12);
        mat-icon { color: var(--amber); }
      }

      /* Confirmed – accent tones */
      &.confirmed .stat-icon {
        background: rgba(56, 189, 248, 0.12);
        mat-icon { color: var(--accent); }
      }

      /* Completed – success tones */
      &.completed .stat-icon {
        background: rgba(16, 185, 129, 0.12);
        mat-icon { color: var(--success); }
      }

      /* Canceled – warn tones */
      &.canceled .stat-icon {
        background: rgba(244, 63, 94, 0.12);
        mat-icon { color: var(--warn); }
      }
    }

    /* ── Recent Reservations Card ── */
    .recent-card {
      --mdc-elevated-card-container-color: var(--bg-card);
      border-radius: var(--radius-xl) !important;
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-sm) !important;
      overflow: hidden;

      mat-card-header {
        padding: 24px 24px 8px;

        mat-card-title {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 10px;

          .section-icon {
            font-size: 22px;
            width: 22px;
            height: 22px;
            color: var(--primary);
          }
        }
      }
    }

    .reservation-item {
      cursor: default;
      border-radius: var(--radius-md);
      transition: background var(--transition-fast);

      &:hover {
        background: var(--bg-subtle);
      }

      .reservation-icon {
        color: var(--primary);
        opacity: 0.7;
      }

      .reservation-title {
        font-family: var(--font-body);
        font-weight: 600;
        color: var(--text-primary);
      }

      .reservation-desc {
        font-family: var(--font-body);
        color: var(--text-secondary);
        font-size: 0.85rem;
      }
    }

    mat-divider {
      --mat-divider-color: var(--border-light);
    }

    .reservation-date {
      font-family: var(--font-body);
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--primary);
      background: var(--primary-light);
      padding: 4px 10px;
      border-radius: var(--radius-full);
      white-space: nowrap;
    }

    /* ── Empty State ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 24px;
      gap: 12px;

      .empty-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--border);
      }
    }

    .empty-message {
      text-align: center;
      font-family: var(--font-body);
      color: var(--text-muted);
      font-size: 0.95rem;
      margin: 0;
    }

    /* ── View All Link ── */
    .view-all {
      display: flex;
      justify-content: center;
      padding: 12px 0 4px;

      .view-all-link {
        font-family: var(--font-body);
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--primary);
        display: flex;
        align-items: center;
        gap: 6px;
        border-radius: var(--radius-full);
        transition: background var(--transition-fast);

        &:hover {
          background: var(--primary-light);
          color: var(--primary-dark);
        }

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .dashboard-container { padding: 20px 16px; }
      .dashboard-header { margin-bottom: 24px; }
      .dashboard-header h1 { font-size: 1.5rem; }
      .stats-grid { gap: 14px; }
    }
  `],
})
export class AgentDashboardComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private notification = inject(NotificationService);
  private ws = inject(WebSocketService);
  private apiUrl = environment.apiUrl;
  private destroy$ = new Subject<void>();

  loading = true;
  agentInfo: AgentInfoDTO | null = null;
  stats: AgentStatsDTO | null = null;
  recentReservations: Reservation[] = [];

  ngOnInit(): void {
    this.loadDashboardData();
    this.setupWebSocket();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.loading = true;

    forkJoin({
      info: this.http.get<AgentInfoDTO>(`${this.apiUrl}/api/agent/info`),
      stats: this.http.get<AgentStatsDTO>(`${this.apiUrl}/api/agent/stats`),
      pending: this.http.get<Reservation[]>(`${this.apiUrl}/api/agent/reservations/pending`),
    }).subscribe({
      next: ({ info, stats, pending }) => {
        this.agentInfo = info;
        this.stats = stats;
        this.recentReservations = pending.slice(0, 5);
        this.loading = false;
      },
      error: () => {
        this.notification.error('Erreur lors du chargement du tableau de bord.');
        this.loading = false;
      },
    });
  }

  private setupWebSocket(): void {
    this.ws.connect();

    // Listen for new reservations
    this.ws.subscribe<Reservation>('/topic/reservations')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadDashboardData();
      });

    // Listen for reservation status changes (confirm, cancel, complete)
    this.ws.subscribe<Reservation>('/topic/reservation-updated')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadDashboardData();
      });
  }
}
