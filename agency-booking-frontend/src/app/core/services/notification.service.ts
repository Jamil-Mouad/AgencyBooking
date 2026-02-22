import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CustomSnackBarComponent, SnackBarType } from '../../shared/components/custom-snackbar/custom-snackbar.component';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.show(message, 'success', 4000);
  }

  error(message: string): void {
    this.show(message, 'error', 6000);
  }

  info(message: string): void {
    this.show(message, 'info', 4000);
  }

  warn(message: string): void {
    this.show(message, 'warn', 5000);
  }

  private show(message: string, type: SnackBarType, duration: number): void {
    this.snackBar.openFromComponent(CustomSnackBarComponent, {
      data: { message, type, duration },
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['custom-snackbar-panel']
    });
  }
}
