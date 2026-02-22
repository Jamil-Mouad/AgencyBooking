import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
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
            <mat-icon>lock_reset</mat-icon>
          </div>
          <h2 class="auth-title">Mot de passe oublié</h2>
          <p class="auth-subtitle">Entrez votre email pour recevoir un code de réinitialisation</p>

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" placeholder="votre@email.com">
              <mat-icon matSuffix>email</mat-icon>
              @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
                <mat-error>L'email est requis</mat-error>
              }
              @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
                <mat-error>Format d'email invalide</mat-error>
              }
            </mat-form-field>

            <button mat-flat-button color="primary" type="submit" class="full-width submit-btn"
                    [disabled]="form.invalid || loading">
              @if (loading) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Envoyer le code
              }
            </button>
          </form>

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
      margin: 0 0 28px;
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
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notification = inject(NotificationService);

  loading = false;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    const email = this.form.getRawValue().email;

    this.authService.requestPasswordReset({ email }).subscribe({
      next: () => {
        this.loading = false;
        this.notification.success('Code de réinitialisation envoyé à votre email.');
        this.router.navigate(['/auth/reset-password'], {
          queryParams: { email }
        });
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
