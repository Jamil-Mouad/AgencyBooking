import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notification = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'Une erreur est survenue';

      if (error.error?.message) {
        message = error.error.message;
      } else {
        switch (error.status) {
          case 0:
            message = 'Impossible de contacter le serveur';
            break;
          case 400:
            message = 'Requête invalide';
            break;
          case 403:
            message = 'Accès interdit';
            break;
          case 404:
            message = 'Ressource introuvable';
            break;
          case 409:
            message = 'Conflit de données';
            break;
          case 500:
            message = 'Erreur interne du serveur';
            break;
        }
      }

      // Don't show notification for 401 (handled by JWT interceptor)
      if (error.status !== 401) {
        notification.error(message);
      }

      return throwError(() => error);
    })
  );
};
