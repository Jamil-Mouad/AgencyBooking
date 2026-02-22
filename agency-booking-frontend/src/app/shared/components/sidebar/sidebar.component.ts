import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

export interface SidebarLink {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatListModule, MatIconModule],
  template: `
    <nav class="sidebar">
      <div class="sidebar-pattern"></div>
      <mat-nav-list>
        @for (link of links; track link.route) {
          <a mat-list-item [routerLink]="link.route" routerLinkActive="active"
             [routerLinkActiveOptions]="{ exact: link.route === '.' }">
            <mat-icon matListItemIcon>{{ link.icon }}</mat-icon>
            <span matListItemTitle>{{ link.label }}</span>
          </a>
        }
      </mat-nav-list>
    </nav>
  `,
  styles: [`
    .sidebar {
      width: 240px;
      height: 100%;
      border-right: 1px solid rgba(232, 224, 240, 0.5);
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 4px 0 24px rgba(91, 108, 240, 0.04);
      padding-top: 12px;
      position: relative;
    }

    .sidebar-pattern {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(circle, rgba(91, 108, 240, 0.04) 1px, transparent 1px);
      background-size: 20px 20px;
      pointer-events: none;
      z-index: 0;
    }

    mat-nav-list {
      position: relative;
      z-index: 1;
    }

    a[mat-list-item] {
      margin: 2px 8px;
      border-radius: var(--radius-md) !important;
      transition: background-color var(--transition-base), color var(--transition-base), transform var(--transition-fast);
      color: var(--text-secondary);
      font-family: var(--font-body);
      font-weight: 500;
      height: 44px !important;

      mat-icon {
        color: var(--text-secondary);
        transition: color var(--transition-base);
      }

      &:hover:not(.active) {
        background: rgba(91, 108, 240, 0.05) !important;
        transform: translateX(2px);
      }
    }

    .active {
      background: linear-gradient(135deg, rgba(91, 108, 240, 0.10) 0%, rgba(67, 56, 202, 0.08) 100%) !important;
      color: var(--primary) !important;
      position: relative;
      font-weight: 600;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 8px;
        bottom: 8px;
        width: 3px;
        background: linear-gradient(180deg, var(--primary) 0%, var(--accent) 100%);
        border-radius: 0 var(--radius-full) var(--radius-full) 0;
      }

      &::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: var(--radius-md);
        box-shadow: 0 0 12px rgba(91, 108, 240, 0.08);
        pointer-events: none;
      }

      mat-icon {
        color: var(--primary) !important;
      }
    }
  `]
})
export class SidebarComponent {
  @Input() links: SidebarLink[] = [];
}
