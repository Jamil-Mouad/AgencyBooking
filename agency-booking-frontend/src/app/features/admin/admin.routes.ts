import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      {
        path: 'overview',
        loadComponent: () => import('./overview/overview.component').then(m => m.OverviewComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./users/users.component').then(m => m.UsersComponent)
      },
      {
        path: 'agents',
        loadComponent: () => import('./agents/agents.component').then(m => m.AgentsComponent)
      },
      {
        path: 'agencies',
        loadComponent: () => import('./agencies/agencies.component').then(m => m.AdminAgenciesComponent)
      },
      {
        path: 'services',
        loadComponent: () => import('./services/services.component').then(m => m.ServicesComponent)
      },
      {
        path: 'statistics',
        loadComponent: () => import('./statistics/statistics.component').then(m => m.StatisticsComponent)
      },
      {
        path: 'contacts',
        loadComponent: () => import('./contacts/contacts.component').then(m => m.ContactsComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./profile/profile.component').then(m => m.AdminProfileComponent)
      }
    ]
  }
];
