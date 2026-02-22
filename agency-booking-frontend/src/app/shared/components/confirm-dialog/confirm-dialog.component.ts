import { Component, Inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  color?: 'primary' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title class="dialog-title">{{ data.title }}</h2>
      <mat-dialog-content class="dialog-content">{{ data.message }}</mat-dialog-content>
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button (click)="dialogRef.close(false)" class="cancel-btn">
          {{ data.cancelText || 'Annuler' }}
        </button>
        <button mat-flat-button [color]="data.color || 'primary'" (click)="dialogRef.close(true)" class="confirm-btn">
          {{ data.confirmText || 'Confirmer' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 24px;
    }

    .dialog-title {
      font-family: var(--font-heading) !important;
      font-size: 1.25rem !important;
      font-weight: 700 !important;
      color: var(--text-primary) !important;
      margin: 0 0 8px 0 !important;
      padding: 0 !important;
    }

    .dialog-content {
      color: var(--text-secondary) !important;
      font-family: var(--font-body) !important;
      font-size: 0.95rem !important;
      line-height: 1.6 !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    .dialog-actions {
      padding: 20px 0 0 0 !important;
      margin: 0 !important;
      gap: 8px;
    }

    .cancel-btn {
      color: var(--text-secondary) !important;
      border-radius: var(--radius-md) !important;
    }

    .confirm-btn {
      border-radius: var(--radius-md) !important;
      font-weight: 600 !important;
      padding: 0 24px !important;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}
}
