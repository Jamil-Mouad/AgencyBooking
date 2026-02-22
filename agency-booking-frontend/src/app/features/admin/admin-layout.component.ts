import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { SidebarComponent, SidebarLink } from '../../shared/components/sidebar/sidebar.component';
import { SidebarService } from '../../core/services/sidebar.service';
import { routeAnimation } from '../../shared/animations';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent],
  animations: [routeAnimation],
  template: `
    <app-header></app-header>
    <div class="dashboard-layout">
      <app-sidebar [links]="sidebarLinks" [class.sidebar-hidden]="!sidebar.isOpen()"></app-sidebar>
      <main class="dashboard-content" [@routeAnimation]="outlet.activatedRouteData">
        <router-outlet #outlet="outlet"></router-outlet>
      </main>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background:
        radial-gradient(ellipse at 10% 20%, rgba(91, 108, 240, 0.03) 0%, transparent 50%),
        radial-gradient(ellipse at 90% 80%, rgba(56, 189, 248, 0.02) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 50%, rgba(124, 58, 237, 0.02) 0%, transparent 60%),
        var(--bg-main);
    }
    .dashboard-layout {
      margin-top: 64px;
      min-height: calc(100vh - 64px);
    }
    app-sidebar {
      transition: width 300ms ease, opacity 200ms ease;
      overflow: hidden;
      width: 240px;
    }
    app-sidebar.sidebar-hidden {
      width: 0;
      opacity: 0;
    }
    .dashboard-content {
      padding: 32px 40px;
      max-width: 1400px;
    }
    @media (max-width: 1024px) {
      .dashboard-content { padding: 24px; }
    }
    @media (max-width: 768px) {
      .dashboard-layout { margin-top: 64px; }
      .dashboard-content { padding: 16px; }
    }
  `
})
export class AdminLayoutComponent {
  sidebar = inject(SidebarService);
  sidebarLinks: SidebarLink[] = [
    { label: 'Vue d\'ensemble', icon: 'dashboard', route: 'overview' },
    { label: 'Utilisateurs', icon: 'people', route: 'users' },
    { label: 'Agents', icon: 'support_agent', route: 'agents' },
    { label: 'Agences', icon: 'store', route: 'agencies' },
    { label: 'Services', icon: 'miscellaneous_services', route: 'services' },
    { label: 'Statistiques', icon: 'bar_chart', route: 'statistics' },
    { label: 'Messages', icon: 'mail', route: 'contacts' },
    { label: 'Profil', icon: 'person', route: 'profile' }
  ];
}
