import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from '../../shared/models';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};

export const roleGuard = (requiredRole: UserRole): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoggedIn) {
      router.navigate(['/auth/login']);
      return false;
    }

    const userRole = authService.userRole;
    if (userRole === requiredRole || userRole === 'ADMIN') {
      return true;
    }

    // Redirect to appropriate dashboard
    if (userRole === 'AGENT') {
      router.navigate(['/agent']);
    } else if (userRole === 'USER') {
      router.navigate(['/user']);
    } else {
      router.navigate(['/']);
    }
    return false;
  };
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn) {
    return true;
  }

  const role = authService.userRole;
  if (role === 'ADMIN') {
    router.navigate(['/admin']);
  } else if (role === 'AGENT') {
    router.navigate(['/agent']);
  } else {
    router.navigate(['/user']);
  }
  return false;
};
