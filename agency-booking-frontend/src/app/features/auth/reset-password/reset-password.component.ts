import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

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
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatStepperModule
  ],
  template: `
    <div class="auth-container">
      <div class="bg-circles">
        <div class="bg-circle" style="width: 200px; height: 200px; top: 10%; left: -6%; animation-delay: 0s;"></div>
        <div class="bg-circle" style="width: 140px; height: 140px; bottom: 15%; right: -4%; animation-delay: 3s;"></div>
      </div>
      <mat-card class="auth-card">
        <div class="auth-card-inner">
          <div class="brand-icon">
            <mat-icon>lock_open</mat-icon>
          </div>
          <h2 class="auth-title">Réinitialisation du mot de passe</h2>
          <p class="auth-subtitle">{{ email }}</p>

          <!-- Step indicator -->
          <div class="step-indicator">
            <div class="step-dot" [class.active]="step >= 1" [class.done]="step > 1"></div>
            <div class="step-line" [class.active]="step > 1"></div>
            <div class="step-dot" [class.active]="step >= 2"></div>
          </div>
          <div class="step-labels">
            <span [class.active]="step === 1">Vérification</span>
            <span [class.active]="step === 2">Nouveau mot de passe</span>
          </div>

          @if (step === 1) {
            <form [formGroup]="codeForm" (ngSubmit)="verifyCode()">
              <p class="step-info">Entrez le code de vérification reçu par email</p>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Code de vérification</mat-label>
                <input matInput formControlName="code" placeholder="000000" maxlength="6">
                <mat-icon matSuffix>pin</mat-icon>
                @if (codeForm.get('code')?.hasError('required') && codeForm.get('code')?.touched) {
                  <mat-error>Le code est requis</mat-error>
                }
                @if (codeForm.get('code')?.hasError('minlength') && codeForm.get('code')?.touched) {
                  <mat-error>Le code doit contenir 6 chiffres</mat-error>
                }
              </mat-form-field>

              <button mat-flat-button color="primary" type="submit" class="full-width submit-btn"
                      [disabled]="codeForm.invalid || loading">
                @if (loading) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Vérifier le code
                }
              </button>
            </form>
          }

          @if (step === 2) {
            <form [formGroup]="passwordForm" (ngSubmit)="resetPassword()">
              <p class="step-info">Choisissez votre nouveau mot de passe</p>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nouveau mot de passe</mat-label>
                <input matInput formControlName="newPassword" [type]="hidePassword ? 'password' : 'text'">
                <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
                  <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                @if (passwordForm.get('newPassword')?.hasError('required') && passwordForm.get('newPassword')?.touched) {
                  <mat-error>Le mot de passe est requis</mat-error>
                }
                @if (passwordForm.get('newPassword')?.hasError('minlength') && passwordForm.get('newPassword')?.touched) {
                  <mat-error>Minimum 8 caractères</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Confirmer le mot de passe</mat-label>
                <input matInput formControlName="confirmPassword" [type]="hideConfirm ? 'password' : 'text'">
                <button mat-icon-button matSuffix type="button" (click)="hideConfirm = !hideConfirm">
                  <mat-icon>{{ hideConfirm ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                @if (passwordForm.get('confirmPassword')?.hasError('required') && passwordForm.get('confirmPassword')?.touched) {
                  <mat-error>La confirmation est requise</mat-error>
                }
                @if (passwordForm.get('confirmPassword')?.hasError('passwordMismatch') && passwordForm.get('confirmPassword')?.touched) {
                  <mat-error>Les mots de passe ne correspondent pas</mat-error>
                }
              </mat-form-field>

              <button mat-flat-button color="primary" type="submit" class="full-width submit-btn"
                      [disabled]="passwordForm.invalid || loading">
                @if (loading) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Réinitialiser le mot de passe
                }
              </button>
            </form>
          }

          <div class="bottom-link">
            <a routerLink="/auth/login">Retour à la connexion</a>
          </div>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-card-inner {
      padding: 40px;
    }

    .brand-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--primary-light);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;

      mat-icon {
        color: var(--primary);
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    .auth-title {
      font-family: var(--font-heading);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      text-align: center;
      margin: 0 0 6px;
    }

    .auth-subtitle {
      font-family: var(--font-body);
      font-size: 0.9rem;
      color: var(--text-secondary);
      text-align: center;
      margin: 0 0 20px;
      word-break: break-all;
    }

    .step-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      margin-bottom: 8px;
    }

    .step-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--border);
      transition: background var(--transition-base), transform var(--transition-base);

      &.active {
        background: var(--primary);
        transform: scale(1.1);
      }

      &.done {
        background: var(--success);
      }
    }

    .step-line {
      width: 60px;
      height: 3px;
      background: var(--border);
      border-radius: var(--radius-full);
      transition: background var(--transition-base);

      &.active {
        background: var(--success);
      }
    }

    .step-labels {
      display: flex;
      justify-content: center;
      gap: 40px;
      margin-bottom: 24px;

      span {
        font-size: 12px;
        color: var(--text-muted);
        font-weight: 500;
        transition: color var(--transition-fast);

        &.active {
          color: var(--primary);
          font-weight: 600;
        }
      }
    }

    .full-width { width: 100%; }

    .submit-btn {
      height: 48px;
      font-size: 16px;
      margin-top: 8px;
      border-radius: var(--radius-md) !important;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%) !important;
      color: white !important;
      font-weight: 600 !important;
      letter-spacing: 0 !important;
    }

    .step-info {
      color: var(--text-secondary);
      font-size: 14px;
      margin-bottom: 16px;
      text-align: center;
    }

    .bottom-link {
      text-align: center;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid var(--border-light);

      a {
        color: var(--primary);
        text-decoration: none;
        font-size: 14px;
        font-weight: 600;

        &:hover { text-decoration: underline; }
      }
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);

  email = '';
  step = 1;
  verifiedCode = '';
  loading = false;
  hidePassword = true;
  hideConfirm = true;

  codeForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  passwordForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator });

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParams['email'] || '';
    if (!this.email) {
      this.router.navigate(['/auth/forgot-password']);
    }
  }

  verifyCode(): void {
    if (this.codeForm.invalid) return;

    this.loading = true;
    const code = this.codeForm.getRawValue().code;

    this.authService.verifyResetCode({ email: this.email, code }).subscribe({
      next: () => {
        this.loading = false;
        this.verifiedCode = code;
        this.step = 2;
        this.notification.success('Code vérifié avec succès.');
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  resetPassword(): void {
    if (this.passwordForm.invalid) return;

    this.loading = true;
    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();

    this.authService.resetPassword({
      email: this.email,
      code: this.verifiedCode,
      newPassword,
      confirmPassword
    }).subscribe({
      next: () => {
        this.loading = false;
        this.notification.success('Mot de passe réinitialisé avec succès !');
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
