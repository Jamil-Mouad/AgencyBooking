import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { Reservation, ReservationCancellationRequest } from '../../../../shared/models';

interface CancelDialogData {
  reservation: Reservation;
}

@Component({
  selector: 'app-reservation-cancel-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  template: `
    <div class="dialog-wrapper">
      <h2 mat-dialog-title class="dialog-title">
        <div class="title-icon">
          <mat-icon>warning_amber</mat-icon>
        </div>
        Annuler la réservation
      </h2>
      <mat-dialog-content>
        <div class="warning-text">
          <mat-icon class="warning-icon">info_outline</mat-icon>
          <p>
            Vous allez annuler la réservation de
            <strong>{{ data.reservation.user.username }}</strong>
            pour le service <strong>{{ data.reservation.service }}</strong>.
          </p>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Raison de l'annulation (optionnel)</mat-label>
          <textarea matInput [(ngModel)]="reason" rows="3"
                    placeholder="Indiquez la raison de l'annulation..."></textarea>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button class="back-btn" (click)="dialogRef.close()">Retour</button>
        <button mat-flat-button class="cancel-action-btn" (click)="onCancel()">
          <mat-icon>close</mat-icon>
          Annuler la réservation
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-wrapper {
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
    }

    .dialog-title {
      font-family: var(--font-heading, 'DM Sans', sans-serif);
      color: var(--text-primary, #1e1b3a);
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }

    .title-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md, 12px);
      background: rgba(245, 158, 66, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        color: var(--amber, #f59e42);
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    .warning-text {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: rgba(245, 158, 66, 0.08);
      padding: 14px 18px;
      border-radius: var(--radius-md, 12px);
      margin-bottom: 20px;
      border: 1px solid rgba(245, 158, 66, 0.2);

      p {
        margin: 0;
        font-size: 0.92rem;
        color: var(--text-primary, #1e1b3a);
        line-height: 1.5;
      }

      strong {
        color: var(--amber, #f59e42);
        font-weight: 700;
      }
    }

    .warning-icon {
      color: var(--amber, #f59e42);
      font-size: 22px;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .full-width {
      width: 100%;
    }

    mat-dialog-content {
      min-width: 380px;
    }

    .back-btn {
      color: var(--text-secondary, #6b7194);
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      font-weight: 500;
      border-radius: var(--radius-sm, 8px);

      &:hover {
        background: var(--bg-subtle, #f5f3ff);
      }
    }

    .cancel-action-btn {
      border-radius: var(--radius-md, 12px) !important;
      background: linear-gradient(135deg, var(--warn, #f43f5e), #dc2646) !important;
      color: #fff !important;
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      font-weight: 600;
      padding: 0 20px;
      box-shadow: 0 2px 8px rgba(244, 63, 94, 0.2);
      transition: box-shadow var(--transition-fast, 0.15s ease), transform var(--transition-fast, 0.15s ease);

      &:hover {
        box-shadow: 0 4px 16px rgba(244, 63, 94, 0.3);
        transform: translateY(-1px);
      }
    }

    ::ng-deep .mat-mdc-dialog-container .mdc-dialog__surface {
      border-radius: var(--radius-xl, 20px) !important;
    }
  `],
})
export class ReservationCancelDialogComponent {
  dialogRef = inject(MatDialogRef<ReservationCancelDialogComponent>);
  data: CancelDialogData = inject(MAT_DIALOG_DATA);

  reason = '';

  onCancel(): void {
    const request: ReservationCancellationRequest = {};
    if (this.reason.trim()) {
      request.reason = this.reason.trim();
    }
    this.dialogRef.close(request);
  }
}
