import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { SystemStats } from '../../../shared/models';
import { fadeIn, staggerList } from '../../../shared/animations';

interface StatBar {
  label: string;
  value: number;
  percentage: number;
  color: string;
  icon: string;
}

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatIconModule, MatDividerModule,
    LoadingSpinnerComponent
  ],
  animations: [fadeIn, staggerList],
  template: `
    <div class="statistics-container">
      <div class="page-header">
        <div class="header-float header-float-1"></div>
        <div class="header-float header-float-2"></div>
        <h1>Statistiques du systeme</h1>
        <p>Vue d'ensemble des donnees et indicateurs</p>
      </div>

      @if (loading) {
        <app-loading-spinner message="Chargement des statistiques..."></app-loading-spinner>
      } @else if (stats) {
        <div class="summary-cards" @staggerList>
          <mat-card class="summary-card" @fadeIn>
            <mat-card-content>
              <div class="summary-icon icon-primary">
                <mat-icon>people</mat-icon>
              </div>
              <div class="summary-info">
                <span class="summary-value">{{ stats.totalUsers }}</span>
                <span class="summary-label">Utilisateurs totaux</span>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card" @fadeIn>
            <mat-card-content>
              <div class="summary-icon icon-purple">
                <mat-icon>support_agent</mat-icon>
              </div>
              <div class="summary-info">
                <span class="summary-value">{{ stats.totalAgents }}</span>
                <span class="summary-label">Agents totaux</span>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card" @fadeIn>
            <mat-card-content>
              <div class="summary-icon icon-pink">
                <mat-icon>store</mat-icon>
              </div>
              <div class="summary-info">
                <span class="summary-value">{{ stats.totalAgencies }}</span>
                <span class="summary-label">Agences totales</span>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card" @fadeIn>
            <mat-card-content>
              <div class="summary-icon icon-accent">
                <mat-icon>event_note</mat-icon>
              </div>
              <div class="summary-info">
                <span class="summary-value">{{ stats.totalReservations }}</span>
                <span class="summary-label">Reservations totales</span>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>Repartition des reservations</mat-card-title>
            <mat-card-subtitle>Par statut de traitement</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="bars-container">
              @for (bar of reservationBars; track bar.label) {
                <div class="bar-item">
                  <div class="bar-header">
                    <div class="bar-label">
                      <mat-icon [style.color]="bar.color">{{ bar.icon }}</mat-icon>
                      <span>{{ bar.label }}</span>
                    </div>
                    <div class="bar-values">
                      <span class="bar-count">{{ bar.value }}</span>
                      <span class="bar-percentage">{{ bar.percentage | number:'1.0-1' }}%</span>
                    </div>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill"
                         [style.width.%]="bar.percentage"
                         [style.background]="bar.color">
                    </div>
                  </div>
                </div>
              }
            </div>

            @if (stats.totalReservations === 0) {
              <div class="no-data">
                <mat-icon>info_outline</mat-icon>
                <span>Aucune reservation enregistree</span>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <div class="detail-cards">
          <mat-card class="detail-card">
            <mat-card-header>
              <mat-card-title>Ratio utilisateurs / agents</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="ratio-display">
                <div class="ratio-item">
                  <div class="ratio-bar">
                    <div class="ratio-fill users" [style.width.%]="getUserPercentage()"></div>
                    <div class="ratio-fill agents" [style.width.%]="getAgentPercentage()"></div>
                  </div>
                  <div class="ratio-legend">
                    <span class="legend-item">
                      <span class="legend-dot users"></span>
                      Utilisateurs: {{ stats.totalUsers }} ({{ getUserPercentage() | number:'1.0-1' }}%)
                    </span>
                    <span class="legend-item">
                      <span class="legend-dot agents"></span>
                      Agents: {{ stats.totalAgents }} ({{ getAgentPercentage() | number:'1.0-1' }}%)
                    </span>
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="detail-card">
            <mat-card-header>
              <mat-card-title>Indicateurs cles</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="kpi-list">
                <div class="kpi-item">
                  <span class="kpi-label">Taux de confirmation</span>
                  <span class="kpi-value">{{ getConfirmationRate() | number:'1.0-1' }}%</span>
                </div>
                <mat-divider></mat-divider>
                <div class="kpi-item">
                  <span class="kpi-label">Taux de completion</span>
                  <span class="kpi-value">{{ getCompletionRate() | number:'1.0-1' }}%</span>
                </div>
                <mat-divider></mat-divider>
                <div class="kpi-item">
                  <span class="kpi-label">Taux d'annulation</span>
                  <span class="kpi-value">{{ getCancellationRate() | number:'1.0-1' }}%</span>
                </div>
                <mat-divider></mat-divider>
                <div class="kpi-item">
                  <span class="kpi-label">Agents par agence (moy.)</span>
                  <span class="kpi-value">{{ getAgentsPerAgency() | number:'1.0-1' }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    .statistics-container {
      padding: 24px;
      max-width: 1200px;
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

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    .summary-card {
      border-radius: var(--radius-xl) !important;
      border: 1px solid rgba(255, 255, 255, 0.5) !important;
      box-shadow: var(--shadow-sm) !important;
      background: rgba(255, 255, 255, 0.7) !important;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: all var(--transition-base) !important;
      position: relative;
      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md) !important;
        border-color: transparent !important;
        &::before { opacity: 1; }
      }
      &::before {
        content: '';
        position: absolute;
        inset: -1px;
        border-radius: inherit;
        padding: 1px;
        background: linear-gradient(135deg, var(--primary), var(--accent));
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        opacity: 0;
        transition: opacity var(--transition-base);
        pointer-events: none;
      }
    }

    .summary-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px !important;
    }

    .summary-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .icon-primary {
      background: linear-gradient(135deg, rgba(91,108,240,0.15), rgba(91,108,240,0.05));
      mat-icon { color: var(--primary); }
    }
    .icon-purple {
      background: linear-gradient(135deg, rgba(124,58,237,0.15), rgba(124,58,237,0.05));
      mat-icon { color: #7c3aed; }
    }
    .icon-pink {
      background: linear-gradient(135deg, rgba(219,39,119,0.15), rgba(219,39,119,0.05));
      mat-icon { color: #db2777; }
    }
    .icon-accent {
      background: linear-gradient(135deg, rgba(2,132,199,0.15), rgba(2,132,199,0.05));
      mat-icon { color: var(--accent-dark); }
    }

    .summary-info {
      display: flex;
      flex-direction: column;
    }

    .summary-value {
      font-size: 28px;
      font-weight: 700;
      font-family: var(--font-heading);
      color: var(--text-primary);
      line-height: 1;
    }

    .summary-label {
      font-size: 13px;
      font-family: var(--font-body);
      color: var(--text-secondary);
      margin-top: 4px;
    }

    .chart-card {
      margin-bottom: 24px;
      padding: 8px 16px 16px;
      border-radius: var(--radius-xl) !important;
      border: 1px solid rgba(255, 255, 255, 0.5) !important;
      box-shadow: var(--shadow-sm) !important;
      background: rgba(255, 255, 255, 0.7) !important;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      ::ng-deep .mat-mdc-card-header-text {
        .mat-mdc-card-title {
          font-family: var(--font-heading);
          font-weight: 700;
          color: var(--text-primary);
        }
        .mat-mdc-card-subtitle {
          font-family: var(--font-body);
          color: var(--text-secondary);
        }
      }
    }

    .bars-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-top: 16px;
    }

    .bar-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .bar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .bar-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
      font-family: var(--font-body);
      color: var(--text-primary);
    }

    .bar-values {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .bar-count {
      font-size: 18px;
      font-weight: 700;
      font-family: var(--font-heading);
      color: var(--text-primary);
    }

    .bar-percentage {
      font-size: 13px;
      font-family: var(--font-body);
      color: var(--text-secondary);
      min-width: 48px;
      text-align: right;
    }

    .bar-track {
      height: 12px;
      background: var(--border-light);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: var(--radius-full);
      transition: width 0.6s var(--transition-spring);
      min-width: 2px;
      position: relative;
      overflow: hidden;
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
        background-size: 200% 100%;
        animation: shimmerMove 2s ease-in-out infinite;
      }
    }

    .no-data {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 32px;
      color: var(--text-muted);
      font-family: var(--font-body);
    }

    .detail-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 20px;
    }

    .detail-card {
      padding: 8px 16px 16px;
      border-radius: var(--radius-xl) !important;
      border: 1px solid rgba(255, 255, 255, 0.5) !important;
      box-shadow: var(--shadow-sm) !important;
      background: rgba(255, 255, 255, 0.7) !important;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      ::ng-deep .mat-mdc-card-header-text {
        .mat-mdc-card-title {
          font-family: var(--font-heading);
          font-weight: 700;
          color: var(--text-primary);
        }
      }
    }

    .ratio-display {
      margin-top: 16px;
    }

    .ratio-bar {
      display: flex;
      height: 24px;
      border-radius: var(--radius-full);
      overflow: hidden;
      background: var(--border-light);
      margin-bottom: 12px;
    }

    .ratio-fill {
      height: 100%;
      transition: width 0.6s var(--transition-spring);
      &.users { background: var(--primary); }
      &.agents { background: #7c3aed; }
    }

    .ratio-legend {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-family: var(--font-body);
      color: var(--text-primary);
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      &.users { background: var(--primary); }
      &.agents { background: #7c3aed; }
    }

    .kpi-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
    }

    .kpi-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-radius: var(--radius-md);
      transition: background var(--transition-fast);
      &:hover {
        background: var(--bg-subtle);
      }
    }

    .kpi-label {
      font-size: 14px;
      font-family: var(--font-body);
      color: var(--text-secondary);
    }

    .kpi-value {
      font-size: 18px;
      font-weight: 700;
      font-family: var(--font-heading);
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    mat-divider {
      border-color: var(--border-light) !important;
    }
  `]
})
export class StatisticsComponent implements OnInit {
  private http = inject(HttpClient);
  private notification = inject(NotificationService);

  loading = false;
  stats: SystemStats | null = null;
  reservationBars: StatBar[] = [];

  ngOnInit(): void {
    this.loadStats();
  }

  getUserPercentage(): number {
    if (!this.stats) return 0;
    const total = this.stats.totalUsers + this.stats.totalAgents;
    if (total === 0) return 0;
    return (this.stats.totalUsers / total) * 100;
  }

  getAgentPercentage(): number {
    if (!this.stats) return 0;
    const total = this.stats.totalUsers + this.stats.totalAgents;
    if (total === 0) return 0;
    return (this.stats.totalAgents / total) * 100;
  }

  getConfirmationRate(): number {
    if (!this.stats || this.stats.totalReservations === 0) return 0;
    return (this.stats.confirmedReservations / this.stats.totalReservations) * 100;
  }

  getCompletionRate(): number {
    if (!this.stats || this.stats.totalReservations === 0) return 0;
    return (this.stats.completedReservations / this.stats.totalReservations) * 100;
  }

  getCancellationRate(): number {
    if (!this.stats || this.stats.totalReservations === 0) return 0;
    return (this.stats.canceledReservations / this.stats.totalReservations) * 100;
  }

  getAgentsPerAgency(): number {
    if (!this.stats || this.stats.totalAgencies === 0) return 0;
    return this.stats.totalAgents / this.stats.totalAgencies;
  }

  private loadStats(): void {
    this.loading = true;
    this.http.get<SystemStats>(`${environment.apiUrl}/api/admin/system-stats/general`).subscribe({
      next: (stats) => {
        this.stats = stats;
        this.buildReservationBars(stats);
        this.loading = false;
      },
      error: () => {
        this.notification.error('Erreur lors du chargement des statistiques');
        this.loading = false;
      }
    });
  }

  private buildReservationBars(stats: SystemStats): void {
    const total = stats.totalReservations;
    this.reservationBars = [
      {
        label: 'En attente',
        value: stats.pendingReservations,
        percentage: total > 0 ? (stats.pendingReservations / total) * 100 : 0,
        color: '#ffc107',
        icon: 'hourglass_empty'
      },
      {
        label: 'Confirmees',
        value: stats.confirmedReservations,
        percentage: total > 0 ? (stats.confirmedReservations / total) * 100 : 0,
        color: '#17a2b8',
        icon: 'check_circle'
      },
      {
        label: 'Terminees',
        value: stats.completedReservations,
        percentage: total > 0 ? (stats.completedReservations / total) * 100 : 0,
        color: '#28a745',
        icon: 'done_all'
      },
      {
        label: 'Annulees',
        value: stats.canceledReservations,
        percentage: total > 0 ? (stats.canceledReservations / total) * 100 : 0,
        color: '#dc3545',
        icon: 'cancel'
      }
    ];
  }
}
