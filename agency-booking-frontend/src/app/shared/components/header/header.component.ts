import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../core/auth/auth.service';
import { SidebarService } from '../../../core/services/sidebar.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule],
  template: `
    <mat-toolbar class="header">
      @if (auth.isLoggedIn) {
        <button mat-icon-button class="hamburger-btn" (click)="sidebar.toggle()">
          <mat-icon>menu</mat-icon>
        </button>
      }
      <a routerLink="/" class="logo">
        <mat-icon class="logo-icon">travel_explore</mat-icon>
        <span class="gradient-text logo-text">AgencyBooking</span>
      </a>

      <span class="spacer"></span>

      @if (!auth.isLoggedIn) {
        <a mat-button routerLink="/auth/login" class="login-btn">Connexion</a>
        <a mat-flat-button routerLink="/auth/register" class="register-btn">Inscription</a>
      } @else {
        <button mat-icon-button [matMenuTriggerFor]="userMenu" class="avatar-btn">
          <span class="user-avatar">{{ (auth.currentUser?.username || 'U').charAt(0).toUpperCase() }}</span>
        </button>
        <mat-menu #userMenu="matMenu" class="user-menu-panel">
          <div class="menu-header">
            <div class="menu-avatar">{{ (auth.currentUser?.username || 'U').charAt(0).toUpperCase() }}</div>
            <div class="menu-user-info">
              <strong>{{ auth.currentUser?.username }}</strong>
              <small>{{ auth.currentUser?.email }}</small>
            </div>
          </div>
          <mat-divider></mat-divider>
          @if (auth.userRole === 'USER') {
            <button mat-menu-item routerLink="/user">
              <mat-icon>dashboard</mat-icon> Tableau de bord
            </button>
          }
          @if (auth.userRole === 'AGENT') {
            <button mat-menu-item routerLink="/agent">
              <mat-icon>dashboard</mat-icon> Tableau de bord
            </button>
          }
          @if (auth.userRole === 'ADMIN') {
            <button mat-menu-item routerLink="/admin">
              <mat-icon>admin_panel_settings</mat-icon> Administration
            </button>
          }
          <button mat-menu-item (click)="auth.logout()">
            <mat-icon>logout</mat-icon> Déconnexion
          </button>
        </mat-menu>
      }
    </mat-toolbar>
  `,
  styles: [`
    .header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: var(--shadow-sm);
      border-bottom: 1px solid var(--border-light);
      color: var(--text-primary);
      height: 64px;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: inherit;
    }

    .logo-icon {
      color: var(--primary);
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .logo-text {
      font-family: var(--font-heading);
      font-size: 1.25rem;
      font-weight: 700;
    }

    .spacer { flex: 1; }

    .login-btn {
      color: var(--primary) !important;
      font-weight: 600 !important;
      border-radius: var(--radius-md) !important;
    }

    .register-btn {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%) !important;
      color: white !important;
      border-radius: var(--radius-full) !important;
      padding: 0 24px !important;
      font-weight: 600 !important;
      box-shadow: 0 2px 8px rgba(91, 108, 240, 0.25) !important;
      transition: transform var(--transition-fast), box-shadow var(--transition-fast) !important;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(91, 108, 240, 0.35) !important;
      }
    }

    .avatar-btn {
      width: 40px !important;
      height: 40px !important;
      padding: 0 !important;
    }

    .user-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      font-family: var(--font-heading);
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0;
    }

    .menu-header {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--bg-subtle);
      border-radius: var(--radius-md) var(--radius-md) 0 0;
    }

    .menu-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-heading);
      font-weight: 700;
      font-size: 16px;
      flex-shrink: 0;
    }

    .menu-user-info {
      display: flex;
      flex-direction: column;
      gap: 2px;

      strong {
        font-family: var(--font-heading);
        font-size: 14px;
        color: var(--text-primary);
      }

      small {
        color: var(--text-secondary);
        font-size: 12px;
      }
    }

    .hamburger-btn {
      color: var(--text-secondary);
      transition: color var(--transition-fast), background var(--transition-fast);
      &:hover {
        color: var(--primary);
        background: rgba(91, 108, 240, 0.08);
      }
    }

    mat-divider { margin: 4px 0; }
  `]
})
export class HeaderComponent {
  auth = inject(AuthService);
  sidebar = inject(SidebarService);
}
