import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import { AgentInfoDTO, BlockedTimeSlot, TimeSlotManagementDTO, ApiResponse, AvailabilityDTO } from '../../../shared/models';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { DateFrPipe } from '../../../shared/pipes/date-fr.pipe';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-blocked-slots',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatTooltipModule,
    LoadingSpinnerComponent,
    DateFrPipe,
  ],
  template: `
    @if (loading) {
      <app-loading-spinner message="Chargement des créneaux bloqués..."></app-loading-spinner>
    } @else {
      <div class="blocked-slots-container">
        <div class="page-header">
          <div class="header-icon">
            <mat-icon>block</mat-icon>
          </div>
          <div>
            <h1>Gestion des créneaux bloqués</h1>
            <p class="page-subtitle">Bloquez ou débloquez des créneaux horaires pour votre agence</p>
          </div>
        </div>

        <mat-card class="form-card">
          <mat-card-header>
            <mat-icon class="card-header-icon">add_circle_outline</mat-icon>
            <mat-card-title>Bloquer un nouveau créneau</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="blockForm" (ngSubmit)="onBlockSlot()" class="block-form">
              <mat-form-field appearance="outline">
                <mat-label>Date</mat-label>
                <input matInput [matDatepicker]="picker" formControlName="date"
                       (dateChange)="onDateChange()">
                <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
                @if (blockForm.get('date')?.hasError('required')) {
                  <mat-error>La date est requise.</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Créneau horaire</mat-label>
                <mat-select formControlName="time">
                  @for (slot of availableSlots; track slot) {
                    <mat-option [value]="slot">{{ slot }}</mat-option>
                  }
                </mat-select>
                @if (blockForm.get('time')?.hasError('required')) {
                  <mat-error>Le créneau est requis.</mat-error>
                }
                @if (availableSlots.length === 0 && blockForm.get('date')?.value) {
                  <mat-hint>Aucun créneau disponible pour cette date.</mat-hint>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="reason-field">
                <mat-label>Raison</mat-label>
                <input matInput formControlName="reason" placeholder="Raison du blocage...">
                @if (blockForm.get('reason')?.hasError('required')) {
                  <mat-error>La raison est requise.</mat-error>
                }
              </mat-form-field>

              <button mat-flat-button color="primary" type="submit"
                      class="submit-btn"
                      [disabled]="blockForm.invalid || submitting">
                <mat-icon>block</mat-icon>
                Bloquer
              </button>
            </form>
          </mat-card-content>
        </mat-card>

        <mat-card class="table-card">
          <mat-card-header>
            <mat-icon class="card-header-icon">list_alt</mat-icon>
            <mat-card-title>Créneaux bloqués</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (blockedSlots.length === 0) {
              <div class="empty-state">
                <div class="empty-icon-wrapper">
                  <mat-icon>event_available</mat-icon>
                </div>
                <p class="empty-title">Aucun créneau bloqué</p>
                <p class="empty-subtitle">Aucun créneau bloqué pour le moment.</p>
              </div>
            } @else {
              <div class="table-wrapper">
                <table mat-table [dataSource]="blockedSlots" class="full-width warm-table">
                  <ng-container matColumnDef="date">
                    <th mat-header-cell *matHeaderCellDef>Date</th>
                    <td mat-cell *matCellDef="let slot">{{ slot.date | dateFr:'long' }}</td>
                  </ng-container>

                  <ng-container matColumnDef="time">
                    <th mat-header-cell *matHeaderCellDef>Heure</th>
                    <td mat-cell *matCellDef="let slot">{{ slot.time }}</td>
                  </ng-container>

                  <ng-container matColumnDef="reason">
                    <th mat-header-cell *matHeaderCellDef>Raison</th>
                    <td mat-cell *matCellDef="let slot">{{ slot.reason }}</td>
                  </ng-container>

                  <ng-container matColumnDef="blockedBy">
                    <th mat-header-cell *matHeaderCellDef>Bloqué par</th>
                    <td mat-cell *matCellDef="let slot">{{ slot.blockedBy.username }}</td>
                  </ng-container>

                  <ng-container matColumnDef="blockedAt">
                    <th mat-header-cell *matHeaderCellDef>Date de blocage</th>
                    <td mat-cell *matCellDef="let slot">{{ slot.blockedAt | dateFr:'datetime' }}</td>
                  </ng-container>

                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef>Actions</th>
                    <td mat-cell *matCellDef="let slot">
                      <button mat-icon-button class="unblock-btn"
                              matTooltip="Débloquer ce créneau"
                              (click)="onUnblock(slot)">
                        <mat-icon>lock_open</mat-icon>
                      </button>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
                </table>
              </div>
            }
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    .blocked-slots-container {
      padding: 32px 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 28px;
    }

    .header-icon {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-xl, 20px);
      background: linear-gradient(135deg, var(--primary, #5b6cf0), var(--primary-dark, #4338ca));
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow-md, 0 4px 12px rgba(91, 108, 240, 0.25));

      mat-icon {
        color: #fff;
        font-size: 26px;
        width: 26px;
        height: 26px;
      }
    }

    h1 {
      font-family: var(--font-heading, 'DM Sans', sans-serif);
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--text-primary, #1e1b3a);
      margin: 0;
      letter-spacing: -0.02em;
    }

    .page-subtitle {
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      color: var(--text-secondary, #6b7194);
      font-size: 0.95rem;
      margin: 2px 0 0;
    }

    .card-header-icon {
      color: var(--primary, #5b6cf0);
      margin-right: 8px;
    }

    .form-card,
    .table-card {
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border-light, #f0ebf8);
      border-radius: var(--radius-xl, 20px);
      box-shadow: var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.04));
      transition: box-shadow var(--transition-base, 0.2s ease);

      &:hover {
        box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.07));
      }
    }

    .form-card {
      margin-bottom: 24px;

      mat-card-header {
        margin-bottom: 12px;

        mat-card-title {
          font-family: var(--font-heading, 'DM Sans', sans-serif);
          color: var(--text-primary, #1e1b3a);
          font-weight: 600;
        }
      }
    }

    .block-form {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;

      mat-form-field {
        flex: 0 0 auto;
        min-width: 180px;
      }

      .reason-field {
        flex: 1;
        min-width: 200px;
      }
    }

    .submit-btn {
      margin-top: 4px;
      height: 56px;
      border-radius: var(--radius-md, 12px) !important;
      background: linear-gradient(135deg, var(--primary, #5b6cf0), var(--primary-dark, #4338ca)) !important;
      color: #fff !important;
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      font-weight: 600;
      letter-spacing: 0.01em;
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

    .table-card {
      mat-card-header {
        margin-bottom: 12px;

        mat-card-title {
          font-family: var(--font-heading, 'DM Sans', sans-serif);
          color: var(--text-primary, #1e1b3a);
          font-weight: 600;
        }
      }
    }

    .table-wrapper {
      border-radius: var(--radius-lg, 16px);
      overflow: hidden;
      border: 1px solid var(--border-light, #f0ebf8);
    }

    .full-width {
      width: 100%;
    }

    .warm-table {
      th.mat-mdc-header-cell {
        background: var(--bg-subtle, #f5f3ff);
        color: var(--text-primary, #1e1b3a);
        font-family: var(--font-heading, 'DM Sans', sans-serif);
        font-weight: 700;
        font-size: 0.85rem;
        letter-spacing: 0.02em;
        border-bottom: 2px solid var(--border-light, #f0ebf8);
      }

      td.mat-mdc-cell {
        color: var(--text-primary, #1e1b3a);
        font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
        font-size: 0.9rem;
        border-bottom-color: var(--border-light, #f0ebf8);
      }

      tr.mat-mdc-row:nth-child(even) {
        background: var(--bg-subtle, #f5f3ff);
      }

      tr.mat-mdc-row:hover {
        background: var(--primary-light, #ede9fe);
      }
    }

    .unblock-btn {
      color: var(--warn, #f43f5e);
      transition: background var(--transition-fast, 0.15s ease);

      &:hover {
        background: rgba(244, 63, 94, 0.08);
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 56px 24px;
    }

    .empty-icon-wrapper {
      width: 72px;
      height: 72px;
      border-radius: var(--radius-full, 9999px);
      background: var(--primary-light, #ede9fe);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 18px;

      mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: var(--primary, #5b6cf0);
      }
    }

    .empty-title {
      font-family: var(--font-heading, 'DM Sans', sans-serif);
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--text-primary, #1e1b3a);
      margin: 0 0 4px;
    }

    .empty-subtitle {
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      font-size: 0.95rem;
      color: var(--text-muted, #9ca3bf);
      margin: 0;
    }
  `],
})
export class BlockedSlotsComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private notification = inject(NotificationService);
  private dialog = inject(MatDialog);
  private auth = inject(AuthService);
  private apiUrl = environment.apiUrl;

  loading = true;
  submitting = false;
  agencyId: number | null = null;
  blockedSlots: BlockedTimeSlot[] = [];
  availableSlots: string[] = [];
  displayedColumns = ['date', 'time', 'reason', 'blockedBy', 'blockedAt', 'actions'];

  blockForm = this.fb.group({
    date: [null as Date | null, Validators.required],
    time: ['', Validators.required],
    reason: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadAgentInfoThenSlots();
  }

  onDateChange(): void {
    const date = this.blockForm.get('date')?.value;
    if (!date || !this.agencyId) {
      this.availableSlots = [];
      return;
    }

    const dateStr = BlockedSlotsComponent.formatDate(date);
    this.http.get<AvailabilityDTO>(
      `${this.apiUrl}/api/availability/${this.agencyId}`,
      { params: { date: dateStr } }
    ).subscribe({
      next: (availability) => {
        this.availableSlots = availability.availableTimeSlots ?? [];
        this.blockForm.get('time')?.setValue('');
      },
      error: () => {
        this.availableSlots = [];
      },
    });
  }

  onBlockSlot(): void {
    if (this.blockForm.invalid || !this.agencyId) return;

    this.submitting = true;
    const { date, time, reason } = this.blockForm.value;

    const dto: TimeSlotManagementDTO = {
      agencyId: this.agencyId,
      date: BlockedSlotsComponent.formatDate(date as Date),
      time: time as string,
      blocked: true,
      reason: reason as string,
      agentName: this.auth.currentUser?.username ?? '',
    };

    this.http.post<ApiResponse>(`${this.apiUrl}/api/timeslots/block`, dto).subscribe({
      next: (response) => {
        this.notification.success(response.message || 'Créneau bloqué avec succès.');
        this.blockForm.reset();
        this.availableSlots = [];
        this.loadBlockedSlots();
        this.submitting = false;
      },
      error: () => {
        this.notification.error('Erreur lors du blocage du créneau.');
        this.submitting = false;
      },
    });
  }

  onUnblock(slot: BlockedTimeSlot): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Débloquer le créneau',
        message: `Voulez-vous débloquer le créneau du ${slot.date} à ${slot.time} ?`,
        confirmText: 'Débloquer',
        color: 'warn',
      } as ConfirmDialogData,
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.http.post<ApiResponse>(
        `${this.apiUrl}/api/timeslots/unblock/${slot.id}`,
        {}
      ).subscribe({
        next: (response) => {
          this.notification.success(response.message || 'Créneau débloqué.');
          this.loadBlockedSlots();
        },
        error: () => {
          this.notification.error('Erreur lors du déblocage du créneau.');
        },
      });
    });
  }

  private loadAgentInfoThenSlots(): void {
    this.http.get<AgentInfoDTO>(`${this.apiUrl}/api/agent/info`).subscribe({
      next: (info) => {
        this.agencyId = info.agencyId;
        this.loadBlockedSlots();
      },
      error: () => {
        this.notification.error('Erreur lors du chargement des informations de l\'agent.');
        this.loading = false;
      },
    });
  }

  private loadBlockedSlots(): void {
    if (!this.agencyId) return;

    this.loading = true;
    this.http.get<BlockedTimeSlot[]>(
      `${this.apiUrl}/api/timeslots/agency/${this.agencyId}`
    ).subscribe({
      next: (slots) => {
        this.blockedSlots = slots;
        this.loading = false;
      },
      error: () => {
        this.notification.error('Erreur lors du chargement des créneaux bloqués.');
        this.loading = false;
      },
    });
  }

  private static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
