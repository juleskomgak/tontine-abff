import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models';

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
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatBadgeModule,
    MatMenuModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-left">
          <mat-icon class="page-icon">admin_panel_settings</mat-icon>
          <div>
            <h1>👥 Gestion des Utilisateurs</h1>
            <p class="subtitle">Administration des comptes et validation</p>
          </div>
        </div>
        
        <button mat-raised-button color="primary" (click)="showAddForm()">
          <mat-icon>person_add</mat-icon>
          Nouvel Utilisateur
        </button>
      </div>

      <!-- Statistiques -->
      <div class="stats-row">
        <mat-card class="stat-card">
          <mat-icon class="stat-icon primary">people</mat-icon>
          <div class="stat-content">
            <h3>{{ allUsers().length }}</h3>
            <p>Total utilisateurs</p>
          </div>
        </mat-card>

        <mat-card class="stat-card warning" (click)="selectedTab = 1">
          <mat-icon class="stat-icon warning">hourglass_empty</mat-icon>
          <div class="stat-content">
            <h3>{{ pendingUsers().length }}</h3>
            <p>En attente de validation</p>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <mat-icon class="stat-icon success">verified_user</mat-icon>
          <div class="stat-content">
            <h3>{{ validatedUsers().length }}</h3>
            <p>Comptes validés</p>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <mat-icon class="stat-icon admin">security</mat-icon>
          <div class="stat-content">
            <h3>{{ countByRole('admin') }}</h3>
            <p>Administrateurs</p>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <mat-icon class="stat-icon tresorier">account_balance_wallet</mat-icon>
          <div class="stat-content">
            <h3>{{ countByRole('tresorier') }}</h3>
            <p>Trésoriers</p>
          </div>
        </mat-card>
      </div>

      <!-- Formulaire -->
      @if (showForm()) {
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>
              @if (editingUser()) {
                ✏️ Modifier l'utilisateur
              } @else {
                ➕ Créer un utilisateur
              }
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Nom</mat-label>
                  <input matInput formControlName="nom" placeholder="Nom de famille">
                  <mat-icon matPrefix>badge</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Prénom</mat-label>
                  <input matInput formControlName="prenom" placeholder="Prénom">
                  <mat-icon matPrefix>person</mat-icon>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Email</mat-label>
                  <input matInput type="email" formControlName="email" placeholder="email@exemple.com">
                  <mat-icon matPrefix>email</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Téléphone</mat-label>
                  <input matInput formControlName="telephone" placeholder="+33 6 00 00 00 00">
                  <mat-icon matPrefix>phone</mat-icon>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Rôle</mat-label>
                  <mat-select formControlName="role">
                    <mat-option value="admin">
                      <mat-icon>security</mat-icon> Administrateur
                    </mat-option>
                    <mat-option value="tresorier">
                      <mat-icon>account_balance_wallet</mat-icon> Trésorier
                    </mat-option>
                    <mat-option value="membre">
                      <mat-icon>person</mat-icon> Membre
                    </mat-option>
                  </mat-select>
                  <mat-icon matPrefix>admin_panel_settings</mat-icon>
                </mat-form-field>

                @if (!editingUser()) {
                  <mat-form-field appearance="outline" class="half-width">
                    <mat-label>Mot de passe</mat-label>
                    <input matInput type="password" formControlName="password" placeholder="Min. 6 caractères">
                    <mat-icon matPrefix>lock</mat-icon>
                  </mat-form-field>
                } @else {
                  <div class="half-width toggle-container">
                    <mat-slide-toggle formControlName="isActive" color="primary">
                      Compte actif
                    </mat-slide-toggle>
                  </div>
                }
              </div>

              <div class="form-actions">
                <button mat-button type="button" (click)="cancelForm()">
                  <mat-icon>close</mat-icon>
                  Annuler
                </button>
                <button mat-raised-button color="primary" type="submit" [disabled]="userForm.invalid || loading()">
                  @if (loading()) {
                    <mat-progress-spinner diameter="20" mode="indeterminate"></mat-progress-spinner>
                  } @else {
                    <mat-icon>{{ editingUser() ? 'save' : 'add' }}</mat-icon>
                    {{ editingUser() ? 'Enregistrer' : 'Créer' }}
                  }
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }

      <!-- Onglets pour la liste des utilisateurs -->
      <mat-card class="table-card">
        <mat-tab-group [(selectedIndex)]="selectedTab" animationDuration="200ms">
          <!-- Onglet: Tous les utilisateurs -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>people</mat-icon>
              <span class="tab-label">Tous les utilisateurs</span>
              <span class="tab-badge">{{ allUsers().length }}</span>
            </ng-template>
            
            @if (loadingList()) {
              <div class="loading-container">
                <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
                <p>Chargement des utilisateurs...</p>
              </div>
            } @else {
              <div class="table-container">
                <table mat-table [dataSource]="allUsers()" class="users-table">
                  <ng-container matColumnDef="nom">
                    <th mat-header-cell *matHeaderCellDef>Utilisateur</th>
                    <td mat-cell *matCellDef="let user">
                      <div class="user-info">
                        <div class="user-avatar" [ngClass]="'role-' + user.role">
                          {{ getInitials(user) }}
                        </div>
                        <div>
                          <div class="user-name">{{ user.nom }} {{ user.prenom }}</div>
                          <div class="user-email">{{ user.email }}</div>
                        </div>
                      </div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="telephone">
                    <th mat-header-cell *matHeaderCellDef>Téléphone</th>
                    <td mat-cell *matCellDef="let user">{{ user.telephone || '-' }}</td>
                  </ng-container>

                  <ng-container matColumnDef="role">
                    <th mat-header-cell *matHeaderCellDef>Rôle</th>
                    <td mat-cell *matCellDef="let user">
                      <span class="role-chip" [ngClass]="'role-' + user.role">
                        {{ getRoleLabel(user.role) }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="validation">
                    <th mat-header-cell *matHeaderCellDef>Validation</th>
                    <td mat-cell *matCellDef="let user">
                      @if (user.isValidated) {
                        <span class="validation-chip validated">
                          <mat-icon>verified</mat-icon> Validé
                        </span>
                      } @else {
                        <span class="validation-chip pending">
                          <mat-icon>hourglass_empty</mat-icon> En attente
                        </span>
                      }
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="statut">
                    <th mat-header-cell *matHeaderCellDef>Statut</th>
                    <td mat-cell *matCellDef="let user">
                      <span class="status-chip" [ngClass]="user.isActive ? 'active' : 'inactive'">
                        {{ user.isActive ? 'Actif' : 'Inactif' }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="createdAt">
                    <th mat-header-cell *matHeaderCellDef>Inscrit le</th>
                    <td mat-cell *matCellDef="let user">{{ formatDate(user.createdAt) }}</td>
                  </ng-container>

                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef>Actions</th>
                    <td mat-cell *matCellDef="let user">
                      <div class="action-buttons">
                        @if (!user.isValidated && user._id !== currentUserId()) {
                          <button mat-icon-button color="primary" 
                                  (click)="validateUser(user)"
                                  matTooltip="Valider le compte">
                            <mat-icon>check_circle</mat-icon>
                          </button>
                        }
                        @if (user.isValidated && user._id !== currentUserId()) {
                          <button mat-icon-button color="warn" 
                                  (click)="invalidateUser(user)"
                                  matTooltip="Révoquer la validation">
                            <mat-icon>cancel</mat-icon>
                          </button>
                        }
                        <button mat-icon-button color="primary" 
                                (click)="editUser(user)"
                                matTooltip="Modifier">
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button mat-icon-button [matMenuTriggerFor]="roleMenu" 
                                matTooltip="Changer le rôle"
                                [disabled]="user._id === currentUserId()">
                          <mat-icon>swap_vert</mat-icon>
                        </button>
                        <mat-menu #roleMenu="matMenu">
                          <button mat-menu-item (click)="changeRole(user, 'admin')">
                            <mat-icon>security</mat-icon> Administrateur
                          </button>
                          <button mat-menu-item (click)="changeRole(user, 'tresorier')">
                            <mat-icon>account_balance_wallet</mat-icon> Trésorier
                          </button>
                          <button mat-menu-item (click)="changeRole(user, 'membre')">
                            <mat-icon>person</mat-icon> Membre
                          </button>
                        </mat-menu>
                        @if (user._id !== currentUserId()) {
                          <button mat-icon-button color="warn" 
                                  (click)="deleteUser(user)"
                                  matTooltip="Supprimer">
                            <mat-icon>delete</mat-icon>
                          </button>
                        }
                      </div>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: displayedColumns;" 
                      [class.current-user]="row._id === currentUserId()"
                      [class.pending-user]="!row.isValidated"></tr>
                </table>
              </div>
            }
          </mat-tab>

          <!-- Onglet: En attente de validation -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>hourglass_empty</mat-icon>
              <span class="tab-label">En attente de validation</span>
              @if (pendingUsers().length > 0) {
                <span class="tab-badge warning">{{ pendingUsers().length }}</span>
              }
            </ng-template>
            
            @if (pendingUsers().length === 0) {
              <div class="empty-state">
                <mat-icon>verified_user</mat-icon>
                <h3>Aucun compte en attente</h3>
                <p>Tous les comptes ont été validés</p>
              </div>
            } @else {
              <div class="table-container">
                <table mat-table [dataSource]="pendingUsers()" class="users-table pending-table">
                  <ng-container matColumnDef="nomPending">
                    <th mat-header-cell *matHeaderCellDef>Utilisateur</th>
                    <td mat-cell *matCellDef="let user">
                      <div class="user-info">
                        <div class="user-avatar pending">
                          {{ getInitials(user) }}
                        </div>
                        <div>
                          <div class="user-name">{{ user.nom }} {{ user.prenom }}</div>
                          <div class="user-email">{{ user.email }}</div>
                        </div>
                      </div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="telephonePending">
                    <th mat-header-cell *matHeaderCellDef>Téléphone</th>
                    <td mat-cell *matCellDef="let user">{{ user.telephone || '-' }}</td>
                  </ng-container>

                  <ng-container matColumnDef="rolePending">
                    <th mat-header-cell *matHeaderCellDef>Rôle demandé</th>
                    <td mat-cell *matCellDef="let user">
                      <span class="role-chip" [ngClass]="'role-' + user.role">
                        {{ getRoleLabel(user.role) }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="createdAtPending">
                    <th mat-header-cell *matHeaderCellDef>Date d'inscription</th>
                    <td mat-cell *matCellDef="let user">{{ formatDate(user.createdAt) }}</td>
                  </ng-container>

                  <ng-container matColumnDef="pendingActions">
                    <th mat-header-cell *matHeaderCellDef>Actions</th>
                    <td mat-cell *matCellDef="let user">
                      <div class="action-buttons">
                        <button mat-raised-button color="primary" (click)="validateUser(user)">
                          <mat-icon>check_circle</mat-icon>
                          Valider
                        </button>
                        <button mat-raised-button color="warn" (click)="deleteUser(user)">
                          <mat-icon>delete</mat-icon>
                          Refuser
                        </button>
                      </div>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="pendingColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: pendingColumns;"></tr>
                </table>
              </div>
            }
          </mat-tab>

          <!-- Onglet: Utilisateurs validés -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>verified_user</mat-icon>
              <span class="tab-label">Comptes validés</span>
              <span class="tab-badge success">{{ validatedUsers().length }}</span>
            </ng-template>
            
            <div class="table-container">
              <table mat-table [dataSource]="validatedUsers()" class="users-table">
                <ng-container matColumnDef="nomValidated">
                  <th mat-header-cell *matHeaderCellDef>Utilisateur</th>
                  <td mat-cell *matCellDef="let user">
                    <div class="user-info">
                      <div class="user-avatar" [ngClass]="'role-' + user.role">
                        {{ getInitials(user) }}
                      </div>
                      <div>
                        <div class="user-name">{{ user.nom }} {{ user.prenom }}</div>
                        <div class="user-email">{{ user.email }}</div>
                      </div>
                    </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="telephoneValidated">
                  <th mat-header-cell *matHeaderCellDef>Téléphone</th>
                  <td mat-cell *matCellDef="let user">{{ user.telephone || '-' }}</td>
                </ng-container>

                <ng-container matColumnDef="roleValidated">
                  <th mat-header-cell *matHeaderCellDef>Rôle</th>
                  <td mat-cell *matCellDef="let user">
                    <span class="role-chip" [ngClass]="'role-' + user.role">
                      {{ getRoleLabel(user.role) }}
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="validatedAt">
                  <th mat-header-cell *matHeaderCellDef>Validé le</th>
                  <td mat-cell *matCellDef="let user">{{ formatDate(user.validatedAt) }}</td>
                </ng-container>

                <ng-container matColumnDef="statutValidated">
                  <th mat-header-cell *matHeaderCellDef>Statut</th>
                  <td mat-cell *matCellDef="let user">
                    <span class="status-chip" [ngClass]="user.isActive ? 'active' : 'inactive'">
                      {{ user.isActive ? 'Actif' : 'Inactif' }}
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="validatedActions">
                  <th mat-header-cell *matHeaderCellDef>Actions</th>
                  <td mat-cell *matCellDef="let user">
                    <div class="action-buttons">
                      @if (user._id !== currentUserId()) {
                        <button mat-icon-button color="warn" 
                                (click)="invalidateUser(user)"
                                matTooltip="Révoquer la validation">
                          <mat-icon>cancel</mat-icon>
                        </button>
                      }
                      <button mat-icon-button color="primary" 
                              (click)="editUser(user)"
                              matTooltip="Modifier">
                        <mat-icon>edit</mat-icon>
                      </button>
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="validatedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: validatedColumns;"
                    [class.current-user]="row._id === currentUserId()"></tr>
              </table>
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 32px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      flex-wrap: wrap;
      gap: 20px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .page-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #7c3aed;
    }

    h1 {
      font-size: 32px;
      font-weight: 700;
      margin: 0;
      color: var(--text-primary);
    }

    .subtitle {
      color: var(--text-secondary);
      margin: 4px 0 0 0;
      font-size: 16px;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px !important;
      border-radius: 12px !important;
      border: 1px solid var(--border-color);
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }

      &.warning {
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        border-color: #f59e0b;
      }

      .stat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        padding: 12px;
        border-radius: 10px;

        &.primary {
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
          color: white;
        }

        &.success {
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          color: white;
        }

        &.warning {
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
          color: white;
        }

        &.admin {
          background: linear-gradient(135deg, #dc2626 0%, #f87171 100%);
          color: white;
        }

        &.tresorier {
          background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%);
          color: white;
        }
      }

      .stat-content {
        h3 {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          color: var(--text-primary);
        }

        p {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary);
        }
      }
    }

    .form-card {
      margin-bottom: 24px;
      border-radius: 12px !important;
      border: 1px solid var(--border-color);

      mat-card-header {
        margin-bottom: 20px;
      }

      mat-card-title {
        font-size: 20px;
        font-weight: 600;
      }
    }

    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;

      @media (max-width: 768px) {
        flex-direction: column;
      }
    }

    .half-width {
      flex: 1;
    }

    .toggle-container {
      display: flex;
      align-items: center;
      padding-top: 16px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--border-color);
    }

    .table-card {
      border-radius: 12px !important;
      border: 1px solid var(--border-color);
      overflow: hidden;
    }

    ::ng-deep .mat-mdc-tab-labels {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    ::ng-deep .mat-mdc-tab {
      min-width: 180px;
    }

    .tab-label {
      margin-left: 8px;
      font-weight: 600;
      color: #1e293b;
    }

    .tab-badge {
      margin-left: 8px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      background: #e2e8f0;
      color: #475569;

      &.warning {
        background: #fef3c7;
        color: #b45309;
        animation: pulse 2s infinite;
      }

      &.success {
        background: #d1fae5;
        color: #059669;
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;

      p {
        margin-top: 20px;
        color: var(--text-secondary);
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      text-align: center;

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #10b981;
        margin-bottom: 16px;
      }

      h3 {
        margin: 0;
        font-size: 20px;
        color: #1e293b;
      }

      p {
        margin: 8px 0 0 0;
        color: #64748b;
      }
    }

    .table-container {
      overflow-x: auto;
    }

    .users-table {
      width: 100%;

      th {
        background: #1e293b !important;
        font-weight: 600 !important;
        color: white !important;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      td {
        padding: 16px;
      }

      tr:hover {
        background: #f8fafc;
      }

      tr.current-user {
        background: #fef3c7;
      }

      tr.pending-user {
        background: #fff7ed;
      }
    }

    .pending-table tr {
      background: #fffbeb;

      &:hover {
        background: #fef3c7;
      }
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
      color: white;

      &.role-admin {
        background: linear-gradient(135deg, #dc2626 0%, #f87171 100%);
      }

      &.role-tresorier {
        background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%);
      }

      &.role-membre {
        background: linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%);
      }

      &.pending {
        background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
      }
    }

    .user-name {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 14px;
    }

    .user-email {
      color: var(--text-secondary);
      font-size: 12px;
    }

    .role-chip {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      &.role-admin {
        background: #fecaca;
        color: #dc2626;
      }

      &.role-tresorier {
        background: #ede9fe;
        color: #7c3aed;
      }

      &.role-membre {
        background: #cffafe;
        color: #0891b2;
      }
    }

    .validation-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &.validated {
        background: #d1fae5;
        color: #059669;
      }

      &.pending {
        background: #fef3c7;
        color: #b45309;
      }
    }

    .status-chip {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;

      &.active {
        background: #d1fae5;
        color: #059669;
      }

      &.inactive {
        background: #fee2e2;
        color: #dc2626;
      }
    }

    .action-buttons {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    @media (max-width: 768px) {
      .page-container {
        padding: 16px;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .stats-row {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class UsersComponent implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  allUsers = signal<User[]>([]);
  showForm = signal(false);
  editingUser = signal<User | null>(null);
  loading = signal(false);
  loadingList = signal(true);
  selectedTab = 0;

  displayedColumns = ['nom', 'telephone', 'role', 'validation', 'statut', 'createdAt', 'actions'];
  pendingColumns = ['nomPending', 'telephonePending', 'rolePending', 'createdAtPending', 'pendingActions'];
  validatedColumns = ['nomValidated', 'telephoneValidated', 'roleValidated', 'validatedAt', 'statutValidated', 'validatedActions'];

  userForm: FormGroup = this.fb.group({
    nom: ['', Validators.required],
    prenom: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telephone: [''],
    role: ['membre', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    isActive: [true]
  });

  currentUserId = signal<string>('');

  // Computed signals for filtered lists
  pendingUsers = computed(() => this.allUsers().filter(u => !u.isValidated));
  validatedUsers = computed(() => this.allUsers().filter(u => u.isValidated));

  ngOnInit() {
    this.currentUserId.set(this.authService.getCurrentUser()?._id || '');
    this.loadUsers();
  }

  loadUsers() {
    this.loadingList.set(true);
    this.userService.getUsers().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.allUsers.set(response.data);
        }
        this.loadingList.set(false);
      },
      error: () => {
        this.loadingList.set(false);
        this.snackBar.open('Erreur lors du chargement des utilisateurs', 'Fermer', { duration: 3000 });
      }
    });
  }

  countByRole(role: string): number {
    return this.allUsers().filter(u => u.role === role).length;
  }

  showAddForm() {
    this.editingUser.set(null);
    this.userForm.reset({ role: 'membre', isActive: true });
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.showForm.set(true);
  }

  editUser(user: User) {
    this.editingUser.set(user);
    this.userForm.patchValue({
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      telephone: user.telephone || '',
      role: user.role,
      isActive: user.isActive
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.showForm.set(true);
  }

  cancelForm() {
    this.showForm.set(false);
    this.editingUser.set(null);
    this.userForm.reset();
  }

  onSubmit() {
    if (this.userForm.valid) {
      this.loading.set(true);
      
      const formData = this.userForm.value;
      
      if (this.editingUser()) {
        const { password, ...updateData } = formData;
        this.userService.updateUser(this.editingUser()!._id, updateData).subscribe({
          next: () => {
            this.loading.set(false);
            this.snackBar.open('Utilisateur mis à jour avec succès !', 'Fermer', { duration: 3000 });
            this.loadUsers();
            this.cancelForm();
          },
          error: (error) => {
            this.loading.set(false);
            const msg = error.error?.message || 'Erreur lors de la mise à jour';
            this.snackBar.open(msg, 'Fermer', { duration: 5000 });
          }
        });
      } else {
        this.userService.createUser(formData).subscribe({
          next: () => {
            this.loading.set(false);
            this.snackBar.open('Utilisateur créé avec succès !', 'Fermer', { duration: 3000 });
            this.loadUsers();
            this.cancelForm();
          },
          error: (error) => {
            this.loading.set(false);
            const msg = error.error?.message || error.error?.errors?.[0]?.msg || 'Erreur lors de la création';
            this.snackBar.open(msg, 'Fermer', { duration: 5000 });
          }
        });
      }
    }
  }

  validateUser(user: User) {
    if (confirm(`Valider le compte de ${user.nom} ${user.prenom} ?\n\nCet utilisateur pourra se connecter à l'application.`)) {
      this.userService.validateUser(user._id).subscribe({
        next: () => {
          this.snackBar.open(`Compte de ${user.nom} ${user.prenom} validé avec succès !`, 'Fermer', { duration: 3000 });
          this.loadUsers();
        },
        error: (error) => {
          const msg = error.error?.message || 'Erreur lors de la validation';
          this.snackBar.open(msg, 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  invalidateUser(user: User) {
    if (confirm(`Révoquer la validation du compte de ${user.nom} ${user.prenom} ?\n\nCet utilisateur ne pourra plus se connecter.`)) {
      this.userService.invalidateUser(user._id).subscribe({
        next: () => {
          this.snackBar.open(`Validation du compte de ${user.nom} ${user.prenom} révoquée`, 'Fermer', { duration: 3000 });
          this.loadUsers();
        },
        error: (error) => {
          const msg = error.error?.message || 'Erreur lors de l\'invalidation';
          this.snackBar.open(msg, 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  changeRole(user: User, newRole: string) {
    if (user.role === newRole) return;
    
    if (confirm(`Changer le rôle de ${user.nom} ${user.prenom} en "${this.getRoleLabel(newRole)}" ?`)) {
      this.userService.changeUserRole(user._id, newRole).subscribe({
        next: () => {
          this.snackBar.open(`Rôle mis à jour : ${this.getRoleLabel(newRole)}`, 'Fermer', { duration: 3000 });
          this.loadUsers();
        },
        error: (error) => {
          const msg = error.error?.message || 'Erreur lors du changement de rôle';
          this.snackBar.open(msg, 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  deleteUser(user: User) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${user.nom} ${user.prenom} ?\n\nCette action est irréversible.`)) {
      this.userService.deleteUser(user._id).subscribe({
        next: () => {
          this.snackBar.open('Utilisateur supprimé avec succès !', 'Fermer', { duration: 3000 });
          this.loadUsers();
        },
        error: (error) => {
          const msg = error.error?.message || 'Erreur lors de la suppression';
          this.snackBar.open(msg, 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  getInitials(user: User): string {
    return `${user.nom.charAt(0)}${user.prenom.charAt(0)}`.toUpperCase();
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      'admin': 'Administrateur',
      'tresorier': 'Trésorier',
      'membre': 'Membre'
    };
    return labels[role] || role;
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
