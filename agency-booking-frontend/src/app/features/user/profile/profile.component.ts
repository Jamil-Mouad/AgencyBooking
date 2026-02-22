import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');

  if (!newPassword || !confirmPassword) return null;
  if (newPassword.value !== confirmPassword.value) {
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatDividerModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-bg">
          <div class="float-shape s1"></div>
          <div class="float-shape s2"></div>
          <div class="float-shape s3"></div>
        </div>
        <h1 class="page-title">Mon profil</h1>
        <p class="page-subtitle">Gérez vos informations personnelles</p>
      </div>

      <!-- Update Username -->
      <mat-card class="profile-card">
        <mat-card-header>
          <div class="card-avatar" mat-card-avatar>
            <mat-icon>person</mat-icon>
          </div>
          <mat-card-title>Nom d'utilisateur</mat-card-title>
          <mat-card-subtitle>Modifiez votre nom d'affichage</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="usernameForm" (ngSubmit)="updateUsername()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nouveau nom d'utilisateur</mat-label>
              <input matInput formControlName="username">
              <mat-icon matSuffix>edit</mat-icon>
              @if (usernameForm.get('username')?.hasError('required') && usernameForm.get('username')?.touched) {
                <mat-error>Le nom d'utilisateur est requis</mat-error>
              }
              @if (usernameForm.get('username')?.hasError('minlength') && usernameForm.get('username')?.touched) {
                <mat-error>Minimum 3 caractères</mat-error>
              }
            </mat-form-field>
            <button mat-flat-button color="primary" type="submit" class="btn-primary"
                    [disabled]="usernameForm.invalid || savingUsername">
              @if (savingUsername) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Enregistrer
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Change Password -->
      <mat-card class="profile-card">
        <mat-card-header>
          <div class="card-avatar" mat-card-avatar>
            <mat-icon>lock</mat-icon>
          </div>
          <mat-card-title>Mot de passe</mat-card-title>
          <mat-card-subtitle>Changez votre mot de passe</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Mot de passe actuel</mat-label>
              <input matInput formControlName="currentPassword" type="password">
              <mat-icon matSuffix>vpn_key</mat-icon>
              @if (passwordForm.get('currentPassword')?.hasError('required') && passwordForm.get('currentPassword')?.touched) {
                <mat-error>Le mot de passe actuel est requis</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nouveau mot de passe</mat-label>
              <input matInput formControlName="newPassword" type="password">
              <mat-icon matSuffix>lock_outline</mat-icon>
              @if (passwordForm.get('newPassword')?.hasError('required') && passwordForm.get('newPassword')?.touched) {
                <mat-error>Le nouveau mot de passe est requis</mat-error>
              }
              @if (passwordForm.get('newPassword')?.hasError('minlength') && passwordForm.get('newPassword')?.touched) {
                <mat-error>Minimum 8 caractères</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Confirmer le nouveau mot de passe</mat-label>
              <input matInput formControlName="confirmPassword" type="password">
              <mat-icon matSuffix>lock</mat-icon>
              @if (passwordForm.get('confirmPassword')?.hasError('required') && passwordForm.get('confirmPassword')?.touched) {
                <mat-error>La confirmation est requise</mat-error>
              }
              @if (passwordForm.get('confirmPassword')?.hasError('passwordMismatch') && passwordForm.get('confirmPassword')?.touched) {
                <mat-error>Les mots de passe ne correspondent pas</mat-error>
              }
            </mat-form-field>

            <button mat-flat-button color="primary" type="submit" class="btn-primary"
                    [disabled]="passwordForm.invalid || savingPassword">
              @if (savingPassword) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Changer le mot de passe
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Delete Account -->
      <mat-card class="profile-card danger-card">
        <mat-card-header>
          <div class="card-avatar danger-avatar" mat-card-avatar>
            <mat-icon>warning</mat-icon>
          </div>
          <mat-card-title>Supprimer mon compte</mat-card-title>
          <mat-card-subtitle>Cette action est irréversible</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (!showDeleteConfirm) {
            <button mat-stroked-button color="warn" (click)="showDeleteConfirm = true" class="btn-danger-outline">
              <mat-icon>delete_forever</mat-icon>
              Supprimer mon compte
            </button>
          }

          @if (showDeleteConfirm) {
            <div class="delete-confirm">
              <p class="delete-warning">
                Attention : toutes vos données seront supprimées définitivement.
                Entrez votre mot de passe pour confirmer.
              </p>
              <form [formGroup]="deleteForm" (ngSubmit)="deleteAccount()">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Mot de passe</mat-label>
                  <input matInput formControlName="password" type="password">
                  <mat-icon matSuffix>lock</mat-icon>
                  @if (deleteForm.get('password')?.hasError('required') && deleteForm.get('password')?.touched) {
                    <mat-error>Le mot de passe est requis</mat-error>
                  }
                </mat-form-field>
                <div class="delete-actions">
                  <button mat-button type="button" (click)="showDeleteConfirm = false" class="btn-cancel">Annuler</button>
                  <button mat-flat-button color="warn" type="submit" class="btn-danger"
                          [disabled]="deleteForm.invalid || deleting">
                    @if (deleting) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      Confirmer la suppression
                    }
                  </button>
                </div>
              </form>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 32px 24px;
      max-width: 620px;
    }

    .page-header {
      position: relative;
      overflow: hidden;
      padding: 28px 32px;
      margin-bottom: 32px;
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

    .page-title {
      font-family: var(--font-heading);
      font-size: 24px;
      font-weight: 700;
      color: white;
      margin: 0 0 4px;
      position: relative;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .page-subtitle {
      font-family: var(--font-body);
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
      margin: 0;
      position: relative;
    }

    .profile-card {
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-xl) !important;
      box-shadow: var(--shadow-sm);
      margin-bottom: 24px;
      padding: 12px 8px;
      transition: box-shadow var(--transition-base), transform var(--transition-base);
    }

    .profile-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }

    .profile-card mat-card-title {
      font-family: var(--font-heading) !important;
      font-weight: 600 !important;
      color: var(--text-primary) !important;
      font-size: 1.05rem !important;
    }

    .profile-card mat-card-subtitle {
      font-family: var(--font-body) !important;
      color: var(--text-secondary) !important;
      font-size: 0.85rem !important;
    }

    .card-avatar {
      background: var(--primary-light) !important;
      color: var(--primary) !important;
      border-radius: var(--radius-full) !important;
      width: 44px !important;
      height: 44px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 20px;
    }

    .card-avatar mat-icon {
      color: var(--primary);
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .danger-avatar {
      background: rgba(244, 63, 94, 0.08) !important;
      color: var(--warn) !important;
      border: 1.5px solid rgba(244, 63, 94, 0.2) !important;
    }

    .danger-avatar mat-icon {
      color: var(--warn) !important;
    }

    .danger-card {
      border: 1px solid rgba(244, 63, 94, 0.2) !important;
      background: var(--bg-card);
    }

    .danger-card:hover {
      box-shadow: 0 4px 16px rgba(244, 63, 94, 0.08);
    }

    .full-width {
      width: 100%;
      margin-bottom: 4px;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark)) !important;
      color: #fff !important;
      border-radius: var(--radius-md) !important;
      font-family: var(--font-heading) !important;
      font-weight: 600 !important;
      padding: 0 28px !important;
      height: 42px !important;
      letter-spacing: 0.01em;
      box-shadow: var(--shadow-xs);
      transition: box-shadow var(--transition-fast), transform var(--transition-fast) !important;
    }

    .btn-primary:hover:not([disabled]) {
      box-shadow: var(--shadow-md) !important;
      transform: translateY(-1px);
    }

    .btn-primary:disabled {
      opacity: 0.55;
    }

    .btn-danger-outline {
      border-color: rgba(244, 63, 94, 0.3) !important;
      color: var(--warn) !important;
      border-radius: var(--radius-md) !important;
      font-family: var(--font-heading) !important;
      font-weight: 600 !important;
      padding: 0 24px !important;
      height: 42px !important;
      transition: background var(--transition-fast), border-color var(--transition-fast) !important;
    }

    .btn-danger-outline:hover {
      background: rgba(244, 63, 94, 0.06) !important;
      border-color: rgba(244, 63, 94, 0.5) !important;
    }

    .btn-danger {
      background: linear-gradient(135deg, var(--warn), #e11d48) !important;
      color: #fff !important;
      border-radius: var(--radius-md) !important;
      font-family: var(--font-heading) !important;
      font-weight: 600 !important;
      padding: 0 24px !important;
      height: 42px !important;
      box-shadow: 0 2px 8px rgba(244, 63, 94, 0.18);
      transition: box-shadow var(--transition-fast), transform var(--transition-fast) !important;
    }

    .btn-danger:hover:not([disabled]) {
      box-shadow: 0 4px 16px rgba(244, 63, 94, 0.25) !important;
      transform: translateY(-1px);
    }

    .btn-cancel {
      color: var(--text-secondary) !important;
      border-radius: var(--radius-md) !important;
      font-family: var(--font-body) !important;
      font-weight: 500 !important;
      transition: color var(--transition-fast), background var(--transition-fast) !important;
    }

    .btn-cancel:hover {
      color: var(--text-primary) !important;
      background: var(--bg-subtle) !important;
    }

    .delete-confirm {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--border-light);
    }

    .delete-warning {
      color: var(--warn);
      font-family: var(--font-body);
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 20px;
      line-height: 1.6;
      background: rgba(244, 63, 94, 0.05);
      padding: 12px 16px;
      border-radius: var(--radius-md);
      border-left: 3px solid var(--warn);
    }

    .delete-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      align-items: center;
    }

    /* Form field styling */
    :host ::ng-deep {
      .mat-mdc-form-field {
        font-family: var(--font-body) !important;
      }

      .mat-mdc-text-field-wrapper {
        border-radius: var(--radius-md) !important;
      }

      .mdc-text-field--outlined .mdc-notched-outline .mdc-notched-outline__leading,
      .mdc-text-field--outlined .mdc-notched-outline .mdc-notched-outline__notch,
      .mdc-text-field--outlined .mdc-notched-outline .mdc-notched-outline__trailing {
        border-color: var(--border) !important;
      }

      .mdc-text-field--outlined:hover .mdc-notched-outline .mdc-notched-outline__leading,
      .mdc-text-field--outlined:hover .mdc-notched-outline .mdc-notched-outline__notch,
      .mdc-text-field--outlined:hover .mdc-notched-outline .mdc-notched-outline__trailing {
        border-color: var(--primary) !important;
      }

      .mat-mdc-form-field-icon-suffix mat-icon {
        color: var(--text-muted) !important;
      }

      .mat-mdc-card-header {
        padding: 16px 20px !important;
      }

      .mat-mdc-card-content {
        padding: 4px 20px 20px !important;
      }

      .mat-mdc-card-content:last-child {
        padding-bottom: 24px !important;
      }
    }
  `]
})
export class UserProfileComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notification = inject(NotificationService);
  private apiUrl = environment.apiUrl;

  savingUsername = false;
  savingPassword = false;
  deleting = false;
  showDeleteConfirm = false;

  usernameForm = this.fb.nonNullable.group({
    username: [this.authService.currentUser?.username || '', [Validators.required, Validators.minLength(3)]]
  });

  passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator });

  deleteForm = this.fb.nonNullable.group({
    password: ['', [Validators.required]]
  });

  updateUsername(): void {
    if (this.usernameForm.invalid) return;

    this.savingUsername = true;
    const { username } = this.usernameForm.getRawValue();

    this.http.post<ApiResponse>(`${this.apiUrl}/api/user/update-username`, { username }).subscribe({
      next: () => {
        this.savingUsername = false;
        this.authService.updateUsername(username);
        this.notification.success('Nom d\'utilisateur mis à jour');
      },
      error: () => {
        this.savingUsername = false;
      }
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;

    this.savingPassword = true;
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();

    this.http.post<ApiResponse>(`${this.apiUrl}/api/user/change-password`, {
      currentPassword,
      newPassword
    }).subscribe({
      next: () => {
        this.savingPassword = false;
        this.passwordForm.reset();
        this.notification.success('Mot de passe modifié avec succès');
      },
      error: () => {
        this.savingPassword = false;
      }
    });
  }

  deleteAccount(): void {
    if (this.deleteForm.invalid) return;

    this.deleting = true;
    const { password } = this.deleteForm.getRawValue();

    this.http.post<ApiResponse>(`${this.apiUrl}/api/user/delete-account`, { password }).subscribe({
      next: () => {
        this.deleting = false;
        this.notification.success('Compte supprimé');
        this.authService.logout();
      },
      error: () => {
        this.deleting = false;
      }
    });
  }
}
