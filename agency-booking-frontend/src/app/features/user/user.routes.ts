import { Routes } from '@angular/router';

export const USER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./user-layout.component').then(m => m.UserLayoutComponent),
    children: [
      { path: '', redirectTo: 'agencies', pathMatch: 'full' },
      {
        path: 'agencies',
        loadComponent: () => import('./agencies/agencies.component').then(m => m.AgenciesComponent)
      },
      {
        path: 'agencies/:id',
        loadComponent: () => import('./new-reservation/new-reservation.component').then(m => m.NewReservationComponent)
      },
      {
        path: 'reservations',
        loadComponent: () => import('./reservations/reservations.component').then(m => m.ReservationsComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./profile/profile.component').then(m => m.UserProfileComponent)
      },
      {
        path: 'support',
        loadComponent: () => import('./support/support.component').then(m => m.SupportComponent)
      }
    ]
  }
];
