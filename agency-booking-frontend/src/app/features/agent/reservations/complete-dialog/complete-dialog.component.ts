import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { Reservation, ReservationCompletionRequest } from '../../../../shared/models';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';

interface CompleteDialogData {
  reservation: Reservation;
}

@Component({
  selector: 'app-reservation-complete-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    DateFrPipe,
  ],
  template: `
    <div class="dialog-wrapper">
      <h2 mat-dialog-title class="dialog-title">
        <div class="title-icon">
          <mat-icon>task_alt</mat-icon>
        </div>
        Marquer comme terminée
      </h2>
      <mat-dialog-content>
        <div class="reservation-summary">
          <div class="summary-row">
            <mat-icon class="summary-icon">person</mat-icon>
            <span><strong>Client:</strong> {{ data.reservation.user.username }}</span>
          </div>
          <div class="summary-row">
            <mat-icon class="summary-icon">miscellaneous_services</mat-icon>
            <span><strong>Service:</strong> {{ data.reservation.service }}</span>
          </div>
          <div class="summary-row">
            <mat-icon class="summary-icon">schedule</mat-icon>
            <span>
              <strong>Créneau:</strong>
              {{ data.reservation.startDateTime | dateFr:'datetime' }}
              - {{ data.reservation.endDateTime | dateFr:'time' }}
            </span>
          </div>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Notes (optionnel)</mat-label>
          <textarea matInput [(ngModel)]="notes" rows="3"
                    placeholder="Ajoutez des notes sur cette réservation..."></textarea>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button class="cancel-btn" (click)="dialogRef.close()">Annuler</button>
        <button mat-flat-button class="complete-btn" (click)="onComplete()">
          <mat-icon>task_alt</mat-icon>
          Terminer
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
      background: rgba(16, 185, 129, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        color: var(--success, #10b981);
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    .reservation-summary {
      background: var(--bg-subtle, #f5f3ff);
      padding: 16px 18px;
      border-radius: var(--radius-md, 12px);
      margin-bottom: 20px;
      border: 1px solid var(--border-light, #f0ebf8);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .summary-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.9rem;
      color: var(--text-primary, #1e1b3a);
    }

    .summary-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--text-muted, #9ca3bf);
    }

    .full-width {
      width: 100%;
    }

    mat-dialog-content {
      min-width: 380px;
    }

    .cancel-btn {
      color: var(--text-secondary, #6b7194);
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      font-weight: 500;
      border-radius: var(--radius-sm, 8px);

      &:hover {
        background: var(--bg-subtle, #f5f3ff);
      }
    }

    .complete-btn {
      border-radius: var(--radius-md, 12px) !important;
      background: linear-gradient(135deg, var(--primary, #5b6cf0), var(--primary-dark, #4338ca)) !important;
      color: #fff !important;
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      font-weight: 600;
      padding: 0 20px;
      box-shadow: var(--shadow-sm, 0 2px 8px rgba(91, 108, 240, 0.18));
      transition: box-shadow var(--transition-fast, 0.15s ease), transform var(--transition-fast, 0.15s ease);

      &:hover {
        box-shadow: var(--shadow-md, 0 4px 16px rgba(91, 108, 240, 0.3));
        transform: translateY(-1px);
      }
    }

    ::ng-deep .mat-mdc-dialog-container .mdc-dialog__surface {
      border-radius: var(--radius-xl, 20px) !important;
    }
  `],
})
export class ReservationCompleteDialogComponent {
  dialogRef = inject(MatDialogRef<ReservationCompleteDialogComponent>);
  data: CompleteDialogData = inject(MAT_DIALOG_DATA);

  notes = '';

  onComplete(): void {
    const request: ReservationCompletionRequest = {};
    if (this.notes.trim()) {
      request.notes = this.notes.trim();
    }
    this.dialogRef.close(request);
  }
}
