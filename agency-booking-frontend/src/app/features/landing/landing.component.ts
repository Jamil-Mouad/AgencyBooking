import { Component, inject, OnInit, OnDestroy, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { environment } from '../../../environments/environment';
import { Agency, PublicStats, PublicTestimonial, FeedbackStatistics } from '../../shared/models';

export interface PublicComment {
  id: number;
  rating: number;
  comment: string;
  date: string;
  authorName: string;
  service: string;
}

interface CommentsPage {
  content: PublicComment[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule,
    HeaderComponent, LoadingSpinnerComponent
  ],
  template: `
    <app-header></app-header>

    <!-- Hero Section -->
    <section class="hero" data-section>
      <div class="hero-gradient-mesh"></div>
      <div class="hero-grid-overlay"></div>
      <div class="bg-circles">
        <div class="bg-circle" style="width: 400px; height: 400px; top: 5%; left: -8%; animation-delay: 0s; opacity: 0.5; filter: blur(40px);"></div>
        <div class="bg-circle" style="width: 250px; height: 250px; bottom: 10%; right: 3%; animation-delay: 2s; opacity: 0.4; filter: blur(30px);"></div>
        <div class="bg-circle" style="width: 180px; height: 180px; top: 45%; left: 35%; animation-delay: 4s; opacity: 0.3; filter: blur(50px);"></div>
        <div class="bg-circle bg-circle-accent" style="width: 300px; height: 300px; top: -5%; right: 15%; animation-delay: 6s; opacity: 0.25; filter: blur(60px);"></div>
        <div class="bg-circle" style="width: 120px; height: 120px; bottom: 25%; left: 15%; animation-delay: 3s; opacity: 0.35; filter: blur(25px);"></div>
        <div class="bg-circle bg-circle-accent" style="width: 200px; height: 200px; bottom: 5%; left: 50%; animation-delay: 5s; opacity: 0.2; filter: blur(45px);"></div>
      </div>
      <div class="hero-content animate-fadeInUp">
        <h1>Simplifiez vos reservations avec notre <span class="gradient-text-animated">service en ligne</span></h1>
        <p class="hero-subtitle">
          Notre plateforme vous permet de gerer facilement vos reservations, de trouver les meilleures agences
          et de suivre vos demandes en temps reel. Plus besoin d'attendre au telephone ou de vous deplacer.
        </p>
        <div class="hero-actions animate-fadeInUp animate-stagger-2">
          <a routerLink="/auth/register" class="hero-btn-primary">
            <mat-icon>rocket_launch</mat-icon>
            Commencer maintenant
          </a>
        </div>
      </div>
      <div class="hero-visual animate-fadeInUp animate-stagger-3">
        <div class="hero-calendar-card">
          <div class="calendar-header">
            <button class="calendar-nav-btn"><mat-icon>chevron_left</mat-icon></button>
            <span class="calendar-month">Avril 2025</span>
            <button class="calendar-nav-btn"><mat-icon>chevron_right</mat-icon></button>
          </div>
          <div class="calendar-weekdays">
            <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span>
          </div>
          <div class="calendar-days">
            <span class="calendar-day calendar-day-empty"></span>
            <span class="calendar-day">1</span>
            <span class="calendar-day">2</span>
            <span class="calendar-day calendar-day-highlight">3</span>
            <span class="calendar-day calendar-day-highlight">4</span>
            <span class="calendar-day calendar-day-highlight">5</span>
            <span class="calendar-day">6</span>
            <span class="calendar-day">7</span>
            <span class="calendar-day">8</span>
            <span class="calendar-day calendar-day-highlight">9</span>
            <span class="calendar-day calendar-day-highlight">10</span>
            <span class="calendar-day">11</span>
            <span class="calendar-day">12</span>
            <span class="calendar-day calendar-day-highlight">13</span>
            <span class="calendar-day">14</span>
            <span class="calendar-day">15</span>
            <span class="calendar-day">16</span>
            <span class="calendar-day calendar-day-highlight">17</span>
            <span class="calendar-day calendar-day-highlight">18</span>
            <span class="calendar-day">19</span>
            <span class="calendar-day">20</span>
            <span class="calendar-day">21</span>
            <span class="calendar-day">22</span>
            <span class="calendar-day">23</span>
            <span class="calendar-day">24</span>
            <span class="calendar-day">25</span>
            <span class="calendar-day">26</span>
            <span class="calendar-day">27</span>
            <span class="calendar-day">28</span>
            <span class="calendar-day">29</span>
            <span class="calendar-day">30</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Section -->
    @if (stats) {
      <section class="stats-section" data-section>
        <div class="stats-grid">
          <div class="stat-card glass-card" [style.animation-delay]="'0.1s'">
            <div class="stat-icon-circle">
              <mat-icon>store</mat-icon>
            </div>
            <span class="stat-number">{{ animatedStats.agencies }}</span>
            <span class="stat-label">Agences partenaires</span>
          </div>
          <div class="stat-card glass-card" [style.animation-delay]="'0.2s'">
            <div class="stat-icon-circle">
              <mat-icon>event_note</mat-icon>
            </div>
            <span class="stat-number">{{ animatedStats.reservations }}</span>
            <span class="stat-label">Reservations effectuees</span>
          </div>
          <div class="stat-card glass-card" [style.animation-delay]="'0.3s'">
            <div class="stat-icon-circle">
              <mat-icon>miscellaneous_services</mat-icon>
            </div>
            <span class="stat-number">{{ animatedStats.services }}</span>
            <span class="stat-label">Services disponibles</span>
          </div>
        </div>
      </section>
    }

    <!-- Features Section -->
    <section class="features-section" data-section>
      <div class="section-header">
        <span class="section-badge">Facile et rapide</span>
        <h2 class="section-title">Comment ca marche ?</h2>
      </div>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-step">1</div>
          <div class="feature-icon-circle">
            <mat-icon class="feature-icon">search</mat-icon>
          </div>
          <h3>Trouvez votre agence</h3>
          <p>Parcourez notre reseau d'agences partenaires et trouvez celle qui correspond a vos besoins.</p>
        </div>
        <div class="features-connector">
          <div class="connector-line"></div>
          <mat-icon class="connector-arrow">arrow_forward</mat-icon>
        </div>
        <div class="feature-card">
          <div class="feature-step">2</div>
          <div class="feature-icon-circle">
            <mat-icon class="feature-icon">calendar_month</mat-icon>
          </div>
          <h3>Reservez en ligne</h3>
          <p>Choisissez le service souhaite, selectionnez une date et reservez votre creneau en quelques clics.</p>
        </div>
        <div class="features-connector">
          <div class="connector-line"></div>
          <mat-icon class="connector-arrow">arrow_forward</mat-icon>
        </div>
        <div class="feature-card">
          <div class="feature-step">3</div>
          <div class="feature-icon-circle">
            <mat-icon class="feature-icon">notifications_active</mat-icon>
          </div>
          <h3>Suivi en temps reel</h3>
          <p>Suivez l'etat de vos reservations et recevez des notifications pour ne rien manquer.</p>
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
    @if (testimonials.length > 0) {
      <section class="testimonials-section" data-section>
        <div class="section-header">
          <span class="section-badge">Ce que disent nos utilisateurs</span>
          <h2 class="section-title">Avis de nos clients</h2>
        </div>
        @if (feedbackStats) {
          <div class="testimonials-summary">
            <div class="summary-stars">
              @for (star of getStarArray(feedbackStats.average); track $index) {
                @if (star === 'full') {
                  <mat-icon class="star-icon star-full">star</mat-icon>
                } @else if (star === 'half') {
                  <mat-icon class="star-icon star-full">star_half</mat-icon>
                } @else {
                  <mat-icon class="star-icon star-empty">star_border</mat-icon>
                }
              }
            </div>
            <span class="summary-average">{{ feedbackStats.average.toFixed(1) }}</span>
            <span class="summary-count">sur {{ feedbackStats.count }} avis</span>
          </div>
        }
        <div class="testimonials-grid">
          @for (testimonial of testimonials; track testimonial.id) {
            <div class="testimonial-card">
              <div class="testimonial-quote-bg">&laquo;</div>
              <div class="testimonial-accent-border"></div>
              <div class="testimonial-stars">
                @for (star of getStarArray(testimonial.rating); track $index) {
                  @if (star === 'full') {
                    <mat-icon class="star-sm star-full">star</mat-icon>
                  } @else if (star === 'half') {
                    <mat-icon class="star-sm star-full">star_half</mat-icon>
                  } @else {
                    <mat-icon class="star-sm star-empty">star_border</mat-icon>
                  }
                }
              </div>
              <p class="testimonial-comment">&laquo; {{ testimonial.comment }} &raquo;</p>
              <div class="testimonial-footer">
                <div class="testimonial-author">
                  <div class="author-avatar">{{ testimonial.authorName.charAt(0).toUpperCase() }}</div>
                  <div class="author-info">
                    <span class="author-name">{{ testimonial.authorName }}</span>
                    <span class="author-date">{{ testimonial.createdAt | date:'dd MMM yyyy' }}</span>
                  </div>
                </div>
                <span class="testimonial-service">{{ testimonial.service }}</span>
              </div>
            </div>
          }
        </div>
      </section>
    }

    <!-- Agencies Preview Section -->
    @if (agencies.length > 0) {
      <section class="agencies-section" data-section>
        <div class="section-header">
          <span class="section-badge">Notre reseau</span>
          <h2 class="section-title">Nos agences partenaires</h2>
        </div>
        <div class="agencies-grid">
          @for (agency of agencies; track agency.id) {
            <div class="agency-card">
              <div class="agency-header">
                <div class="agency-avatar">
                  <mat-icon>store</mat-icon>
                </div>
                <div class="agency-info">
                  <h4 class="agency-name">{{ agency.name }}</h4>
                  <span class="agency-location">
                    <mat-icon class="inline-icon">location_on</mat-icon>
                    {{ agency.city }}
                  </span>
                </div>
              </div>
              <p class="agency-address">{{ agency.address }}</p>
              @if (agency.services.length > 0) {
                <div class="agency-services">
                  @for (service of agency.services.slice(0, 3); track service.id) {
                    <span class="service-pill">{{ service.name }}</span>
                  }
                  @if (agency.services.length > 3) {
                    <span class="service-pill service-pill-more">+{{ agency.services.length - 3 }}</span>
                  }
                </div>
              }
            </div>
          }
        </div>
        <div class="see-all">
          <a routerLink="/auth/register" class="see-all-btn">
            Voir toutes les agences
            <mat-icon>arrow_forward</mat-icon>
          </a>
        </div>
      </section>
    }

    <!-- Comments Section -->
    <section class="comments-section" data-section>
      <div class="section-header">
        <span class="section-badge">Retours d'experience</span>
        <h2 class="section-title">Commentaires recents</h2>
      </div>
      @if (publicComments.length > 0) {
        <div class="comments-masonry">
          @for (comment of publicComments; track comment.id; let i = $index) {
            <div class="comment-card" [class.comment-card-new]="i >= previousCommentCount" [style.animation-delay]="(i >= previousCommentCount ? (i - previousCommentCount) * 0.08 : 0) + 's'">
              <div class="comment-card-inner">
                <div class="comment-stars">
                  @for (star of getStarArray(comment.rating); track $index) {
                    @if (star === 'full') {
                      <mat-icon class="star-sm star-gold">star</mat-icon>
                    } @else if (star === 'half') {
                      <mat-icon class="star-sm star-gold">star_half</mat-icon>
                    } @else {
                      <mat-icon class="star-sm star-empty-light">star_border</mat-icon>
                    }
                  }
                </div>
                <p class="comment-text">&laquo; {{ comment.comment }} &raquo;</p>
                <div class="comment-author-section">
                  <div class="comment-avatar">{{ comment.authorName.charAt(0).toUpperCase() }}</div>
                  <div class="comment-author-info">
                    <span class="comment-author-name">{{ comment.authorName }}</span>
                    <span class="comment-date">{{ comment.date | date:'dd MMM yyyy' }}</span>
                  </div>
                </div>
                <span class="comment-service-badge">{{ comment.service }}</span>
              </div>
            </div>
          }
        </div>
        @if (loadingComments) {
          <div class="comments-loading">
            <mat-spinner [diameter]="32"></mat-spinner>
            <span>Chargement...</span>
          </div>
        }
        @if (!loadingComments && commentsCurrentPage + 1 < commentsTotalPages) {
          <div class="comments-load-more">
            <button class="load-more-btn" (click)="loadMoreComments()">
              <mat-icon>expand_more</mat-icon>
              Voir plus de commentaires
            </button>
          </div>
        }
      } @else if (loadingComments) {
        <app-loading-spinner message="Chargement des commentaires..."></app-loading-spinner>
      }
    </section>

    <!-- Footer -->
    <footer class="footer" data-section>
      <div class="footer-top-gradient"></div>
      <div class="footer-pattern"></div>
      <div class="footer-grid">
        <div class="footer-brand-col">
          <div class="footer-brand">
            <div class="footer-logo">
              <mat-icon>travel_explore</mat-icon>
            </div>
            <span>AgencyBooking</span>
          </div>
          <p class="footer-text">
            Plateforme de reservation en ligne pour agences.
            Simplifiez la gestion de vos rendez-vous.
          </p>
        </div>
        <div class="footer-links-col">
          <h4 class="footer-col-title">Navigation</h4>
          <a routerLink="/auth/login" class="footer-link">Connexion</a>
          <a routerLink="/auth/register" class="footer-link">Inscription</a>
        </div>
        <div class="footer-links-col">
          <h4 class="footer-col-title">Plateforme</h4>
          <span class="footer-link-text">Agences partenaires</span>
          <span class="footer-link-text">Services disponibles</span>
          <span class="footer-link-text">Avis clients</span>
        </div>
        <div class="footer-contact-col">
          <h4 class="footer-col-title">Contact</h4>
          <div class="footer-contact-item">
            <mat-icon class="footer-contact-icon">email</mat-icon>
            <span>contact&#64;agencybooking.com</span>
          </div>
          <div class="footer-contact-item">
            <mat-icon class="footer-contact-icon">location_on</mat-icon>
            <span>Maroc</span>
          </div>
        </div>
      </div>
      <div class="footer-separator"></div>
      <p class="footer-copyright">
        &copy; 2025 AgencyBooking - Projet PFE. Tous droits reserves.
      </p>
    </footer>
  `,
  styles: [`
    :host {
      display: block;
      scroll-behavior: smooth;
      --gold: #f59e42;
      --gold-dark: #d97706;
    }

    /* ===== Scroll Reveal ===== */
    [data-section] {
      opacity: 0;
      transform: translateY(40px);
      transition: opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
    }
    [data-section].visible {
      opacity: 1;
      transform: translateY(0);
    }
    /* Hero always visible */
    .hero[data-section] {
      opacity: 1;
      transform: none;
    }

    /* ===== Section badge & header ===== */
    .section-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--primary-light);
      color: var(--primary);
      font-size: 0.8rem;
      font-weight: 600;
      padding: 6px 16px;
      border-radius: var(--radius-full);
      letter-spacing: 0.02em;
      margin-bottom: 12px;
    }
    .section-header {
      text-align: center;
      margin-bottom: 56px;
    }
    .section-title {
      text-align: center;
      font-family: var(--font-heading);
      font-size: 2.2rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 8px 0 0;
    }

    /* ===== Glassmorphism helper ===== */
    .glass-card {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.5);
    }

    /* ========================================
       HERO
    ======================================== */
    .hero {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 80px;
      padding: 100px 48px 48px;
      color: var(--text-primary);
      text-align: left;
      position: relative;
      overflow: hidden;
      background: var(--bg-main);
    }

    /* Animated gradient mesh */
    .hero-gradient-mesh {
      position: absolute;
      inset: 0;
      z-index: 0;
      background:
        radial-gradient(ellipse 80% 60% at 10% 20%, rgba(91, 108, 240, 0.12) 0%, transparent 60%),
        radial-gradient(ellipse 60% 80% at 80% 80%, rgba(56, 189, 248, 0.1) 0%, transparent 55%),
        radial-gradient(ellipse 70% 50% at 50% 10%, rgba(67, 56, 202, 0.08) 0%, transparent 50%),
        radial-gradient(ellipse 50% 70% at 90% 30%, rgba(245, 158, 66, 0.06) 0%, transparent 50%),
        radial-gradient(ellipse 60% 60% at 30% 70%, rgba(91, 108, 240, 0.08) 0%, transparent 50%);
      animation: meshShift 20s ease-in-out infinite alternate;
    }

    @keyframes meshShift {
      0% {
        background:
          radial-gradient(ellipse 80% 60% at 10% 20%, rgba(91, 108, 240, 0.12) 0%, transparent 60%),
          radial-gradient(ellipse 60% 80% at 80% 80%, rgba(56, 189, 248, 0.1) 0%, transparent 55%),
          radial-gradient(ellipse 70% 50% at 50% 10%, rgba(67, 56, 202, 0.08) 0%, transparent 50%),
          radial-gradient(ellipse 50% 70% at 90% 30%, rgba(245, 158, 66, 0.06) 0%, transparent 50%),
          radial-gradient(ellipse 60% 60% at 30% 70%, rgba(91, 108, 240, 0.08) 0%, transparent 50%);
      }
      33% {
        background:
          radial-gradient(ellipse 70% 70% at 30% 40%, rgba(91, 108, 240, 0.14) 0%, transparent 55%),
          radial-gradient(ellipse 80% 60% at 70% 60%, rgba(56, 189, 248, 0.09) 0%, transparent 50%),
          radial-gradient(ellipse 60% 60% at 60% 30%, rgba(67, 56, 202, 0.1) 0%, transparent 55%),
          radial-gradient(ellipse 50% 80% at 20% 70%, rgba(245, 158, 66, 0.07) 0%, transparent 50%),
          radial-gradient(ellipse 70% 50% at 80% 20%, rgba(91, 108, 240, 0.06) 0%, transparent 50%);
      }
      66% {
        background:
          radial-gradient(ellipse 60% 80% at 50% 30%, rgba(91, 108, 240, 0.1) 0%, transparent 50%),
          radial-gradient(ellipse 70% 50% at 30% 60%, rgba(56, 189, 248, 0.12) 0%, transparent 55%),
          radial-gradient(ellipse 80% 60% at 80% 50%, rgba(67, 56, 202, 0.07) 0%, transparent 50%),
          radial-gradient(ellipse 60% 60% at 60% 80%, rgba(245, 158, 66, 0.08) 0%, transparent 50%),
          radial-gradient(ellipse 50% 70% at 10% 40%, rgba(91, 108, 240, 0.09) 0%, transparent 50%);
      }
      100% {
        background:
          radial-gradient(ellipse 80% 60% at 20% 50%, rgba(91, 108, 240, 0.11) 0%, transparent 60%),
          radial-gradient(ellipse 50% 70% at 75% 30%, rgba(56, 189, 248, 0.11) 0%, transparent 55%),
          radial-gradient(ellipse 70% 60% at 40% 80%, rgba(67, 56, 202, 0.09) 0%, transparent 50%),
          radial-gradient(ellipse 60% 50% at 85% 70%, rgba(245, 158, 66, 0.05) 0%, transparent 50%),
          radial-gradient(ellipse 60% 60% at 15% 15%, rgba(91, 108, 240, 0.1) 0%, transparent 50%);
      }
    }

    /* Dot pattern overlay */
    .hero-grid-overlay {
      position: absolute;
      inset: 0;
      z-index: 0;
      background-image: radial-gradient(rgba(91, 108, 240, 0.06) 1px, transparent 1px);
      background-size: 28px 28px;
      pointer-events: none;
    }

    .bg-circles {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
    }
    .bg-circle {
      position: absolute;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(91, 108, 240, 0.15), rgba(91, 108, 240, 0.04));
      animation: float 14s ease-in-out infinite;
    }
    .bg-circle-accent {
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(56, 189, 248, 0.03));
    }

    .hero-content {
      max-width: 580px;
      position: relative;
      z-index: 1;
    }

    /* Hero badge - glassmorphism */
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.55);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: var(--primary);
      font-size: 0.85rem;
      font-weight: 600;
      padding: 8px 20px;
      border-radius: var(--radius-full);
      margin-bottom: 24px;
      letter-spacing: 0.02em;
      border: 1px solid rgba(91, 108, 240, 0.15);
      box-shadow: 0 2px 16px rgba(91, 108, 240, 0.08);
    }
    .hero-badge-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--gold);
    }

    .hero h1 {
      font-family: var(--font-heading);
      font-size: 3.2rem;
      font-weight: 800;
      line-height: 1.15;
      margin: 0 0 20px;
      color: var(--text-primary);
    }

    /* Animated gradient text */
    .gradient-text-animated {
      background: linear-gradient(
        135deg,
        var(--primary) 0%,
        var(--accent) 25%,
        var(--primary-dark) 50%,
        var(--primary) 75%,
        var(--accent) 100%
      );
      background-size: 300% 300%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: gradientTextFlow 6s ease-in-out infinite;
    }

    @keyframes gradientTextFlow {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    .hero-subtitle {
      font-size: 1.15rem;
      line-height: 1.7;
      color: var(--text-secondary);
      margin-bottom: 36px;
    }
    .hero-actions {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .hero-btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      font-family: var(--font-body);
      font-size: 1rem;
      font-weight: 600;
      padding: 14px 32px;
      border-radius: var(--radius-full);
      border: none;
      cursor: pointer;
      text-decoration: none;
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);
      box-shadow: 0 4px 20px rgba(91, 108, 240, 0.3);
      position: relative;
      overflow: hidden;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, transparent, rgba(255,255,255,0.15), transparent);
        transform: translateX(-100%);
        transition: transform 0.5s ease;
      }
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(91, 108, 240, 0.4);
        color: white;
        &::before { transform: translateX(100%); }
      }
    }
    .hero-btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: var(--primary);
      font-family: var(--font-body);
      font-size: 1rem;
      font-weight: 600;
      padding: 14px 32px;
      border-radius: var(--radius-full);
      border: 2px solid rgba(91, 108, 240, 0.2);
      cursor: pointer;
      text-decoration: none;
      transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      &:hover {
        transform: translateY(-2px);
        border-color: var(--primary);
        box-shadow: var(--shadow-md);
        color: var(--primary);
        background: rgba(255, 255, 255, 0.9);
      }
    }
    .hero-visual {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 1;
      perspective: 800px;
    }
    .hero-calendar-card {
      background: white;
      border-radius: 20px;
      padding: 28px 24px 20px;
      box-shadow: 0 20px 60px rgba(91, 108, 240, 0.15), 0 4px 20px rgba(0,0,0,0.06);
      width: 340px;
      transform: rotate3d(0.2, -1, 0, 12deg);
      transition: transform 0.4s ease;
      animation: float 6s ease-in-out infinite;
      border: 1px solid rgba(91, 108, 240, 0.08);
    }
    .hero-calendar-card:hover {
      transform: rotate3d(0, 0, 0, 0deg);
    }
    .calendar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .calendar-month {
      font-family: var(--font-heading);
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    .calendar-nav-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-secondary);
      padding: 4px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, color 0.2s;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
    }
    .calendar-nav-btn:hover {
      background: var(--primary-light);
      color: var(--primary);
    }
    .calendar-weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      text-align: center;
      margin-bottom: 8px;
      span {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-secondary);
        padding: 4px 0;
      }
    }
    .calendar-days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      text-align: center;
    }
    .calendar-day {
      font-size: 0.85rem;
      padding: 8px 0;
      border-radius: 10px;
      color: var(--text-primary);
      font-weight: 500;
      cursor: default;
      transition: background 0.2s, color 0.2s;
    }
    .calendar-day-empty {
      visibility: hidden;
    }
    .calendar-day-highlight {
      background: var(--primary, #5b6cf0);
      color: white;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(91, 108, 240, 0.3);
    }

    /* ========================================
       STATS
    ======================================== */
    .stats-section {
      padding: 72px 48px;
      background: var(--bg-card);
      position: relative;
    }
    .stats-grid {
      display: flex;
      justify-content: center;
      gap: 40px;
      flex-wrap: wrap;
      max-width: 960px;
      margin: 0 auto;
    }
    .stat-card {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 32px 44px;
      border-radius: var(--radius-xl);
      position: relative;
      transition: transform var(--transition-base), box-shadow var(--transition-base);
      cursor: default;
      &::before {
        content: '';
        position: absolute;
        inset: -1px;
        border-radius: var(--radius-xl);
        padding: 2px;
        background: linear-gradient(135deg, rgba(91, 108, 240, 0.15), rgba(56, 189, 248, 0.1), rgba(91, 108, 240, 0.15));
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        opacity: 0;
        transition: opacity var(--transition-base);
      }
      &:hover {
        transform: translateY(-6px);
        box-shadow: 0 16px 48px rgba(91, 108, 240, 0.12);
        &::before { opacity: 1; }
      }
    }
    .stat-icon-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-light), rgba(91, 108, 240, 0.12));
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: var(--primary);
      }
    }
    .stat-number {
      font-family: var(--font-heading);
      font-size: 2.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, var(--text-primary), var(--primary-dark));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .stat-label {
      font-size: 0.95rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    /* ========================================
       FEATURES
    ======================================== */
    .features-section {
      padding: 96px 48px;
      background: var(--bg-subtle);
      text-align: center;
      position: relative;
    }
    /* Wave separator at top */
    .features-section::before {
      content: '';
      position: absolute;
      top: -2px;
      left: 0;
      right: 0;
      height: 48px;
      background: var(--bg-card);
      clip-path: ellipse(55% 100% at 50% 0%);
    }

    .features-grid {
      display: flex;
      align-items: stretch;
      justify-content: center;
      gap: 0;
      max-width: 1100px;
      margin: 0 auto;
    }

    .features-connector {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      flex-shrink: 0;
      position: relative;
    }
    .connector-line {
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, rgba(91, 108, 240, 0.1), rgba(91, 108, 240, 0.3), rgba(91, 108, 240, 0.1));
      border-radius: 1px;
    }
    .connector-arrow {
      position: absolute;
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--primary);
      opacity: 0.5;
    }

    .feature-card {
      text-align: center;
      padding: 48px 32px 40px;
      border-radius: var(--radius-xl);
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-sm);
      position: relative;
      transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
      flex: 1 1 0;
      min-width: 0;
      &::before {
        content: '';
        position: absolute;
        inset: -1px;
        border-radius: var(--radius-xl);
        padding: 2px;
        background: linear-gradient(135deg, var(--primary), var(--accent), var(--primary-dark));
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        opacity: 0;
        transition: opacity var(--transition-base);
      }
      &:hover {
        transform: translateY(-6px);
        box-shadow: var(--shadow-lg);
        &::before { opacity: 1; }
        .feature-icon-circle {
          transform: scale(1.08);
          .feature-icon { color: var(--primary-dark); }
        }
        .feature-icon {
          animation: iconPop 0.4s ease;
        }
      }
      h3 {
        font-family: var(--font-heading);
        font-size: 1.2rem;
        font-weight: 600;
        margin: 20px 0 8px;
        color: var(--text-primary);
      }
      p {
        color: var(--text-secondary);
        line-height: 1.7;
        margin: 0;
        font-size: 0.95rem;
      }
    }

    @keyframes iconPop {
      0% { transform: scale(1) rotate(0deg); }
      30% { transform: scale(1.2) rotate(-5deg); }
      60% { transform: scale(0.95) rotate(3deg); }
      100% { transform: scale(1) rotate(0deg); }
    }

    .feature-step {
      position: absolute;
      top: 16px;
      right: 20px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white;
      font-family: var(--font-heading);
      font-size: 0.85rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 12px rgba(91, 108, 240, 0.3);
    }
    .feature-icon-circle {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-light), rgba(91, 108, 240, 0.1));
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      transition: transform var(--transition-base), box-shadow var(--transition-base);
    }
    .feature-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: var(--primary);
      transition: color var(--transition-base);
    }

    /* ========================================
       TESTIMONIALS
    ======================================== */
    .testimonials-section {
      padding: 96px 48px;
      background: var(--bg-card);
      text-align: center;
      position: relative;
    }
    .testimonials-section::before {
      content: '';
      position: absolute;
      top: -2px;
      left: 0;
      right: 0;
      height: 48px;
      background: var(--bg-subtle);
      clip-path: ellipse(55% 100% at 50% 0%);
    }
    .testimonials-summary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin: -24px 0 48px;
    }
    .summary-stars {
      display: flex;
      gap: 2px;
    }
    .star-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
    .star-full {
      color: var(--gold);
    }
    .star-empty {
      color: #d4d4d8;
    }
    .summary-average {
      font-family: var(--font-heading);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    .summary-count {
      font-size: 0.95rem;
      color: var(--text-secondary);
    }
    .testimonials-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .testimonial-card {
      text-align: left;
      padding: 28px 28px 28px 32px;
      border-radius: var(--radius-xl);
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-sm);
      transition: transform var(--transition-base), box-shadow var(--transition-base);
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: relative;
      overflow: hidden;
      &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg);
      }
    }
    .testimonial-accent-border {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: linear-gradient(180deg, var(--primary), var(--accent));
      border-radius: 4px 0 0 4px;
    }
    .testimonial-quote-bg {
      position: absolute;
      top: 8px;
      right: 16px;
      font-size: 5rem;
      font-family: Georgia, serif;
      color: rgba(91, 108, 240, 0.05);
      line-height: 1;
      pointer-events: none;
      user-select: none;
    }
    .testimonial-stars {
      display: flex;
      gap: 2px;
      position: relative;
      z-index: 1;
    }
    .star-sm {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .testimonial-comment {
      font-size: 0.95rem;
      line-height: 1.7;
      color: var(--text-secondary);
      margin: 0;
      font-style: italic;
      flex: 1;
      position: relative;
      z-index: 1;
    }
    .testimonial-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      position: relative;
      z-index: 1;
    }
    .testimonial-author {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .author-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      font-family: var(--font-heading);
      font-size: 0.85rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 10px rgba(91, 108, 240, 0.2);
    }
    .author-info {
      display: flex;
      flex-direction: column;
    }
    .author-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .author-date {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .testimonial-service {
      display: inline-block;
      background: var(--primary-light);
      color: var(--primary);
      font-size: 0.75rem;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: var(--radius-full);
    }

    /* ========================================
       AGENCIES
    ======================================== */
    .agencies-section {
      padding: 96px 48px;
      background: var(--bg-subtle);
      text-align: center;
      position: relative;
    }
    .agencies-section::before {
      content: '';
      position: absolute;
      top: -2px;
      left: 0;
      right: 0;
      height: 48px;
      background: var(--bg-card);
      clip-path: ellipse(55% 100% at 50% 0%);
    }

    .agencies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .agency-card {
      text-align: left;
      padding: 28px;
      border-radius: var(--radius-xl);
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-sm);
      transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
      position: relative;
      &::before {
        content: '';
        position: absolute;
        inset: -1px;
        border-radius: var(--radius-xl);
        padding: 2px;
        background: linear-gradient(135deg, var(--primary), var(--accent));
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        opacity: 0;
        transition: opacity var(--transition-base);
      }
      &:hover {
        transform: translateY(-5px) scale(1.01);
        box-shadow: 0 16px 48px rgba(91, 108, 240, 0.12);
        &::before { opacity: 1; }
      }
    }
    .agency-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 12px;
    }
    .agency-avatar {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(91, 108, 240, 0.2);
      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }
    .agency-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .agency-name {
      font-family: var(--font-heading);
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }
    .agency-location {
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .inline-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .agency-address {
      color: var(--text-muted);
      font-size: 0.85rem;
      margin: 0 0 12px;
      line-height: 1.5;
    }
    .agency-services {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .service-pill {
      display: inline-block;
      background: var(--primary-light);
      color: var(--primary);
      font-size: 0.75rem;
      font-weight: 600;
      padding: 5px 14px;
      border-radius: var(--radius-full);
      transition: background var(--transition-fast), transform var(--transition-fast);
      &:hover {
        background: rgba(91, 108, 240, 0.15);
        transform: translateY(-1px);
      }
    }
    .service-pill-more {
      background: var(--bg-subtle);
      color: var(--text-secondary);
    }
    .see-all {
      text-align: center;
      margin-top: 48px;
    }
    .see-all-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      font-family: var(--font-body);
      font-size: 1rem;
      font-weight: 600;
      padding: 14px 36px;
      border-radius: var(--radius-full);
      text-decoration: none;
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);
      box-shadow: 0 4px 20px rgba(91, 108, 240, 0.3);
      position: relative;
      overflow: hidden;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, transparent, rgba(255,255,255,0.15), transparent);
        transform: translateX(-100%);
        transition: transform 0.5s ease;
      }
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(91, 108, 240, 0.4);
        color: white;
        &::before { transform: translateX(100%); }
      }
    }

    /* ========================================
       COMMENTS SECTION
    ======================================== */
    .comments-section {
      padding: 96px 48px;
      background: var(--bg-card);
      text-align: center;
      position: relative;
    }
    .comments-section::before {
      content: '';
      position: absolute;
      top: -2px;
      left: 0;
      right: 0;
      height: 48px;
      background: var(--bg-subtle);
      clip-path: ellipse(55% 100% at 50% 0%);
    }

    .comments-masonry {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .comment-card {
      text-align: left;
      break-inside: avoid;
    }

    .comment-card-new {
      animation: commentFadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    @keyframes commentFadeIn {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .comment-card-inner {
      padding: 24px;
      border-radius: var(--radius-xl);
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(91, 108, 240, 0.08);
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 14px;
      transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 36px rgba(91, 108, 240, 0.1);
        border-color: rgba(91, 108, 240, 0.15);
      }
    }

    .comment-stars {
      display: flex;
      gap: 2px;
    }
    .star-gold {
      color: transparent;
      background: linear-gradient(135deg, #f59e42, #fbbf24);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      /* fallback for mat-icon */
      color: #f59e42;
      -webkit-text-fill-color: #f59e42;
    }
    .star-empty-light {
      color: #e2e2ea;
    }

    .comment-text {
      font-size: 0.9rem;
      line-height: 1.7;
      color: var(--text-secondary);
      margin: 0;
      font-style: italic;
    }

    .comment-author-section {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .comment-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      color: white;
      font-family: var(--font-heading);
      font-size: 0.8rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(91, 108, 240, 0.2);
    }
    .comment-author-info {
      display: flex;
      flex-direction: column;
    }
    .comment-author-name {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .comment-date {
      font-size: 0.72rem;
      color: var(--text-muted);
    }
    .comment-service-badge {
      display: inline-block;
      align-self: flex-start;
      background: linear-gradient(135deg, rgba(91, 108, 240, 0.08), rgba(56, 189, 248, 0.08));
      color: var(--primary);
      font-size: 0.72rem;
      font-weight: 600;
      padding: 4px 14px;
      border-radius: var(--radius-full);
      border: 1px solid rgba(91, 108, 240, 0.1);
    }

    .comments-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 32px 0 0;
      span {
        color: var(--text-secondary);
        font-size: 0.9rem;
      }
    }

    .comments-load-more {
      text-align: center;
      padding-top: 36px;
    }
    .load-more-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: transparent;
      color: var(--primary);
      font-family: var(--font-body);
      font-size: 0.95rem;
      font-weight: 600;
      padding: 12px 28px;
      border-radius: var(--radius-full);
      border: 2px solid rgba(91, 108, 240, 0.2);
      cursor: pointer;
      transition: all var(--transition-base);
      position: relative;
      overflow: hidden;
      &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, var(--primary), var(--primary-dark));
        opacity: 0;
        transition: opacity var(--transition-base);
        z-index: 0;
      }
      mat-icon, span {
        position: relative;
        z-index: 1;
      }
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        transition: transform var(--transition-base);
      }
      &:hover {
        border-color: var(--primary);
        color: white;
        box-shadow: 0 4px 20px rgba(91, 108, 240, 0.25);
        transform: translateY(-2px);
        &::before { opacity: 1; }
        mat-icon { transform: translateY(2px); }
      }
    }

    /* ========================================
       FOOTER
    ======================================== */
    .footer {
      background: #1e1b3a;
      color: white;
      padding: 0 0 32px;
      position: relative;
      overflow: hidden;
    }
    .footer-top-gradient {
      height: 4px;
      background: linear-gradient(90deg, var(--primary), var(--accent), var(--primary-dark), var(--primary));
      background-size: 300% 100%;
      animation: footerGradient 8s ease infinite;
    }

    @keyframes footerGradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    .footer-pattern {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 24px 24px;
      pointer-events: none;
    }

    .footer-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1.2fr;
      gap: 48px;
      max-width: 1200px;
      margin: 0 auto;
      padding: 56px 48px 40px;
      position: relative;
      z-index: 1;
    }
    .footer-brand-col {}
    .footer-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: var(--font-heading);
      font-size: 1.4rem;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .footer-logo {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }
    .footer-text {
      color: #9494b0;
      line-height: 1.7;
      font-size: 0.9rem;
      margin: 0;
    }
    .footer-col-title {
      font-family: var(--font-heading);
      font-size: 0.95rem;
      font-weight: 600;
      margin: 0 0 16px;
      color: white;
    }
    .footer-links-col {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .footer-link {
      color: #9494b0;
      font-size: 0.85rem;
      text-decoration: none;
      transition: color var(--transition-fast), padding-left var(--transition-fast);
      &:hover {
        color: white;
        padding-left: 4px;
      }
    }
    .footer-link-text {
      color: #9494b0;
      font-size: 0.85rem;
    }
    .footer-contact-col {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .footer-contact-item {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #9494b0;
      font-size: 0.85rem;
    }
    .footer-contact-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--primary);
    }
    .footer-separator {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
      margin: 0 48px 20px;
      position: relative;
      z-index: 1;
    }
    .footer-copyright {
      color: #5e5e78;
      font-size: 0.82rem;
      text-align: center;
      margin: 0;
      position: relative;
      z-index: 1;
    }

    /* ========================================
       KEYFRAMES
    ======================================== */
    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      33% { transform: translateY(-15px) rotate(3deg); }
      66% { transform: translateY(8px) rotate(-2deg); }
    }

    /* ========================================
       RESPONSIVE
    ======================================== */
    @media (max-width: 1024px) {
      .features-grid {
        flex-direction: column;
        align-items: center;
        max-width: 400px;
      }
      .features-connector {
        width: 2px;
        height: 40px;
        flex-direction: column;
        .connector-line {
          width: 2px;
          height: 100%;
          background: linear-gradient(180deg, rgba(91, 108, 240, 0.1), rgba(91, 108, 240, 0.3), rgba(91, 108, 240, 0.1));
        }
        .connector-arrow {
          transform: rotate(90deg);
        }
      }
      .feature-card {
        width: 100%;
      }
      .comments-masonry {
        grid-template-columns: repeat(2, 1fr);
      }
      .footer-grid {
        grid-template-columns: 1fr 1fr;
        gap: 32px;
      }
    }

    @media (max-width: 768px) {
      .hero {
        flex-direction: column;
        text-align: center;
        padding: 100px 24px 48px;
        gap: 40px;
      }
      .hero h1 { font-size: 2.2rem; }
      .hero-actions { justify-content: center; }
      .hero-calendar-card {
        width: 280px;
        transform: none;
        padding: 20px 16px 16px;
      }

      .stats-grid { gap: 16px; }
      .stat-card { padding: 24px 28px; }

      .features-section,
      .agencies-section,
      .stats-section,
      .testimonials-section,
      .comments-section {
        padding: 56px 20px;
      }
      .section-title { font-size: 1.75rem; }
      .section-header { margin-bottom: 36px; }

      .features-section::before,
      .testimonials-section::before,
      .agencies-section::before,
      .comments-section::before {
        height: 24px;
      }

      .agencies-grid { grid-template-columns: 1fr; }
      .testimonials-grid { grid-template-columns: 1fr; }
      .comments-masonry { grid-template-columns: 1fr; }

      .footer-grid {
        grid-template-columns: 1fr;
        gap: 32px;
        padding: 40px 24px 32px;
      }
      .footer-separator { margin: 0 24px 16px; }
    }
  `]
})
export class LandingComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private el = inject(ElementRef);
  private zone = inject(NgZone);
  private apiUrl = environment.apiUrl;

  stats: PublicStats | null = null;
  agencies: Agency[] = [];
  feedbackStats: FeedbackStatistics | null = null;
  testimonials: PublicTestimonial[] = [];

  // Animated stat counters
  animatedStats = { agencies: 0, reservations: 0, services: 0 };
  private counterIntervals: ReturnType<typeof setInterval>[] = [];

  // Public comments
  publicComments: PublicComment[] = [];
  loadingComments = false;
  commentsCurrentPage = 0;
  commentsTotalPages = 1;
  previousCommentCount = 0;

  // Scroll observer
  private scrollHandler: (() => void) | null = null;

  ngOnInit(): void {
    this.loadStats();
    this.loadAgencies();
    this.loadFeedbackStats();
    this.loadTestimonials();
    this.loadComments(0);
    this.setupScrollObserver();
  }

  ngOnDestroy(): void {
    this.counterIntervals.forEach(id => clearInterval(id));
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
    }
  }

  private setupScrollObserver(): void {
    this.zone.runOutsideAngular(() => {
      const check = () => {
        const sections = this.el.nativeElement.querySelectorAll('[data-section]');
        sections.forEach((section: HTMLElement) => {
          const rect = section.getBoundingClientRect();
          const inView = rect.top < window.innerHeight * 0.85;
          if (inView && !section.classList.contains('visible')) {
            section.classList.add('visible');
          }
        });
      };
      // Initial check
      setTimeout(check, 100);
      this.scrollHandler = check;
      window.addEventListener('scroll', check, { passive: true });
    });
  }

  private animateCounters(): void {
    if (!this.stats) return;
    const targets = {
      agencies: this.stats.totalAgencies,
      reservations: this.stats.totalReservations,
      services: this.stats.totalServices
    };

    const duration = 1800; // ms
    const steps = 60;
    const interval = duration / steps;

    (Object.keys(targets) as (keyof typeof targets)[]).forEach(key => {
      const target = targets[key];
      let current = 0;
      const increment = target / steps;
      const id = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(id);
        }
        this.zone.run(() => {
          this.animatedStats[key] = Math.round(current);
        });
      }, interval);
      this.counterIntervals.push(id);
    });
  }

  private loadStats(): void {
    this.http.get<PublicStats>(`${this.apiUrl}/api/public/stats`).subscribe({
      next: (data) => {
        this.stats = data;
        // Start counters after a short delay so the section is rendered
        setTimeout(() => this.animateCounters(), 300);
      },
      error: (err) => { console.error('Failed to load stats:', err); }
    });
  }

  private loadAgencies(): void {
    this.http.get<Agency[]>(`${this.apiUrl}/api/agencies`).subscribe({
      next: (data) => this.agencies = data.slice(0, 6),
      error: () => {}
    });
  }

  private loadFeedbackStats(): void {
    this.http.get<FeedbackStatistics>(`${this.apiUrl}/api/public/feedback/statistics`).subscribe({
      next: (data) => this.feedbackStats = data,
      error: (err) => { console.error('Failed to load feedback stats:', err); }
    });
  }

  private loadTestimonials(): void {
    this.http.get<{ content: PublicTestimonial[] }>(`${this.apiUrl}/api/public/feedback/testimonials?page=0&size=4`).subscribe({
      next: (data) => this.testimonials = data.content,
      error: (err) => { console.error('Failed to load testimonials:', err); }
    });
  }

  private loadComments(page: number): void {
    this.loadingComments = true;
    this.http.get<CommentsPage>(`${this.apiUrl}/api/public/feedback/comments?page=${page}&size=6`).subscribe({
      next: (data) => {
        this.previousCommentCount = this.publicComments.length;
        this.publicComments = [...this.publicComments, ...data.content];
        this.commentsCurrentPage = data.currentPage;
        this.commentsTotalPages = data.totalPages;
        this.loadingComments = false;
      },
      error: (err) => {
        this.loadingComments = false;
        console.error('Failed to load comments:', err);
      }
    });
  }

  loadMoreComments(): void {
    if (this.commentsCurrentPage + 1 < this.commentsTotalPages) {
      this.loadComments(this.commentsCurrentPage + 1);
    }
  }

  getStarArray(rating: number): ('full' | 'half' | 'empty')[] {
    const stars: ('full' | 'half' | 'empty')[] = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
    const roundUp = rating - fullStars >= 0.75;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push('full');
      } else if (i === fullStars && hasHalf) {
        stars.push('half');
      } else if (i === fullStars && roundUp) {
        stars.push('full');
      } else {
        stars.push('empty');
      }
    }
    return stars;
  }
}
