import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { User, UserRole, ChangeRoleRequest, ApiResponse } from '../../../shared/models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatMenuModule, MatChipsModule, MatTooltipModule,
    LoadingSpinnerComponent
  ],
  template: `
    <div class="users-container">
      <div class="page-header">
        <div class="header-float header-float-1"></div>
        <div class="header-float header-float-2"></div>
        <h1>Gestion des utilisateurs</h1>
        <p>Gerez les comptes et les roles des utilisateurs</p>
      </div>

      @if (loading) {
        <app-loading-spinner message="Chargement des utilisateurs..."></app-loading-spinner>
      } @else {
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Rechercher un utilisateur</mat-label>
          <input matInput (keyup)="applyFilter($event)" placeholder="Nom, email ou role..." #searchInput>
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <div class="table-container">
          <table mat-table [dataSource]="dataSource" matSort class="users-table">
            <ng-container matColumnDef="username">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Nom d'utilisateur</th>
              <td mat-cell *matCellDef="let user">{{ user.username }}</td>
            </ng-container>

            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Email</th>
              <td mat-cell *matCellDef="let user">{{ user.email }}</td>
            </ng-container>

            <ng-container matColumnDef="role">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Role</th>
              <td mat-cell *matCellDef="let user">
                <mat-chip [class]="'role-' + user.role.toLowerCase()" highlighted>
                  {{ getRoleLabel(user.role) }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let user">
                <button mat-icon-button [matMenuTriggerFor]="roleMenu" matTooltip="Changer le role">
                  <mat-icon>admin_panel_settings</mat-icon>
                </button>
                <mat-menu #roleMenu="matMenu">
                  <div class="menu-title">Changer le role</div>
                  @for (role of availableRoles; track role) {
                    <button mat-menu-item
                            [disabled]="user.role === role"
                            (click)="changeRole(user, role)">
                      <mat-icon>{{ getRoleIcon(role) }}</mat-icon>
                      {{ getRoleLabel(role) }}
                    </button>
                  }
                </mat-menu>
                <button mat-icon-button color="warn" (click)="confirmDelete(user)" matTooltip="Supprimer l'utilisateur">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <tr class="mat-row no-data-row" *matNoDataRow>
              <td class="mat-cell" [attr.colspan]="displayedColumns.length">
                Aucun utilisateur trouve
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
    .users-container {
      padding: 28px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
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
    }

    .header-float {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      animation: adminFloat 12s ease-in-out infinite;
    }
    .header-float-1 {
      width: 70px;
      height: 70px;
      top: -15px;
      right: 12%;
      background: rgba(255, 255, 255, 0.06);
    }
    .header-float-2 {
      width: 40px;
      height: 40px;
      bottom: -8px;
      left: 30%;
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
      border-radius: var(--radius-xl);
      overflow: hidden;
      box-shadow: var(--shadow-md);
      border: 1px solid rgba(255, 255, 255, 0.5);
    }

    .users-table {
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

    .role-user {
      --mdc-chip-elevated-container-color: var(--success-light);
      --mdc-chip-label-text-color: var(--success-dark);
      font-weight: 600;
      font-size: 12px;
    }

    .role-agent {
      --mdc-chip-elevated-container-color: #f3e8ff;
      --mdc-chip-label-text-color: #7c3aed;
      font-weight: 600;
      font-size: 12px;
    }

    .role-admin {
      --mdc-chip-elevated-container-color: var(--warn-light);
      --mdc-chip-label-text-color: var(--warn-dark);
      font-weight: 600;
      font-size: 12px;
    }

    .menu-title {
      padding: 8px 16px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: var(--font-body);
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
export class UsersComponent implements OnInit {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns = ['username', 'email', 'role', 'actions'];
  dataSource = new MatTableDataSource<User>();
  loading = false;
  availableRoles: UserRole[] = ['USER', 'AGENT', 'ADMIN'];

  ngOnInit(): void {
    this.loadUsers();
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  getRoleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      USER: 'Utilisateur',
      AGENT: 'Agent',
      ADMIN: 'Administrateur'
    };
    return labels[role] || role;
  }

  getRoleIcon(role: UserRole): string {
    const icons: Record<UserRole, string> = {
      USER: 'person',
      AGENT: 'support_agent',
      ADMIN: 'admin_panel_settings'
    };
    return icons[role] || 'person';
  }

  changeRole(user: User, newRole: UserRole): void {
    const body: ChangeRoleRequest = { newRole };
    this.http.post<ApiResponse>(
      `${environment.apiUrl}/api/admin/users/change-role/${user.id}`,
      body
    ).subscribe({
      next: () => {
        this.notification.success(`Role de ${user.username} change en ${this.getRoleLabel(newRole)}`);
        user.role = newRole;
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors du changement de role');
      }
    });
  }

  confirmDelete(user: User): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Supprimer l\'utilisateur',
        message: `Etes-vous sur de vouloir supprimer l'utilisateur "${user.username}" ? Cette action est irreversible.`,
        confirmText: 'Supprimer',
        color: 'warn'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.deleteUser(user);
      }
    });
  }

  private deleteUser(user: User): void {
    this.http.delete<ApiResponse>(
      `${environment.apiUrl}/api/admin/users/${user.id}`
    ).subscribe({
      next: () => {
        this.notification.success(`Utilisateur "${user.username}" supprime`);
        this.dataSource.data = this.dataSource.data.filter(u => u.id !== user.id);
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors de la suppression de l\'utilisateur');
      }
    });
  }

  private loadUsers(): void {
    this.loading = true;
    this.http.get<User[]>(`${environment.apiUrl}/api/admin/users`).subscribe({
      next: (users) => {
        this.dataSource.data = users;
        this.loading = false;
        // Defer paginator/sort assignment to next tick so Angular can render the elements
        setTimeout(() => {
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        });
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Erreur lors du chargement des utilisateurs');
        this.loading = false;
      }
    });
  }
}
