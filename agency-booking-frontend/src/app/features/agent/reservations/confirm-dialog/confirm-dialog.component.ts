import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { Reservation, ReservationConfirmationRequest } from '../../../../shared/models';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';

interface ConfirmDialogData {
  reservation: Reservation;
}

@Component({
  selector: 'app-reservation-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    DateFrPipe,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <div class="dialog-wrapper">
      <h2 mat-dialog-title class="dialog-title">
        <div class="title-icon">
          <mat-icon>check_circle</mat-icon>
        </div>
        Confirmer la réservation
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
            <mat-icon class="summary-icon">calendar_today</mat-icon>
            <span><strong>Date souhaitée:</strong> {{ data.reservation.preferredDate | dateFr:'long' }}</span>
          </div>
        </div>

        <form [formGroup]="form" class="confirm-form">
          <mat-form-field appearance="outline">
            <mat-label>Date de début</mat-label>
            <input matInput [matDatepicker]="startPicker" [min]="today" formControlName="startDate">
            <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
            @if (form.get('startDate')?.hasError('required')) {
              <mat-error>La date de début est requise.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Heure de début</mat-label>
            <input matInput type="time" formControlName="startTime">
            @if (form.get('startTime')?.hasError('required')) {
              <mat-error>L'heure de début est requise.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Date de fin</mat-label>
            <input matInput [matDatepicker]="endPicker" [min]="today" formControlName="endDate">
            <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
            @if (form.get('endDate')?.hasError('required')) {
              <mat-error>La date de fin est requise.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Heure de fin</mat-label>
            <input matInput type="time" formControlName="endTime">
            @if (form.get('endTime')?.hasError('required')) {
              <mat-error>L'heure de fin est requise.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Message (optionnel)</mat-label>
            <textarea matInput formControlName="message" rows="3"
                      placeholder="Message pour le client..."></textarea>
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button class="cancel-btn" (click)="dialogRef.close()">Annuler</button>
        <button mat-flat-button class="confirm-btn" [disabled]="form.invalid" (click)="onConfirm()">
          <mat-icon>check</mat-icon>
          Confirmer
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
      background: linear-gradient(135deg, var(--primary, #5b6cf0), var(--primary-dark, #4338ca));
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        color: #fff;
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

    .confirm-form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 16px;

      .full-width {
        grid-column: 1 / -1;
      }
    }

    mat-dialog-content {
      min-width: 400px;
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

    .confirm-btn {
      border-radius: var(--radius-md, 12px) !important;
      background: linear-gradient(135deg, var(--primary, #5b6cf0), var(--primary-dark, #4338ca)) !important;
      color: #fff !important;
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      font-weight: 600;
      padding: 0 20px;
      box-shadow: var(--shadow-sm, 0 2px 8px rgba(91, 108, 240, 0.18));
      transition: box-shadow var(--transition-fast, 0.15s ease), transform var(--transition-fast, 0.15s ease);

      &:hover:not([disabled]) {
        box-shadow: var(--shadow-md, 0 4px 16px rgba(91, 108, 240, 0.3));
        transform: translateY(-1px);
      }

      &[disabled] {
        opacity: 0.55;
        background: var(--text-muted, #9ca3bf) !important;
        box-shadow: none;
      }
    }

    ::ng-deep .mat-mdc-dialog-container .mdc-dialog__surface {
      border-radius: var(--radius-xl, 20px) !important;
    }
  `],
})
export class ReservationConfirmDialogComponent {
  dialogRef = inject(MatDialogRef<ReservationConfirmDialogComponent>);
  data: ConfirmDialogData = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  today = new Date();

  form = this.fb.group({
    startDate: [this.getDefaultDate(), Validators.required],
    startTime: [this.getDefaultStartTime(), Validators.required],
    endDate: [this.getDefaultDate(), Validators.required],
    endTime: [this.getDefaultEndTime(), Validators.required],
    message: [''],
  });

  onConfirm(): void {
    if (this.form.invalid) return;

    const { startDate, startTime, endDate, endTime, message } = this.form.value;

    const startDateTime = this.combineDateAndTime(startDate as Date, startTime as string);
    const endDateTime = this.combineDateAndTime(endDate as Date, endTime as string);

    const request: ReservationConfirmationRequest = {
      startDateTime,
      endDateTime,
    };

    if (message) {
      request.message = message;
    }

    this.dialogRef.close(request);
  }

  private getDefaultDate(): Date {
    const preferredDate = this.data.reservation.preferredDate;
    if (preferredDate) {
      // Extract just the date part (YYYY-MM-DD) in case the value contains a time component
      const dateOnly = preferredDate.substring(0, 10);
      const parsed = new Date(dateOnly + 'T00:00:00');
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  }

  private getDefaultStartTime(): string {
    const startDateTime = this.data.reservation.startDateTime;
    if (startDateTime) {
      const d = new Date(startDateTime);
      return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    }
    return '09:00';
  }

  private getDefaultEndTime(): string {
    const endDateTime = this.data.reservation.endDateTime;
    if (endDateTime) {
      const d = new Date(endDateTime);
      return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    }
    return '10:00';
  }

  private combineDateAndTime(date: Date, time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined.toISOString();
  }
}
