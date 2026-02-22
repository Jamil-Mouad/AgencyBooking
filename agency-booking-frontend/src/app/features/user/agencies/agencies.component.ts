import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { environment } from '../../../../environments/environment';
import { Agency } from '../../../shared/models';

@Component({
  selector: 'app-agencies',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatChipsModule,
    LoadingSpinnerComponent
  ],
  template: `
    <div class="page-container">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-bg">
          <div class="float-shape s1"></div>
          <div class="float-shape s2"></div>
          <div class="float-shape s3"></div>
        </div>
        <h1 class="page-title">Agences</h1>
        <p class="page-subtitle">Trouvez et réservez auprès de nos agences partenaires</p>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filters">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Rechercher une agence</mat-label>
            <input matInput [(ngModel)]="searchTerm" (ngModelChange)="applyFilters()" placeholder="Nom de l'agence...">
            <mat-icon matSuffix class="search-icon">search</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="city-field">
            <mat-label>Filtrer par ville</mat-label>
            <mat-select [(ngModel)]="selectedCity" (ngModelChange)="applyFilters()">
              <mat-option value="">Toutes les villes</mat-option>
              @for (city of cities; track city) {
                <mat-option [value]="city">{{ city }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <!-- Loading -->
      @if (loading) {
        <app-loading-spinner message="Chargement des agences..."></app-loading-spinner>
      }

      <!-- No results -->
      @if (!loading && filteredAgencies.length === 0) {
        <div class="empty-state">
          <div class="empty-state-icon-wrapper">
            <mat-icon>store_mall_directory</mat-icon>
          </div>
          <h3>Aucune agence trouvée</h3>
          <p>Essayez de modifier vos critères de recherche</p>
        </div>
      }

      <!-- Agencies Grid -->
      @if (!loading && filteredAgencies.length > 0) {
        <div class="agencies-grid">
          @for (agency of filteredAgencies; track agency.id) {
            <mat-card class="agency-card">
              <mat-card-header>
                <div class="agency-avatar" mat-card-avatar>
                  <mat-icon>store</mat-icon>
                </div>
                <mat-card-title class="agency-name">{{ agency.name }}</mat-card-title>
                <mat-card-subtitle class="agency-location">
                  <mat-icon class="inline-icon">location_on</mat-icon>
                  {{ agency.city }}
                </mat-card-subtitle>
              </mat-card-header>

              <mat-card-content>
                <div class="agency-details">
                  <p class="agency-address">
                    <mat-icon class="inline-icon">home</mat-icon>
                    <span>{{ agency.address }}</span>
                  </p>

                  @if (agency.phoneNumber) {
                    <p class="agency-phone">
                      <mat-icon class="inline-icon">phone</mat-icon>
                      <span>{{ agency.phoneNumber }}</span>
                    </p>
                  }
                </div>

                @if (agency.services.length > 0) {
                  <div class="agency-services">
                    @for (service of agency.services; track service.id) {
                      <span class="service-chip">{{ service.name }}</span>
                    }
                  </div>
                }
              </mat-card-content>

              <mat-card-actions align="end">
                <a mat-flat-button color="primary" class="book-btn" [routerLink]="['/user/agencies', agency.id]">
                  <mat-icon>event</mat-icon>
                  Réserver
                </a>
              </mat-card-actions>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    /* ===== Page Container ===== */
    .page-container {
      padding: 32px 24px 48px;
      max-width: 1280px;
      margin: 0 auto;
    }

    /* ===== Page Header ===== */
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

    /* ===== Filters Section ===== */
    .filters-section {
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-xl);
      padding: 20px 24px 4px;
      margin-bottom: 32px;
      box-shadow: var(--shadow-xs);
    }

    .filters {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .search-field {
      flex: 1;
      min-width: 260px;
    }

    .city-field {
      min-width: 220px;
    }

    .search-icon {
      color: var(--text-muted);
    }

    /* ===== Agencies Grid ===== */
    .agencies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }

    /* ===== Agency Card ===== */
    .agency-card {
      border-radius: var(--radius-lg) !important;
      border: 1px solid var(--border-light) !important;
      background: var(--bg-card) !important;
      box-shadow: var(--shadow-sm) !important;
      transition: box-shadow var(--transition-base), transform var(--transition-base) !important;
      overflow: hidden;

      &:hover {
        box-shadow: var(--shadow-md) !important;
        transform: translateY(-3px);
      }
    }

    /* ===== Agency Avatar ===== */
    .agency-avatar {
      background: var(--primary-light) !important;
      color: var(--primary) !important;
      border-radius: var(--radius-md) !important;
      width: 44px !important;
      height: 44px !important;
      display: flex !important;
      align-items: center;
      justify-content: center;

      mat-icon {
        color: var(--primary);
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    /* ===== Agency Name & Location ===== */
    .agency-name {
      font-family: var(--font-heading) !important;
      font-weight: 600 !important;
      color: var(--text-primary) !important;
      font-size: 1.05rem !important;
    }

    .agency-location {
      color: var(--text-secondary) !important;
      font-family: var(--font-body) !important;
      display: flex !important;
      align-items: center;
      gap: 2px;
      font-size: 0.875rem !important;
    }

    /* ===== Inline Icons ===== */
    .inline-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      vertical-align: middle;
      margin-right: 6px;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    /* ===== Agency Details ===== */
    .agency-details {
      padding-top: 4px;
    }

    .agency-address,
    .agency-phone {
      color: var(--text-secondary);
      font-family: var(--font-body);
      font-size: 0.875rem;
      margin: 8px 0;
      display: flex;
      align-items: center;
      line-height: 1.4;
    }

    /* ===== Service Chips ===== */
    .agency-services {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border-light);
    }

    .service-chip {
      display: inline-flex;
      align-items: center;
      padding: 4px 14px;
      border-radius: var(--radius-full);
      background: var(--primary-light);
      color: var(--primary-dark);
      font-family: var(--font-body);
      font-size: 0.8rem;
      font-weight: 500;
      letter-spacing: 0.01em;
      transition: background var(--transition-fast);

      &:hover {
        background: var(--bg-subtle);
      }
    }

    /* ===== Book Button ===== */
    .book-btn {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%) !important;
      color: var(--text-inverse) !important;
      border-radius: var(--radius-md) !important;
      font-family: var(--font-body) !important;
      font-weight: 600 !important;
      letter-spacing: 0 !important;
      padding: 0 20px !important;
      height: 40px;
      transition: transform var(--transition-fast), box-shadow var(--transition-fast), opacity var(--transition-fast) !important;
      box-shadow: 0 2px 8px rgba(91, 108, 240, 0.25) !important;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 6px;
      }

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(91, 108, 240, 0.35) !important;
      }

      &:active {
        transform: translateY(0);
      }
    }

    /* ===== Empty State ===== */
    .empty-state {
      text-align: center;
      padding: 80px 24px;
      background: var(--bg-card);
      border: 1px dashed var(--border);
      border-radius: var(--radius-xl);
      margin-top: 8px;
    }

    .empty-state-icon-wrapper {
      width: 80px;
      height: 80px;
      border-radius: var(--radius-full);
      background: var(--primary-light);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;

      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: var(--primary);
      }
    }

    .empty-state h3 {
      font-family: var(--font-heading);
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 8px;
    }

    .empty-state p {
      font-family: var(--font-body);
      font-size: 0.95rem;
      color: var(--text-muted);
      margin: 0;
    }

    /* ===== Responsive ===== */
    @media (max-width: 640px) {
      .page-container {
        padding: 20px 16px 40px;
      }

      .page-title {
        font-size: 1.5rem;
      }

      .filters-section {
        padding: 16px 16px 0;
        border-radius: var(--radius-lg);
      }

      .filters {
        flex-direction: column;
        gap: 0;
      }

      .search-field,
      .city-field {
        min-width: 100%;
      }

      .agencies-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }
  `]
})
export class AgenciesComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  agencies: Agency[] = [];
  filteredAgencies: Agency[] = [];
  cities: string[] = [];
  searchTerm = '';
  selectedCity = '';
  loading = false;

  ngOnInit(): void {
    this.loadAgencies();
  }

  applyFilters(): void {
    this.filteredAgencies = this.agencies.filter(agency => {
      const matchesSearch = !this.searchTerm ||
        agency.name.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesCity = !this.selectedCity || agency.city === this.selectedCity;
      return matchesSearch && matchesCity;
    });
  }

  private loadAgencies(): void {
    this.loading = true;
    this.http.get<Agency[]>(`${this.apiUrl}/api/agencies`).subscribe({
      next: (data) => {
        this.agencies = data;
        this.filteredAgencies = data;
        this.cities = [...new Set(data.map(a => a.city))].sort();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
