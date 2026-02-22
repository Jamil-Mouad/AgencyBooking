import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { SystemStats } from '../../../shared/models';
import { fadeIn, staggerList } from '../../../shared/animations';

interface QuickLink {
  label: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatCardModule, MatIconModule, MatButtonModule,
    LoadingSpinnerComponent
  ],
  animations: [fadeIn, staggerList],
  template: `
    <div class="overview-container">
      <div class="welcome-section">
        <div class="welcome-dot-grid"></div>
        <div class="welcome-float welcome-float-1"></div>
        <div class="welcome-float welcome-float-2"></div>
        <div class="welcome-float welcome-float-3"></div>
        <div class="welcome-text">
          <h1>Bienvenue, {{ auth.currentUser?.username }}</h1>
          <p>Voici un apercu de votre systeme de reservation</p>
        </div>
        <div class="welcome-decoration">
          <mat-icon>dashboard</mat-icon>
        </div>
      </div>

      @if (loading) {
        <app-loading-spinner message="Chargement des statistiques..."></app-loading-spinner>
      } @else if (stats) {
        <div class="stats-grid" @staggerList>
          <div class="stat-card users" @fadeIn>
            <div class="stat-icon">
              <mat-icon>people</mat-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.totalUsers }}</span>
              <span class="stat-label">Utilisateurs</span>
            </div>
          </div>

          <div class="stat-card agents" @fadeIn>
            <div class="stat-icon">
              <mat-icon>support_agent</mat-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.totalAgents }}</span>
              <span class="stat-label">Agents</span>
            </div>
          </div>

          <div class="stat-card agencies" @fadeIn>
            <div class="stat-icon">
              <mat-icon>store</mat-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.totalAgencies }}</span>
              <span class="stat-label">Agences</span>
            </div>
          </div>

          <div class="stat-card reservations" @fadeIn>
            <div class="stat-icon">
              <mat-icon>event_note</mat-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.totalReservations }}</span>
              <span class="stat-label">Reservations</span>
            </div>
          </div>
        </div>

        <div class="reservation-breakdown">
          <h2>Reservations par statut</h2>
          <div class="breakdown-grid">
            <div class="breakdown-card pending">
              <div class="breakdown-icon">
                <mat-icon>hourglass_empty</mat-icon>
              </div>
              <span class="breakdown-value">{{ stats.pendingReservations }}</span>
              <span class="breakdown-label">En attente</span>
            </div>

            <div class="breakdown-card confirmed">
              <div class="breakdown-icon">
                <mat-icon>check_circle</mat-icon>
              </div>
              <span class="breakdown-value">{{ stats.confirmedReservations }}</span>
              <span class="breakdown-label">Confirmees</span>
            </div>

            <div class="breakdown-card completed">
              <div class="breakdown-icon">
                <mat-icon>done_all</mat-icon>
              </div>
              <span class="breakdown-value">{{ stats.completedReservations }}</span>
              <span class="breakdown-label">Terminees</span>
            </div>

            <div class="breakdown-card canceled">
              <div class="breakdown-icon">
                <mat-icon>cancel</mat-icon>
              </div>
              <span class="breakdown-value">{{ stats.canceledReservations }}</span>
              <span class="breakdown-label">Annulees</span>
            </div>
          </div>
        </div>
      }

      <div class="quick-links-section">
        <h2>Acces rapide</h2>
        <div class="quick-links-grid">
          @for (link of quickLinks; track link.route) {
            <a [routerLink]="link.route" class="quick-link-card">
              <div class="link-icon-wrap">
                <mat-icon>{{ link.icon }}</mat-icon>
              </div>
              <span>{{ link.label }}</span>
              <mat-icon class="link-arrow">arrow_forward</mat-icon>
            </a>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overview-container {
      padding: 28px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .welcome-section {
      display: flex;
      align-items: center;
      justify-content: space-between;
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
    }

    .welcome-dot-grid {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
      background-size: 24px 24px;
      pointer-events: none;
    }

    .welcome-float {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      animation: adminFloat 12s ease-in-out infinite;
    }
    .welcome-float-1 {
      width: 80px;
      height: 80px;
      top: -20px;
      right: 10%;
      background: rgba(255, 255, 255, 0.06);
    }
    .welcome-float-2 {
      width: 50px;
      height: 50px;
      bottom: -10px;
      left: 25%;
      background: rgba(255, 255, 255, 0.04);
      animation-delay: -4s;
    }
    .welcome-float-3 {
      width: 35px;
      height: 35px;
      top: 20%;
      right: 30%;
      background: rgba(255, 255, 255, 0.05);
      animation-delay: -8s;
      border-radius: var(--radius-md);
    }

    .welcome-text {
      position: relative;
      z-index: 1;
      h1 {
        margin: 0 0 6px;
        font-size: 26px;
        font-weight: 700;
        font-family: var(--font-heading);
        color: white;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      p {
        margin: 0;
        color: rgba(255,255,255,0.8);
        font-size: 15px;
        font-family: var(--font-body);
      }
    }

    .welcome-decoration {
      position: relative;
      z-index: 1;
      width: 56px;
      height: 56px;
      border-radius: var(--radius-lg);
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: white;
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      margin-bottom: 36px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px;
      border-radius: var(--radius-xl);
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: var(--shadow-sm);
      transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
      position: relative;
      &:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow-lg);
        border-color: transparent;
        &::before {
          opacity: 1;
        }
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

    .stat-card.users .stat-icon {
      background: linear-gradient(135deg, rgba(91, 108, 240, 0.15), rgba(91, 108, 240, 0.05));
      mat-icon { color: var(--primary); }
    }
    .stat-card.agents .stat-icon {
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(124, 58, 237, 0.05));
      mat-icon { color: #7c3aed; }
    }
    .stat-card.agencies .stat-icon {
      background: linear-gradient(135deg, rgba(219, 39, 119, 0.15), rgba(219, 39, 119, 0.05));
      mat-icon { color: #db2777; }
    }
    .stat-card.reservations .stat-icon {
      background: linear-gradient(135deg, rgba(2, 132, 199, 0.15), rgba(2, 132, 199, 0.05));
      mat-icon { color: var(--accent-dark); }
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      font-family: var(--font-heading);
      color: var(--text-primary);
      line-height: 1;
    }

    .stat-label {
      font-size: 14px;
      font-family: var(--font-body);
      color: var(--text-secondary);
      margin-top: 4px;
    }

    .reservation-breakdown {
      margin-bottom: 36px;
      h2 {
        font-size: 20px;
        font-weight: 600;
        font-family: var(--font-heading);
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0 0 16px;
      }
    }

    .breakdown-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .breakdown-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 24px 20px;
      border-radius: var(--radius-xl);
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: var(--shadow-sm);
      text-align: center;
      transition: transform var(--transition-base), box-shadow var(--transition-base);
      &:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow-lg);
      }
    }

    .breakdown-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    .breakdown-card.pending .breakdown-icon {
      background: linear-gradient(135deg, rgba(245, 158, 66, 0.2), rgba(245, 158, 66, 0.05));
      mat-icon { color: var(--amber-dark); }
    }
    .breakdown-card.confirmed .breakdown-icon {
      background: linear-gradient(135deg, rgba(2, 132, 199, 0.2), rgba(2, 132, 199, 0.05));
      mat-icon { color: var(--accent-dark); }
    }
    .breakdown-card.completed .breakdown-icon {
      background: linear-gradient(135deg, rgba(5, 150, 105, 0.2), rgba(5, 150, 105, 0.05));
      mat-icon { color: var(--success-dark); }
    }
    .breakdown-card.canceled .breakdown-icon {
      background: linear-gradient(135deg, rgba(225, 29, 72, 0.2), rgba(225, 29, 72, 0.05));
      mat-icon { color: var(--warn-dark); }
    }

    .breakdown-value {
      font-size: 28px;
      font-weight: 700;
      font-family: var(--font-heading);
      color: var(--text-primary);
    }

    .breakdown-label {
      font-size: 13px;
      font-family: var(--font-body);
      color: var(--text-secondary);
    }

    .quick-links-section {
      h2 {
        font-size: 20px;
        font-weight: 600;
        font-family: var(--font-heading);
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0 0 16px;
      }
    }

    .quick-links-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
    }

    .quick-link-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 20px;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: var(--radius-lg);
      border: 1px solid rgba(255, 255, 255, 0.5);
      text-decoration: none;
      color: var(--text-primary);
      font-weight: 600;
      font-family: var(--font-body);
      font-size: 14px;
      box-shadow: var(--shadow-xs);
      transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base), background var(--transition-base);
      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        border-color: rgba(91, 108, 240, 0.3);
        background: rgba(255, 255, 255, 0.85);
        .link-arrow {
          transform: translateX(3px);
          color: var(--primary);
        }
      }
    }

    .link-icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, rgba(91, 108, 240, 0.15), rgba(91, 108, 240, 0.05));
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--primary);
      }
    }

    .link-arrow {
      margin-left: auto;
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--text-muted);
      transition: transform var(--transition-fast), color var(--transition-fast);
    }
  `]
})
export class OverviewComponent implements OnInit {
  private http = inject(HttpClient);
  private notification = inject(NotificationService);
  auth = inject(AuthService);

  loading = false;
  stats: SystemStats | null = null;

  quickLinks: QuickLink[] = [
    { label: 'Gerer les utilisateurs', icon: 'people', route: '../users', color: '#4361ee' },
    { label: 'Gerer les agents', icon: 'support_agent', route: '../agents', color: '#7209b7' },
    { label: 'Gerer les agences', icon: 'store', route: '../agencies', color: '#f72585' },
    { label: 'Gerer les services', icon: 'miscellaneous_services', route: '../services', color: '#4cc9f0' },
    { label: 'Voir les statistiques', icon: 'bar_chart', route: '../statistics', color: '#4361ee' },
    { label: 'Messages de contact', icon: 'mail', route: '../contacts', color: '#7209b7' }
  ];

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.loading = true;
    this.http.get<SystemStats>(`${environment.apiUrl}/api/admin/system-stats/general`).subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loading = false;
      },
      error: () => {
        this.notification.error('Erreur lors du chargement des statistiques');
        this.loading = false;
      }
    });
  }
}
