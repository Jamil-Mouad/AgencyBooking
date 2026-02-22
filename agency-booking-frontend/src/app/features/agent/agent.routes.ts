import { Routes } from '@angular/router';

export const AGENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./agent-layout.component').then(m => m.AgentLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.AgentDashboardComponent)
      },
      {
        path: 'reservations',
        loadComponent: () => import('./reservations/reservations.component').then(m => m.AgentReservationsComponent)
      },
      {
        path: 'calendar',
        loadComponent: () => import('./calendar/calendar.component').then(m => m.CalendarComponent)
      },
      {
        path: 'blocked-slots',
        loadComponent: () => import('./blocked-slots/blocked-slots.component').then(m => m.BlockedSlotsComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./profile/profile.component').then(m => m.AgentProfileComponent)
      }
    ]
  }
];
