import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ApiResponse, PasswordChangeRequest } from '../../../shared/models';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatDividerModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="profile-container">
      <div class="page-header">
        <div class="header-float header-float-1"></div>
        <div class="header-float header-float-2"></div>
        <h1>Mon profil</h1>
        <p>Consultez et modifiez vos informations personnelles</p>
      </div>

      <div class="profile-layout">
        <mat-card class="info-card">
          <mat-card-header>
            <div class="avatar" mat-card-avatar>
              <mat-icon>admin_panel_settings</mat-icon>
            </div>
            <mat-card-title>{{ auth.currentUser?.username }}</mat-card-title>
            <mat-card-subtitle>{{ auth.currentUser?.email }}</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <mat-divider></mat-divider>
            <div class="info-list">
              <div class="info-item">
                <mat-icon>person</mat-icon>
                <div>
                  <span class="info-label">Nom d'utilisateur</span>
                  <span class="info-value">{{ auth.currentUser?.username }}</span>
                </div>
              </div>
              <div class="info-item">
                <mat-icon>email</mat-icon>
                <div>
                  <span class="info-label">Adresse email</span>
                  <span class="info-value">{{ auth.currentUser?.email }}</span>
                </div>
              </div>
              <div class="info-item">
                <mat-icon>shield</mat-icon>
                <div>
                  <span class="info-label">Role</span>
                  <span class="info-value role-badge">Administrateur</span>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="password-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="lock-icon">lock</mat-icon>
            <mat-card-title>Changer le mot de passe</mat-card-title>
            <mat-card-subtitle>Mettez a jour votre mot de passe de connexion</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()">
              <div class="field-animate field-animate-1">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Mot de passe actuel</mat-label>
                  <input matInput formControlName="currentPassword"
                         [type]="hideCurrentPassword ? 'password' : 'text'">
                  <button mat-icon-button matSuffix type="button"
                          (click)="hideCurrentPassword = !hideCurrentPassword">
                    <mat-icon>{{ hideCurrentPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                  @if (passwordForm.get('currentPassword')?.hasError('required') && passwordForm.get('currentPassword')?.touched) {
                    <mat-error>Le mot de passe actuel est requis</mat-error>
                  }
                </mat-form-field>
              </div>

              <div class="field-animate field-animate-2">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Nouveau mot de passe</mat-label>
                  <input matInput formControlName="newPassword"
                         [type]="hideNewPassword ? 'password' : 'text'">
                  <button mat-icon-button matSuffix type="button"
                          (click)="hideNewPassword = !hideNewPassword">
                    <mat-icon>{{ hideNewPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                  @if (passwordForm.get('newPassword')?.hasError('required') && passwordForm.get('newPassword')?.touched) {
                    <mat-error>Le nouveau mot de passe est requis</mat-error>
                  }
                  @if (passwordForm.get('newPassword')?.hasError('minlength') && passwordForm.get('newPassword')?.touched) {
                    <mat-error>Minimum 6 caracteres</mat-error>
                  }
                </mat-form-field>
              </div>

              <div class="field-animate field-animate-3">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Confirmer le nouveau mot de passe</mat-label>
                  <input matInput formControlName="confirmPassword"
                         [type]="hideConfirmPassword ? 'password' : 'text'">
                  <button mat-icon-button matSuffix type="button"
                          (click)="hideConfirmPassword = !hideConfirmPassword">
                    <mat-icon>{{ hideConfirmPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                  @if (passwordForm.get('confirmPassword')?.hasError('required') && passwordForm.get('confirmPassword')?.touched) {
                    <mat-error>La confirmation est requise</mat-error>
                  }
                </mat-form-field>
              </div>

              @if (passwordMismatch) {
                <p class="error-text">Les mots de passe ne correspondent pas</p>
              }

              <button mat-flat-button color="primary" type="submit" class="full-width submit-btn"
                      [disabled]="passwordForm.invalid || saving">
                @if (saving) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <mat-icon>lock_reset</mat-icon>
                  Changer le mot de passe
                }
              </button>
            </form>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      padding: 24px;
      max-width: 900px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 32px;
      padding: 28px 32px;
      background:
        radial-gradient(ellipse at 20% 50%, rgba(91, 108, 240, 0.9) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 20%, rgba(67, 56, 202, 0.8) 0%, transparent 50%),
        radial-gradient(ellipse at 60% 80%, rgba(56, 189, 248, 0.3) 0%, transparent 50%),
        linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      border-radius: var(--radius-xl);
      color: white;
      position: relative;
      overflow: hidden;
      &::before {
        content: '';
        position: absolute;
        top: -30px;
        right: -30px;
        width: 120px;
        height: 120px;
        border-radius: 50%;
        background: rgba(255,255,255,0.08);
      }
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background-image: radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
        background-size: 24px 24px;
        pointer-events: none;
      }
      h1 {
        margin: 0 0 4px;
        font-size: 24px;
        font-family: var(--font-heading);
        font-weight: 700;
        color: white;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      p {
        margin: 0;
        font-family: var(--font-body);
        color: rgba(255,255,255,0.8);
        font-size: 14px;
      }
    }

    .profile-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      align-items: start;
    }

    @media (max-width: 768px) {
      .profile-layout {
        grid-template-columns: 1fr;
      }
    }

    .info-card {
      padding: 20px;
      border-radius: var(--radius-xl) !important;
      border: 1px solid rgba(255, 255, 255, 0.5) !important;
      box-shadow: var(--shadow-sm) !important;
      background: rgba(255, 255, 255, 0.7) !important;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: all var(--transition-base);
      position: relative;
      &:hover {
        box-shadow: var(--shadow-md) !important;
        border-color: transparent !important;
        &::before { opacity: 1; }
      }
      &::before {
        content: '';
        position: absolute;
        inset: -1px;
        border-radius: inherit;
        padding: 1px;
        background: linear-gradient(135deg, var(--primary), var(--accent));
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        opacity: 0;
        transition: opacity var(--transition-base);
        pointer-events: none;
      }
    }

    .avatar {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      border-radius: 50%;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: adminAvatarGlow 3s ease-in-out infinite;
      mat-icon {
        color: white;
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    mat-card-header {
      margin-bottom: 16px;
      ::ng-deep .mat-mdc-card-header-text {
        .mat-mdc-card-title {
          font-family: var(--font-heading);
          font-weight: 700;
          color: var(--text-primary);
        }
        .mat-mdc-card-subtitle {
          font-family: var(--font-body);
          color: var(--text-secondary);
        }
      }
    }

    mat-divider {
      margin-bottom: 16px;
      border-color: var(--border-light) !important;
    }

    .info-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-radius: var(--radius-md);
      transition: background var(--transition-fast);
      &:hover {
        background: var(--bg-subtle);
      }
      mat-icon {
        color: var(--primary);
        width: 36px;
        height: 36px;
        font-size: 20px;
        background: var(--primary-light);
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      div {
        display: flex;
        flex-direction: column;
      }
    }

    .info-label {
      font-size: 12px;
      font-family: var(--font-body);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-value {
      font-size: 15px;
      font-family: var(--font-body);
      color: var(--text-primary);
      font-weight: 500;
    }

    .role-badge {
      color: var(--primary) !important;
      font-weight: 600 !important;
    }

    .password-card {
      padding: 20px;
      border-radius: var(--radius-xl) !important;
      border: 1px solid rgba(255, 255, 255, 0.5) !important;
      box-shadow: var(--shadow-sm) !important;
      background: rgba(255, 255, 255, 0.7) !important;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: all var(--transition-base);
      position: relative;
      &:hover {
        box-shadow: var(--shadow-md) !important;
        border-color: transparent !important;
        &::before { opacity: 1; }
      }
      &::before {
        content: '';
        position: absolute;
        inset: -1px;
        border-radius: inherit;
        padding: 1px;
        background: linear-gradient(135deg, var(--primary), var(--accent));
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        opacity: 0;
        transition: opacity var(--transition-base);
        pointer-events: none;
      }
    }

    .lock-icon {
      background: var(--warn-light);
      color: var(--warn);
      border-radius: var(--radius-md);
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .full-width {
      width: 100%;
    }

    .submit-btn {
      height: 44px;
      margin-top: 8px;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark)) !important;
      color: white !important;
      border-radius: var(--radius-md) !important;
      font-family: var(--font-body) !important;
      font-weight: 600 !important;
      position: relative;
      overflow: hidden;
      transition: box-shadow var(--transition-base), transform var(--transition-base);
      mat-icon {
        margin-right: 8px;
      }
      &:hover:not(:disabled) {
        box-shadow: 0 4px 16px rgba(91, 108, 240, 0.3);
        transform: translateY(-1px);
      }
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%);
        background-size: 200% 100%;
        opacity: 0;
        transition: opacity var(--transition-fast);
      }
      &:hover::after {
        opacity: 1;
        animation: shimmerMove 1.5s ease-in-out infinite;
      }
    }

    .error-text {
      color: var(--warn);
      font-size: 13px;
      font-family: var(--font-body);
      margin: -8px 0 8px;
    }

    .header-float {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      animation: adminFloat 12s ease-in-out infinite;
    }
    .header-float-1 {
      width: 70px;
      height: 70px;
      top: -15px;
      right: 12%;
      background: rgba(255,255,255,0.06);
    }
    .header-float-2 {
      width: 40px;
      height: 40px;
      bottom: -8px;
      left: 30%;
      background: rgba(255,255,255,0.04);
      animation-delay: -4s;
    }

    .field-animate {
      animation: fieldFadeUp 0.3s ease-out both;
    }
    .field-animate-1 { animation-delay: 0.05s; }
    .field-animate-2 { animation-delay: 0.1s; }
    .field-animate-3 { animation-delay: 0.15s; }
  `]
})
export class AdminProfileComponent {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private notification = inject(NotificationService);
  auth = inject(AuthService);

  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;
  saving = false;

  passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  });

  get passwordMismatch(): boolean {
    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();
    return confirmPassword.length > 0 && newPassword !== confirmPassword;
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid || this.passwordMismatch) return;

    this.saving = true;
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    const request: PasswordChangeRequest = { currentPassword, newPassword };

    this.http.post<ApiResponse>(
      `${environment.apiUrl}/api/user/change-password`,
      request
    ).subscribe({
      next: () => {
        this.notification.success('Mot de passe modifie avec succes');
        this.passwordForm.reset();
        this.saving = false;
      },
      error: () => {
        this.notification.error('Erreur lors du changement de mot de passe');
        this.saving = false;
      }
    });
  }
}
