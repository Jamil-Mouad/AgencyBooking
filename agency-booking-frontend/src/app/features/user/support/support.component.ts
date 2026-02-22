import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '../../../core/services/notification.service';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-icon-wrapper">
          <mat-icon class="header-icon">headset_mic</mat-icon>
        </div>
        <h1 class="page-title">Support</h1>
        <p class="page-subtitle">Contactez-nous pour toute question ou problème</p>
      </div>

      <mat-card class="support-card">
        <mat-card-header class="card-header">
          <div class="card-avatar" mat-card-avatar>
            <mat-icon>support_agent</mat-icon>
          </div>
          <mat-card-title class="card-title">Envoyer un message</mat-card-title>
          <mat-card-subtitle class="card-subtitle">Notre équipe vous répondra dans les plus brefs délais</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content class="card-body">
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Sujet</mat-label>
              <input matInput formControlName="subject" placeholder="Décrivez brièvement votre demande">
              <mat-icon matSuffix class="field-icon">subject</mat-icon>
              @if (form.get('subject')?.hasError('required') && form.get('subject')?.touched) {
                <mat-error>Le sujet est requis</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Message</mat-label>
              <textarea matInput formControlName="message" rows="6"
                        placeholder="Détaillez votre demande ou problème..."></textarea>
              @if (form.get('message')?.hasError('required') && form.get('message')?.touched) {
                <mat-error>Le message est requis</mat-error>
              }
              @if (form.get('message')?.hasError('minlength') && form.get('message')?.touched) {
                <mat-error>Minimum 10 caractères</mat-error>
              }
            </mat-form-field>

            <button mat-flat-button type="submit" class="submit-btn"
                    [disabled]="form.invalid || loading">
              @if (loading) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>send</mat-icon>
                Envoyer
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Info / Help section -->
      <div class="help-section">
        <div class="help-card">
          <div class="help-icon-wrap">
            <mat-icon>schedule</mat-icon>
          </div>
          <div class="help-text">
            <span class="help-label">Temps de réponse</span>
            <span class="help-value">Sous 24 heures ouvrées</span>
          </div>
        </div>
        <div class="help-card">
          <div class="help-icon-wrap">
            <mat-icon>mail_outline</mat-icon>
          </div>
          <div class="help-text">
            <span class="help-label">Email direct</span>
            <span class="help-value">support&#64;agence.com</span>
          </div>
        </div>
        <div class="help-card">
          <div class="help-icon-wrap">
            <mat-icon>tips_and_updates</mat-icon>
          </div>
          <div class="help-text">
            <span class="help-label">Astuce</span>
            <span class="help-value">Décrivez votre problème en détail pour une aide rapide</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 32px 24px 48px;
      max-width: 640px;
      margin: 0 auto;
    }

    /* ---- Page header ---- */
    .page-header {
      margin-bottom: 32px;
    }
    .header-icon-wrapper {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-lg, 16px);
      background: var(--primary-light, #ede9fe);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    .header-icon-wrapper .header-icon {
      color: var(--primary, #5b6cf0);
      font-size: 26px;
      width: 26px;
      height: 26px;
    }
    .page-title {
      font-family: var(--font-heading, 'DM Sans', sans-serif);
      font-size: 1.85rem;
      font-weight: 700;
      color: var(--text-primary, #1e1b3a);
      margin: 0 0 6px;
      letter-spacing: -0.01em;
    }
    .page-subtitle {
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      color: var(--text-secondary, #6b7194);
      margin: 0;
      font-size: 1rem;
      line-height: 1.5;
    }

    /* ---- Support card ---- */
    .support-card {
      border-radius: var(--radius-xl, 20px) !important;
      border: 1px solid var(--border-light, #f0ebf8);
      box-shadow: var(--shadow-sm, 0 2px 8px rgba(91,108,240,0.06)) !important;
      background: var(--bg-card, #ffffff);
      padding: 8px 4px;
      transition: box-shadow var(--transition-base, 0.2s ease);
    }
    .support-card:hover {
      box-shadow: var(--shadow-md, 0 4px 16px rgba(91,108,240,0.10)) !important;
    }

    /* Card header */
    .card-header {
      padding: 24px 24px 8px !important;
    }
    .card-avatar {
      background: var(--primary-light, #ede9fe) !important;
      border-radius: var(--radius-md, 12px) !important;
      width: 44px !important;
      height: 44px !important;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-avatar mat-icon {
      color: var(--primary, #5b6cf0);
      font-size: 24px;
      width: 24px;
      height: 24px;
    }
    .card-title {
      font-family: var(--font-heading, 'DM Sans', sans-serif) !important;
      font-weight: 600 !important;
      color: var(--text-primary, #1e1b3a) !important;
      font-size: 1.15rem !important;
    }
    .card-subtitle {
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif) !important;
      color: var(--text-secondary, #6b7194) !important;
      font-size: 0.9rem !important;
    }

    /* Card body / form */
    .card-body {
      padding: 16px 24px 24px !important;
    }

    .full-width {
      width: 100%;
      margin-bottom: 4px;
    }

    /* Style outline form fields */
    :host ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      margin-bottom: 4px;
    }
    :host ::ng-deep .mdc-notched-outline__leading,
    :host ::ng-deep .mdc-notched-outline__notch,
    :host ::ng-deep .mdc-notched-outline__trailing {
      border-color: var(--border, #e8e0f0) !important;
    }
    :host ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
    :host ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
    :host ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
      border-color: var(--primary, #5b6cf0) !important;
    }
    :host ::ng-deep .mdc-notched-outline {
      border-radius: var(--radius-md, 12px) !important;
    }
    :host ::ng-deep .mdc-notched-outline__leading {
      border-radius: var(--radius-md, 12px) 0 0 var(--radius-md, 12px) !important;
    }
    :host ::ng-deep .mdc-notched-outline__trailing {
      border-radius: 0 var(--radius-md, 12px) var(--radius-md, 12px) 0 !important;
    }
    :host ::ng-deep .mat-mdc-form-field-focus-overlay {
      background: transparent !important;
    }
    :host ::ng-deep .mat-mdc-floating-label {
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif) !important;
      color: var(--text-muted, #9ca3bf) !important;
    }
    :host ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-floating-label {
      color: var(--primary, #5b6cf0) !important;
    }
    :host ::ng-deep .mat-mdc-input-element {
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif) !important;
      color: var(--text-primary, #1e1b3a) !important;
    }
    :host ::ng-deep .mat-mdc-input-element::placeholder {
      color: var(--text-muted, #9ca3bf) !important;
    }

    .field-icon {
      color: var(--text-muted, #9ca3bf);
      font-size: 20px;
    }

    /* Submit button */
    .submit-btn {
      width: 100%;
      height: 52px;
      font-size: 1rem;
      font-weight: 600;
      font-family: var(--font-heading, 'DM Sans', sans-serif);
      border-radius: var(--radius-md, 12px) !important;
      background: linear-gradient(135deg, var(--primary, #5b6cf0), var(--primary-dark, #4338ca)) !important;
      color: #ffffff !important;
      letter-spacing: 0.02em;
      box-shadow: 0 4px 14px rgba(91, 108, 240, 0.25) !important;
      transition: all var(--transition-fast, 0.15s ease) !important;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 8px;
    }
    .submit-btn:hover:not([disabled]) {
      box-shadow: 0 6px 20px rgba(91, 108, 240, 0.35) !important;
      transform: translateY(-1px);
    }
    .submit-btn:active:not([disabled]) {
      transform: translateY(0);
    }
    .submit-btn[disabled] {
      background: var(--border, #e8e0f0) !important;
      color: var(--text-muted, #9ca3bf) !important;
      box-shadow: none !important;
    }
    .submit-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* ---- Help / Info section ---- */
    .help-section {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin-top: 24px;
    }
    .help-card {
      display: flex;
      align-items: center;
      gap: 14px;
      background: var(--bg-subtle, #f5f3ff);
      border: 1px solid var(--border-light, #f0ebf8);
      border-radius: var(--radius-lg, 16px);
      padding: 16px 20px;
      transition: box-shadow var(--transition-fast, 0.15s ease);
    }
    .help-card:hover {
      box-shadow: var(--shadow-xs, 0 1px 4px rgba(91,108,240,0.05));
    }
    .help-icon-wrap {
      width: 40px;
      height: 40px;
      min-width: 40px;
      border-radius: var(--radius-sm, 8px);
      background: var(--primary-light, #ede9fe);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .help-icon-wrap mat-icon {
      color: var(--primary, #5b6cf0);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .help-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .help-label {
      font-family: var(--font-heading, 'DM Sans', sans-serif);
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--text-primary, #1e1b3a);
    }
    .help-value {
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      font-size: 0.82rem;
      color: var(--text-secondary, #6b7194);
      line-height: 1.4;
    }

    /* ---- Spinner inside button ---- */
    :host ::ng-deep .submit-btn .mat-mdc-progress-spinner circle {
      stroke: #ffffff !important;
    }

    /* ---- Responsive ---- */
    @media (max-width: 480px) {
      .page-container {
        padding: 20px 16px 40px;
      }
      .page-title {
        font-size: 1.5rem;
      }
      .card-body {
        padding: 12px 16px 20px !important;
      }
      .card-header {
        padding: 20px 16px 8px !important;
      }
    }
  `]
})
export class SupportComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private notification = inject(NotificationService);
  private apiUrl = environment.apiUrl;

  loading = false;

  form = this.fb.nonNullable.group({
    subject: ['', [Validators.required]],
    message: ['', [Validators.required, Validators.minLength(10)]]
  });

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    const { subject, message } = this.form.getRawValue();

    this.http.post<ApiResponse>(`${this.apiUrl}/api/user/contact`, { subject, message }).subscribe({
      next: () => {
        this.loading = false;
        this.form.reset();
        this.notification.success('Message envoyé avec succès ! Nous vous répondrons rapidement.');
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
