import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { Agency, ApiResponse } from '../../../shared/models';

interface AgentDisplay {
  id: number;
  username: string;
  email: string;
  agencyId: number | null;
  agencyName: string | null;
  available: boolean;
}

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatPaginatorModule, MatSelectModule, MatSlideToggleModule,
    MatButtonModule, MatIconModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule,
    LoadingSpinnerComponent
  ],
  template: `
    <div class="agents-container">
      <div class="page-header">
        <div class="header-float header-float-1"></div>
        <div class="header-float header-float-2"></div>
        <div>
          <h1>Gestion des agents</h1>
          <p>Gerez les agents et leurs affectations</p>
        </div>
        <button mat-flat-button color="primary" (click)="openCreateDialog()">
          <mat-icon>person_add</mat-icon>
          Nouvel agent
        </button>
      </div>

      @if (loading) {
        <app-loading-spinner message="Chargement des agents..."></app-loading-spinner>
      } @else {
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Rechercher un agent</mat-label>
          <input matInput (keyup)="applyFilter($event)" placeholder="Nom, email, agence...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <div class="table-container">
          <table mat-table [dataSource]="dataSource" class="agents-table">
            <ng-container matColumnDef="username">
              <th mat-header-cell *matHeaderCellDef>Nom</th>
              <td mat-cell *matCellDef="let agent">{{ agent.username }}</td>
            </ng-container>

            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Email</th>
              <td mat-cell *matCellDef="let agent">{{ agent.email }}</td>
            </ng-container>

            <ng-container matColumnDef="agencyName">
              <th mat-header-cell *matHeaderCellDef>Agence</th>
              <td mat-cell *matCellDef="let agent">
                <mat-select [value]="agent.agencyId"
                            (selectionChange)="reassignAgency(agent, $event.value)"
                            placeholder="Aucune agence"
                            class="agency-select">
                  <mat-option [value]="null">Aucune agence</mat-option>
                  @for (agency of agencies; track agency.id) {
                    <mat-option [value]="agency.id">{{ agency.name }}</mat-option>
                  }
                </mat-select>
              </td>
            </ng-container>

            <ng-container matColumnDef="available">
              <th mat-header-cell *matHeaderCellDef>Disponibilite</th>
              <td mat-cell *matCellDef="let agent">
                <mat-slide-toggle [checked]="agent.available"
                                  (change)="toggleAvailability(agent)"
                                  color="primary">
                  {{ agent.available ? 'Disponible' : 'Indisponible' }}
                </mat-slide-toggle>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let agent">
                <button mat-icon-button color="warn" (click)="confirmDelete(agent)" matTooltip="Supprimer l'agent">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <tr class="mat-row no-data-row" *matNoDataRow>
              <td class="mat-cell" [attr.colspan]="displayedColumns.length">
                Aucun agent enregistre
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
    .agents-container {
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
        &:hover {
          background: rgba(255,255,255,0.25) !important;
        }
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

    .search-field {
      width: 100%;
      max-width: 400px;
      margin-bottom: 16px;
    }

    .table-container {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      border-radius: var(--radius-xl);
      overflow: hidden;
      box-shadow: var(--shadow-md);
    }

    .agents-table {
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

    @keyframes adminFloat {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-10px) rotate(5deg); }
    }

    @keyframes shimmerMove {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @keyframes adminRowFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .agency-select {
      width: 180px;
    }

    .no-data-row td {
      text-align: center;
      padding: 48px 24px;
      color: var(--text-muted);
      font-style: italic;
      font-family: var(--font-body);
    }
  `]
})
export class AgentsComponent implements OnInit {
  private http = inject(HttpClient);
  private notification = inject(NotificationService);
  private dialog = inject(MatDialog);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns = ['username', 'email', 'agencyName', 'available', 'actions'];
  dataSource = new MatTableDataSource<AgentDisplay>();
  agencies: Agency[] = [];
  loading = false;

  ngOnInit(): void {
    this.loadAgencies();
    this.loadAgents();
    this.dataSource.filterPredicate = (data: AgentDisplay, filter: string) => {
      const search = filter.trim().toLowerCase();
      return (data.username?.toLowerCase().includes(search) || false)
        || (data.email?.toLowerCase().includes(search) || false)
        || (data.agencyName?.toLowerCase().includes(search) || false);
    };
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(AgentCreateDialogComponent, {
      width: '500px',
      data: { agencies: this.agencies }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAgents();
      }
    });
  }

  reassignAgency(agent: AgentDisplay, agencyId: number | null): void {
    this.http.put<ApiResponse>(
      `${environment.apiUrl}/api/admin/agents/${agent.id}/assign-agency`,
      { agencyId }
    ).subscribe({
      next: () => {
        const agency = this.agencies.find(a => a.id === agencyId);
        agent.agencyId = agencyId;
        agent.agencyName = agency?.name || null;
        this.notification.success('Agent reassigne avec succes');
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors de la reassignation');
        this.loadAgents();
      }
    });
  }

  toggleAvailability(agent: AgentDisplay): void {
    this.http.put<any>(
      `${environment.apiUrl}/api/admin/agents/${agent.id}/toggle-availability`,
      {}
    ).subscribe({
      next: (res) => {
        agent.available = res.available;
        this.notification.success(agent.available ? 'Agent disponible' : 'Agent indisponible');
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors du changement de disponibilite');
        agent.available = !agent.available;
      }
    });
  }

  confirmDelete(agent: AgentDisplay): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Supprimer l\'agent',
        message: `Etes-vous sur de vouloir supprimer l'agent "${agent.username}" ? Cette action est irreversible.`,
        confirmText: 'Supprimer',
        color: 'warn'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.deleteAgent(agent);
      }
    });
  }

  private deleteAgent(agent: AgentDisplay): void {
    this.http.delete<ApiResponse>(
      `${environment.apiUrl}/api/admin/agents/${agent.id}`
    ).subscribe({
      next: () => {
        this.notification.success('Agent supprime avec succes');
        this.dataSource.data = this.dataSource.data.filter(a => a.id !== agent.id);
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors de la suppression');
      }
    });
  }

  private loadAgencies(): void {
    this.http.get<Agency[]>(`${environment.apiUrl}/api/agencies`).subscribe({
      next: (agencies) => {
        this.agencies = agencies;
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors du chargement des agences');
      }
    });
  }

  private loadAgents(): void {
    this.loading = true;
    this.http.get<AgentDisplay[]>(`${environment.apiUrl}/api/admin/agents`).subscribe({
      next: (agents) => {
        this.dataSource.data = agents;
        this.loading = false;
        // Defer paginator assignment to next tick so Angular can render the element
        setTimeout(() => {
          this.dataSource.paginator = this.paginator;
        });
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors du chargement des agents');
        this.loading = false;
      }
    });
  }
}

// --- Agent Create Dialog Component ---

interface AgentCreateDialogData {
  agencies: Agency[];
}

@Component({
  selector: 'app-agent-create-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="title-icon">person_add</mat-icon>
      Nouvel agent
    </h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="agent-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nom d'utilisateur</mat-label>
          <input matInput formControlName="username">
          @if (form.get('username')?.hasError('required') && form.get('username')?.touched) {
            <mat-error>Le nom est requis</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" type="email">
          @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
            <mat-error>L'email est requis</mat-error>
          }
          @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
            <mat-error>Email invalide</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Mot de passe</mat-label>
          <input matInput formControlName="password" type="password">
          @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
            <mat-error>Le mot de passe est requis</mat-error>
          }
          @if (form.get('password')?.hasError('minlength') && form.get('password')?.touched) {
            <mat-error>Minimum 6 caracteres</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Confirmer le mot de passe</mat-label>
          <input matInput formControlName="passwordConfirm" type="password">
          @if (form.get('passwordConfirm')?.hasError('required') && form.get('passwordConfirm')?.touched) {
            <mat-error>La confirmation est requise</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Agence (optionnel)</mat-label>
          <mat-select formControlName="agencyId">
            <mat-option [value]="null">Aucune agence</mat-option>
            @for (agency of data.agencies; track agency.id) {
              <mat-option [value]="agency.id">{{ agency.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">Annuler</button>
      <button mat-flat-button color="primary" (click)="onSave()" [disabled]="form.invalid || saving">
        Creer l'agent
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      font-family: var(--font-heading);
      font-weight: 600;
      color: var(--text-primary);
      font-size: 20px;
    }
    .title-icon {
      color: var(--primary);
      vertical-align: middle;
      margin-right: 10px;
      background: linear-gradient(135deg, rgba(91, 108, 240, 0.15), rgba(91, 108, 240, 0.05));
      box-shadow: 0 0 12px rgba(91, 108, 240, 0.1);
      border-radius: var(--radius-full);
      width: 36px;
      height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    .agent-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 400px;
    }
    .full-width { width: 100%; }
    .agent-form mat-form-field {
      animation: fieldFadeUp 0.3s ease-out both;
    }
    .agent-form mat-form-field:nth-child(1) { animation-delay: 0.05s; }
    .agent-form mat-form-field:nth-child(2) { animation-delay: 0.1s; }
    .agent-form mat-form-field:nth-child(3) { animation-delay: 0.15s; }
    .agent-form mat-form-field:nth-child(4) { animation-delay: 0.2s; }
    .agent-form mat-form-field:nth-child(5) { animation-delay: 0.25s; }
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
    @keyframes fieldFadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmerMove {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `]
})
export class AgentCreateDialogComponent {
  dialogRef = inject(MatDialogRef<AgentCreateDialogComponent>);
  data: AgentCreateDialogData = inject(MAT_DIALOG_DATA);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private notification = inject(NotificationService);

  saving = false;

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    passwordConfirm: ['', [Validators.required]],
    agencyId: [null as number | null]
  });

  onSave(): void {
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    if (value.password !== value.passwordConfirm) {
      this.notification.error('Les mots de passe ne correspondent pas');
      return;
    }

    this.saving = true;
    this.http.post(`${environment.apiUrl}/api/admin/users/create-agent`, {
      username: value.username,
      email: value.email,
      password: value.password,
      passwordConfirm: value.passwordConfirm,
      agencyId: value.agencyId
    }).subscribe({
      next: () => {
        this.notification.success('Agent cree avec succes');
        this.saving = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors de la creation de l\'agent');
        this.saving = false;
      }
    });
  }
}
