import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { NotificationService } from '../../../core/services/notification.service';
import { environment } from '../../../../environments/environment';
import { Agency, AvailabilityDTO, ReservationRequest } from '../../../shared/models';

@Component({
  selector: 'app-new-reservation',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule,
    MatDatepickerModule, MatNativeDateModule, MatChipsModule,
    MatProgressSpinnerModule, MatDividerModule,
    LoadingSpinnerComponent
  ],
  template: `
    <div class="page-container">
      @if (loadingAgency) {
        <app-loading-spinner message="Chargement de l'agence..."></app-loading-spinner>
      }

      @if (!loadingAgency && agency) {
        <!-- Agency Info -->
        <mat-card class="agency-info-card">
          <mat-card-header>
            <div class="avatar-wrapper" mat-card-avatar>
              <mat-icon class="agency-avatar">store</mat-icon>
            </div>
            <mat-card-title class="card-title">{{ agency.name }}</mat-card-title>
            <mat-card-subtitle class="card-subtitle">
              <mat-icon class="inline-icon location-icon">location_on</mat-icon>
              {{ agency.city }} - {{ agency.address }}
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (agency.description) {
              <p class="agency-description">{{ agency.description }}</p>
            }
            <div class="contact-details">
              @if (agency.phoneNumber) {
                <p class="agency-detail">
                  <mat-icon class="inline-icon detail-icon">phone</mat-icon>
                  {{ agency.phoneNumber }}
                </p>
              }
              @if (agency.email) {
                <p class="agency-detail">
                  <mat-icon class="inline-icon detail-icon">email</mat-icon>
                  {{ agency.email }}
                </p>
              }
            </div>

            @if (agency.businessHours && agency.businessHours.length > 0) {
              <mat-divider class="section-divider"></mat-divider>
              <h4 class="hours-heading">Horaires d'ouverture</h4>
              <div class="hours-grid">
                @for (hours of agency.businessHours; track hours.day) {
                  <div class="hours-row">
                    <span class="day-label">{{ hours.day }}</span>
                    @if (hours.closed) {
                      <span class="closed-label">Fermé</span>
                    } @else {
                      <span class="hours-value">{{ hours.openingTime }} - {{ hours.closingTime }}</span>
                    }
                  </div>
                }
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Reservation Form -->
        <mat-card class="reservation-form-card">
          <mat-card-header>
            <div class="avatar-wrapper" mat-card-avatar>
              <mat-icon class="form-avatar">event</mat-icon>
            </div>
            <mat-card-title class="card-title">Nouvelle réservation</mat-card-title>
            <mat-card-subtitle class="card-subtitle">Remplissez le formulaire pour réserver</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Service</mat-label>
                <mat-select formControlName="service">
                  @for (service of agency.services; track service.id) {
                    <mat-option [value]="service.name">{{ service.name }}</mat-option>
                  }
                </mat-select>
                <mat-icon matSuffix class="field-suffix-icon">miscellaneous_services</mat-icon>
                @if (form.get('service')?.hasError('required') && form.get('service')?.touched) {
                  <mat-error>Le service est requis</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Description</mat-label>
                <textarea matInput formControlName="description" rows="3"
                          placeholder="Décrivez brièvement votre besoin..."></textarea>
                @if (form.get('description')?.hasError('required') && form.get('description')?.touched) {
                  <mat-error>La description est requise</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Date souhaitée</mat-label>
                <input matInput [matDatepicker]="picker" formControlName="preferredDate"
                       [min]="minDate" (dateChange)="onDateChange()">
                <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
                @if (form.get('preferredDate')?.hasError('required') && form.get('preferredDate')?.touched) {
                  <mat-error>La date est requise</mat-error>
                }
              </mat-form-field>

              <!-- Availability Info -->
              @if (loadingAvailability) {
                <div class="availability-loading">
                  <mat-spinner diameter="24"></mat-spinner>
                  <span>Vérification des disponibilités...</span>
                </div>
              }

              @if (availability && !loadingAvailability) {
                <div class="availability-info">
                  @if (availability.availableTimeSlots.length > 0) {
                    <div class="available-slots">
                      <p class="slots-title">
                        <mat-icon class="inline-icon slots-icon">check_circle</mat-icon>
                        Créneaux disponibles — sélectionnez une heure
                      </p>
                      <div class="slots-grid">
                        @for (slot of availability.availableTimeSlots; track slot) {
                          <mat-chip highlighted class="slot-chip"
                                    [class.selected]="selectedTimeSlot === slot"
                                    (click)="selectTimeSlot(slot)">{{ slot }}</mat-chip>
                        }
                      </div>
                    </div>
                  } @else {
                    <div class="no-slots">
                      <mat-icon class="no-slots-icon">event_busy</mat-icon>
                      <span>Aucun créneau disponible pour cette date</span>
                    </div>
                  }
                </div>
              }

              <button mat-flat-button color="primary" type="submit" class="full-width submit-btn"
                      [disabled]="form.invalid || submitting">
                @if (submitting) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <mat-icon>send</mat-icon>
                  Envoyer la demande de réservation
                }
              </button>
            </form>
          </mat-card-content>
        </mat-card>
      }

      @if (!loadingAgency && !agency) {
        <div class="empty-state">
          <div class="empty-state-icon-wrapper">
            <mat-icon>error_outline</mat-icon>
          </div>
          <p class="empty-state-title">Agence introuvable</p>
          <p class="empty-state-subtitle">L'agence que vous recherchez n'existe pas ou a été supprimée.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container {
      padding: 32px 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    /* ── Cards ── */
    .agency-info-card,
    .reservation-form-card {
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-xl) !important;
      box-shadow: var(--shadow-sm) !important;
      margin-bottom: 28px;
      padding: 12px 8px;
      transition: box-shadow var(--transition-base), transform var(--transition-base);

      &:hover {
        box-shadow: var(--shadow-md) !important;
      }
    }

    /* ── Avatar icons ── */
    .avatar-wrapper {
      background: var(--primary-light);
      border-radius: var(--radius-full);
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .agency-avatar,
    .form-avatar {
      color: var(--primary);
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    /* ── Card header text ── */
    .card-title {
      font-family: var(--font-heading);
      color: var(--text-primary);
      font-weight: 700;
    }

    .card-subtitle {
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 2px;
    }

    /* ── Inline icons ── */
    .inline-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      vertical-align: middle;
      margin-right: 6px;
      color: var(--text-muted);
    }

    .location-icon {
      color: var(--primary);
    }

    .detail-icon {
      color: var(--text-muted);
    }

    .field-suffix-icon {
      color: var(--text-muted);
    }

    /* ── Agency description & details ── */
    .agency-description {
      color: var(--text-secondary);
      line-height: 1.6;
      margin: 16px 0;
      font-size: 14.5px;
    }

    .contact-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .agency-detail {
      color: var(--text-secondary);
      font-size: 14px;
      margin: 4px 0;
      display: flex;
      align-items: center;
    }

    /* ── Section divider ── */
    .section-divider {
      margin: 20px 0;
      border-top-color: var(--border-light);
    }

    /* ── Hours section ── */
    .hours-heading {
      font-family: var(--font-heading);
      color: var(--text-primary);
      font-weight: 600;
      margin: 14px 0 10px;
      font-size: 15px;
    }

    .hours-grid {
      display: flex;
      flex-direction: column;
      gap: 2px;
      background: var(--bg-subtle);
      border-radius: var(--radius-md);
      padding: 12px 16px;
    }

    .hours-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      padding: 6px 0;
      border-bottom: 1px solid var(--border-light);

      &:last-child {
        border-bottom: none;
      }
    }

    .day-label {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 13.5px;
    }

    .hours-value {
      color: var(--text-secondary);
      font-size: 13.5px;
    }

    .closed-label {
      color: var(--warn);
      font-weight: 500;
      font-size: 13px;
    }

    /* ── Form ── */
    .full-width {
      width: 100%;
    }

    /* ── Submit button ── */
    .submit-btn {
      height: 52px;
      font-size: 15px;
      font-weight: 600;
      font-family: var(--font-body);
      margin-top: 12px;
      border-radius: var(--radius-md) !important;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark)) !important;
      color: var(--text-inverse) !important;
      letter-spacing: 0.3px;
      box-shadow: var(--shadow-sm);
      transition: box-shadow var(--transition-fast), transform var(--transition-fast), opacity var(--transition-fast);

      &:hover:not([disabled]) {
        box-shadow: var(--shadow-md);
        transform: translateY(-1px);
      }

      &:active:not([disabled]) {
        transform: translateY(0);
        box-shadow: var(--shadow-xs);
      }

      &[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      mat-icon {
        margin-right: 8px;
        font-size: 20px;
      }
    }

    /* ── Availability loading ── */
    .availability-loading {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 16px;
      color: var(--text-secondary);
      background: var(--bg-subtle);
      border-radius: var(--radius-md);
      margin-bottom: 12px;
      font-size: 14px;
    }

    /* ── Availability info ── */
    .availability-info {
      margin-bottom: 20px;
    }

    /* ── Available slots ── */
    .available-slots {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.18);
      border-radius: var(--radius-lg);
      padding: 20px;
    }

    .slots-title {
      font-weight: 600;
      color: var(--success);
      margin: 0 0 12px;
      display: flex;
      align-items: center;
      font-size: 14.5px;
      font-family: var(--font-body);
    }

    .slots-icon {
      color: var(--success) !important;
      margin-right: 8px;
    }

    .slots-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .slot-chip {
      --mdc-chip-elevated-container-color: var(--bg-card);
      --mdc-chip-label-text-color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.25) !important;
      cursor: pointer;
      font-weight: 500;
      transition: all var(--transition-fast);

      &:hover {
        --mdc-chip-elevated-container-color: rgba(16, 185, 129, 0.12);
        --mdc-chip-label-text-color: var(--success-dark);
        transform: scale(1.05);
        box-shadow: var(--shadow-xs);
      }
    }

    .slot-chip.selected {
      --mdc-chip-elevated-container-color: var(--primary) !important;
      --mdc-chip-label-text-color: var(--text-inverse) !important;
      border-color: var(--primary) !important;
      box-shadow: var(--shadow-sm);
    }

    /* ── No slots ── */
    .no-slots {
      background: rgba(245, 158, 66, 0.08);
      border: 1px solid rgba(245, 158, 66, 0.18);
      border-radius: var(--radius-lg);
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--amber-dark);
      font-size: 14.5px;
      font-weight: 500;
    }

    .no-slots-icon {
      color: var(--amber) !important;
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    /* ── Empty state ── */
    .empty-state {
      text-align: center;
      padding: 80px 32px;
      color: var(--text-muted);
    }

    .empty-state-icon-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      border-radius: var(--radius-full);
      background: var(--primary-light);
      margin-bottom: 20px;

      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: var(--primary);
      }
    }

    .empty-state-title {
      font-family: var(--font-heading);
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 8px;
    }

    .empty-state-subtitle {
      font-size: 14.5px;
      color: var(--text-muted);
      margin: 0;
    }
  `]
})
export class NewReservationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);
  private apiUrl = environment.apiUrl;

  agency: Agency | null = null;
  availability: AvailabilityDTO | null = null;
  loadingAgency = false;
  loadingAvailability = false;
  submitting = false;
  minDate = new Date();
  selectedTimeSlot: string | null = null;

  form = this.fb.nonNullable.group({
    service: ['', [Validators.required]],
    description: ['', [Validators.required]],
    preferredDate: [null as Date | null, [Validators.required]]
  });

  ngOnInit(): void {
    const agencyId = Number(this.route.snapshot.paramMap.get('id'));
    if (agencyId) {
      this.loadAgency(agencyId);
    }
  }

  selectTimeSlot(slot: string): void {
    this.selectedTimeSlot = slot;
  }

  onDateChange(): void {
    const date = this.form.getRawValue().preferredDate;
    if (!date || !this.agency) return;

    const formattedDate = this.formatDate(date);
    this.loadingAvailability = true;
    this.availability = null;
    this.selectedTimeSlot = null;

    this.http.get<AvailabilityDTO>(
      `${this.apiUrl}/api/availability/${this.agency.id}?date=${formattedDate}`
    ).subscribe({
      next: (data) => {
        this.availability = data;
        this.loadingAvailability = false;
      },
      error: () => {
        this.loadingAvailability = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || !this.agency) return;

    // Require time slot selection if slots are available
    if (this.availability?.availableTimeSlots?.length && !this.selectedTimeSlot) {
      this.notification.error('Veuillez sélectionner un créneau horaire');
      return;
    }

    this.submitting = true;
    const value = this.form.getRawValue();

    const request: ReservationRequest = {
      service: value.service,
      description: value.description,
      preferredDate: this.formatDate(value.preferredDate!),
      preferredTime: this.selectedTimeSlot || undefined,
      agencyId: this.agency.id
    };

    this.http.post(`${this.apiUrl}/api/user/reservation`, request).subscribe({
      next: () => {
        this.submitting = false;
        this.notification.success('Réservation envoyée avec succès !');
        this.router.navigate(['/user/reservations']);
      },
      error: () => {
        this.submitting = false;
      }
    });
  }

  private loadAgency(id: number): void {
    this.loadingAgency = true;
    this.http.get<Agency>(`${this.apiUrl}/api/agencies/${id}`).subscribe({
      next: (data) => {
        this.agency = data;
        this.loadingAgency = false;
      },
      error: () => {
        this.loadingAgency = false;
      }
    });
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
