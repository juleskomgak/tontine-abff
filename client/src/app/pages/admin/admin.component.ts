import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AdminService, DatabaseStatus, CleanResult } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>🛠️ Administration Système</h1>
          <p class="subtitle">Outils d'administration et maintenance</p>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
          <p>Chargement...</p>
        </div>
      } @else {
        <!-- État de la base de données -->
        @if (dbStatus()) {
          <mat-card class="status-card">
            <mat-card-header>
              <mat-icon mat-card-avatar>storage</mat-icon>
              <mat-card-title>État de la Base de Données</mat-card-title>
              <mat-card-subtitle>Dernière mise à jour: {{ lastUpdate() | date:'short' }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="stats-grid">
                <div class="stat-item">
                  <mat-icon>account_balance</mat-icon>
                  <div>
                    <strong>{{ dbStatus()!.tontines }}</strong>
                    <span>Tontines</span>
                  </div>
                </div>
                <div class="stat-item">
                  <mat-icon>confirmation_number</mat-icon>
                  <div>
                    <strong>{{ dbStatus()!.tours }}</strong>
                    <span>Tours</span>
                  </div>
                </div>
                <div class="stat-item">
                  <mat-icon>payments</mat-icon>
                  <div>
                    <strong>{{ dbStatus()!.contributions }}</strong>
                    <span>Cotisations</span>
                  </div>
                </div>
                <div class="stat-item">
                  <mat-icon>account_balance_wallet</mat-icon>
                  <div>
                    <strong>{{ dbStatus()!.banques }}</strong>
                    <span>Banques</span>
                  </div>
                </div>
              </div>

              @if (dbStatus() && dbStatus()!.donneesOrphelines && dbStatus()!.donneesOrphelines.totalOrphelines > 0) {
                <div class="orphaned-data-alert">
                  <mat-icon>warning</mat-icon>
                  <div>
                    <strong>{{ dbStatus()!.donneesOrphelines.totalOrphelines }} données orphelines détectées</strong>
                    <p>Ces données peuvent causer des soldes incorrects dans les rapports.</p>
                    <div class="orphaned-details">
                      <span>• {{ dbStatus()!.donneesOrphelines.banquesOrphelines }} banques orphelines</span>
                      <span>• {{ dbStatus()!.donneesOrphelines.toursOrphelins }} tours orphelins</span>
                      <span>• {{ dbStatus()!.donneesOrphelines.contributionsOrphelines }} cotisations orphelines</span>
                    </div>
                  </div>
                </div>
              } @else {
                <div class="clean-data-success">
                  <mat-icon>check_circle</mat-icon>
                  <div>
                    <strong>Base de données propre</strong>
                    <p>Aucune donnée orpheline détectée.</p>
                  </div>
                </div>
              }
            </mat-card-content>
            <mat-card-actions>
              <button mat-button (click)="refreshStatus()">
                <mat-icon>refresh</mat-icon>
                Actualiser
              </button>
              @if (dbStatus()!.donneesOrphelines.totalOrphelines > 0) {
                <button mat-raised-button color="warn" (click)="cleanOrphanedData()">
                  <mat-icon>cleaning_services</mat-icon>
                  Nettoyer les données orphelines
                </button>
              }
            </mat-card-actions>
          </mat-card>
        }

        <!-- Actions d'administration -->
        <mat-card class="actions-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>build</mat-icon>
            <mat-card-title>Actions d'Administration</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="actions-grid">
              <button mat-stroked-button class="action-button" (click)="refreshStatus()">
                <mat-icon>refresh</mat-icon>
                <span>Actualiser le statut</span>
              </button>

              <button mat-stroked-button class="action-button" [routerLink]="['/admin/users']">
                <mat-icon>people</mat-icon>
                <span>Gérer les utilisateurs</span>
              </button>

              <button mat-stroked-button class="action-button" color="warn" (click)="cleanOrphanedData()" [disabled]="dbStatus()?.donneesOrphelines?.totalOrphelines === 0">
                <mat-icon>cleaning_services</mat-icon>
                <span>Nettoyer données orphelines</span>
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .page-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
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

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      color: var(--text-secondary);
    }

    .status-card, .actions-card {
      margin-bottom: 24px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background-color: var(--background-color);
      border-radius: 8px;

      mat-icon {
        color: var(--primary-color);
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      div {
        display: flex;
        flex-direction: column;
        gap: 2px;

        strong {
          color: var(--text-primary);
          font-size: 24px;
          font-weight: 600;
        }

        span {
          color: var(--text-secondary);
          font-size: 12px;
        }
      }
    }

    .orphaned-data-alert {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      margin-bottom: 16px;

      mat-icon {
        color: #f59e0b;
        font-size: 24px;
        width: 24px;
        height: 24px;
        margin-top: 2px;
      }

      div {
        flex: 1;

        strong {
          color: #92400e;
          display: block;
          margin-bottom: 4px;
        }

        p {
          color: #92400e;
          margin: 8px 0;
          font-size: 14px;
        }
      }
    }

    .orphaned-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 13px;
      color: #92400e;
    }

    .clean-data-success {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background-color: #d1fae5;
      border: 1px solid #10b981;
      border-radius: 8px;

      mat-icon {
        color: #10b981;
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      div {
        strong {
          color: #065f46;
          display: block;
        }

        p {
          color: #065f46;
          margin: 4px 0 0 0;
          font-size: 14px;
        }
      }
    }

    mat-card-actions {
      padding: 16px;
      border-top: 1px solid var(--border-color);
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .action-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 24px;
      height: auto;
      min-height: 80px;

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      span {
        text-align: center;
        font-weight: 500;
      }
    }

    @media (max-width: 768px) {
      .page-container {
        padding: 16px;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .actions-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AdminComponent implements OnInit {
  authService = inject(AuthService);
  private adminService = inject(AdminService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  loading = signal(false);
  dbStatus = signal<DatabaseStatus | null>(null);
  lastUpdate = signal<Date>(new Date());

  ngOnInit() {
    this.loadDatabaseStatus();
  }

  loadDatabaseStatus() {
    this.loading.set(true);
    this.adminService.getDatabaseStatus().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.dbStatus.set(response.data);
          this.lastUpdate.set(new Date());
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.snackBar.open('Erreur lors du chargement du statut', 'Fermer', { duration: 3000 });
      }
    });
  }

  refreshStatus() {
    this.loadDatabaseStatus();
  }

  async cleanOrphanedData() {
    // Importer le composant de confirmation de manière dynamique
    const { ConfirmDialogComponent } = await import('../../shared/confirm-dialog.component');

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: {
        title: 'Nettoyer les données orphelines',
        message: `Êtes-vous sûr de vouloir supprimer ${this.dbStatus()?.donneesOrphelines?.totalOrphelines} données orphelines ?`,
        details: 'Cette action supprimera :',
        detailsList: [
          `• ${this.dbStatus()?.donneesOrphelines?.banquesOrphelines} banques orphelines`,
          `• ${this.dbStatus()?.donneesOrphelines?.toursOrphelins} tours orphelins`,
          `• ${this.dbStatus()?.donneesOrphelines?.contributionsOrphelines} cotisations orphelines`,
          '',
          'Ces données peuvent causer des soldes incorrects dans les rapports.'
        ],
        confirmLabel: 'Nettoyer',
        cancelLabel: 'Annuler',
        confirmColor: 'warn',
        requireReason: false
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (!result || !result.confirmed) return;

      this.loading.set(true);
      this.adminService.cleanOrphanedData().subscribe({
        next: (response) => {
          this.loading.set(false);
          if (response.success) {
            this.snackBar.open(
              `Nettoyage terminé: ${response.data?.totalElementsSupprimes} éléments supprimés`,
              'Fermer',
              { duration: 5000, panelClass: 'success-snackbar' }
            );
            // Recharger le statut
            this.loadDatabaseStatus();
          } else {
            this.snackBar.open(response.message || 'Erreur lors du nettoyage', 'Fermer', {
              duration: 5000,
              panelClass: 'error-snackbar'
            });
          }
        },
        error: (error) => {
          this.loading.set(false);
          console.error('Erreur nettoyage:', error);
          this.snackBar.open(
            error.error?.message || 'Erreur lors du nettoyage',
            'Fermer',
            { duration: 5000, panelClass: 'error-snackbar' }
          );
        }
      });
    });
  }
}