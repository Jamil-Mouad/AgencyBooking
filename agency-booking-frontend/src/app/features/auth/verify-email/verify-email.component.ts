import { Component, inject, OnInit, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-verify-email',
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
            <mat-icon>mark_email_read</mat-icon>
          </div>
          <h2 class="auth-title">Vérification email</h2>
          <p class="auth-subtitle">Entrez le code envoyé à {{ email }}</p>

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <!-- Hidden input for form control -->
            <input type="hidden" formControlName="code">

            <!-- 6 digit boxes -->
            <div class="code-boxes">
              @for (i of digitIndexes; track i) {
                <input
                  #digitInput
                  type="text"
                  maxlength="1"
                  class="digit-box"
                  [value]="digits[i]"
                  (input)="onDigitInput($event, i)"
                  (keydown)="onDigitKeydown($event, i)"
                  (paste)="onPaste($event)"
                  inputmode="numeric"
                  pattern="[0-9]"
                  autocomplete="one-time-code"
                >
              }
            </div>

            @if (form.get('code')?.hasError('required') && form.get('code')?.touched) {
              <p class="code-error">Le code est requis</p>
            }
            @if (form.get('code')?.hasError('minlength') && form.get('code')?.touched) {
              <p class="code-error">Le code doit contenir 6 chiffres</p>
            }

            <button mat-flat-button color="primary" type="submit" class="full-width submit-btn"
                    [disabled]="form.invalid || loading">
              @if (loading) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Vérifier
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
      word-break: break-all;
    }

    .full-width { width: 100%; }

    .code-boxes {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 24px;
    }

    .digit-box {
      width: 48px;
      height: 56px;
      border: 2px solid var(--border);
      border-radius: var(--radius-md);
      text-align: center;
      font-size: 1.5rem;
      font-weight: 600;
      font-family: var(--font-heading);
      color: var(--text-primary);
      background: var(--bg-card);
      outline: none;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
      -moz-appearance: textfield;

      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      &:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(91, 108, 240, 0.12);
      }
    }

    .code-error {
      text-align: center;
      color: var(--warn);
      font-size: 13px;
      margin: -16px 0 16px;
    }

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
export class VerifyEmailComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);

  @ViewChildren('digitInput') digitInputs!: QueryList<ElementRef<HTMLInputElement>>;

  email = '';
  loading = false;
  digits: string[] = ['', '', '', '', '', ''];
  digitIndexes = [0, 1, 2, 3, 4, 5];

  form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParams['email'] || '';
    if (!this.email) {
      this.router.navigate(['/auth/register']);
    }
  }

  onDigitInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/[^0-9]/g, '');
    input.value = value;
    this.digits[index] = value;
    this.updateFormCode();

    if (value && index < 5) {
      const inputs = this.digitInputs.toArray();
      inputs[index + 1]?.nativeElement.focus();
    }
  }

  onDigitKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      const inputs = this.digitInputs.toArray();
      this.digits[index - 1] = '';
      inputs[index - 1]?.nativeElement.focus();
      this.updateFormCode();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text')?.replace(/[^0-9]/g, '') || '';
    for (let i = 0; i < 6; i++) {
      this.digits[i] = pasted[i] || '';
    }
    this.updateFormCode();
    const inputs = this.digitInputs.toArray();
    const focusIdx = Math.min(pasted.length, 5);
    inputs[focusIdx]?.nativeElement.focus();
  }

  private updateFormCode(): void {
    const code = this.digits.join('');
    this.form.patchValue({ code });
    if (code.length === 6) {
      this.form.get('code')?.markAsTouched();
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    this.authService.verifyEmail({
      email: this.email,
      code: this.form.getRawValue().code
    }).subscribe({
      next: () => {
        this.loading = false;
        this.notification.success('Email vérifié avec succès ! Vous pouvez maintenant vous connecter.');
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
