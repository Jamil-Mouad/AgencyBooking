import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DateFrPipe } from '../../../shared/pipes/date-fr.pipe';
import { NotificationService } from '../../../core/services/notification.service';
import { environment } from '../../../../environments/environment';
import { Reservation, ReservationFeedbackDTO } from '../../../shared/models';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatTabsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule,
    MatDividerModule, MatProgressSpinnerModule,
    LoadingSpinnerComponent, StatusBadgeComponent, DateFrPipe
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-bg">
          <div class="float-shape s1"></div>
          <div class="float-shape s2"></div>
          <div class="float-shape s3"></div>
        </div>
        <h1 class="page-title">Mes réservations</h1>
        <p class="page-subtitle">Suivez l'état de vos réservations</p>
      </div>

      @if (loading) {
        <app-loading-spinner message="Chargement des réservations..."></app-loading-spinner>
      }

      @if (!loading) {
        <mat-tab-group animationDuration="200ms" class="warm-tabs">
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>hourglass_empty</mat-icon>
              En attente ({{ pendingReservations.length }})
            </ng-template>
            <ng-template matTabContent>
              @if (pendingReservations.length === 0) {
                <div class="empty-tab">
                  <div class="empty-tab-icon-wrap">
                    <mat-icon>inbox</mat-icon>
                  </div>
                  <p>Aucune réservation en attente</p>
                </div>
              }
              <div class="cards-grid">
                @for (reservation of pendingReservations; track reservation.id) {
                  <mat-card class="reservation-card">
                    <mat-card-header>
                      <mat-card-title>{{ reservation.service }}</mat-card-title>
                      <mat-card-subtitle>{{ reservation.agency.name }} - {{ reservation.agency.city }}</mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="reservation-details">
                        <div class="detail-row">
                          <mat-icon class="detail-icon">event</mat-icon>
                          <span>Date souhaitée : {{ reservation.preferredDate | dateFr:'long' }}</span>
                        </div>
                        @if (reservation.description) {
                          <div class="detail-row">
                            <mat-icon class="detail-icon">description</mat-icon>
                            <span>{{ reservation.description }}</span>
                          </div>
                        }
                        <div class="detail-row">
                          <mat-icon class="detail-icon">access_time</mat-icon>
                          <span>Créée le {{ reservation.createdAt | dateFr:'datetime' }}</span>
                        </div>
                      </div>
                      <div class="reservation-status">
                        <app-status-badge [status]="reservation.status"></app-status-badge>
                      </div>
                    </mat-card-content>
                    <mat-card-actions align="end">
                      <button mat-stroked-button color="warn" (click)="openCancelDialog(reservation)">
                        <mat-icon>cancel</mat-icon>
                        Annuler
                      </button>
                    </mat-card-actions>
                  </mat-card>
                }
              </div>
            </ng-template>
          </mat-tab>

          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>check_circle</mat-icon>
              Confirmées ({{ confirmedReservations.length }})
            </ng-template>
            <ng-template matTabContent>
              @if (confirmedReservations.length === 0) {
                <div class="empty-tab">
                  <div class="empty-tab-icon-wrap">
                    <mat-icon>inbox</mat-icon>
                  </div>
                  <p>Aucune réservation confirmée</p>
                </div>
              }
              <div class="cards-grid">
                @for (reservation of confirmedReservations; track reservation.id) {
                  <mat-card class="reservation-card">
                    <mat-card-header>
                      <mat-card-title>{{ reservation.service }}</mat-card-title>
                      <mat-card-subtitle>{{ reservation.agency.name }} - {{ reservation.agency.city }}</mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="reservation-details">
                        <div class="detail-row">
                          <mat-icon class="detail-icon">event</mat-icon>
                          <span>Date souhaitée : {{ reservation.preferredDate | dateFr:'long' }}</span>
                        </div>
                        @if (reservation.startDateTime) {
                          <div class="detail-row confirmed-time">
                            <mat-icon class="detail-icon">schedule</mat-icon>
                            <span>
                              Créneau confirmé : {{ reservation.startDateTime | dateFr:'datetime' }}
                              @if (reservation.endDateTime) {
                                - {{ reservation.endDateTime | dateFr:'time' }}
                              }
                            </span>
                          </div>
                        }
                        @if (reservation.handledByAgent) {
                          <div class="detail-row">
                            <mat-icon class="detail-icon">support_agent</mat-icon>
                            <span>Agent : {{ reservation.handledByAgent.username }}</span>
                          </div>
                        }
                      </div>
                      <div class="reservation-status">
                        <app-status-badge [status]="reservation.status"></app-status-badge>
                      </div>
                    </mat-card-content>
                  </mat-card>
                }
              </div>
            </ng-template>
          </mat-tab>

          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>done_all</mat-icon>
              Terminées ({{ completedReservations.length }})
            </ng-template>
            <ng-template matTabContent>
              @if (completedReservations.length === 0) {
                <div class="empty-tab">
                  <div class="empty-tab-icon-wrap">
                    <mat-icon>inbox</mat-icon>
                  </div>
                  <p>Aucune réservation terminée</p>
                </div>
              }
              <div class="cards-grid">
                @for (reservation of completedReservations; track reservation.id) {
                  <mat-card class="reservation-card">
                    <mat-card-header>
                      <mat-card-title>{{ reservation.service }}</mat-card-title>
                      <mat-card-subtitle>{{ reservation.agency.name }} - {{ reservation.agency.city }}</mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="reservation-details">
                        <div class="detail-row">
                          <mat-icon class="detail-icon">event</mat-icon>
                          <span>Date : {{ reservation.preferredDate | dateFr:'long' }}</span>
                        </div>
                        <div class="detail-row">
                          <mat-icon class="detail-icon">access_time</mat-icon>
                          <span>Terminée le {{ reservation.updatedAt | dateFr:'datetime' }}</span>
                        </div>
                      </div>
                      <div class="reservation-status">
                        <app-status-badge [status]="reservation.status"></app-status-badge>
                      </div>
                    </mat-card-content>
                    <mat-card-actions align="end">
                      <button mat-stroked-button color="primary" (click)="openFeedbackDialog(reservation)">
                        <mat-icon>rate_review</mat-icon>
                        Laisser un avis
                      </button>
                    </mat-card-actions>
                  </mat-card>
                }
              </div>
            </ng-template>
          </mat-tab>

          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>block</mat-icon>
              Annulées ({{ canceledReservations.length }})
            </ng-template>
            <ng-template matTabContent>
              @if (canceledReservations.length === 0) {
                <div class="empty-tab">
                  <div class="empty-tab-icon-wrap">
                    <mat-icon>inbox</mat-icon>
                  </div>
                  <p>Aucune réservation annulée</p>
                </div>
              }
              <div class="cards-grid">
                @for (reservation of canceledReservations; track reservation.id) {
                  <mat-card class="reservation-card canceled">
                    <mat-card-header>
                      <mat-card-title>{{ reservation.service }}</mat-card-title>
                      <mat-card-subtitle>{{ reservation.agency.name }} - {{ reservation.agency.city }}</mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="reservation-details">
                        <div class="detail-row">
                          <mat-icon class="detail-icon">event</mat-icon>
                          <span>Date : {{ reservation.preferredDate | dateFr:'long' }}</span>
                        </div>
                        <div class="detail-row">
                          <mat-icon class="detail-icon">access_time</mat-icon>
                          <span>Annulée le {{ reservation.updatedAt | dateFr:'datetime' }}</span>
                        </div>
                      </div>
                      <div class="reservation-status">
                        <app-status-badge [status]="reservation.status"></app-status-badge>
                      </div>
                    </mat-card-content>
                  </mat-card>
                }
              </div>
            </ng-template>
          </mat-tab>
        </mat-tab-group>
      }

      <!-- Cancel Dialog Overlay -->
      @if (showCancelDialog && selectedReservation) {
        <div class="dialog-overlay" (click)="closeCancelDialog()">
          <mat-card class="dialog-card" (click)="$event.stopPropagation()">
            <mat-card-header>
              <mat-card-title>Annuler la réservation</mat-card-title>
              <mat-card-subtitle>{{ selectedReservation.service }} - {{ selectedReservation.agency.name }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Raison de l'annulation (optionnel)</mat-label>
                <textarea matInput [(ngModel)]="cancelReason" rows="3"
                          placeholder="Indiquez la raison de votre annulation..."></textarea>
              </mat-form-field>
            </mat-card-content>
            <mat-card-actions align="end">
              <button mat-button (click)="closeCancelDialog()" class="dialog-btn-secondary">Retour</button>
              <button mat-flat-button color="warn" (click)="confirmCancel()" [disabled]="canceling" class="dialog-btn-warn">
                @if (canceling) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Confirmer l'annulation
                }
              </button>
            </mat-card-actions>
          </mat-card>
        </div>
      }

      <!-- Feedback Dialog Overlay -->
      @if (showFeedbackDialog && selectedReservation) {
        <div class="dialog-overlay" (click)="closeFeedbackDialog()">
          <mat-card class="dialog-card" (click)="$event.stopPropagation()">
            <mat-card-header>
              <mat-card-title>Laisser un avis</mat-card-title>
              <mat-card-subtitle>{{ selectedReservation.service }} - {{ selectedReservation.agency.name }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="rating-section">
                <label>Note</label>
                <div class="stars">
                  @for (star of [1, 2, 3, 4, 5]; track star) {
                    <button mat-icon-button (click)="feedbackRating = star" type="button" class="star-btn">
                      <mat-icon [class.active-star]="star <= feedbackRating">
                        {{ star <= feedbackRating ? 'star' : 'star_border' }}
                      </mat-icon>
                    </button>
                  }
                </div>
              </div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Commentaire</mat-label>
                <textarea matInput [(ngModel)]="feedbackComment" rows="3"
                          placeholder="Partagez votre expérience..."></textarea>
              </mat-form-field>
            </mat-card-content>
            <mat-card-actions align="end">
              <button mat-button (click)="closeFeedbackDialog()" class="dialog-btn-secondary">Annuler</button>
              <button mat-flat-button color="primary" (click)="submitFeedback()"
                      [disabled]="feedbackRating === 0 || submittingFeedback" class="dialog-btn-primary">
                @if (submittingFeedback) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Envoyer
                }
              </button>
            </mat-card-actions>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    /* ===== Page Layout ===== */
    .page-container {
      padding: 32px 24px;
      max-width: 960px;
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

    .page-title {
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

    /* ===== Cards Grid ===== */
    .cards-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 20px 4px 8px;
    }

    /* ===== Reservation Card ===== */
    .reservation-card {
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg) !important;
      box-shadow: var(--shadow-sm);
      transition: box-shadow var(--transition-base, 0.2s ease),
                  transform var(--transition-base, 0.2s ease),
                  border-color var(--transition-base, 0.2s ease);
      overflow: hidden;

      &:hover {
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
        border-color: var(--border);
      }

      &.canceled {
        opacity: 0.65;
        border-color: var(--border);
        background: var(--bg-subtle);

        &:hover {
          transform: none;
          box-shadow: var(--shadow-sm);
        }
      }
    }

    :host ::ng-deep .reservation-card {
      .mat-mdc-card-header {
        padding: 20px 20px 8px;
      }

      .mat-mdc-card-title {
        font-family: var(--font-heading, 'DM Sans', sans-serif);
        font-size: 1.05rem;
        font-weight: 600;
        color: var(--text-primary);
        letter-spacing: -0.01em;
      }

      .mat-mdc-card-subtitle {
        font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
        color: var(--text-secondary);
        font-size: 0.85rem;
        margin-top: 2px;
      }

      .mat-mdc-card-content {
        padding: 0 20px 12px;
      }

      .mat-mdc-card-actions {
        padding: 8px 20px 16px;
        min-height: auto;
      }
    }

    /* ===== Reservation Details ===== */
    .reservation-details {
      margin: 8px 0 4px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 5px 0;
      color: var(--text-secondary);
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .detail-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .confirmed-time {
      color: var(--primary);
      font-weight: 600;
      background: var(--primary-light);
      border-radius: var(--radius-sm);
      padding: 8px 12px !important;
      margin: 4px 0;

      .detail-icon {
        color: var(--primary);
      }
    }

    .reservation-status {
      margin-top: 14px;
    }

    /* ===== Empty State ===== */
    .empty-tab {
      text-align: center;
      padding: 72px 24px;
      color: var(--text-muted);

      .empty-tab-icon-wrap {
        width: 72px;
        height: 72px;
        border-radius: var(--radius-full);
        background: var(--bg-subtle);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;

        mat-icon {
          font-size: 36px;
          width: 36px;
          height: 36px;
          color: var(--text-muted);
        }
      }

      p {
        font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
        font-size: 0.95rem;
        color: var(--text-muted);
        margin: 0;
      }
    }

    /* ===== Tabs ===== */
    :host ::ng-deep .warm-tabs {
      .mat-mdc-tab-header {
        background: var(--bg-card);
        border-bottom: 1px solid var(--border-light);
        border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      }

      .mat-mdc-tab .mdc-tab__text-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
        font-weight: 500;
        font-size: 0.875rem;
        color: var(--text-secondary);
        letter-spacing: 0;
      }

      .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label {
        color: var(--primary);
        font-weight: 600;
      }

      .mat-mdc-tab-body-wrapper {
        padding-top: 4px;
      }

      .mdc-tab-indicator__content--underline {
        border-color: var(--primary) !important;
        border-width: 3px !important;
        border-radius: 3px 3px 0 0;
      }

      .mat-mdc-tab:not(.mat-mdc-tab-disabled) .mdc-tab-indicator__content--underline {
        border-color: var(--primary) !important;
      }

      .mat-mdc-tab:not(.mat-mdc-tab-disabled).mdc-tab--active .mdc-tab__icon {
        color: var(--primary);
      }

      .mat-ripple-element {
        background-color: var(--primary-light) !important;
      }
    }

    /* ===== Dialog Overlay ===== */
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(30, 27, 58, 0.35);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 24px;
      animation: overlayFadeIn 0.2s ease-out;
    }

    @keyframes overlayFadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes dialogSlideUp {
      from {
        opacity: 0;
        transform: translateY(16px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .dialog-card {
      width: 100%;
      max-width: 480px;
      padding: 28px !important;
      border-radius: var(--radius-xl) !important;
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-xl);
      animation: dialogSlideUp 0.25s ease-out;
    }

    :host ::ng-deep .dialog-card {
      .mat-mdc-card-header {
        padding: 0 0 16px;
      }

      .mat-mdc-card-title {
        font-family: var(--font-heading, 'DM Sans', sans-serif);
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--text-primary);
      }

      .mat-mdc-card-subtitle {
        font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
        color: var(--text-secondary);
        font-size: 0.85rem;
      }

      .mat-mdc-card-content {
        padding: 0;
      }

      .mat-mdc-card-actions {
        padding: 12px 0 0;
        gap: 8px;
      }
    }

    .full-width {
      width: 100%;
    }

    .dialog-btn-secondary {
      color: var(--text-secondary) !important;
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      border-radius: var(--radius-md) !important;
    }

    .dialog-btn-primary {
      background: var(--primary) !important;
      color: white !important;
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      border-radius: var(--radius-md) !important;
      font-weight: 600;

      &:hover:not([disabled]) {
        background: var(--primary-dark) !important;
      }

      &[disabled] {
        opacity: 0.5;
      }
    }

    .dialog-btn-warn {
      background: var(--warn) !important;
      color: white !important;
      font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
      border-radius: var(--radius-md) !important;
      font-weight: 600;

      &[disabled] {
        opacity: 0.5;
      }
    }

    /* ===== Rating / Stars ===== */
    .rating-section {
      margin-bottom: 20px;

      label {
        display: block;
        font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-secondary);
        margin-bottom: 6px;
      }
    }

    .stars {
      display: flex;
      gap: 2px;
    }

    .star-btn {
      transition: transform var(--transition-fast, 0.15s ease);

      &:hover {
        transform: scale(1.15);
      }
    }

    .active-star {
      color: var(--amber) !important;
    }

    /* ===== Action Buttons on Cards ===== */
    :host ::ng-deep .reservation-card .mat-mdc-card-actions {
      .mat-mdc-outlined-button {
        border-radius: var(--radius-md);
        font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
        font-weight: 500;
        font-size: 0.85rem;
        letter-spacing: 0;
        text-transform: none;
        padding: 0 16px;
        border-color: var(--border);
        transition: all var(--transition-fast, 0.15s ease);

        &:hover {
          border-color: var(--primary);
          background: var(--primary-light);
        }
      }
    }

    /* ===== Form Field Styling ===== */
    :host ::ng-deep .mat-mdc-form-field {
      .mdc-text-field--outlined .mdc-notched-outline__leading,
      .mdc-text-field--outlined .mdc-notched-outline__notch,
      .mdc-text-field--outlined .mdc-notched-outline__trailing {
        border-color: var(--border) !important;
      }

      &.mat-focused .mdc-text-field--outlined .mdc-notched-outline__leading,
      &.mat-focused .mdc-text-field--outlined .mdc-notched-outline__notch,
      &.mat-focused .mdc-text-field--outlined .mdc-notched-outline__trailing {
        border-color: var(--primary) !important;
      }

      .mat-mdc-input-element {
        font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
        color: var(--text-primary);
      }

      .mat-mdc-floating-label {
        font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
        color: var(--text-muted);
      }
    }

    /* ===== Responsive ===== */
    @media (max-width: 600px) {
      .page-container {
        padding: 20px 16px;
      }

      .page-title {
        font-size: 1.5rem;
      }

      .cards-grid {
        padding: 16px 0 8px;
        gap: 12px;
      }

      :host ::ng-deep .reservation-card {
        .mat-mdc-card-header {
          padding: 16px 16px 6px;
        }

        .mat-mdc-card-content {
          padding: 0 16px 8px;
        }

        .mat-mdc-card-actions {
          padding: 4px 16px 12px;
        }
      }

      .dialog-card {
        padding: 20px !important;
        border-radius: var(--radius-lg) !important;
      }
    }
  `]
})
export class ReservationsComponent implements OnInit {
  private http = inject(HttpClient);
  private notification = inject(NotificationService);
  private apiUrl = environment.apiUrl;

  reservations: Reservation[] = [];
  loading = false;

  // Cancel dialog state
  showCancelDialog = false;
  selectedReservation: Reservation | null = null;
  cancelReason = '';
  canceling = false;

  // Feedback dialog state
  showFeedbackDialog = false;
  feedbackRating = 0;
  feedbackComment = '';
  submittingFeedback = false;

  get pendingReservations(): Reservation[] {
    return this.reservations.filter(r => r.status === 'PENDING');
  }

  get confirmedReservations(): Reservation[] {
    return this.reservations.filter(r => r.status === 'CONFIRMED');
  }

  get completedReservations(): Reservation[] {
    return this.reservations.filter(r => r.status === 'COMPLETED');
  }

  get canceledReservations(): Reservation[] {
    return this.reservations.filter(r => r.status === 'CANCELED');
  }

  ngOnInit(): void {
    this.loadReservations();
  }

  openCancelDialog(reservation: Reservation): void {
    this.selectedReservation = reservation;
    this.cancelReason = '';
    this.showCancelDialog = true;
  }

  closeCancelDialog(): void {
    this.showCancelDialog = false;
    this.selectedReservation = null;
  }

  confirmCancel(): void {
    if (!this.selectedReservation) return;

    this.canceling = true;
    const body = this.cancelReason ? { reason: this.cancelReason } : {};

    this.http.post(
      `${this.apiUrl}/api/user/reservation/cancel/${this.selectedReservation.id}`,
      body
    ).subscribe({
      next: () => {
        this.canceling = false;
        this.closeCancelDialog();
        this.notification.success('Réservation annulée avec succès');
        this.loadReservations();
      },
      error: () => {
        this.canceling = false;
      }
    });
  }

  openFeedbackDialog(reservation: Reservation): void {
    this.selectedReservation = reservation;
    this.feedbackRating = 0;
    this.feedbackComment = '';
    this.showFeedbackDialog = true;
  }

  closeFeedbackDialog(): void {
    this.showFeedbackDialog = false;
    this.selectedReservation = null;
  }

  submitFeedback(): void {
    if (!this.selectedReservation || this.feedbackRating === 0) return;

    this.submittingFeedback = true;
    const feedback: ReservationFeedbackDTO = {
      reservationId: this.selectedReservation.id,
      comment: this.feedbackComment,
      rating: this.feedbackRating
    };

    this.http.post(`${this.apiUrl}/api/user/feedback`, feedback).subscribe({
      next: () => {
        this.submittingFeedback = false;
        this.closeFeedbackDialog();
        this.notification.success('Merci pour votre avis !');
      },
      error: () => {
        this.submittingFeedback = false;
      }
    });
  }

  private loadReservations(): void {
    this.loading = true;
    this.http.get<Reservation[]>(`${this.apiUrl}/api/user/reservations`).subscribe({
      next: (data) => {
        this.reservations = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
