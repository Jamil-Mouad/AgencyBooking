import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../../environments/environment';
import { AgentInfoDTO, AvailabilityDTO } from '../../../shared/models';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

interface WeekDay {
  date: Date;
  label: string;
  dayName: string;
  availability: AvailabilityDTO | null;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    LoadingSpinnerComponent,
  ],
  template: `
    @if (loading) {
      <app-loading-spinner message="Chargement du calendrier..."></app-loading-spinner>
    } @else {
      <div class="calendar-container">
        <div class="calendar-header">
          <h1>Calendrier</h1>
          <div class="week-nav">
            <button mat-icon-button (click)="previousWeek()" matTooltip="Semaine précédente">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <span class="week-label">{{ weekLabel }}</span>
            <button mat-icon-button (click)="nextWeek()" matTooltip="Semaine suivante">
              <mat-icon>chevron_right</mat-icon>
            </button>
            <button mat-stroked-button class="today-btn" (click)="goToToday()">Aujourd'hui</button>
          </div>
        </div>

        <div class="legend">
          <span class="legend-item">
            <span class="dot available"></span> Disponible
          </span>
          <span class="legend-item">
            <span class="dot booked"></span> Réservé
          </span>
          <span class="legend-item">
            <span class="dot blocked"></span> Bloqué
          </span>
        </div>

        <div class="week-grid">
          @for (day of weekDays; track day.date.toISOString()) {
            <mat-card class="day-card" [class.today]="isToday(day.date)" [class.past]="isPast(day.date)">
              <mat-card-header>
                <mat-card-title>{{ day.dayName }}</mat-card-title>
                <mat-card-subtitle>{{ day.label }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                @if (!day.availability) {
                  <p class="no-data">Pas de données</p>
                } @else {
                  <div class="slots-container">
                    @if (day.availability.availableTimeSlots.length > 0) {
                      <div class="slot-group">
                        <span class="slot-group-label available-label">Disponibles</span>
                        <div class="slots">
                          @for (slot of day.availability.availableTimeSlots; track slot) {
                            <span class="slot available">{{ slot }}</span>
                          }
                        </div>
                      </div>
                    }

                    @if (getReservedSlots(day.availability!).length > 0) {
                      <div class="slot-group">
                        <span class="slot-group-label booked-label">Réservés</span>
                        <div class="slots">
                          @for (slot of getReservedSlots(day.availability!); track slot) {
                            <span class="slot booked"
                                  [matTooltip]="getBookedInfo(day.availability!, slot)">
                              {{ slot }}
                            </span>
                          }
                        </div>
                      </div>
                    }

                    @if (getBlockedSlots(day.availability!).length > 0) {
                      <div class="slot-group">
                        <span class="slot-group-label blocked-label">Bloqués</span>
                        <div class="slots">
                          @for (slot of getBlockedSlots(day.availability!); track slot) {
                            <span class="slot blocked"
                                  [matTooltip]="getBookedInfo(day.availability!, slot)">
                              {{ slot }}
                            </span>
                          }
                        </div>
                      </div>
                    }

                    @if (day.availability.availableTimeSlots.length === 0 && day.availability.bookedTimeSlots.length === 0) {
                      <p class="no-data">Aucun créneau</p>
                    }
                  </div>
                }
              </mat-card-content>
            </mat-card>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .calendar-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      background: var(--bg-main);
    }

    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 16px;

      h1 {
        margin: 0;
        font-family: var(--font-heading), sans-serif;
        font-size: 1.8rem;
        font-weight: 700;
        color: var(--text-primary);
        letter-spacing: -0.01em;
      }
    }

    .week-nav {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-subtle);
      padding: 6px 12px;
      border-radius: var(--radius-xl);

      .week-label {
        font-family: var(--font-body), sans-serif;
        font-size: 1.05rem;
        font-weight: 600;
        min-width: 200px;
        text-align: center;
        color: var(--text-primary);
      }

      button[mat-icon-button] {
        color: var(--text-secondary);
        transition: color var(--transition-fast);

        &:hover {
          color: var(--primary);
        }
      }
    }

    .today-btn {
      border-color: var(--primary) !important;
      color: var(--primary) !important;
      font-family: var(--font-body), sans-serif;
      font-weight: 600;
      border-radius: var(--radius-md) !important;
      transition: background var(--transition-fast), color var(--transition-fast);

      &:hover {
        background: var(--primary) !important;
        color: #ffffff !important;
      }
    }

    .legend {
      display: flex;
      gap: 24px;
      margin-bottom: 20px;
      padding: 10px 16px;
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);

      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: var(--font-body), sans-serif;
        font-size: 0.85rem;
        color: var(--text-secondary);
      }

      .dot {
        width: 10px;
        height: 10px;
        border-radius: var(--radius-full);

        &.available { background: var(--success); }
        &.booked { background: var(--primary); }
        &.blocked { background: var(--warn); }
      }
    }

    .week-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 14px;
    }

    .day-card {
      min-height: 200px;
      background: var(--bg-card) !important;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg) !important;
      box-shadow: var(--shadow-xs);
      transition: box-shadow var(--transition-fast), border-color var(--transition-fast);

      &:hover {
        box-shadow: var(--shadow-sm);
        border-color: var(--border);
      }

      &.today {
        border: 2px solid var(--primary);
        box-shadow: var(--shadow-sm);

        mat-card-title {
          color: var(--primary) !important;
        }
      }

      &.past {
        opacity: 0.55;
      }

      mat-card-header {
        margin-bottom: 10px;
      }

      mat-card-title {
        font-family: var(--font-heading), sans-serif;
        font-weight: 700;
        color: var(--text-primary);
      }

      mat-card-subtitle {
        font-family: var(--font-body), sans-serif;
        color: var(--text-secondary) !important;
      }
    }

    .slots-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .slot-group {
      .slot-group-label {
        font-family: var(--font-body), sans-serif;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        margin-bottom: 6px;
        display: block;

        &.available-label { color: var(--success); }
        &.booked-label { color: var(--primary-dark); }
        &.blocked-label { color: var(--warn); }
      }
    }

    .slots {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }

    .slot {
      padding: 3px 10px;
      border-radius: var(--radius-full);
      font-family: var(--font-body), sans-serif;
      font-size: 0.78rem;
      font-weight: 600;
      transition: opacity var(--transition-fast);

      &:hover {
        opacity: 0.85;
      }

      &.available {
        background: rgba(16, 185, 129, 0.1);
        color: var(--success);
      }

      &.booked {
        background: var(--primary-light);
        color: var(--primary-dark);
        cursor: help;
      }

      &.blocked {
        background: rgba(244, 63, 94, 0.1);
        color: var(--warn);
      }
    }

    .no-data {
      color: var(--text-muted);
      font-family: var(--font-body), sans-serif;
      font-size: 0.85rem;
      text-align: center;
      padding: 16px 0;
      font-style: italic;
    }
  `],
})
export class CalendarComponent implements OnInit {
  private http = inject(HttpClient);
  private notification = inject(NotificationService);
  private apiUrl = environment.apiUrl;

  loading = true;
  weekDays: WeekDay[] = [];
  weekLabel = '';
  agencyId: number | null = null;

  private currentWeekStart = CalendarComponent.getMonday(new Date());

  ngOnInit(): void {
    this.loadAgentInfoThenCalendar();
  }

  previousWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.buildWeek();
    this.loadWeekAvailability();
  }

  nextWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.buildWeek();
    this.loadWeekAvailability();
  }

  goToToday(): void {
    this.currentWeekStart = CalendarComponent.getMonday(new Date());
    this.buildWeek();
    this.loadWeekAvailability();
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isPast(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  getBookedInfo(availability: AvailabilityDTO, slot: string): string {
    const info = availability.bookedSlotInfo?.[slot] || availability.bookedSlotInfo?.[slot.substring(0, 5)];
    return info ? info : 'Réservé';
  }

  isBlockedSlot(availability: AvailabilityDTO, slot: string): boolean {
    // Try both key formats: HH:mm:ss and HH:mm
    const info = availability.bookedSlotInfo?.[slot] || availability.bookedSlotInfo?.[slot.substring(0, 5)] || '';
    return info.startsWith('Bloqué') || info.startsWith('Créneau bloqué');
  }

  getReservedSlots(availability: AvailabilityDTO): string[] {
    return availability.bookedTimeSlots.filter(slot => !this.isBlockedSlot(availability, slot));
  }

  getBlockedSlots(availability: AvailabilityDTO): string[] {
    return availability.bookedTimeSlots.filter(slot => this.isBlockedSlot(availability, slot));
  }

  private loadAgentInfoThenCalendar(): void {
    this.http.get<AgentInfoDTO>(`${this.apiUrl}/api/agent/info`).subscribe({
      next: (info) => {
        this.agencyId = info.agencyId;
        this.buildWeek();
        this.loadWeekAvailability();
      },
      error: () => {
        this.notification.error('Erreur lors du chargement des informations de l\'agent.');
        this.loading = false;
      },
    });
  }

  private buildWeek(): void {
    const days: WeekDay[] = [];
    const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(this.currentWeekStart);
      date.setDate(date.getDate() + i);

      days.push({
        date: new Date(date),
        label: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        dayName: dayNames[i],
        availability: null,
      });
    }

    this.weekDays = days;
    this.updateWeekLabel();
  }

  private updateWeekLabel(): void {
    const start = this.weekDays[0]?.date;
    const end = this.weekDays[6]?.date;
    if (!start || !end) return;

    const formatOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    const startStr = start.toLocaleDateString('fr-FR', formatOptions);
    const endStr = end.toLocaleDateString('fr-FR', { ...formatOptions, year: 'numeric' });
    this.weekLabel = `${startStr} - ${endStr}`;
  }

  private loadWeekAvailability(): void {
    if (!this.agencyId) return;

    this.loading = true;
    const dateStr = CalendarComponent.formatDate(this.currentWeekStart);

    this.http.get<AvailabilityDTO[]>(
      `${this.apiUrl}/api/availability/${this.agencyId}/week`,
      { params: { startDate: dateStr } }
    ).subscribe({
      next: (availabilities) => {
        this.mapAvailabilitiesToDays(availabilities);
        this.loading = false;
      },
      error: () => {
        this.notification.error('Erreur lors du chargement de la disponibilité.');
        this.loading = false;
      },
    });
  }

  private mapAvailabilitiesToDays(availabilities: AvailabilityDTO[]): void {
    for (const day of this.weekDays) {
      const dateStr = CalendarComponent.formatDate(day.date);
      const match = availabilities.find(a => a.date === dateStr);
      day.availability = match ?? null;
    }
  }

  private static getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
