import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatMenuModule,
    MatBadgeModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>👥 Gestion des Utilisateurs</h1>
          <p class="subtitle">Gérer les comptes utilisateurs et leurs permissions</p>
        </div>
        <button mat-raised-button color="primary" (click)="showAddForm()">
          <mat-icon>add</mat-icon>
          Ajouter un Utilisateur
        </button>
      </div>

      <mat-tab-group mat-stretch-tabs="false" class="enhanced-tabs">
        <mat-tab>
          <ng-template mat-tab-label>
            <div class="tab-label">
              <mat-icon>people</mat-icon>
              <span>Tous les utilisateurs</span>
              <mat-chip class="tab-badge" color="primary">{{ users().length }}</mat-chip>
            </div>
          </ng-template>
          <div class="tab-content">
            <div class="stats-overview">
              <mat-card class="stats-card highlight-card">
                <mat-card-content>
                  <div class="stats-grid">
                    <div class="stat-item total-stat">
                      <div class="stat-icon">
                        <mat-icon>people</mat-icon>
                      </div>
                      <div class="stat-content">
                        <strong class="stat-number">{{ users().length }}</strong>
                        <span class="stat-label">Total utilisateurs</span>
                      </div>
                    </div>
                    <div class="stat-item validated-stat">
                      <div class="stat-icon">
                        <mat-icon>check_circle</mat-icon>
                      </div>
                      <div class="stat-content">
                        <strong class="stat-number">{{ validatedUsersCount() }}</strong>
                        <span class="stat-label">Validés</span>
                      </div>
                    </div>
                    <div class="stat-item pending-stat">
                      <div class="stat-icon">
                        <mat-icon>schedule</mat-icon>
                      </div>
                      <div class="stat-content">
                        <strong class="stat-number">{{ pendingUsersCount() }}</strong>
                        <span class="stat-label">En attente</span>
                      </div>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>

            <mat-card class="table-card">
              <mat-card-content>
                <table mat-table [dataSource]="users()" class="users-table">
                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Nom</th>
                    <td mat-cell *matCellDef="let user">{{ user.nom }} {{ user.prenom }}</td>
                  </ng-container>

                  <ng-container matColumnDef="email">
                    <th mat-header-cell *matHeaderCellDef>Email</th>
                    <td mat-cell *matCellDef="let user">{{ user.email }}</td>
                  </ng-container>

                  <ng-container matColumnDef="role">
                    <th mat-header-cell *matHeaderCellDef>Rôle</th>
                    <td mat-cell *matCellDef="let user">
                      <mat-chip [color]="getRoleColor(user.role)" selected>
                        {{ getRoleLabel(user.role) }}
                      </mat-chip>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Statut</th>
                    <td mat-cell *matCellDef="let user">
                      <mat-chip [color]="user.isValidated ? 'primary' : 'warn'" selected>
                        {{ user.isValidated ? 'Validé' : 'En attente' }}
                      </mat-chip>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="createdAt">
                    <th mat-header-cell *matHeaderCellDef>Créé le</th>
                    <td mat-cell *matCellDef="let user">{{ user.createdAt | date:'dd/MM/yyyy' }}</td>
                  </ng-container>

                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef>Actions</th>
                    <td mat-cell *matCellDef="let user">
                      <button mat-icon-button [matMenuTriggerFor]="userMenu" [matMenuTriggerData]="{user: user}" aria-label="Actions">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
                </table>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Menu d'actions partagé -->
        <mat-menu #userMenu="matMenu">
          <ng-template matMenuContent let-user="user">
            <button mat-menu-item (click)="editUser(user)">
              <mat-icon>edit</mat-icon>
              <span>Modifier</span>
            </button>
            <button mat-menu-item (click)="toggleValidation(user)">
              <mat-icon>{{ user.isValidated ? 'block' : 'check_circle' }}</mat-icon>
              <span>{{ user.isValidated ? 'Désactiver' : 'Valider' }}</span>
            </button>
            <button mat-menu-item (click)="resetPassword(user)" *ngIf="user.isValidated">
              <mat-icon>lock_reset</mat-icon>
              <span>Réinitialiser mot de passe</span>
            </button>
            <button mat-menu-item (click)="deleteUser(user)" class="delete-action">
              <mat-icon>delete</mat-icon>
              <span>Supprimer</span>
            </button>
          </ng-template>
        </mat-menu>

        <mat-tab>
          <ng-template mat-tab-label>
            <div class="tab-label">
              <mat-icon>group_work</mat-icon>
              <span>Par rôle</span>
              <mat-chip class="tab-badge" color="accent">{{ totalUsersCount() }}</mat-chip>
            </div>
          </ng-template>
          <div class="tab-content">
            <div class="role-overview">
              <div class="role-summary">
                <mat-card *ngFor="let role of ['admin', 'tresorier', 'membre']" class="role-card {{ role }}-card">
                  <mat-card-header>
                    <div class="role-header">
                      <div class="role-icon">
                        <mat-icon>{{ getRoleIcon(role) }}</mat-icon>
                      </div>
                      <div class="role-info">
                        <mat-card-title class="role-title">{{ getRoleLabel(role) }}s</mat-card-title>
                        <mat-card-subtitle class="role-count">{{ getUsersByRole(role).length }} utilisateur(s)</mat-card-subtitle>
                      </div>
                      <mat-chip class="role-badge" [color]="getRoleColor(role)">
                        {{ getUsersByRole(role).length }}
                      </mat-chip>
                    </div>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="role-users">
                      <div *ngFor="let user of getUsersByRole(role)" class="user-item enhanced-user-item">
                        <div class="user-avatar">
                          <mat-icon>person</mat-icon>
                        </div>
                        <div class="user-info">
                          <strong>{{ user.nom }} {{ user.prenom }}</strong>
                          <span>{{ user.email }}</span>
                        </div>
                        <mat-chip [color]="user.isValidated ? 'primary' : 'warn'" selected class="status-chip">
                          {{ user.isValidated ? 'Validé' : 'En attente' }}
                        </mat-chip>
                      </div>
                      <div *ngIf="getUsersByRole(role).length === 0" class="empty-state">
                        <mat-icon>person_off</mat-icon>
                        <span>Aucun utilisateur dans ce rôle</span>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>

    <!-- Dialog pour ajouter/modifier un utilisateur -->
    <div *ngIf="showForm()" class="dialog-overlay" (click)="hideForm()">
      <div class="dialog-content" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2>{{ editingUser() ? 'Modifier' : 'Ajouter' }} un Utilisateur</h2>
          <button mat-icon-button (click)="hideForm()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <form [formGroup]="userForm" (ngSubmit)="saveUser()">
          <mat-form-field appearance="outline">
            <mat-label>Nom</mat-label>
            <input matInput formControlName="nom" required>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Prénom</mat-label>
            <input matInput formControlName="prenom" required>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" required>
          </mat-form-field>

          <mat-form-field appearance="outline" *ngIf="!editingUser()">
            <mat-label>Mot de passe</mat-label>
            <input matInput type="password" formControlName="password" required>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Rôle</mat-label>
            <mat-select formControlName="role" required>
              <mat-option value="membre">Membre</mat-option>
              <mat-option value="tresorier">Trésorier</mat-option>
              <mat-option value="admin">Administrateur</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-slide-toggle formControlName="isValidated">
            Compte validé
          </mat-slide-toggle>

          <div class="dialog-actions">
            <button mat-button type="button" (click)="hideForm()">Annuler</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="!userForm.valid">
              {{ editingUser() ? 'Modifier' : 'Ajouter' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;

      h1 {
        font-size: 32px;
        font-weight: 700;
        margin: 0 0 8px 0;
        color: var(--text-primary);
      }

      .subtitle {
        color: var(--text-secondary);
        margin: 0;
        font-size: 16px;
      }
    }

    .enhanced-tabs {
      margin-bottom: 32px;

      ::ng-deep .mat-mdc-tab-header {
        border-bottom: 2px solid var(--border-color);
      }

      ::ng-deep .mat-mdc-tab {
        min-width: 200px;
        height: 64px;

        .mdc-tab__content {
          padding: 16px;
        }
      }
    }

    .tab-label {
      display: flex;
      align-items: center;
      gap: 8px;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      span {
        font-weight: 500;
        font-size: 14px;
      }
    }

    .tab-badge {
      font-size: 12px;
      font-weight: 600;
      min-height: 20px;
      padding: 0 8px;
    }

    .stats-overview {
      margin-bottom: 32px;
    }

    .highlight-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;

      ::ng-deep .mat-mdc-card-content {
        padding: 24px !important;
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: transform 0.2s ease, box-shadow 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      }

      &.total-stat {
        background: rgba(255, 255, 255, 0.15);
        border-left: 4px solid #ffffff;
      }

      &.validated-stat {
        background: rgba(76, 175, 80, 0.1);
        border-left: 4px solid #4caf50;
      }

      &.pending-stat {
        background: rgba(255, 152, 0, 0.1);
        border-left: 4px solid #ff9800;
      }
    }

    .stat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: white;
      }
    }

    .stat-content {
      flex: 1;

      .stat-number {
        display: block;
        font-size: 32px;
        font-weight: 700;
        line-height: 1;
        margin-bottom: 4px;
        color: white;
      }

      .stat-label {
        font-size: 14px;
        opacity: 0.9;
        color: white;
      }
    }

    .table-card {
      border-radius: 12px;
      border: 1px solid var(--border-color);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .users-table {
      width: 100%;

      th {
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        font-weight: 600;
        color: var(--text-primary);
        padding: 16px;
        font-size: 14px;
      }

      td {
        color: var(--text-primary);
        padding: 16px;
      }

      .mat-mdc-chip {
        font-size: 12px;
        font-weight: 500;
      }
    }

    .role-overview {
      margin-top: 24px;
    }

    .role-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
    }

    .role-card {
      border-radius: 16px;
      border: 1px solid var(--border-color);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      transition: transform 0.2s ease, box-shadow 0.2s ease;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
      }

      &.admin-card {
        border-left: 4px solid #f44336;
        background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
      }

      &.tresorier-card {
        border-left: 4px solid #ff9800;
        background: linear-gradient(135deg, #fff3e0 0%, #ffcc02 100%);
      }

      &.membre-card {
        border-left: 4px solid #2196f3;
        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
      }
    }

    .role-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;

      .role-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

        mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
          color: var(--primary-color);
        }
      }

      .role-info {
        flex: 1;

        .role-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: var(--text-primary);
        }

        .role-count {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
        }
      }

      .role-badge {
        font-size: 14px;
        font-weight: 600;
        min-height: 24px;
        padding: 0 12px;
      }
    }

    .role-users {
      padding: 0 20px 20px 20px;
    }

    .enhanced-user-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 12px;
      margin-bottom: 12px;
      border: 1px solid rgba(255, 255, 255, 0.5);
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.9);
        transform: translateX(4px);
      }

      .user-avatar {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--primary-color);
        color: white;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }

      .user-info {
        flex: 1;

        strong {
          display: block;
          color: var(--text-primary);
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 2px;
        }

        span {
          color: var(--text-secondary);
          font-size: 14px;
        }
      }

      .status-chip {
        font-size: 12px;
        font-weight: 500;
        min-height: 24px;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: var(--text-secondary);
      background: rgba(255, 255, 255, 0.5);
      border-radius: 12px;
      border: 2px dashed var(--border-color);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }

      span {
        font-size: 16px;
        font-weight: 500;
      }
    }

    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog-content {
      background: white;
      border-radius: 12px;
      padding: 24px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;

      h2 {
        margin: 0;
        color: var(--text-primary);
      }
    }

    mat-form-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }

    .delete-action {
      color: #f44336 !important;
    }

    @media (max-width: 768px) {
      .page-container {
        padding: 16px;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .role-tabs {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class UsersComponent implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  users = signal<User[]>([]);
  showForm = signal(false);
  editingUser = signal<User | null>(null);
  userForm: FormGroup;

  // Computed signals for stats
  validatedUsersCount = signal(0);
  pendingUsersCount = signal(0);
  totalUsersCount = signal(0);

  displayedColumns = ['name', 'email', 'role', 'status', 'createdAt', 'actions'];

  constructor() {
    this.userForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      role: ['membre', Validators.required],
      isValidated: [false]
    });
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.userService.getUsers().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.users.set(response.data);
          this.validatedUsersCount.set(response.data.filter(u => u.isValidated).length);
          this.pendingUsersCount.set(response.data.filter(u => !u.isValidated).length);
          this.totalUsersCount.set(response.data.length);
        }
      },
      error: (error) => {
        this.snackBar.open('Erreur lors du chargement des utilisateurs', 'Fermer', { duration: 3000 });
      }
    });
  }

  showAddForm() {
    this.editingUser.set(null);
    this.userForm.reset({
      nom: '',
      prenom: '',
      email: '',
      password: '',
      role: 'membre',
      isValidated: false
    });
    this.userForm.get('password')?.setValidators(Validators.required);
    this.userForm.get('password')?.updateValueAndValidity();
    this.showForm.set(true);
  }

  editUser(user: User) {
    this.editingUser.set(user);
    this.userForm.patchValue({
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role,
      isValidated: user.isValidated
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.showForm.set(true);
  }

  hideForm() {
    this.showForm.set(false);
    this.editingUser.set(null);
  }

  saveUser() {
    if (!this.userForm.valid) return;

    const formValue = this.userForm.value;

    if (this.editingUser()) {
      // Modification
      const updateData: Partial<User> = {
        nom: formValue.nom,
        prenom: formValue.prenom,
        email: formValue.email,
        role: formValue.role,
        isValidated: formValue.isValidated
      };

      this.userService.updateUser(this.editingUser()!._id, updateData).subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open('Utilisateur modifié avec succès', 'Fermer', { duration: 3000 });
            this.loadUsers();
            this.hideForm();
          }
        },
        error: (error) => {
          this.snackBar.open('Erreur lors de la modification', 'Fermer', { duration: 3000 });
        }
      });
    } else {
      // Création
      const createData = {
        nom: formValue.nom,
        prenom: formValue.prenom,
        email: formValue.email,
        password: formValue.password,
        role: formValue.role,
        isValidated: formValue.isValidated
      };

      this.userService.createUser(createData).subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open('Utilisateur créé avec succès', 'Fermer', { duration: 3000 });
            this.loadUsers();
            this.hideForm();
          }
        },
        error: (error) => {
          this.snackBar.open('Erreur lors de la création', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  toggleValidation(user: User) {
    const newStatus = !user.isValidated;
    this.userService.updateUser(user._id, { isValidated: newStatus }).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open(
            `Utilisateur ${newStatus ? 'validé' : 'désactivé'} avec succès`,
            'Fermer',
            { duration: 3000 }
          );
          this.loadUsers();
        }
      },
      error: (error) => {
        this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', { duration: 3000 });
      }
    });
  }

  resetPassword(user: User) {
    const newPassword = 'Temp123!'; // Mot de passe temporaire
    this.userService.resetPassword(user._id, newPassword).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open(
            `Mot de passe réinitialisé. Nouveau mot de passe: ${newPassword}`,
            'Fermer',
            { duration: 5000 }
          );
        }
      },
      error: (error) => {
        this.snackBar.open('Erreur lors de la réinitialisation', 'Fermer', { duration: 3000 });
      }
    });
  }

  deleteUser(user: User) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${user.nom} ${user.prenom} ?`)) {
      this.userService.deleteUser(user._id).subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open('Utilisateur supprimé avec succès', 'Fermer', { duration: 3000 });
            this.loadUsers();
          }
        },
        error: (error) => {
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'admin': return 'warn';
      case 'tresorier': return 'accent';
      case 'membre': return 'primary';
      default: return 'basic';
    }
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'admin': return 'Admin';
      case 'tresorier': return 'Trésorier';
      case 'membre': return 'Membre';
      default: return role;
    }
  }

  getRoleIcon(role: string): string {
    switch (role) {
      case 'admin': return 'admin_panel_settings';
      case 'tresorier': return 'account_balance';
      case 'membre': return 'person';
      default: return 'person';
    }
  }

  getUsersByRole(role: string): User[] {
    return this.users().filter(user => user.role === role);
  }
}
