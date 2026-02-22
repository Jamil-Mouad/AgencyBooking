import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { environment } from '../../../../environments/environment';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const passwordConfirm = control.get('passwordConfirm');

  if (!password || !passwordConfirm) return null;
  if (password.value !== passwordConfirm.value) {
    passwordConfirm.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="auth-split-layout">
      <!-- Left Decorative Panel -->
      <div class="auth-brand-panel">
        <div class="brand-mesh-bg"></div>

        <!-- Floating decorative shapes -->
        <div class="brand-floating-shapes">
          <div class="floating-shape shape-circle shape-1"></div>
          <div class="floating-shape shape-square shape-2"></div>
          <div class="floating-shape shape-circle shape-3"></div>
          <div class="floating-shape shape-square shape-4"></div>
          <div class="floating-shape shape-circle shape-5"></div>
          <div class="floating-shape shape-donut shape-6"></div>
        </div>

        <!-- Geometric illustration -->
        <div class="brand-illustration">
          <div class="geo-people">
            <div class="geo-person p1">
              <div class="person-head"></div>
              <div class="person-body"></div>
            </div>
            <div class="geo-person p2">
              <div class="person-head"></div>
              <div class="person-body"></div>
            </div>
            <div class="geo-person p3">
              <div class="person-head"></div>
              <div class="person-body"></div>
            </div>
          </div>
          <div class="geo-plus-badge">
            <mat-icon>person_add</mat-icon>
          </div>
        </div>

        <div class="brand-content">
          <div class="brand-logo">
            <div class="brand-logo-icon">
              <mat-icon>travel_explore</mat-icon>
            </div>
            <h1 class="brand-name">AgencyBooking</h1>
          </div>
          <p class="brand-tagline">Creez votre compte et commencez a reserver</p>

          <div class="brand-features">
            <div class="brand-feature feature-stagger-1">
              <div class="feature-icon-wrap">
                <mat-icon>event_available</mat-icon>
              </div>
              <div class="feature-text">
                <strong>Reservation simple</strong>
                <span>Reservez en quelques clics</span>
              </div>
            </div>
            <div class="brand-feature feature-stagger-2">
              <div class="feature-icon-wrap">
                <mat-icon>speed</mat-icon>
              </div>
              <div class="feature-text">
                <strong>Suivi en temps reel</strong>
                <span>Gerez vos reservations facilement</span>
              </div>
            </div>
            <div class="brand-feature feature-stagger-3">
              <div class="feature-icon-wrap">
                <mat-icon>verified_user</mat-icon>
              </div>
              <div class="feature-text">
                <strong>100% Securise</strong>
                <span>Vos donnees sont protegees</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Form Panel -->
      <div class="auth-form-panel">
        <div class="auth-form-wrapper">
          <!-- Mobile brand header -->
          <div class="mobile-brand-header">
            <div class="brand-logo-icon small">
              <mat-icon>travel_explore</mat-icon>
            </div>
            <span class="mobile-brand-name">AgencyBooking</span>
          </div>

          <div class="auth-glass-card" [class.shake]="shakeForm">
            <div class="glass-card-inner">
              <div class="form-header">
                <div class="form-icon-wrap">
                  <mat-icon>person_add</mat-icon>
                  <div class="icon-ring"></div>
                </div>
                <h2 class="auth-title">Inscription</h2>
                <p class="auth-subtitle">Creez votre compte gratuitement</p>
              </div>

              <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="form-field-animate field-delay-1">
                  <mat-form-field appearance="outline" class="full-width auth-field">
                    <mat-label>Nom d'utilisateur</mat-label>
                    <input matInput formControlName="username" placeholder="Votre nom d'utilisateur">
                    <mat-icon matSuffix class="field-icon">person</mat-icon>
                    @if (form.get('username')?.hasError('required') && form.get('username')?.touched) {
                      <mat-error>Le nom d'utilisateur est requis</mat-error>
                    }
                    @if (form.get('username')?.hasError('minlength') && form.get('username')?.touched) {
                      <mat-error>Minimum 3 caracteres</mat-error>
                    }
                  </mat-form-field>
                </div>

                <div class="form-field-animate field-delay-2">
                  <mat-form-field appearance="outline" class="full-width auth-field">
                    <mat-label>Email</mat-label>
                    <input matInput formControlName="email" type="email" placeholder="votre@email.com">
                    <mat-icon matSuffix class="field-icon">email</mat-icon>
                    @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
                      <mat-error>L'email est requis</mat-error>
                    }
                    @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
                      <mat-error>Format d'email invalide</mat-error>
                    }
                  </mat-form-field>
                </div>

                <div class="form-field-animate field-delay-3">
                  <mat-form-field appearance="outline" class="full-width auth-field">
                    <mat-label>Mot de passe</mat-label>
                    <input matInput formControlName="password" [type]="hidePassword ? 'password' : 'text'">
                    <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword"
                            class="password-toggle-btn">
                      <mat-icon class="toggle-icon" [class.toggled]="!hidePassword">
                        {{ hidePassword ? 'visibility_off' : 'visibility' }}
                      </mat-icon>
                    </button>
                    @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
                      <mat-error>Le mot de passe est requis</mat-error>
                    }
                    @if (form.get('password')?.hasError('minlength') && form.get('password')?.touched) {
                      <mat-error>Minimum 8 caracteres</mat-error>
                    }
                  </mat-form-field>
                </div>

                <!-- Password Strength Indicator -->
                @if (form.get('password')?.value) {
                  <div class="form-field-animate" style="animation-delay: 0.1s;">
                    <div class="password-strength-section">
                      <!-- Strength bar -->
                      <div class="strength-track">
                        <div class="strength-fill"
                             [style.width.%]="passwordStrength * 25"
                             [style.background]="strengthGradient">
                        </div>
                      </div>
                      <div class="strength-label-row">
                        <span class="strength-label" [style.color]="strengthColor">{{ strengthLabel }}</span>
                      </div>

                      <!-- Criteria checklist -->
                      <div class="criteria-list">
                        <div class="criteria-item" [class.met]="hasMinLength">
                          <div class="criteria-check">
                            <mat-icon>{{ hasMinLength ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                          </div>
                          <span>8 caracteres minimum</span>
                        </div>
                        <div class="criteria-item" [class.met]="hasUppercase">
                          <div class="criteria-check">
                            <mat-icon>{{ hasUppercase ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                          </div>
                          <span>Une lettre majuscule</span>
                        </div>
                        <div class="criteria-item" [class.met]="hasNumber">
                          <div class="criteria-check">
                            <mat-icon>{{ hasNumber ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                          </div>
                          <span>Un chiffre</span>
                        </div>
                        <div class="criteria-item" [class.met]="hasSpecialChar">
                          <div class="criteria-check">
                            <mat-icon>{{ hasSpecialChar ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                          </div>
                          <span>Un caractere special</span>
                        </div>
                      </div>
                    </div>
                  </div>
                }

                <div class="form-field-animate field-delay-4">
                  <mat-form-field appearance="outline" class="full-width auth-field">
                    <mat-label>Confirmer le mot de passe</mat-label>
                    <input matInput formControlName="passwordConfirm" [type]="hidePasswordConfirm ? 'password' : 'text'">
                    <button mat-icon-button matSuffix type="button" (click)="hidePasswordConfirm = !hidePasswordConfirm"
                            class="password-toggle-btn">
                      <mat-icon class="toggle-icon" [class.toggled]="!hidePasswordConfirm">
                        {{ hidePasswordConfirm ? 'visibility_off' : 'visibility' }}
                      </mat-icon>
                    </button>
                    @if (form.get('passwordConfirm')?.hasError('required') && form.get('passwordConfirm')?.touched) {
                      <mat-error>La confirmation est requise</mat-error>
                    }
                    @if (form.get('passwordConfirm')?.hasError('passwordMismatch') && form.get('passwordConfirm')?.touched) {
                      <mat-error>Les mots de passe ne correspondent pas</mat-error>
                    }
                  </mat-form-field>
                </div>

                <div class="form-field-animate field-delay-5">
                  <button mat-flat-button color="primary" type="submit"
                          class="full-width submit-btn premium-btn"
                          [disabled]="form.invalid || loading"
                          [class.loading]="loading">
                    @if (loading) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      <span class="btn-content">
                        <mat-icon class="btn-icon">how_to_reg</mat-icon>
                        Creer mon compte
                      </span>
                    }
                    <div class="btn-shimmer"></div>
                  </button>
                </div>
              </form>

              <div class="form-field-animate field-delay-6">
                <div class="social-proof">
                  <div class="avatar-stack">
                    <div class="mini-avatar" style="background: #5b6cf0;">M</div>
                    <div class="mini-avatar" style="background: #10b981;">A</div>
                    <div class="mini-avatar" style="background: #f59e42;">S</div>
                  </div>
                  <span>Rejoignez <strong>+{{ userCount }}</strong> utilisateurs</span>
                </div>
              </div>

              <div class="form-field-animate field-delay-6">
                <div class="bottom-link">
                  Deja un compte ?
                  <a routerLink="/auth/login">
                    <span class="link-text">Se connecter</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ===== Split Layout ===== */
    .auth-split-layout {
      display: flex;
      min-height: 100vh;
      width: 100%;
    }

    /* ===== Left Brand Panel ===== */
    .auth-brand-panel {
      position: relative;
      width: 45%;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 48px;
      overflow: hidden;
    }

    .brand-mesh-bg {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse at 20% 50%, rgba(91, 108, 240, 0.35) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 20%, rgba(56, 189, 248, 0.25) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 80%, rgba(99, 102, 241, 0.3) 0%, transparent 55%),
        radial-gradient(ellipse at 90% 90%, rgba(244, 63, 94, 0.1) 0%, transparent 40%),
        linear-gradient(135deg, #1e1b3a 0%, #312e81 50%, #1e1b3a 100%);
      animation: meshShift 12s ease-in-out infinite alternate;
      z-index: 0;
    }

    @keyframes meshShift {
      0% {
        background:
          radial-gradient(ellipse at 20% 50%, rgba(91, 108, 240, 0.35) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 20%, rgba(56, 189, 248, 0.25) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 80%, rgba(99, 102, 241, 0.3) 0%, transparent 55%),
          radial-gradient(ellipse at 90% 90%, rgba(244, 63, 94, 0.1) 0%, transparent 40%),
          linear-gradient(135deg, #1e1b3a 0%, #312e81 50%, #1e1b3a 100%);
      }
      50% {
        background:
          radial-gradient(ellipse at 40% 30%, rgba(91, 108, 240, 0.4) 0%, transparent 60%),
          radial-gradient(ellipse at 60% 70%, rgba(56, 189, 248, 0.3) 0%, transparent 50%),
          radial-gradient(ellipse at 30% 60%, rgba(99, 102, 241, 0.25) 0%, transparent 55%),
          radial-gradient(ellipse at 70% 10%, rgba(244, 63, 94, 0.15) 0%, transparent 40%),
          linear-gradient(135deg, #1e1b3a 0%, #312e81 50%, #1e1b3a 100%);
      }
      100% {
        background:
          radial-gradient(ellipse at 60% 40%, rgba(91, 108, 240, 0.3) 0%, transparent 60%),
          radial-gradient(ellipse at 20% 80%, rgba(56, 189, 248, 0.2) 0%, transparent 50%),
          radial-gradient(ellipse at 70% 50%, rgba(99, 102, 241, 0.35) 0%, transparent 55%),
          radial-gradient(ellipse at 30% 20%, rgba(244, 63, 94, 0.12) 0%, transparent 40%),
          linear-gradient(135deg, #1e1b3a 0%, #312e81 50%, #1e1b3a 100%);
      }
    }

    /* Floating shapes */
    .brand-floating-shapes {
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
    }

    .floating-shape {
      position: absolute;
      animation: float 10s ease-in-out infinite;
    }

    .shape-circle {
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .shape-square {
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      transform: rotate(15deg);
    }

    .shape-donut {
      border-radius: 50%;
      background: transparent;
      border: 3px solid rgba(255, 255, 255, 0.08);
    }

    .shape-1 { width: 80px; height: 80px; top: 10%; left: 10%; animation-delay: 0s; }
    .shape-2 { width: 60px; height: 60px; top: 20%; right: 15%; animation-delay: 2s; }
    .shape-3 { width: 40px; height: 40px; bottom: 30%; left: 20%; animation-delay: 4s; }
    .shape-4 { width: 50px; height: 50px; bottom: 15%; right: 10%; animation-delay: 1s; }
    .shape-5 { width: 24px; height: 24px; top: 50%; left: 60%; animation-delay: 3s; }
    .shape-6 { width: 70px; height: 70px; top: 65%; right: 25%; animation-delay: 5s; }

    /* Geometric illustration - People */
    .brand-illustration {
      position: relative;
      z-index: 2;
      margin-bottom: 40px;
      display: flex;
      align-items: flex-end;
      gap: 16px;
    }

    .geo-people {
      display: flex;
      gap: 10px;
      align-items: flex-end;
    }

    .geo-person {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      opacity: 0.8;
    }

    .person-head {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      border: 1.5px solid rgba(255, 255, 255, 0.15);
    }

    .person-body {
      width: 28px;
      height: 32px;
      border-radius: 8px 8px 0 0;
      background: rgba(255, 255, 255, 0.1);
      border: 1.5px solid rgba(255, 255, 255, 0.1);
      border-bottom: none;
    }

    .p1 {
      .person-head { background: rgba(91, 108, 240, 0.35); }
      .person-body { background: rgba(91, 108, 240, 0.15); }
    }

    .p2 {
      transform: scale(1.15);
      opacity: 1;
      .person-head { background: rgba(56, 189, 248, 0.35); }
      .person-body { background: rgba(56, 189, 248, 0.15); }
    }

    .p3 {
      .person-head { background: rgba(16, 185, 129, 0.35); }
      .person-body { background: rgba(16, 185, 129, 0.15); }
    }

    .geo-plus-badge {
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: warmGlow 3s ease-in-out infinite;

      mat-icon {
        color: rgba(91, 108, 240, 0.8);
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    /* Brand content */
    .brand-content {
      position: relative;
      z-index: 2;
      text-align: center;
    }

    .brand-logo {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .brand-logo-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        color: white;
        font-size: 26px;
        width: 26px;
        height: 26px;
      }

      &.small {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: var(--primary-light);
        backdrop-filter: none;
        border: none;

        mat-icon {
          color: var(--primary);
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }
    }

    .brand-name {
      font-family: var(--font-heading);
      font-size: 1.75rem;
      font-weight: 800;
      color: white;
      margin: 0;
      letter-spacing: -0.5px;
    }

    .brand-tagline {
      font-family: var(--font-body);
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.9rem;
      margin: 0 0 40px;
    }

    .brand-features {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      max-width: 300px;
      margin: 0 auto;
    }

    .brand-feature {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      opacity: 0;
      animation: featureSlideIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }

    .feature-stagger-1 { animation-delay: 0.3s; }
    .feature-stagger-2 { animation-delay: 0.5s; }
    .feature-stagger-3 { animation-delay: 0.7s; }

    @keyframes featureSlideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .feature-icon-wrap {
      width: 38px;
      height: 38px;
      min-width: 38px;
      border-radius: 10px;
      background: rgba(91, 108, 240, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        color: rgba(255, 255, 255, 0.9);
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .feature-text {
      display: flex;
      flex-direction: column;
      gap: 2px;

      strong {
        color: white;
        font-size: 0.85rem;
        font-weight: 600;
        font-family: var(--font-heading);
      }

      span {
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.75rem;
        font-family: var(--font-body);
      }
    }

    /* ===== Right Form Panel ===== */
    .auth-form-panel {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      background:
        radial-gradient(ellipse at 80% 20%, rgba(91, 108, 240, 0.04) 0%, transparent 50%),
        radial-gradient(ellipse at 20% 80%, rgba(56, 189, 248, 0.03) 0%, transparent 50%),
        var(--bg-main);
      position: relative;
      overflow-y: auto;
    }

    .auth-form-wrapper {
      width: 100%;
      max-width: 460px;
      padding: 20px 0;
    }

    /* Mobile header */
    .mobile-brand-header {
      display: none;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
      justify-content: center;
    }

    .mobile-brand-name {
      font-family: var(--font-heading);
      font-weight: 700;
      font-size: 1.1rem;
      color: var(--text-primary);
    }

    /* ===== Glass Card ===== */
    .auth-glass-card {
      position: relative;
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      border-radius: var(--radius-xl);
      box-shadow:
        0 8px 32px rgba(91, 108, 240, 0.08),
        0 2px 8px rgba(0, 0, 0, 0.04),
        inset 0 1px 0 rgba(255, 255, 255, 0.6);
      overflow: hidden;
    }

    @property --border-angle {
      syntax: '<angle>';
      initial-value: 0deg;
      inherits: false;
    }

    .auth-glass-card::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: var(--radius-xl);
      padding: 1.5px;
      background: conic-gradient(
        from var(--border-angle, 0deg),
        rgba(91, 108, 240, 0.4),
        rgba(56, 189, 248, 0.2),
        rgba(99, 102, 241, 0.1),
        transparent,
        rgba(91, 108, 240, 0.4)
      );
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      animation: rotateBorder 6s linear infinite;
      z-index: 0;
      pointer-events: none;
    }

    @keyframes rotateBorder {
      to { --border-angle: 360deg; }
    }

    .glass-card-inner {
      padding: 36px 32px;
      position: relative;
      z-index: 1;
    }

    /* Shake animation */
    .shake {
      animation: shake 0.5s ease-in-out;
    }

    /* Form header */
    .form-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .form-icon-wrap {
      position: relative;
      width: 60px;
      height: 60px;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
        color: var(--primary);
        z-index: 1;
      }
    }

    .icon-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: var(--primary-light);
      animation: warmGlow 3s ease-in-out infinite;

      &::after {
        content: '';
        position: absolute;
        inset: 6px;
        border-radius: 50%;
        border: 2px dashed rgba(91, 108, 240, 0.2);
        animation: spinSlow 12s linear infinite;
      }
    }

    @keyframes spinSlow {
      to { transform: rotate(360deg); }
    }

    .auth-title {
      font-family: var(--font-heading);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 4px;
    }

    .auth-subtitle {
      font-family: var(--font-body);
      font-size: 0.88rem;
      color: var(--text-secondary);
      margin: 0;
    }

    /* ===== Form field animations ===== */
    .form-field-animate {
      opacity: 0;
      animation: fieldFadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }

    .field-delay-1 { animation-delay: 0.1s; }
    .field-delay-2 { animation-delay: 0.18s; }
    .field-delay-3 { animation-delay: 0.26s; }
    .field-delay-4 { animation-delay: 0.34s; }
    .field-delay-5 { animation-delay: 0.42s; }
    .field-delay-6 { animation-delay: 0.50s; }

    @keyframes fieldFadeUp {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ===== Form fields ===== */
    .full-width { width: 100%; }

    .auth-field {
      .field-icon {
        color: var(--text-muted);
        transition: color var(--transition-base);
      }

      &.mat-focused .field-icon {
        color: var(--primary);
      }
    }

    .password-toggle-btn {
      .toggle-icon {
        transition: transform var(--transition-base), color var(--transition-base);
        color: var(--text-muted);
      }

      &:hover .toggle-icon {
        color: var(--primary);
      }

      .toggle-icon.toggled {
        transform: rotate(180deg);
        color: var(--primary);
      }
    }

    /* ===== Password Strength Section ===== */
    .password-strength-section {
      margin: -4px 0 16px;
      padding: 14px 16px;
      border-radius: var(--radius-md);
      background: var(--bg-subtle);
      border: 1px solid var(--border-light);
    }

    .strength-track {
      height: 6px;
      border-radius: var(--radius-full);
      background: var(--border);
      overflow: hidden;
      margin-bottom: 8px;
    }

    .strength-fill {
      height: 100%;
      border-radius: var(--radius-full);
      transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1), background 0.4s ease;
    }

    .strength-label-row {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 10px;
    }

    .strength-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .criteria-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 12px;
    }

    .criteria-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-muted);
      transition: color var(--transition-base);

      &.met {
        color: var(--success);

        .criteria-check mat-icon {
          color: var(--success);
          transform: scale(1);
        }
      }
    }

    .criteria-check {
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--border);
        transition: color var(--transition-base), transform var(--transition-spring);
        transform: scale(0.85);
      }
    }

    /* ===== Premium Submit Button ===== */
    .premium-btn {
      height: 50px;
      font-size: 15px;
      margin-top: 8px;
      border-radius: var(--radius-md) !important;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%) !important;
      color: white !important;
      font-weight: 600 !important;
      letter-spacing: 0.3px !important;
      position: relative;
      overflow: hidden;
      transition: transform var(--transition-fast), box-shadow var(--transition-fast) !important;

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 8px 24px rgba(91, 108, 240, 0.35) !important;

        .btn-shimmer {
          opacity: 1;
          animation: shimmerMove 1.2s ease-in-out;
        }
      }

      &:active:not(:disabled) {
        transform: translateY(0);
      }

      &:disabled {
        opacity: 0.55;
      }

      .btn-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        position: relative;
        z-index: 1;
      }

      .btn-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &.loading {
        pointer-events: none;
      }
    }

    .btn-shimmer {
      position: absolute;
      top: 0;
      left: -100%;
      width: 60%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.2),
        transparent
      );
      opacity: 0;
      z-index: 0;
      pointer-events: none;
    }

    @keyframes shimmerMove {
      0% { left: -100%; opacity: 1; }
      100% { left: 150%; opacity: 0; }
    }

    /* ===== Social Proof ===== */
    .social-proof {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-top: 20px;
      padding: 10px 0;
      font-size: 12px;
      color: var(--text-secondary);

      strong {
        color: var(--primary);
      }
    }

    .avatar-stack {
      display: flex;

      .mini-avatar {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        color: white;
        border: 2px solid white;
        margin-left: -8px;

        &:first-child { margin-left: 0; }
      }
    }

    /* ===== Bottom Link ===== */
    .bottom-link {
      text-align: center;
      font-size: 14px;
      color: var(--text-secondary);
      padding-top: 16px;
      border-top: 1px solid var(--border-light);

      a {
        color: var(--primary);
        text-decoration: none;
        font-weight: 600;
        position: relative;

        .link-text {
          position: relative;

          &::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 50%;
            width: 0;
            height: 1.5px;
            background: var(--primary);
            transition: width var(--transition-base), left var(--transition-base);
          }
        }

        &:hover .link-text::after {
          width: 100%;
          left: 0;
        }
      }
    }

    /* ===== Responsive ===== */
    @media (max-width: 960px) {
      .auth-split-layout {
        flex-direction: column;
      }

      .auth-brand-panel {
        display: none;
      }

      .mobile-brand-header {
        display: flex;
      }

      .auth-form-panel {
        min-height: 100vh;
        padding: 24px;
      }

      .glass-card-inner {
        padding: 28px 22px;
      }
    }

    @media (max-width: 480px) {
      .auth-form-panel {
        padding: 16px;
      }

      .glass-card-inner {
        padding: 24px 18px;
      }

      .criteria-list {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notification = inject(NotificationService);
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  hidePassword = true;
  hidePasswordConfirm = true;
  loading = false;
  shakeForm = false;
  userCount: number = 0;

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    passwordConfirm: ['', [Validators.required]]
  }, { validators: passwordMatchValidator });

  ngOnInit(): void {
    this.http.get<any>(`${this.apiUrl}/api/public/stats`).subscribe({
      next: (data) => this.userCount = data.userCount || 0,
      error: () => {}
    });
  }

  get passwordStrength(): number {
    const pw = this.form.get('password')?.value || '';
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  get strengthColor(): string {
    switch (this.passwordStrength) {
      case 1: return '#f43f5e';
      case 2: return '#f59e0b';
      case 3: return '#f59e0b';
      case 4: return '#10b981';
      default: return '#e8e0f0';
    }
  }

  get strengthGradient(): string {
    switch (this.passwordStrength) {
      case 1: return 'linear-gradient(90deg, #f43f5e, #fb7185)';
      case 2: return 'linear-gradient(90deg, #f59e0b, #fbbf24)';
      case 3: return 'linear-gradient(90deg, #f59e0b, #84cc16)';
      case 4: return 'linear-gradient(90deg, #10b981, #34d399)';
      default: return '#e8e0f0';
    }
  }

  get strengthLabel(): string {
    switch (this.passwordStrength) {
      case 1: return 'Faible';
      case 2: return 'Moyen';
      case 3: return 'Bon';
      case 4: return 'Fort';
      default: return '';
    }
  }

  get hasMinLength(): boolean {
    return (this.form.get('password')?.value || '').length >= 8;
  }

  get hasUppercase(): boolean {
    return /[A-Z]/.test(this.form.get('password')?.value || '');
  }

  get hasNumber(): boolean {
    return /[0-9]/.test(this.form.get('password')?.value || '');
  }

  get hasSpecialChar(): boolean {
    return /[^A-Za-z0-9]/.test(this.form.get('password')?.value || '');
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    const value = this.form.getRawValue();

    this.authService.register({
      username: value.username,
      email: value.email,
      password: value.password,
      passwordConfirm: value.passwordConfirm
    }).subscribe({
      next: () => {
        this.loading = false;
        this.notification.success('Compte créé ! Vérifiez votre email.');
        this.router.navigate(['/auth/verify-email'], {
          queryParams: { email: value.email }
        });
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
