import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { Agency, AgencyRequest, AgentSummary, ServiceOffering, BusinessHours, ApiResponse } from '../../../shared/models';

const DAYS_OF_WEEK = [
  { value: 'MONDAY', label: 'Lundi' },
  { value: 'TUESDAY', label: 'Mardi' },
  { value: 'WEDNESDAY', label: 'Mercredi' },
  { value: 'THURSDAY', label: 'Jeudi' },
  { value: 'FRIDAY', label: 'Vendredi' },
  { value: 'SATURDAY', label: 'Samedi' },
  { value: 'SUNDAY', label: 'Dimanche' }
];

@Component({
  selector: 'app-admin-agencies',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatChipsModule, MatTooltipModule,
    LoadingSpinnerComponent
  ],
  template: `
    <div class="agencies-container">
      <div class="page-header">
        <div class="header-float header-float-1"></div>
        <div class="header-float header-float-2"></div>
        <div>
          <h1>Gestion des agences</h1>
          <p>Creez, modifiez et supprimez les agences</p>
        </div>
        <button mat-flat-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          Nouvelle agence
        </button>
      </div>

      @if (loading) {
        <app-loading-spinner message="Chargement des agences..."></app-loading-spinner>
      } @else {
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Rechercher une agence</mat-label>
          <input matInput (keyup)="applyFilter($event)" placeholder="Nom, ville, adresse...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <div class="table-container">
          <table mat-table [dataSource]="dataSource" matSort class="agencies-table">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Nom</th>
              <td mat-cell *matCellDef="let agency">{{ agency.name }}</td>
            </ng-container>

            <ng-container matColumnDef="city">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Ville</th>
              <td mat-cell *matCellDef="let agency">{{ agency.city }}</td>
            </ng-container>

            <ng-container matColumnDef="address">
              <th mat-header-cell *matHeaderCellDef>Adresse</th>
              <td mat-cell *matCellDef="let agency">{{ agency.address }}</td>
            </ng-container>

            <ng-container matColumnDef="agents">
              <th mat-header-cell *matHeaderCellDef>Agents</th>
              <td mat-cell *matCellDef="let agency">
                <button mat-button color="primary" (click)="viewAgents(agency)" class="agents-count-btn">
                  <mat-icon>people</mat-icon>
                  {{ agency.agents?.length || 0 }}
                </button>
              </td>
            </ng-container>

            <ng-container matColumnDef="services">
              <th mat-header-cell *matHeaderCellDef>Services</th>
              <td mat-cell *matCellDef="let agency">
                <div class="service-chips">
                  @for (service of getServiceObjects(agency.services)?.slice(0, 3); track service.id) {
                    <mat-chip highlighted>{{ service.name }}</mat-chip>
                  }
                  @if ((getServiceObjects(agency.services)?.length || 0) > 3) {
                    <mat-chip highlighted class="overflow-chip" (click)="viewServices(agency)">
                      +{{ getServiceObjects(agency.services).length - 3 }}
                    </mat-chip>
                  }
                  @if ((getServiceObjects(agency.services)?.length || 0) > 0) {
                    <button mat-icon-button class="view-services-btn" (click)="viewServices(agency)" matTooltip="Voir tous les services">
                      <mat-icon>visibility</mat-icon>
                    </button>
                  }
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let agency">
                <button mat-icon-button color="primary" (click)="openEditDialog(agency)" matTooltip="Modifier">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="confirmDelete(agency)" matTooltip="Supprimer">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <tr class="mat-row no-data-row" *matNoDataRow>
              <td class="mat-cell" [attr.colspan]="displayedColumns.length">
                Aucune agence trouvee
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
  `,
  styles: [`
    .agencies-container {
      padding: 28px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
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
        top: -40%;
        right: -10%;
        width: 180px;
        height: 180px;
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
        font-weight: 700;
        font-family: var(--font-heading);
        color: white;
        position: relative;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      p {
        margin: 0;
        color: rgba(255,255,255,0.8);
        font-size: 14px;
        font-family: var(--font-body);
        position: relative;
      }
      button {
        background: rgba(255,255,255,0.15) !important;
        color: white !important;
        border: 1px solid rgba(255,255,255,0.25) !important;
        border-radius: var(--radius-md) !important;
        font-family: var(--font-body) !important;
        font-weight: 600 !important;
        backdrop-filter: blur(8px);
        position: relative;
        overflow: hidden;
        transition: background var(--transition-fast) !important;
        &::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%);
          background-size: 200% 100%;
          opacity: 0;
          transition: opacity var(--transition-fast);
        }
        &:hover {
          background: rgba(255,255,255,0.25) !important;
        }
        &:hover::after {
          opacity: 1;
          animation: shimmerMove 1.5s ease-in-out infinite;
        }
      }
      button mat-icon {
        margin-right: 8px;
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

    .table-container {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: var(--radius-xl);
      overflow: hidden;
      box-shadow: var(--shadow-md);
      border: 1px solid rgba(255, 255, 255, 0.5);
    }

    .agencies-table {
      width: 100%;
    }

    th.mat-mdc-header-cell {
      background: linear-gradient(135deg, rgba(91, 108, 240, 0.06) 0%, rgba(67, 56, 202, 0.03) 100%);
      font-weight: 600;
      color: var(--text-primary);
      font-size: 12px;
      font-family: var(--font-body);
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

    .service-chips {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      align-items: center;
      mat-chip {
        --mdc-chip-elevated-container-color: var(--primary-light);
        --mdc-chip-label-text-color: var(--primary-dark);
        font-size: 11px;
        font-weight: 600;
      }
      .overflow-chip {
        cursor: pointer;
        --mdc-chip-elevated-container-color: var(--primary);
        --mdc-chip-label-text-color: white;
        transition: transform var(--transition-fast), box-shadow var(--transition-fast);
        &:hover {
          transform: scale(1.08);
          box-shadow: var(--shadow-sm);
        }
      }
    }

    .view-services-btn {
      width: 28px;
      height: 28px;
      line-height: 28px;
      color: var(--text-muted);
      transition: color var(--transition-fast), background var(--transition-fast);
      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
      &:hover {
        color: var(--primary);
        background: var(--primary-light);
      }
    }

    .no-data-row td {
      text-align: center;
      padding: 48px 24px;
      color: var(--text-muted);
      font-style: italic;
      font-family: var(--font-body);
    }

    .search-field {
      width: 100%;
      max-width: 400px;
      margin-bottom: 16px;
    }

    .agents-count-btn {
      min-width: auto;
      padding: 4px 14px;
      font-weight: 600;
      color: var(--primary) !important;
      font-family: var(--font-body);
      border-radius: var(--radius-full) !important;
      background: var(--primary-light) !important;
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 4px;
      }
    }
  `]
})
export class AdminAgenciesComponent implements OnInit {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns = ['name', 'city', 'address', 'agents', 'services', 'actions'];
  dataSource = new MatTableDataSource<Agency>();
  loading = false;

  ngOnInit(): void {
    this.loadAgencies();
    this.dataSource.filterPredicate = (data: Agency, filter: string) => {
      const search = filter.trim().toLowerCase();
      return (data.name?.toLowerCase().includes(search) || false)
        || (data.city?.toLowerCase().includes(search) || false)
        || (data.address?.toLowerCase().includes(search) || false);
    };
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  /** Filter out bare ID references from @JsonIdentityInfo — keep only full objects with a name */
  getServiceObjects(services: any[]): ServiceOffering[] {
    if (!services) return [];
    return services.filter(s => s && typeof s === 'object' && s.name);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(AgencyFormDialogComponent, {
      width: '700px',
      maxHeight: '90vh',
      data: { agency: null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAgencies();
      }
    });
  }

  openEditDialog(agency: Agency): void {
    const dialogRef = this.dialog.open(AgencyFormDialogComponent, {
      width: '700px',
      maxHeight: '90vh',
      data: { agency }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAgencies();
      }
    });
  }

  viewAgents(agency: Agency): void {
    this.dialog.open(AgencyAgentsDialogComponent, {
      width: '500px',
      data: { agency }
    });
  }

  viewServices(agency: Agency): void {
    this.dialog.open(AgencyServicesDialogComponent, {
      width: '500px',
      data: { agency }
    });
  }

  confirmDelete(agency: Agency): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Supprimer l\'agence',
        message: `Etes-vous sur de vouloir supprimer l'agence "${agency.name}" ? Cette action est irreversible.`,
        confirmText: 'Supprimer',
        color: 'warn'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.deleteAgency(agency);
      }
    });
  }

  private deleteAgency(agency: Agency): void {
    this.http.delete<ApiResponse>(`${environment.apiUrl}/api/agencies/${agency.id}`).subscribe({
      next: () => {
        this.notification.success(`Agence "${agency.name}" supprimee`);
        this.loadAgencies();
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors de la suppression de l\'agence');
      }
    });
  }

  private loadAgencies(): void {
    this.loading = true;
    this.http.get<Agency[]>(`${environment.apiUrl}/api/agencies`).subscribe({
      next: (agencies) => {
        this.dataSource.data = agencies;
        this.loading = false;
        // Defer paginator/sort assignment to next tick so Angular can render the elements
        setTimeout(() => {
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        });
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors du chargement des agences');
        this.loading = false;
      }
    });
  }
}

// --- Agency Form Dialog Component ---

interface AgencyFormDialogData {
  agency: Agency | null;
}

@Component({
  selector: 'app-agency-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule,
    MatCheckboxModule, MatDividerModule, MatChipsModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.agency ? 'Modifier l\\'agence' : 'Nouvelle agence' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="agency-form">
        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Nom</mat-label>
            <input matInput formControlName="name">
            @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
              <mat-error>Le nom est requis</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Ville</mat-label>
            <input matInput formControlName="city">
            @if (form.get('city')?.hasError('required') && form.get('city')?.touched) {
              <mat-error>La ville est requise</mat-error>
            }
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Adresse</mat-label>
          <input matInput formControlName="address">
          @if (form.get('address')?.hasError('required') && form.get('address')?.touched) {
            <mat-error>L'adresse est requise</mat-error>
          }
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Telephone</mat-label>
            <input matInput formControlName="phoneNumber">
            @if (form.get('phoneNumber')?.hasError('required') && form.get('phoneNumber')?.touched) {
              <mat-error>Le telephone est requis</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email">
            @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
              <mat-error>L'email est requis</mat-error>
            }
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Services</mat-label>
          <mat-select formControlName="serviceIds" multiple>
            @for (service of availableServices; track service.id) {
              <mat-option [value]="service.id">{{ service.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-divider></mat-divider>

        <h3>Horaires d'ouverture</h3>
        <div formArrayName="businessHours" class="hours-list">
          @for (day of daysOfWeek; track day.value; let i = $index) {
            <div class="hours-row" [formGroupName]="i">
              <mat-checkbox formControlName="closed" class="day-checkbox">
                {{ day.label }}
              </mat-checkbox>
              @if (!getBusinessHoursGroup(i).get('closed')?.value) {
                <mat-form-field appearance="outline" class="time-field">
                  <mat-label>Ouverture</mat-label>
                  <input matInput formControlName="openingTime" type="time">
                </mat-form-field>
                <mat-form-field appearance="outline" class="time-field">
                  <mat-label>Fermeture</mat-label>
                  <input matInput formControlName="closingTime" type="time">
                </mat-form-field>
              } @else {
                <span class="closed-label">Ferme</span>
              }
            </div>
          }
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">Annuler</button>
      <button mat-flat-button color="primary" (click)="onSave()" [disabled]="form.invalid || saving">
        {{ data.agency ? 'Mettre a jour' : 'Creer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .agency-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 500px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    h2[mat-dialog-title] {
      font-family: var(--font-heading);
      font-weight: 600;
      color: var(--text-primary);
      font-size: 20px;
    }

    mat-divider {
      margin: 8px 0 4px;
    }

    h3 {
      margin: 16px 0 12px;
      font-size: 16px;
      font-weight: 600;
      font-family: var(--font-heading);
      color: var(--text-primary);
      padding-bottom: 8px;
      border-bottom: 2px solid var(--border-light);
    }

    .hours-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .hours-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 10px;
      border-radius: var(--radius-md);
      transition: background var(--transition-fast);
      &:hover {
        background: var(--bg-subtle);
      }
    }

    .day-checkbox {
      min-width: 120px;
      font-family: var(--font-body);
    }

    .time-field {
      width: 140px;
    }

    .closed-label {
      color: var(--text-muted);
      font-style: italic;
      font-size: 14px;
      font-family: var(--font-body);
    }

    .agency-form mat-form-field,
    .agency-form .form-row,
    .agency-form mat-divider,
    .agency-form h3,
    .agency-form .hours-list {
      animation: fieldFadeUp 0.3s ease-out both;
    }
    .agency-form > :nth-child(1) { animation-delay: 0.05s; }
    .agency-form > :nth-child(2) { animation-delay: 0.1s; }
    .agency-form > :nth-child(3) { animation-delay: 0.15s; }
    .agency-form > :nth-child(4) { animation-delay: 0.2s; }
    .agency-form > :nth-child(5) { animation-delay: 0.25s; }
    .agency-form > :nth-child(6) { animation-delay: 0.3s; }
    .agency-form > :nth-child(7) { animation-delay: 0.35s; }
    .agency-form > :nth-child(8) { animation-delay: 0.4s; }

    mat-dialog-actions button[mat-flat-button] {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%) !important;
      color: white !important;
      border-radius: var(--radius-md) !important;
      font-family: var(--font-body) !important;
      font-weight: 600 !important;
      padding: 0 24px !important;
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
    mat-dialog-actions button[mat-button] {
      color: var(--text-secondary) !important;
      font-family: var(--font-body) !important;
      border-radius: var(--radius-md) !important;
    }
  `]
})
export class AgencyFormDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<AgencyFormDialogComponent>);
  data: AgencyFormDialogData = inject(MAT_DIALOG_DATA);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private notification = inject(NotificationService);

  availableServices: ServiceOffering[] = [];
  daysOfWeek = DAYS_OF_WEEK;
  saving = false;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    address: ['', [Validators.required]],
    city: ['', [Validators.required]],
    phoneNumber: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    description: [''],
    serviceIds: [[] as number[]],
    businessHours: this.fb.array(
      DAYS_OF_WEEK.map(day =>
        this.fb.group({
          day: [day.value],
          openingTime: ['09:00'],
          closingTime: ['17:00'],
          closed: [day.value === 'SUNDAY']
        })
      )
    )
  });

  ngOnInit(): void {
    this.loadServices();

    if (this.data.agency) {
      this.populateForm(this.data.agency);
    }
  }

  get businessHoursArray(): FormArray {
    return this.form.get('businessHours') as FormArray;
  }

  getBusinessHoursGroup(index: number): FormGroup {
    return this.businessHoursArray.at(index) as FormGroup;
  }

  onSave(): void {
    if (this.form.invalid) return;

    this.saving = true;
    const formValue = this.form.getRawValue();

    const request: AgencyRequest = {
      name: formValue.name,
      address: formValue.address,
      city: formValue.city,
      phoneNumber: formValue.phoneNumber,
      email: formValue.email,
      description: formValue.description,
      serviceIds: formValue.serviceIds,
      businessHours: formValue.businessHours.map(bh => ({
        day: bh.day || '',
        openingTime: bh.closed ? '' : (bh.openingTime || ''),
        closingTime: bh.closed ? '' : (bh.closingTime || ''),
        closed: bh.closed ?? false
      }))
    };

    console.log('[AgencyForm] onSave payload:', JSON.stringify(request, null, 2));

    if (this.data.agency) {
      this.updateAgency(this.data.agency.id, request);
    } else {
      this.createAgency(request);
    }
  }

  private createAgency(request: AgencyRequest): void {
    this.http.post<Agency>(`${environment.apiUrl}/api/agencies`, request).subscribe({
      next: () => {
        this.notification.success('Agence creee avec succes');
        this.saving = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors de la creation de l\'agence');
        this.saving = false;
      }
    });
  }

  private updateAgency(id: number, request: AgencyRequest): void {
    this.http.put<Agency>(`${environment.apiUrl}/api/agencies/${id}`, request).subscribe({
      next: () => {
        this.notification.success('Agence mise a jour avec succes');
        this.saving = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors de la mise a jour de l\'agence');
        this.saving = false;
      }
    });
  }

  private loadServices(): void {
    this.http.get<ServiceOffering[]>(`${environment.apiUrl}/api/services`).subscribe({
      next: (services) => {
        this.availableServices = services;
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors du chargement des services');
      }
    });
  }

  private populateForm(agency: Agency): void {
    this.form.patchValue({
      name: agency.name,
      address: agency.address,
      city: agency.city,
      phoneNumber: agency.phoneNumber,
      email: agency.email,
      description: agency.description,
      serviceIds: agency.services?.map(s => s.id) || []
    });

    if (agency.businessHours?.length) {
      const hoursArray = this.businessHoursArray;
      for (let i = 0; i < DAYS_OF_WEEK.length; i++) {
        const dayValue = DAYS_OF_WEEK[i].value;
        const existing = agency.businessHours.find(bh => bh.day === dayValue);
        if (existing) {
          hoursArray.at(i).patchValue({
            openingTime: existing.openingTime || '09:00',
            closingTime: existing.closingTime || '17:00',
            closed: existing.closed
          });
        }
      }
    }
  }
}

// --- Agency Agents Dialog Component ---

interface AgencyAgentsDialogData {
  agency: Agency;
}

@Component({
  selector: 'app-agency-agents-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="title-icon">people</mat-icon>
      Agents de l'agence "{{ data.agency.name }}"
    </h2>
    <mat-dialog-content>
      @if (data.agency.agents?.length) {
        <div class="agents-list">
          @for (agent of data.agency.agents; track agent.id) {
            <div class="agent-card">
              <div class="agent-avatar">
                <mat-icon>person</mat-icon>
              </div>
              <div class="agent-info">
                <strong>{{ agent.username || 'Sans nom' }}</strong>
                <small>{{ agent.email }}</small>
              </div>
              <mat-chip [class.available]="agent.available" [class.unavailable]="!agent.available">
                {{ agent.available ? 'Disponible' : 'Indisponible' }}
              </mat-chip>
            </div>
          }
        </div>
      } @else {
        <div class="no-agents">
          <mat-icon>person_off</mat-icon>
          <p>Aucun agent assigne a cette agence</p>
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

    .agents-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 400px;
    }

    .agent-card {
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

    .agent-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon {
        color: white;
        font-size: 22px;
      }
    }

    .agent-info {
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

    mat-chip.available {
      --mdc-chip-elevated-container-color: var(--success-light);
      --mdc-chip-label-text-color: var(--success-dark);
      font-size: 11px;
      font-weight: 600;
      font-family: var(--font-body);
    }

    mat-chip.unavailable {
      --mdc-chip-elevated-container-color: var(--warn-light);
      --mdc-chip-label-text-color: var(--warn-dark);
      font-size: 11px;
      font-weight: 600;
      font-family: var(--font-body);
    }

    .no-agents {
      text-align: center;
      padding: 32px 24px;
      color: var(--text-muted);
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--border);
      }
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
export class AgencyAgentsDialogComponent {
  dialogRef = inject(MatDialogRef<AgencyAgentsDialogComponent>);
  data: AgencyAgentsDialogData = inject(MAT_DIALOG_DATA);
}

// --- Agency Services Dialog Component ---

interface AgencyServicesDialogData {
  agency: Agency;
}

@Component({
  selector: 'app-agency-services-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule, MatButtonModule, MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="title-icon">miscellaneous_services</mat-icon>
      Services de "{{ data.agency.name }}"
    </h2>
    <mat-dialog-content>
      @if (services.length) {
        <div class="services-list">
          @for (service of services; track service.id) {
            <div class="service-item">
              <div class="service-icon">
                <mat-icon>miscellaneous_services</mat-icon>
              </div>
              <div class="service-info">
                <strong>{{ service.name }}</strong>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="no-services">
          <mat-icon>inventory_2</mat-icon>
          <p>Aucun service pour cette agence</p>
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

    .services-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 400px;
    }

    .service-item {
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

    .service-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon {
        color: white;
        font-size: 22px;
      }
    }

    .service-info {
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
    }

    .no-services {
      text-align: center;
      padding: 32px 24px;
      color: var(--text-muted);
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--border);
      }
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
export class AgencyServicesDialogComponent {
  dialogRef = inject(MatDialogRef<AgencyServicesDialogComponent>);
  data: AgencyServicesDialogData = inject(MAT_DIALOG_DATA);

  get services(): ServiceOffering[] {
    if (!this.data.agency.services) return [];
    return this.data.agency.services.filter(s => s && typeof s === 'object' && s.name);
  }
}
