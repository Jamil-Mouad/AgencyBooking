import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../../environments/environment';
import { AgentInfoDTO, ApiResponse, PasswordChangeRequest } from '../../../shared/models';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-agent-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatTooltipModule,
    LoadingSpinnerComponent,
  ],
  template: `
    @if (loading) {
      <app-loading-spinner message="Chargement du profil..."></app-loading-spinner>
    } @else {
      <div class="profile-container">
        <div class="page-header">
          <div class="header-bg">
            <div class="float-shape s1"></div>
            <div class="float-shape s2"></div>
            <div class="float-shape s3"></div>
          </div>
          <h1>Mon profil</h1>
          <p class="page-subtitle">Consultez et modifiez vos informations personnelles</p>
        </div>

        <mat-card class="info-card">
          <mat-card-header>
            <div class="avatar-wrapper">
              <mat-icon class="profile-avatar">account_circle</mat-icon>
            </div>
            <div class="header-info">
              <mat-card-title>{{ agentInfo?.username }}</mat-card-title>
              <mat-card-subtitle>Agent</mat-card-subtitle>
            </div>
          </mat-card-header>
          <mat-card-content>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-icon-wrapper">
                  <mat-icon>person</mat-icon>
                </div>
                <div class="info-editable">
                  <span class="info-label">Nom d'utilisateur</span>
                  @if (editingUsername) {
                    <div class="edit-row">
                      <mat-form-field appearance="outline" class="inline-field">
                        <input matInput [(ngModel)]="newUsername" placeholder="Nouveau nom">
                      </mat-form-field>
                      <button mat-icon-button class="edit-action-btn save-btn" (click)="saveUsername()" [disabled]="!newUsername.trim() || savingUsername">
                        <mat-icon>check</mat-icon>
                      </button>
                      <button mat-icon-button class="edit-action-btn cancel-btn" (click)="cancelEditUsername()">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  } @else {
                    <div class="edit-row">
                      <span class="info-value">{{ agentInfo?.username }}</span>
                      <button mat-icon-button class="edit-trigger-btn" (click)="startEditUsername()" matTooltip="Modifier le nom">
                        <mat-icon>edit</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              </div>
              <div class="info-item">
                <div class="info-icon-wrapper">
                  <mat-icon>email</mat-icon>
                </div>
                <div>
                  <span class="info-label">Email</span>
                  <span class="info-value">{{ agentInfo?.email }}</span>
                </div>
              </div>
              <div class="info-item">
                <div class="info-icon-wrapper">
                  <mat-icon>business</mat-icon>
                </div>
                <div>
                  <span class="info-label">Agence</span>
                  <span class="info-value">{{ agentInfo?.agencyName }}</span>
                </div>
              </div>
              <div class="info-item">
                <div class="info-icon-wrapper">
                  <mat-icon>circle</mat-icon>
                </div>
                <div class="availability-row">
                  <span class="info-label">Disponibilité</span>
                  <mat-slide-toggle
                    [checked]="agentInfo?.available ?? false"
                    (change)="toggleAvailability()"
                    [disabled]="togglingAvailability"
                    color="primary">
                    <span class="availability-text" [class.available]="agentInfo?.available" [class.unavailable]="!agentInfo?.available">
                      {{ agentInfo?.available ? 'Disponible' : 'Indisponible' }}
                    </span>
                  </mat-slide-toggle>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="password-card">
          <mat-card-header>
            <mat-icon class="card-header-icon">lock</mat-icon>
            <mat-card-title>Changer le mot de passe</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()" class="password-form">
              <mat-form-field appearance="outline">
                <mat-label>Mot de passe actuel</mat-label>
                <input matInput [type]="hideCurrentPassword ? 'password' : 'text'"
                       formControlName="currentPassword">
                <button mat-icon-button matSuffix type="button"
                        (click)="hideCurrentPassword = !hideCurrentPassword">
                  <mat-icon>{{ hideCurrentPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                @if (passwordForm.get('currentPassword')?.hasError('required')) {
                  <mat-error>Le mot de passe actuel est requis.</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Nouveau mot de passe</mat-label>
                <input matInput [type]="hideNewPassword ? 'password' : 'text'"
                       formControlName="newPassword">
                <button mat-icon-button matSuffix type="button"
                        (click)="hideNewPassword = !hideNewPassword">
                  <mat-icon>{{ hideNewPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                @if (passwordForm.get('newPassword')?.hasError('required')) {
                  <mat-error>Le nouveau mot de passe est requis.</mat-error>
                }
                @if (passwordForm.get('newPassword')?.hasError('minlength')) {
                  <mat-error>Le mot de passe doit contenir au moins 6 caractères.</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Confirmer le nouveau mot de passe</mat-label>
                <input matInput [type]="hideConfirmPassword ? 'password' : 'text'"
                       formControlName="confirmPassword">
                <button mat-icon-button matSuffix type="button"
                        (click)="hideConfirmPassword = !hideConfirmPassword">
                  <mat-icon>{{ hideConfirmPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                @if (passwordForm.get('confirmPassword')?.hasError('required')) {
                  <mat-error>La confirmation est requise.</mat-error>
                }
              </mat-form-field>

              @if (passwordMismatch) {
                <p class="error-text">Les mots de passe ne correspondent pas.</p>
              }

              <div class="form-actions">
                <button mat-flat-button color="primary" type="submit"
                        class="submit-btn"
                        [disabled]="passwordForm.invalid || submitting">
                  <mat-icon>lock</mat-icon>
                  Changer le mot de passe
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    .profile-container {
      padding: 32px 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .page-header {
      position: relative;
      overflow: hidden;
      padding: 28px 32px;
      margin-bottom: 28px;
      border-radius: var(--radius-xl);
      background:
        radial-gradient(ellipse at 20% 50%, rgba(91, 108, 240, 0.9) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 20%, rgba(67, 56, 202, 0.8) 0%, transparent 50%),
        radial-gradient(ellipse at 60% 80%, rgba(56, 189, 248, 0.3) 0%, transparent 50%),
        linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background-image: radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
        background-size: 24px 24px;
        pointer-events: none;
      }
    }

    .header-bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .float-shape {
      position: absolute;
      border-radius: 50%;
      animation: floatShape 12s ease-in-out infinite;
    }
    .float-shape.s1 { width: 80px; height: 80px; top: -20px; right: 10%; background: rgba(255,255,255,0.07); }
    .float-shape.s2 { width: 50px; height: 50px; bottom: -10px; left: 25%; background: rgba(255,255,255,0.05); animation-delay: -4s; }
    .float-shape.s3 { width: 30px; height: 30px; top: 50%; right: 30%; background: rgba(255,255,255,0.04); animation-delay: -8s; }

    @keyframes floatShape {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-10px) rotate(5deg); }
    }

    h1 {
      font-family: var(--font-heading, 'DM Sans', sans-serif);
      font-size: 24px;
      font-weight: 700;
      color: white;
      margin: 0 0 4px;
      position: relative;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .page-subtitle {
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
      margin: 0;
      position: relative;
    }

    .info-card,
    .password-card {
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border-light, #f0ebf8);
      border-radius: var(--radius-xl, 20px);
      box-shadow: var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.04));
      transition: box-shadow var(--transition-base, 0.2s ease);

      &:hover {
        box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.07));
      }
    }

    .info-card {
      margin-bottom: 24px;

      mat-card-header {
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 14px;
      }
    }

    .avatar-wrapper {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-full, 9999px);
      background: linear-gradient(135deg, var(--primary, #5b6cf0), var(--primary-dark, #4338ca));
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow-sm, 0 2px 8px rgba(91, 108, 240, 0.2));
      flex-shrink: 0;
    }

    .profile-avatar {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #fff !important;
    }

    .header-info {
      display: flex;
      flex-direction: column;

      mat-card-title {
        font-family: var(--font-heading, 'DM Sans', sans-serif);
        color: var(--text-primary, #1e1b3a);
        font-weight: 700;
      }

      mat-card-subtitle {
        color: var(--text-secondary, #6b7194);
        font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      }
    }

    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 10px 14px;
      border-radius: var(--radius-md, 12px);
      transition: background var(--transition-fast, 0.15s ease);

      &:hover {
        background: var(--bg-subtle, #f5f3ff);
      }

      > div:not(.info-icon-wrapper) {
        display: flex;
        flex-direction: column;
      }
    }

    .info-icon-wrapper {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-sm, 8px);
      background: var(--primary-light, #ede9fe);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        color: var(--text-muted, #9ca3bf);
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .info-label {
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      font-size: 0.78rem;
      color: var(--text-muted, #9ca3bf);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-weight: 500;
    }

    .info-value {
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary, #1e1b3a);
    }

    .availability-text {
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      font-size: 0.88rem;
      font-weight: 600;
      padding: 3px 12px;
      border-radius: var(--radius-full, 9999px);

      &.available {
        color: var(--success, #10b981);
        background: rgba(16, 185, 129, 0.1);
      }

      &.unavailable {
        color: var(--warn, #f43f5e);
        background: rgba(244, 63, 94, 0.08);
      }
    }

    .status-available {
      --mdc-chip-elevated-container-color: rgba(16, 185, 129, 0.12);
      --mdc-chip-label-text-color: var(--success, #10b981);
    }

    .status-unavailable {
      --mdc-chip-elevated-container-color: rgba(244, 63, 94, 0.1);
      --mdc-chip-label-text-color: var(--warn, #f43f5e);
    }

    .edit-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .inline-field {
      width: 200px;
      font-size: 0.9rem;
    }

    .edit-trigger-btn {
      color: var(--text-muted, #9ca3bf);
      transition: color var(--transition-fast, 0.15s ease), background var(--transition-fast, 0.15s ease);

      &:hover {
        color: var(--primary, #5b6cf0);
        background: var(--primary-light, #ede9fe);
      }
    }

    .edit-action-btn {
      &.save-btn {
        color: var(--success, #10b981);

        &:hover {
          background: rgba(16, 185, 129, 0.1);
        }
      }

      &.cancel-btn {
        color: var(--text-muted, #9ca3bf);

        &:hover {
          background: rgba(156, 163, 191, 0.12);
        }
      }
    }

    .availability-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .info-editable {
      display: flex;
      flex-direction: column;
    }

    .card-header-icon {
      color: var(--primary, #5b6cf0);
      margin-right: 8px;
    }

    .password-card {
      mat-card-header {
        margin-bottom: 12px;

        mat-card-title {
          font-family: var(--font-heading, 'DM Sans', sans-serif);
          color: var(--text-primary, #1e1b3a);
          font-weight: 600;
        }
      }
    }

    .password-form {
      display: flex;
      flex-direction: column;
      max-width: 400px;
    }

    .error-text {
      color: var(--warn, #f43f5e);
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      font-size: 0.85rem;
      margin: -8px 0 8px;
      padding: 8px 12px;
      background: rgba(244, 63, 94, 0.06);
      border-radius: var(--radius-sm, 8px);
      border-left: 3px solid var(--warn, #f43f5e);
    }

    .form-actions {
      display: flex;
      justify-content: flex-start;
      padding-top: 8px;
    }

    .submit-btn {
      border-radius: var(--radius-md, 12px) !important;
      background: linear-gradient(135deg, var(--primary, #5b6cf0), var(--primary-dark, #4338ca)) !important;
      color: #fff !important;
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      font-weight: 600;
      letter-spacing: 0.01em;
      padding: 0 24px;
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
  `],
})
export class AgentProfileComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private notification = inject(NotificationService);
  private apiUrl = environment.apiUrl;

  loading = true;
  submitting = false;
  agentInfo: AgentInfoDTO | null = null;

  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;

  editingUsername = false;
  newUsername = '';
  savingUsername = false;
  togglingAvailability = false;

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  get passwordMismatch(): boolean {
    const { newPassword, confirmPassword } = this.passwordForm.value;
    return !!newPassword && !!confirmPassword && newPassword !== confirmPassword;
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid || this.passwordMismatch) return;

    this.submitting = true;
    const { currentPassword, newPassword } = this.passwordForm.value;

    const request: PasswordChangeRequest = {
      currentPassword: currentPassword as string,
      newPassword: newPassword as string,
    };

    this.http.post<ApiResponse>(`${this.apiUrl}/api/user/change-password`, request).subscribe({
      next: (response) => {
        this.notification.success(response.message || 'Mot de passe changé avec succès.');
        this.passwordForm.reset();
        this.submitting = false;
      },
      error: () => {
        this.notification.error('Erreur lors du changement de mot de passe.');
        this.submitting = false;
      },
    });
  }

  startEditUsername(): void {
    this.editingUsername = true;
    this.newUsername = this.agentInfo?.username || '';
  }

  cancelEditUsername(): void {
    this.editingUsername = false;
    this.newUsername = '';
  }

  saveUsername(): void {
    if (!this.newUsername.trim()) return;
    this.savingUsername = true;
    
    this.http.post<ApiResponse>(`${this.apiUrl}/api/user/update-username`, {
      username: this.newUsername.trim()
    }).subscribe({
      next: (response) => {
        this.notification.success(response.message || 'Nom d\'utilisateur mis à jour.');
        if (this.agentInfo) {
          this.agentInfo.username = this.newUsername.trim();
        }
        this.editingUsername = false;
        this.savingUsername = false;
      },
      error: () => {
        this.notification.error('Erreur lors de la mise à jour du nom d\'utilisateur.');
        this.savingUsername = false;
      },
    });
  }

  toggleAvailability(): void {
    this.togglingAvailability = true;
    
    this.http.put<AgentInfoDTO>(`${this.apiUrl}/api/agent/toggle-availability`, {}).subscribe({
      next: (updatedInfo) => {
        this.agentInfo = updatedInfo;
        this.notification.success(
          updatedInfo.available ? 'Vous êtes maintenant disponible.' : 'Vous êtes maintenant indisponible.'
        );
        this.togglingAvailability = false;
      },
      error: () => {
        this.notification.error('Erreur lors du changement de disponibilité.');
        this.togglingAvailability = false;
      },
    });
  }

  private loadProfile(): void {
    this.http.get<AgentInfoDTO>(`${this.apiUrl}/api/agent/info`).subscribe({
      next: (info) => {
        this.agentInfo = info;
        this.loading = false;
      },
      error: () => {
        this.notification.error('Erreur lors du chargement du profil.');
        this.loading = false;
      },
    });
  }
}
