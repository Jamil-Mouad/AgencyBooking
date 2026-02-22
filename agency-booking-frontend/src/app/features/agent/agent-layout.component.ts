import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { SidebarComponent, SidebarLink } from '../../shared/components/sidebar/sidebar.component';
import { SidebarService } from '../../core/services/sidebar.service';
import { routeAnimation } from '../../shared/animations';

@Component({
  selector: 'app-agent-layout',
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
      background: var(--bg-main);
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
export class AgentLayoutComponent {
  sidebar = inject(SidebarService);
  sidebarLinks: SidebarLink[] = [
    { label: 'Tableau de bord', icon: 'dashboard', route: 'dashboard' },
    { label: 'Reservations', icon: 'event_note', route: 'reservations' },
    { label: 'Calendrier', icon: 'calendar_today', route: 'calendar' },
    { label: 'Creneaux bloques', icon: 'block', route: 'blocked-slots' },
    { label: 'Profil', icon: 'person', route: 'profile' }
  ];
}
