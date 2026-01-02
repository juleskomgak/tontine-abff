import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { BanqueService } from '../../services/banque.service';
import { TontineService } from '../../services/tontine.service';
import { CarteCodebafService } from '../../services/carte-codebaf.service';
import { SolidariteService } from '../../services/solidarite.service';
import { AuthService } from '../../services/auth.service';
import { BanqueCentrale, Tontine, CarteCodebafStats } from '../../models';

@Component({
  selector: 'app-banque',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatSnackBarModule, MatProgressSpinnerModule, MatButtonModule, MatMenuModule],
  template: `
    <div class="banque-page-container">
      <div class="banque-page-header">
        <div class="banque-header-left">
          <mat-icon class="banque-page-icon">account_balance</mat-icon>
          <div>
            <h1 class="banque-h1">Banque centrale</h1>
            <p class="banque-subtitle">Monitoring centralise: Tontines, Solidarites et Cartes CODEBAF</p>
          </div>
        </div>
        <div class="banque-header-actions">
          <button mat-icon-button [matMenuTriggerFor]="actionsMenu" aria-label="Actions">
            <mat-icon>more_vert</mat-icon>
          </button>
          <mat-menu #actionsMenu="matMenu">
            <button mat-menu-item (click)="recalculerToutes()">
              <mat-icon>refresh</mat-icon>
              <span>Recalculer les soldes</span>
            </button>
            <button mat-menu-item (click)="nettoyerOrphelines()">
              <mat-icon>cleaning_services</mat-icon>
              <span>Nettoyer les données orphelines</span>
            </button>
          </mat-menu>
        </div>
      </div>

      <mat-card class="banque-filter-card">
        <mat-card-content>
          <div class="banque-filters-row">
            <mat-form-field appearance="outline" class="banque-filter-field">
              <mat-label>Vue</mat-label>
              <mat-select [value]="selectedView()" (selectionChange)="selectedView.set($event.value)">
                <mat-option value="tontine">Tontine</mat-option>
                <mat-option value="solidarite">Solidarites</mat-option>
                <mat-option value="cartes">Cartes CODEBAF</mat-option>
              </mat-select>
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="banque-filter-field">
              <mat-label>Année</mat-label>
              <mat-select [value]="selectedYear()" (selectionChange)="selectedYear.set($event.value)">
                @for (year of availableYears(); track year) {
                  <mat-option [value]="year">{{ year }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <div class="loading-container">
          <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
          <p>Chargement des données...</p>
        </div>
      } @else {
        @if (selectedView() === 'tontine') {
          <!-- Vue Tontine -->
          @if (banques().length === 0) {
            <mat-card class="empty-state-card">
              <mat-card-content>
                <div class="empty-state">
                  <mat-icon>account_balance</mat-icon>
                  <h3>Aucune banque tontine</h3>
                  <p>Aucune donnée bancaire disponible pour les tontines</p>
                </div>
              </mat-card-content>
            </mat-card>
          } @else {
            <div class="banque-stats-grid">
              <mat-card class="banque-stat-card solde">
                <mat-card-content>
                  <mat-icon class="banque-stat-icon account_balance_wallet">account_balance_wallet</mat-icon>
                  <div class="banque-stat-content">
                    <h3>{{ totalSolde() | number:'1.0-0' }} FCFA</h3>
                    <p>Solde total</p>
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="banque-stat-card cotisations">
                <mat-card-content>
                  <mat-icon class="banque-stat-icon payments">payments</mat-icon>
                  <div class="banque-stat-content">
                    <h3>{{ totalCotise() | number:'1.0-0' }} FCFA</h3>
                    <p>Total cotisé</p>
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="banque-stat-card distribue">
                <mat-card-content>
                  <mat-icon class="banque-stat-icon call_made">call_made</mat-icon>
                  <div class="banque-stat-content">
                    <h3>{{ totalDistribue() | number:'1.0-0' }} FCFA</h3>
                    <p>Total distribué</p>
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="banque-stat-card refus">
                <mat-card-content>
                  <mat-icon class="banque-stat-icon block">block</mat-icon>
                  <div class="banque-stat-content">
                    <h3>{{ totalRefus() | number:'1.0-0' }} FCFA</h3>
                    <p>Total refus</p>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>

            <!-- Liste des banques tontine -->
            <div class="banques-list">
              @for (banque of banques(); track banque._id) {
                <mat-card class="banque-card">
                  <mat-card-header>
                    <mat-card-title>{{ getTontineName(banque.tontine) }}</mat-card-title>
                    <mat-card-subtitle>Cycle {{ getTontineCycle(banque.tontine) }}</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="banque-details">
                      <div class="detail-item">
                        <mat-icon>account_balance_wallet</mat-icon>
                        <span><strong>Solde total:</strong> {{ banque.soldeTotal | number:'1.0-0' }} FCFA</span>
                      </div>
                      <div class="detail-item">
                        <mat-icon>payments</mat-icon>
                        <span><strong>Cotisations:</strong> {{ banque.soldeCotisations | number:'1.0-0' }} FCFA</span>
                      </div>
                      <div class="detail-item">
                        <mat-icon>block</mat-icon>
                        <span><strong>Refus:</strong> {{ banque.soldeRefus | number:'1.0-0' }} FCFA</span>
                      </div>
                      <div class="detail-item">
                        <mat-icon>call_made</mat-icon>
                        <span><strong>Distribué:</strong> {{ banque.totalDistribue | number:'1.0-0' }} FCFA</span>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>
              }
            </div>
          }
        } @else if (selectedView() === 'solidarite') {
          <!-- Vue Solidarité -->
          @if (!solidariteStats()) {
            <mat-card class="empty-state-card">
              <mat-card-content>
                <div class="empty-state">
                  <mat-icon>group</mat-icon>
                  <h3>Aucune donnée solidarité</h3>
                  <p>Aucune statistique disponible pour les solidarités</p>
                </div>
              </mat-card-content>
            </mat-card>
          } @else {
            <div class="solidarite-stats">
              <div class="stats-grid">
                <mat-card class="stat-card">
                  <mat-card-content>
                    <mat-icon class="stat-icon">group</mat-icon>
                    <div class="stat-content">
                      <h3>{{ solidariteStats()!.totalMembres }}</h3>
                      <p>Total membres</p>
                    </div>
                  </mat-card-content>
                </mat-card>

                <mat-card class="stat-card">
                  <mat-card-content>
                    <mat-icon class="stat-icon">payments</mat-icon>
                    <div class="stat-content">
                      <h3>{{ solidariteStats()!.totalGlobal.totalCollecte | number:'1.0-0' }} FCFA</h3>
                      <p>Total collecté</p>
                    </div>
                  </mat-card-content>
                </mat-card>

                <mat-card class="stat-card">
                  <mat-card-content>
                    <mat-icon class="stat-icon">trending_up</mat-icon>
                    <div class="stat-content">
                      <h3>{{ solidariteStats()!.totalGlobal.tauxCollecte }}</h3>
                      <p>Taux moyen</p>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>
            </div>
          }
        } @else if (selectedView() === 'cartes') {
          <!-- Vue Cartes CODEBAF -->
          @if (!cartesStats()) {
            <mat-card class="empty-state-card">
              <mat-card-content>
                <div class="empty-state">
                  <mat-icon>credit_card</mat-icon>
                  <h3>Aucune carte CODEBAF</h3>
                  <p>Aucune statistique disponible pour les cartes CODEBAF</p>
                </div>
              </mat-card-content>
            </mat-card>
          } @else {
            <div class="cartes-stats">
              <div class="stats-grid">
                <mat-card class="stat-card">
                  <mat-card-content>
                    <mat-icon class="stat-icon">credit_card</mat-icon>
                    <div class="stat-content">
                      <h3>{{ cartesStats()!.global.totalCartes }}</h3>
                      <p>Total cartes</p>
                    </div>
                  </mat-card-content>
                </mat-card>

                <mat-card class="stat-card">
                  <mat-card-content>
                    <mat-icon class="stat-icon">account_balance_wallet</mat-icon>
                    <div class="stat-content">
                      <h3>{{ cartesStats()!.global.totalMontantAttendu | number:'1.0-0' }} FCFA</h3>
                      <p>Montant attendu</p>
                    </div>
                  </mat-card-content>
                </mat-card>

                <mat-card class="stat-card">
                  <mat-card-content>
                    <mat-icon class="stat-icon">payments</mat-icon>
                    <div class="stat-content">
                      <h3>{{ cartesStats()!.global.totalMontantPaye | number:'1.0-0' }} FCFA</h3>
                      <p>Montant payé</p>
                    </div>
                  </mat-card-content>
                </mat-card>

                <mat-card class="stat-card">
                  <mat-card-content>
                    <mat-icon class="stat-icon">trending_up</mat-icon>
                    <div class="stat-content">
                      <h3>{{ cartesStats()!.global.tauxRecouvrement }}</h3>
                      <p>Taux recouvrement</p>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>
            </div>
          }
        }
      }
    </div>
  `,
  styles: [`
    .banque-page-container {
      padding: 32px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .banque-page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;

      .banque-header-left {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .banque-page-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #2563eb;
      }

      h1.banque-h1 {
        font-size: 32px;
        font-weight: 700;
        margin: 0;
        color: var(--text-primary);
      }

      .banque-subtitle {
        color: var(--text-secondary);
        margin: 4px 0 0 0;
        font-size: 16px;
      }
    }

    .banque-filter-card {
      margin-bottom: 24px;
      border-radius: 12px !important;
      border: 1px solid var(--border-color);
    }

    .banque-filters-row {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;

      .banque-filter-field {
        min-width: 250px;
      }
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

    .empty-state-card {
      border-radius: 12px !important;
      border: 1px solid var(--border-color);
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;

      mat-icon {
        font-size: 72px;
        width: 72px;
        height: 72px;
        color: #cbd5e1;
        margin-bottom: 20px;
      }

      h3 {
        font-size: 24px;
        font-weight: 600;
        margin: 0 0 12px 0;
        color: var(--text-primary);
      }

      p {
        color: var(--text-secondary);
        margin: 0;
        font-size: 16px;
      }
    }

    .banque-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .banque-stat-card {
      border-radius: 12px !important;
      border: 1px solid var(--border-color);
      transition: transform 0.2s ease, box-shadow 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      mat-card-content {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px !important;
      }

      .banque-stat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        padding: 12px;
        border-radius: 10px;

        &.account_balance_wallet {
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          color: white;
        }

        &.payments {
          background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
          color: white;
        }

        &.call_made {
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
          color: white;
        }

        &.block {
          background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
          color: white;
        }
      }

      .banque-stat-content {
        h3 {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 4px 0;
          color: var(--text-primary);
        }

        p {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
        }
      }
    }

    .banques-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 16px;
    }

    .banque-card {
      border-radius: 12px !important;
      border: 1px solid var(--border-color);

      mat-card-header {
        background: #f8fafc;
        border-bottom: 1px solid var(--border-color);
        margin-bottom: 16px;

        mat-card-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }

        mat-card-subtitle {
          color: var(--text-secondary);
        }
      }

      .banque-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;

        .detail-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 8px;
          font-size: 14px;

          mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
            color: #2563eb;
          }

          strong {
            color: var(--text-primary);
          }

          span {
            color: var(--text-secondary);
          }
        }
      }
    }

    .solidarite-stats, .cartes-stats {
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .stat-card {
        border-radius: 12px !important;
        border: 1px solid var(--border-color);
        transition: transform 0.2s ease, box-shadow 0.2s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        mat-card-content {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px !important;
        }

        .stat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
          padding: 12px;
          border-radius: 10px;
          background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
          color: white;
        }

        .stat-content {
          h3 {
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 4px 0;
            color: var(--text-primary);
          }

          p {
            margin: 0;
            font-size: 13px;
            color: var(--text-secondary);
            font-weight: 500;
          }
        }
      }
    }

    @media (max-width: 768px) {
      .banque-page-container {
        padding: 16px;
      }

      .banque-filters-row {
        flex-direction: column;

        .banque-filter-field {
          width: 100%;
        }
      }

      .banque-stats-grid, .stats-grid {
        grid-template-columns: 1fr;
      }

      .banques-list {
        grid-template-columns: 1fr;
      }

      .banque-details {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BanqueComponent implements OnInit {

  private banqueService = inject(BanqueService);
  private tontineService = inject(TontineService);
  private carteCodebafService = inject(CarteCodebafService);
  private solidariteService = inject(SolidariteService);
  private snackBar = inject(MatSnackBar);

  loading = signal(true);
  allBanques = signal<BanqueCentrale[]>([]); // Toutes les banques (cache)
  allTontines = signal<Tontine[]>([]); // Toutes les tontines (cache)
  selectedView = signal<'tontine'|'solidarite'|'cartes'>('tontine');
  selectedYear = signal<number>(new Date().getFullYear());
  availableYears = signal<number[]>([]);
  cartesStats = signal<CarteCodebafStats | null>(null);
  solidariteStats = signal<any>(null);

  // Filtrer les banques par année (côté client)
  banques = computed(() => {
    const year = this.selectedYear();
    return this.allBanques().filter(banque => {
      if (!banque.createdAt) return true;
      const banqueYear = new Date(banque.createdAt).getFullYear();
      return banqueYear === year;
    });
  });

  // Filtrer les tontines par année (côté client)
  tontines = computed(() => {
    const year = this.selectedYear();
    return this.allTontines().filter(tontine => {
      if (!tontine.dateDebut) return true;
      const tontineYear = new Date(tontine.dateDebut).getFullYear();
      return tontineYear === year;
    });
  });

  totalSolde = computed(() => {
    return this.banques().reduce((sum, b) => sum + b.soldeTotal, 0);
  });

  totalCotise = computed(() => {
    return this.banques().reduce((sum, b) => sum + b.totalCotise, 0);
  });

  totalDistribue = computed(() => {
    return this.banques().reduce((sum, b) => sum + b.totalDistribue, 0);
  });

  totalRefus = computed(() => {
    return this.banques().reduce((sum, b) => sum + b.totalRefus, 0);
  });

  private isInitialized = false;

  constructor() {
    // Recharger les stats cartes CODEBAF et solidarités quand l'année change
    effect(() => {
      const year = this.selectedYear();
      if (this.isInitialized && year) {
        this.loadCartesAndSolidariteStats(year);
      }
    });
  }

  ngOnInit() {
    this.initializeYears();
    this.loadData();
  }

  initializeYears() {
    const currentYear = new Date().getFullYear();
    const years = [];
    // Générer les années de 2024 à l'année courante + 1
    for (let year = 2024; year <= currentYear + 1; year++) {
      years.push(year);
    }
    this.availableYears.set(years.reverse());
    this.selectedYear.set(currentYear);
  }

  loadData() {
    this.loading.set(true);

    // Charger les banques (une seule fois, filtrage côté client)
    this.banqueService.getAllBanques().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.allBanques.set(response.data);
        }
      },
      error: (error) => {
        this.snackBar.open('Erreur lors du chargement des banques', 'Fermer', { duration: 3000 });
      }
    });

    // Charger les tontines (une seule fois, filtrage côté client)
    this.tontineService.getTontines().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.allTontines.set(response.data);
        }
      }
    });

    // Charger les stats cartes CODEBAF avec l'année sélectionnée
    this.carteCodebafService.getStatistiques(this.selectedYear()).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.cartesStats.set(response.data);
        }
      }
    });

    // Charger les stats solidarités
    this.solidariteService.getStats(this.selectedYear()).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.solidariteStats.set(response.data);
        }
        this.loading.set(false);
        this.isInitialized = true;
      },
      error: () => {
        this.loading.set(false);
        this.isInitialized = true;
      }
    });
  }

  // Méthode pour recharger uniquement les stats cartes et solidarités (quand l'année change)
  loadCartesAndSolidariteStats(year: number) {
    this.carteCodebafService.getStatistiques(year).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.cartesStats.set(response.data);
        }
      }
    });

    this.solidariteService.getStats(year).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.solidariteStats.set(response.data);
        }
      }
    });
  }

  getTontineName(tontine: Tontine | string): string {
    if (typeof tontine === 'string') {
      const found = this.tontines().find(t => t._id === tontine);
      return found ? found.nom : 'Tontine inconnue';
    }
    return tontine.nom;
  }

  getTontineCycle(tontine: Tontine | string): number {
    if (typeof tontine === 'string') {
      const found = this.tontines().find(t => t._id === tontine);
      return found ? found.cycleCourant : 0;
    }
    return tontine.cycleCourant;
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  nettoyerOrphelines() {
    if (!confirm('Êtes-vous sûr de vouloir nettoyer les données orphelines ? Cette action supprimera les banques liées à des tontines inexistantes.')) {
      return;
    }

    this.banqueService.nettoyerOrphelines().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const data = response.data;
          this.snackBar.open(
            `Nettoyage terminé: ${data.orphelinesSuprimees} banques orphelines supprimées, ${data.banquesRecalculees} banques recalculées`,
            'Fermer',
            { duration: 5000 }
          );
          this.loadData();
        }
      },
      error: (error) => {
        this.snackBar.open('Erreur lors du nettoyage', 'Fermer', { duration: 3000 });
      }
    });
  }

  recalculerToutes() {
    if (!confirm('Êtes-vous sûr de vouloir recalculer tous les soldes des banques ?')) {
      return;
    }

    this.banqueService.recalculerToutes().subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Recalcul terminé avec succès', 'Fermer', { duration: 3000 });
          this.loadData();
        }
      },
      error: (error) => {
        this.snackBar.open('Erreur lors du recalcul', 'Fermer', { duration: 3000 });
      }
    });
  }
}
