import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TontineService } from '../../services/tontine.service';
import { AuthService } from '../../services/auth.service';
import { Tontine } from '../../models';

@Component({
  selector: 'app-tontines',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>🏦 Gestion des Tontines</h1>
          <p class="subtitle">{{ tontines().length }} tontine(s) enregistrée(s)</p>
        </div>
        @if (authService.hasRole('admin', 'tresorier')) {
          <button mat-raised-button color="primary" [routerLink]="['/tontines/new']">
            <mat-icon>add</mat-icon>
            Nouvelle Tontine
          </button>
        }
      </div>

      @if (tontines().length === 0) {
        <mat-card class="empty-card">
          <mat-card-content>
            <div class="empty-state">
              <mat-icon>account_balance</mat-icon>
              <h3>Aucune tontine enregistrée</h3>
              <p>Commencez par créer votre première tontine</p>
              @if (authService.hasRole('admin', 'tresorier')) {
                <button mat-raised-button color="primary" [routerLink]="['/tontines/new']">
                  <mat-icon>add</mat-icon>
                  Créer une Tontine
                </button>
              }
            </div>
          </mat-card-content>
        </mat-card>
      } @else {
        <div class="tontines-grid">
          @for (tontine of tontines(); track tontine._id) {
            <mat-card class="tontine-card" [routerLink]="['/tontines', tontine._id]">
              <mat-card-header>
                <mat-card-title>
                  <div class="card-title-row">
                    <span>{{ tontine.nom }}</span>
                    <mat-chip [class]="'status-' + tontine.statut">
                      {{ getStatutLabel(tontine.statut) }}
                    </mat-chip>
                  </div>
                </mat-card-title>
                @if (tontine.description) {
                  <mat-card-subtitle>{{ tontine.description }}</mat-card-subtitle>
                }
              </mat-card-header>

              <mat-card-content>
                <div class="tontine-info">
                  <div class="info-item">
                    <mat-icon>payments</mat-icon>
                    <div>
                      <strong>{{ tontine.montantCotisation | number:'1.0-0' }} FCFA</strong>
                      <span>Cotisation {{ tontine.frequence }}</span>
                    </div>
                  </div>

                  <div class="info-item">
                    <mat-icon>people</mat-icon>
                    <div>
                      <strong>{{ getActiveMembersCount(tontine) }} membres</strong>
                      <span>Participants</span>
                    </div>
                  </div>

                  <div class="info-item">
                    <mat-icon>account_balance_wallet</mat-icon>
                    <div>
                      <strong>{{ getCalculatedTotal(tontine) | number:'1.0-0' }} FCFA</strong>
                      <span>Montant total</span>
                    </div>
                  </div>

                  <div class="info-item">
                    <mat-icon>event</mat-icon>
                    <div>
                      <strong>{{ formatDate(tontine.dateDebut) }}</strong>
                      <span>Date de début</span>
                    </div>
                  </div>
                </div>
              </mat-card-content>

              <mat-card-actions>
                <button mat-button color="primary">
                  <mat-icon>visibility</mat-icon>
                  Détails
                </button>
                @if (authService.hasRole('admin', 'tresorier')) {
                  <button mat-button color="accent" (click)="editTontine($event, tontine._id)">
                    <mat-icon>edit</mat-icon>
                    Modifier
                  </button>
                }
              </mat-card-actions>
            </mat-card>
          }
        </div>
      }
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

      button {
        height: 44px;
        font-weight: 600;
      }
    }

    .empty-card {
      border-radius: 12px !important;
      border: 1px solid var(--border-color);
    }

    .empty-state {
      text-align: center;
      padding: 80px 20px;

      mat-icon {
        font-size: 80px;
        width: 80px;
        height: 80px;
        color: var(--text-secondary);
        opacity: 0.5;
      }

      h3 {
        margin: 20px 0 10px 0;
        color: var(--text-primary);
      }

      p {
        color: var(--text-secondary);
        margin: 0 0 24px 0;
      }
    }

    .tontines-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 24px;
    }

    .tontine-card {
      border-radius: 12px !important;
      border: 1px solid var(--border-color);
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 25px -3px rgb(0 0 0 / 0.15) !important;
      }

      mat-card-header {
        margin-bottom: 16px;
      }

      mat-card-title {
        font-size: 20px;
        font-weight: 600;
        color: var(--text-primary);
      }

      mat-card-subtitle {
        color: var(--text-secondary);
        margin-top: 8px;
        font-size: 14px;
      }
    }

    .card-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .status-actif {
      background-color: #d1fae5 !important;
      color: #065f46 !important;
    }

    .status-planifie {
      background-color: #dbeafe !important;
      color: #1e40af !important;
    }

    .status-termine {
      background-color: #e5e7eb !important;
      color: #374151 !important;
    }

    .status-suspendu {
      background-color: #fef3c7 !important;
      color: #92400e !important;
    }

    .tontine-info {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin: 16px 0;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
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
          font-size: 15px;
        }

        span {
          color: var(--text-secondary);
          font-size: 12px;
        }
      }
    }

    mat-card-actions {
      padding: 16px;
      border-top: 1px solid var(--border-color);
      display: flex;
      gap: 8px;
    }

    @media (max-width: 768px) {
      .page-container {
        padding: 16px;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;

        button {
          width: 100%;
        }
      }

      .tontines-grid {
        grid-template-columns: 1fr;
      }

      .tontine-info {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TontinesComponent implements OnInit {
  authService = inject(AuthService);
  private tontineService = inject(TontineService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  tontines = signal<Tontine[]>([]);

  ngOnInit() {
    this.loadTontines();
  }

  loadTontines() {
    this.tontineService.getTontines().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tontines.set(response.data);
        }
      },
      error: (error) => {
        this.snackBar.open('Erreur lors du chargement des tontines', 'Fermer', { duration: 3000 });
      }
    });
  }

  getStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'actif': 'Active',
      'planifie': 'Planifiée',
      'termine': 'Terminée',
      'suspendu': 'Suspendue'
    };
    return labels[statut] || statut;
  }

  // Calculer le nombre de membres actifs basé sur le tableau membres
  getActiveMembersCount(tontine: Tontine): number {
    if (!tontine.membres || !Array.isArray(tontine.membres)) return 0;
    return tontine.membres.filter(m => m.isActive).length;
  }

  // Calculer le montant total basé sur le nombre de membres actifs
  getCalculatedTotal(tontine: Tontine): number {
    const activeCount = this.getActiveMembersCount(tontine);
    return activeCount * tontine.montantCotisation;
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  editTontine(event: Event, tontineId: string) {
    event.stopPropagation();
    this.router.navigate(['/tontines', 'edit', tontineId]);
  }
}
