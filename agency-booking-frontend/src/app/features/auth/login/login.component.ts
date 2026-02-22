import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
import { scaleIn } from '../../../shared/animations';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  animations: [scaleIn],
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
          <div class="geo-calendar">
            <div class="geo-cal-header"></div>
            <div class="geo-cal-row">
              <span class="geo-dot"></span><span class="geo-dot"></span><span class="geo-dot accent"></span>
              <span class="geo-dot"></span><span class="geo-dot"></span>
            </div>
            <div class="geo-cal-row">
              <span class="geo-dot"></span><span class="geo-dot active"></span><span class="geo-dot"></span>
              <span class="geo-dot"></span><span class="geo-dot accent"></span>
            </div>
            <div class="geo-cal-row">
              <span class="geo-dot"></span><span class="geo-dot"></span><span class="geo-dot"></span>
              <span class="geo-dot active"></span><span class="geo-dot"></span>
            </div>
          </div>
          <div class="geo-shield">
            <mat-icon>shield</mat-icon>
          </div>
        </div>

        <div class="brand-content">
          <div class="brand-logo">
            <div class="brand-logo-icon">
              <mat-icon>travel_explore</mat-icon>
            </div>
            <h1 class="brand-name">AgencyBooking</h1>
          </div>
          <p class="brand-tagline">Votre plateforme de reservation intelligente</p>

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
        <div class="auth-form-wrapper" @scaleIn>
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
                  <mat-icon>lock</mat-icon>
                  <div class="icon-ring"></div>
                </div>
                <h2 class="auth-title">Connexion</h2>
                <p class="auth-subtitle">Accedez a votre espace personnel</p>
              </div>

              <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="form-field-animate field-delay-1">
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

                <div class="form-field-animate field-delay-2">
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
                  </mat-form-field>
                </div>

                <div class="form-field-animate field-delay-3">
                  <div class="forgot-link">
                    <a routerLink="/auth/forgot-password">
                      <span class="link-text">Mot de passe oublie ?</span>
                    </a>
                  </div>
                </div>

                <div class="form-field-animate field-delay-4">
                  <button mat-flat-button color="primary" type="submit"
                          class="full-width submit-btn premium-btn"
                          [disabled]="form.invalid || loading"
                          [class.loading]="loading">
                    @if (loading) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      <span class="btn-content">
                        <mat-icon class="btn-icon">login</mat-icon>
                        Connexion
                      </span>
                    }
                    <div class="btn-shimmer"></div>
                  </button>
                </div>
              </form>

              <div class="form-field-animate field-delay-5">
                <div class="social-proof">
                  <div class="avatar-stack">
                    <div class="mini-avatar" style="background: #5b6cf0;">M</div>
                    <div class="mini-avatar" style="background: #10b981;">A</div>
                    <div class="mini-avatar" style="background: #f59e42;">S</div>
                  </div>
                  <span>Rejoignez <strong>+{{ userCount }}</strong> utilisateurs</span>
                </div>
              </div>

              <div class="form-field-animate field-delay-5">
                <div class="bottom-link">
                  Pas encore de compte ?
                  <a routerLink="/auth/register">
                    <span class="link-text">Creer un compte</span>
                  </a>
                </div>
              </div>
            </div>
            <div class="glass-border-glow"></div>
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

    /* Geometric illustration */
    .brand-illustration {
      position: relative;
      z-index: 2;
      margin-bottom: 40px;
      display: flex;
      align-items: flex-end;
      gap: 16px;
    }

    .geo-calendar {
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 12px 16px;
      width: 160px;
    }

    .geo-cal-header {
      height: 8px;
      background: linear-gradient(90deg, rgba(91, 108, 240, 0.6), rgba(56, 189, 248, 0.6));
      border-radius: 4px;
      margin-bottom: 12px;
    }

    .geo-cal-row {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      justify-content: center;
    }

    .geo-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.12);
      display: inline-block;

      &.active {
        background: rgba(91, 108, 240, 0.7);
        box-shadow: 0 0 12px rgba(91, 108, 240, 0.5);
      }
      &.accent {
        background: rgba(56, 189, 248, 0.5);
      }
    }

    .geo-shield {
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
      overflow: hidden;
    }

    .auth-form-wrapper {
      width: 100%;
      max-width: 440px;
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

    .glass-card-inner {
      padding: 40px 36px;
      position: relative;
      z-index: 1;
    }

    /* Animated gradient border */
    .glass-border-glow {
      position: absolute;
      inset: -1px;
      border-radius: var(--radius-xl);
      background: conic-gradient(
        from 0deg,
        rgba(91, 108, 240, 0.3),
        rgba(56, 189, 248, 0.2),
        rgba(99, 102, 241, 0.3),
        rgba(244, 63, 94, 0.1),
        rgba(91, 108, 240, 0.3)
      );
      z-index: -1;
      animation: borderRotate 6s linear infinite;
      opacity: 0.5;
    }

    @keyframes borderRotate {
      to { transform: rotate(360deg); }
    }

    /* We need a mask approach for the border glow */
    .auth-glass-card {
      &::before {
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
    }

    @keyframes rotateBorder {
      to {
        --border-angle: 360deg;
      }
    }

    /* Register property for animated border angle */
    @property --border-angle {
      syntax: '<angle>';
      initial-value: 0deg;
      inherits: false;
    }

    .glass-border-glow { display: none; }

    /* Shake animation */
    .shake {
      animation: shake 0.5s ease-in-out;
    }

    /* Form header */
    .form-header {
      text-align: center;
      margin-bottom: 28px;
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

    .field-delay-1 { animation-delay: 0.15s; }
    .field-delay-2 { animation-delay: 0.25s; }
    .field-delay-3 { animation-delay: 0.35s; }
    .field-delay-4 { animation-delay: 0.45s; }
    .field-delay-5 { animation-delay: 0.55s; }

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

    /* ===== Forgot Link ===== */
    .forgot-link {
      text-align: right;
      margin-bottom: 16px;

      a {
        color: var(--primary);
        text-decoration: none;
        font-size: 13px;
        font-weight: 500;
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
      margin-top: 24px;
      padding: 12px 0;
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
        padding: 32px 24px;
      }
    }

    @media (max-width: 480px) {
      .auth-form-panel {
        padding: 16px;
      }

      .glass-card-inner {
        padding: 28px 20px;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notification = inject(NotificationService);
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  hidePassword = true;
  loading = false;
  shakeForm = false;
  userCount: number = 0;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.http.get<any>(`${this.apiUrl}/api/public/stats`).subscribe({
      next: (data) => this.userCount = data.userCount || 0,
      error: () => {}
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    const { email, password } = this.form.getRawValue();

    this.authService.login({ email, password }).subscribe({
      next: (response) => {
        this.loading = false;
        this.notification.success('Connexion réussie');
        const role = response.role;
        if (role === 'ADMIN') {
          this.router.navigate(['/admin']);
        } else if (role === 'AGENT') {
          this.router.navigate(['/agent']);
        } else {
          this.router.navigate(['/user']);
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
