import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

export type SnackBarType = 'success' | 'error' | 'info' | 'warn';

export interface CustomSnackBarData {
  message: string;
  type: SnackBarType;
  duration: number;
}

@Component({
  selector: 'app-custom-snackbar',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="snackbar-content" [class]="'snackbar-' + data.type">
      <div class="snackbar-body">
        <mat-icon class="snackbar-type-icon">{{ iconMap[data.type] }}</mat-icon>
        <span class="snackbar-message">{{ data.message }}</span>
        <button mat-icon-button class="snackbar-close" (click)="dismiss()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <div class="snackbar-progress">
        <div class="snackbar-progress-bar" [style.animation-duration.ms]="data.duration"></div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .snackbar-content {
      border-radius: var(--radius-lg);
      overflow: hidden;
      animation: slideInFromRight 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      border-left: 4px solid transparent;
    }

    .snackbar-body {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
    }

    .snackbar-type-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
    }

    .snackbar-message {
      flex: 1;
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 500;
      line-height: 1.4;
    }

    .snackbar-close {
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      opacity: 0.7;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover { opacity: 1; }
    }

    .snackbar-progress {
      height: 3px;
    }

    .snackbar-progress-bar {
      height: 100%;
      animation: progressShrink linear forwards;
      transform-origin: left;
    }

    // Success
    .snackbar-success {
      background: #ecfdf5;
      border-left-color: #10b981;
      .snackbar-body { color: #065f46; }
      .snackbar-type-icon { color: #10b981; }
      .snackbar-close { color: #065f46; }
      .snackbar-progress { background: rgba(16, 185, 129, 0.1); }
      .snackbar-progress-bar { background: rgba(16, 185, 129, 0.3); }
    }

    // Error
    .snackbar-error {
      background: #fff1f2;
      border-left-color: #f43f5e;
      .snackbar-body { color: #9f1239; }
      .snackbar-type-icon { color: #f43f5e; }
      .snackbar-close { color: #9f1239; }
      .snackbar-progress { background: rgba(244, 63, 94, 0.1); }
      .snackbar-progress-bar { background: rgba(244, 63, 94, 0.3); }
    }

    // Info
    .snackbar-info {
      background: #ede9fe;
      border-left-color: #5b6cf0;
      .snackbar-body { color: #3730a3; }
      .snackbar-type-icon { color: #5b6cf0; }
      .snackbar-close { color: #3730a3; }
      .snackbar-progress { background: rgba(91, 108, 240, 0.1); }
      .snackbar-progress-bar { background: rgba(91, 108, 240, 0.3); }
    }

    // Warn
    .snackbar-warn {
      background: #fffbeb;
      border-left-color: #f59e0b;
      .snackbar-body { color: #92400e; }
      .snackbar-type-icon { color: #f59e0b; }
      .snackbar-close { color: #92400e; }
      .snackbar-progress { background: rgba(245, 158, 11, 0.1); }
      .snackbar-progress-bar { background: rgba(245, 158, 11, 0.3); }
    }

    @keyframes progressShrink {
      from { width: 100%; }
      to { width: 0%; }
    }

    @keyframes slideInFromRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `]
})
export class CustomSnackBarComponent {
  data = inject<CustomSnackBarData>(MAT_SNACK_BAR_DATA);
  private snackBarRef = inject(MatSnackBarRef);

  iconMap: Record<SnackBarType, string> = {
    success: 'check_circle',
    error: 'error_outline',
    info: 'info',
    warn: 'warning'
  };

  dismiss(): void {
    this.snackBarRef.dismiss();
  }
}
