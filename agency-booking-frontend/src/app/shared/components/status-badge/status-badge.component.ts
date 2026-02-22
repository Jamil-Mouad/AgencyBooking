import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReservationStatus } from '../../models';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [class]="'status-' + status.toLowerCase()">
      <span class="status-dot"></span>
      {{ statusLabel }}
    </span>
  `,
  styles: [`
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 14px;
      border-radius: var(--radius-full);
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 600;
      line-height: 1.4;
      white-space: nowrap;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-pending {
      background: #fef3c7;
      color: #92400e;
      .status-dot { background: #f59e0b; }
    }

    .status-confirmed {
      background: #dbeafe;
      color: #1e40af;
      .status-dot { background: #3b82f6; }
    }

    .status-completed {
      background: #d1fae5;
      color: #065f46;
      .status-dot { background: #10b981; }
    }

    .status-canceled {
      background: #ffe4e6;
      color: #9f1239;
      .status-dot { background: #f43f5e; }
    }
  `]
})
export class StatusBadgeComponent {
  @Input() status: ReservationStatus = 'PENDING';

  get statusLabel(): string {
    const labels: Record<ReservationStatus, string> = {
      PENDING: 'En attente',
      CONFIRMED: 'Confirmée',
      COMPLETED: 'Terminée',
      CANCELED: 'Annulée'
    };
    return labels[this.status] || this.status;
  }
}
