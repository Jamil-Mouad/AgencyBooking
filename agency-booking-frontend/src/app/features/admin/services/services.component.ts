import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ServiceOffering, ServiceOfferingRequest, Agency, ApiResponse } from '../../../shared/models';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatCardModule,
    LoadingSpinnerComponent
  ],
  template: `
    <div class="services-container">
      <div class="page-header">
        <div class="header-float header-float-1"></div>
        <div class="header-float header-float-2"></div>
        <h1>Gestion des services</h1>
        <p>Ajoutez, modifiez et supprimez les services proposes</p>
      </div>

      <div class="services-layout">
        <mat-card class="add-service-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="form-icon">add_circle</mat-icon>
            <mat-card-title>{{ editingService ? 'Modifier le service' : 'Ajouter un service' }}</mat-card-title>
          </mat-card-header>

          <mat-card-content>
            <form [formGroup]="serviceForm" (ngSubmit)="onSubmit()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nom du service</mat-label>
                <input matInput formControlName="name" placeholder="Ex: Vol, Hotel, Transport...">
                <mat-icon matSuffix>miscellaneous_services</mat-icon>
                @if (serviceForm.get('name')?.hasError('required') && serviceForm.get('name')?.touched) {
                  <mat-error>Le nom du service est requis</mat-error>
                }
              </mat-form-field>

              <div class="form-actions">
                <button mat-flat-button color="primary" type="submit"
                        [disabled]="serviceForm.invalid">
                  <mat-icon>{{ editingService ? 'save' : 'add' }}</mat-icon>
                  {{ editingService ? 'Mettre a jour' : 'Ajouter' }}
                </button>
                @if (editingService) {
                  <button mat-button type="button" (click)="cancelEdit()">
                    Annuler
                  </button>
                }
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <div class="services-list-section">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Rechercher un service</mat-label>
            <input matInput (keyup)="applyFilter($event)" placeholder="Nom du service...">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          @if (loading) {
            <app-loading-spinner message="Chargement des services..."></app-loading-spinner>
          } @else {
            <div class="table-container">
              <table mat-table [dataSource]="dataSource" matSort class="services-table">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Nom du service</th>
                  <td mat-cell *matCellDef="let service">{{ service.name }}</td>
                </ng-container>

                <ng-container matColumnDef="agencies">
                  <th mat-header-cell *matHeaderCellDef>Agences</th>
                  <td mat-cell *matCellDef="let service">
                    <button mat-button color="primary" (click)="viewAgencies(service)" class="agencies-count-btn">
                      <mat-icon>store</mat-icon>
                      {{ serviceAgenciesMap[service.id]?.length || 0 }}
                    </button>
                  </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Actions</th>
                  <td mat-cell *matCellDef="let service">
                    <button mat-icon-button color="primary" (click)="startEdit(service)" matTooltip="Modifier">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="confirmDelete(service)" matTooltip="Supprimer">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"
                    [class.editing-row]="editingService?.id === row.id"></tr>

                <tr class="mat-row no-data-row" *matNoDataRow>
                  <td class="mat-cell" [attr.colspan]="displayedColumns.length">
                    Aucun service trouve
                  </td>
                </tr>
              </table>

              <mat-paginator [pageSizeOptions]="[10, 25, 50]"
                             showFirstLastButtons
                             aria-label="Selectionner la page">
              </mat-paginator>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .services-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 32px;
      padding: 28px 32px;
      background:
        radial-gradient(ellipse at 20% 50%, rgba(91, 108, 240, 0.9) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 20%, rgba(67, 56, 202, 0.8) 0%, transparent 50%),
        radial-gradient(ellipse at 60% 80%, rgba(56, 189, 248, 0.3) 0%, transparent 50%),
        linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      border-radius: var(--radius-xl);
      color: white;
      position: relative;
      overflow: hidden;
      &::before {
        content: '';
        position: absolute;
        top: -30px;
        right: -30px;
        width: 120px;
        height: 120px;
        border-radius: 50%;
        background: rgba(255,255,255,0.08);
      }
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background-image: radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
        background-size: 24px 24px;
        pointer-events: none;
      }
      h1 {
        margin: 0 0 4px;
        font-size: 24px;
        font-family: var(--font-heading);
        font-weight: 700;
        color: white;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      p {
        margin: 0;
        font-family: var(--font-body);
        color: rgba(255,255,255,0.8);
        font-size: 14px;
      }
    }

    .header-float {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      animation: adminFloat 12s ease-in-out infinite;
    }
    .header-float-1 {
      width: 70px; height: 70px; top: -15px; right: 12%;
      background: rgba(255, 255, 255, 0.06);
    }
    .header-float-2 {
      width: 40px; height: 40px; bottom: -8px; left: 30%;
      background: rgba(255, 255, 255, 0.04);
      animation-delay: -4s;
    }

    .services-layout {
      display: grid;
      grid-template-columns: 350px 1fr;
      gap: 24px;
      align-items: start;
    }

    @media (max-width: 960px) {
      .services-layout {
        grid-template-columns: 1fr;
      }
    }

    .add-service-card {
      padding: 20px;
      border-radius: var(--radius-xl);
      border: 1px solid rgba(255, 255, 255, 0.5);
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: var(--shadow-sm);
      transition: all var(--transition-base);
      position: relative;
      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        border-color: transparent;
        &::before {
          opacity: 1;
        }
      }
      &::before {
        content: '';
        position: absolute;
        inset: -1px;
        border-radius: inherit;
        padding: 1px;
        background: linear-gradient(135deg, var(--primary), var(--accent));
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        opacity: 0;
        transition: opacity var(--transition-base);
        pointer-events: none;
      }
    }

    .form-icon {
      background: linear-gradient(135deg, rgba(2, 132, 199, 0.15), rgba(2, 132, 199, 0.05));
      color: var(--accent-dark);
      border-radius: var(--radius-md);
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    mat-card-header {
      margin-bottom: 16px;
      ::ng-deep .mat-mdc-card-header-text {
        .mat-mdc-card-title {
          font-family: var(--font-heading);
          font-weight: 600;
          color: var(--text-primary);
        }
      }
    }

    .full-width {
      width: 100%;
    }

    .form-actions {
      display: flex;
      gap: 8px;
      button[type="submit"] {
        background: linear-gradient(135deg, var(--primary), var(--primary-dark)) !important;
        color: white !important;
        border-radius: var(--radius-md) !important;
        font-family: var(--font-body) !important;
        font-weight: 600 !important;
        position: relative;
        overflow: hidden;
        &::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%);
          background-size: 200% 100%;
          opacity: 0;
          transition: opacity var(--transition-fast);
        }
        &:hover::after {
          opacity: 1;
          animation: shimmerMove 1.5s ease-in-out infinite;
        }
      }
      button[type="button"] {
        border-radius: var(--radius-md) !important;
        font-family: var(--font-body) !important;
        color: var(--text-secondary) !important;
      }
      button mat-icon {
        margin-right: 8px;
      }
    }

    .search-field {
      width: 100%;
    }

    .table-container {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: var(--radius-xl);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      border: 1px solid rgba(255, 255, 255, 0.5);
    }

    .services-table {
      width: 100%;
    }

    th.mat-mdc-header-cell {
      background: linear-gradient(135deg, rgba(91, 108, 240, 0.06) 0%, rgba(67, 56, 202, 0.03) 100%);
      font-weight: 600;
      font-family: var(--font-body);
      color: var(--text-primary);
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    tr.mat-mdc-row {
      animation: adminRowFadeIn 0.3s ease-out both;
    }
    tr.mat-mdc-row:nth-child(1) { animation-delay: 0.04s; }
    tr.mat-mdc-row:nth-child(2) { animation-delay: 0.08s; }
    tr.mat-mdc-row:nth-child(3) { animation-delay: 0.12s; }
    tr.mat-mdc-row:nth-child(4) { animation-delay: 0.16s; }
    tr.mat-mdc-row:nth-child(5) { animation-delay: 0.2s; }
    tr.mat-mdc-row:nth-child(6) { animation-delay: 0.24s; }
    tr.mat-mdc-row:nth-child(7) { animation-delay: 0.28s; }
    tr.mat-mdc-row:nth-child(8) { animation-delay: 0.32s; }
    tr.mat-mdc-row:nth-child(9) { animation-delay: 0.36s; }
    tr.mat-mdc-row:nth-child(10) { animation-delay: 0.4s; }

    tr.mat-mdc-row:hover {
      background: rgba(91, 108, 240, 0.06);
      transition: background var(--transition-fast);
    }

    tr.mat-mdc-row:nth-child(even) {
      background: var(--bg-subtle);
    }

    tr.mat-mdc-row:nth-child(even):hover {
      background: rgba(91, 108, 240, 0.06);
    }

    .editing-row {
      background: var(--primary-light) !important;
      border-left: 3px solid var(--primary);
    }

    .no-data-row td {
      text-align: center;
      padding: 48px 24px;
      color: var(--text-muted);
      font-style: italic;
      font-family: var(--font-body);
    }

    .agencies-count-btn {
      min-width: auto;
      padding: 4px 14px;
      font-weight: 600;
      font-family: var(--font-body);
      border-radius: var(--radius-full) !important;
      background: var(--primary-light) !important;
      color: var(--primary) !important;
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 4px;
      }
    }

    td.mat-mdc-cell {
      font-family: var(--font-body);
      color: var(--text-primary);
    }

    button[color="primary"] mat-icon {
      color: var(--primary);
    }

    button[color="warn"] mat-icon {
      color: var(--warn);
    }

    @keyframes shimmerMove {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `]
})
export class ServicesComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns = ['name', 'agencies', 'actions'];
  dataSource = new MatTableDataSource<ServiceOffering>();
  serviceAgenciesMap: { [serviceId: number]: Agency[] } = {};
  loading = false;
  editingService: ServiceOffering | null = null;

  serviceForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.loadServices();
    this.dataSource.filterPredicate = (data: ServiceOffering, filter: string) => {
      return data.name?.toLowerCase().includes(filter) || false;
    };
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  onSubmit(): void {
    if (this.serviceForm.invalid) return;

    const request: ServiceOfferingRequest = { name: this.serviceForm.getRawValue().name };

    if (this.editingService) {
      this.updateService(this.editingService.id, request);
    } else {
      this.createService(request);
    }
  }

  startEdit(service: ServiceOffering): void {
    this.editingService = service;
    this.serviceForm.patchValue({ name: service.name });
  }

  cancelEdit(): void {
    this.editingService = null;
    this.serviceForm.reset();
  }

  viewAgencies(service: ServiceOffering): void {
    this.dialog.open(ServiceAgenciesDialogComponent, {
      width: '500px',
      data: { service, agencies: this.serviceAgenciesMap[service.id] || [] }
    });
  }

  confirmDelete(service: ServiceOffering): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Supprimer le service',
        message: `Etes-vous sur de vouloir supprimer le service "${service.name}" ?`,
        confirmText: 'Supprimer',
        color: 'warn'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.deleteService(service);
      }
    });
  }

  private createService(request: ServiceOfferingRequest): void {
    this.http.post<ServiceOffering>(`${environment.apiUrl}/api/services`, request).subscribe({
      next: () => {
        this.notification.success('Service cree avec succes');
        this.serviceForm.reset();
        this.loadServices();
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors de la creation du service');
      }
    });
  }

  private updateService(id: number, request: ServiceOfferingRequest): void {
    this.http.put<ServiceOffering>(`${environment.apiUrl}/api/services/${id}`, request).subscribe({
      next: () => {
        this.notification.success('Service mis a jour avec succes');
        this.editingService = null;
        this.serviceForm.reset();
        this.loadServices();
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors de la mise a jour du service');
      }
    });
  }

  private deleteService(service: ServiceOffering): void {
    this.http.delete<ApiResponse>(`${environment.apiUrl}/api/services/${service.id}`).subscribe({
      next: () => {
        this.notification.success(`Service "${service.name}" supprime`);
        this.loadServices();
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors de la suppression du service');
      }
    });
  }

  private loadServices(): void {
    this.loading = true;
    this.http.get<ServiceOffering[]>(`${environment.apiUrl}/api/services`).subscribe({
      next: (services) => {
        this.dataSource.data = services;
        this.loading = false;
        // Defer paginator/sort assignment to next tick so Angular can render the elements
        setTimeout(() => {
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        });
        // Load agencies for each service
        for (const service of services) {
          this.http.get<Agency[]>(`${environment.apiUrl}/api/services/${service.id}/agencies`).subscribe({
            next: (agencies) => {
              this.serviceAgenciesMap[service.id] = agencies;
            }
          });
        }
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors du chargement des services');
        this.loading = false;
      }
    });
  }
}

// --- Service Agencies Dialog Component ---

interface ServiceAgenciesDialogData {
  service: ServiceOffering;
  agencies: Agency[];
}

@Component({
  selector: 'app-service-agencies-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="title-icon">store</mat-icon>
      Agences proposant "{{ data.service.name }}"
    </h2>
    <mat-dialog-content>
      @if (data.agencies.length) {
        <div class="agencies-list">
          @for (agency of data.agencies; track agency.id) {
            <div class="agency-card">
              <div class="agency-avatar">
                <mat-icon>store</mat-icon>
              </div>
              <div class="agency-info">
                <strong>{{ agency.name }}</strong>
                <small>{{ agency.city }}</small>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="no-agencies">
          <mat-icon>store_mall_directory</mat-icon>
          <p>Aucune agence ne propose ce service</p>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Fermer</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 18px;
      font-family: var(--font-heading);
      font-weight: 700;
      color: var(--text-primary);
    }
    .title-icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: var(--primary-light);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    .agencies-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 400px;
    }
    .agency-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: var(--radius-lg);
      background: var(--bg-subtle);
      border: 1px solid var(--border-light);
      transition: all var(--transition-fast);
      &:hover {
        background: var(--primary-light);
        border-color: var(--border);
        transform: translateX(2px);
      }
    }
    .agency-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { color: white; font-size: 22px; }
    }
    .agency-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      strong {
        font-size: 14px;
        font-family: var(--font-heading);
        font-weight: 600;
        color: var(--text-primary);
      }
      small {
        font-size: 12px;
        font-family: var(--font-body);
        color: var(--text-secondary);
      }
    }
    .no-agencies {
      text-align: center;
      padding: 32px 24px;
      color: var(--text-muted);
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--border); }
      p {
        margin: 12px 0 0;
        font-size: 14px;
        font-family: var(--font-body);
        font-style: italic;
        color: var(--text-secondary);
      }
    }

    mat-dialog-actions button {
      border-radius: var(--radius-md) !important;
      font-family: var(--font-body) !important;
      font-weight: 600 !important;
      color: var(--text-secondary) !important;
      &:hover {
        background: var(--bg-subtle) !important;
        color: var(--text-primary) !important;
      }
    }
  `]
})
export class ServiceAgenciesDialogComponent {
  dialogRef = inject(MatDialogRef<ServiceAgenciesDialogComponent>);
  data: ServiceAgenciesDialogData = inject(MAT_DIALOG_DATA);
}
