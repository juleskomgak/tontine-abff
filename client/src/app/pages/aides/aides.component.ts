import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AideService, CategorieAide, AideAccordee, AideStats } from '../../services/aide.service';

@Component({
  selector: 'app-aides',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule,
    MatSelectModule, MatFormFieldModule, MatInputModule, MatTableModule,
    MatChipsModule, MatTabsModule, MatDialogModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatMenuModule, MatTooltipModule
  ],
  template: `
    <div class="aides-container">
      <div class="page-header">
        <div class="header-left">
          <mat-icon class="page-icon">volunteer_activism</mat-icon>
          <div>
            <h1>Gestion des Aides</h1>
            <p class="subtitle">Aides aux membres actifs et en règle</p>
          </div>
        </div>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="openNewAideDialog()">
            <mat-icon>add</mat-icon>
            Nouvelle aide
          </button>
        </div>
      </div>

      <!-- Filtres -->
      <mat-card class="filter-card">
        <mat-card-content>
          <div class="filters-row">
            <mat-form-field appearance="outline">
              <mat-label>Année</mat-label>
              <mat-select [(ngModel)]="selectedYear" (selectionChange)="loadData()">
                @for (year of availableYears; track year) {
                  <mat-option [value]="year">{{ year }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Type d'aide</mat-label>
              <mat-select [(ngModel)]="selectedType" (selectionChange)="loadAides()">
                <mat-option value="">Tous</mat-option>
                <mat-option value="malheureux">Événement malheureux</mat-option>
                <mat-option value="heureux">Événement heureux</mat-option>
                <mat-option value="chefferie">Chefferie</mat-option>
                <mat-option value="repas">Aide repas</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Statut</mat-label>
              <mat-select [(ngModel)]="selectedStatut" (selectionChange)="loadAides()">
                <mat-option value="">Tous</mat-option>
                <mat-option value="en_attente">En attente</mat-option>
                <mat-option value="approuve">Approuvées</mat-option>
                <mat-option value="paye">Payées</mat-option>
                <mat-option value="refuse">Refusées</mat-option>
                <mat-option value="annule">Annulées</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Statistiques -->
      @if (stats()) {
        <div class="stats-grid">
          <mat-card class="stat-card total">
            <mat-card-content>
              <mat-icon>payments</mat-icon>
              <div class="stat-content">
                <h3>{{ stats()!.totalGeneral.totalMontant | number:'1.0-0' }} FCFA</h3>
                <p>Total aides accordées</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card count">
            <mat-card-content>
              <mat-icon>group</mat-icon>
              <div class="stat-content">
                <h3>{{ stats()!.totalGeneral.nombreAides }}</h3>
                <p>Nombre d'aides</p>
              </div>
            </mat-card-content>
          </mat-card>

          @for (typeStat of stats()!.parType; track typeStat._id) {
            <mat-card class="stat-card type" [style.border-left-color]="aideService.getTypeColor(typeStat._id)">
              <mat-card-content>
                <div class="stat-content">
                  <h3>{{ typeStat.totalMontant | number:'1.0-0' }} FCFA</h3>
                  <p>{{ aideService.getTypeLabel(typeStat._id) }} ({{ typeStat.nombreAides }})</p>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }

      <!-- Onglets -->
      <mat-tab-group (selectedTabChange)="onTabChange($event)">
        <!-- Tab Aides -->
        <mat-tab label="Aides accordées">
          <div class="tab-content">
            @if (loading()) {
              <div class="loading">
                <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
              </div>
            } @else if (aides().length === 0) {
              <div class="empty-state">
                <mat-icon>volunteer_activism</mat-icon>
                <h3>Aucune aide</h3>
                <p>Aucune aide enregistrée pour cette période</p>
              </div>
            } @else {
              <div class="aides-list">
                @for (aide of aides(); track aide._id) {
                  <mat-card class="aide-card" [class]="'statut-' + aide.statut">
                    <mat-card-header>
                      <div class="aide-header">
                        <div class="aide-info">
                          <span class="type-badge" [style.background-color]="aideService.getTypeColor(aide.categorie.type)">
                            {{ aide.categorie.nom }}
                          </span>
                          <h3>{{ aide.membre.nom }} {{ aide.membre.prenom }}</h3>
                        </div>
                        <div class="aide-montant">
                          {{ aide.montant | number:'1.0-0' }} FCFA
                        </div>
                      </div>
                    </mat-card-header>
                    <mat-card-content>
                      <p class="motif"><strong>Motif:</strong> {{ aide.motif }}</p>
                      @if (aide.description) {
                        <p class="description">{{ aide.description }}</p>
                      }
                      <div class="aide-meta">
                        <span class="statut-chip" [style.background-color]="aideService.getStatutColor(aide.statut)">
                          {{ aideService.getStatutLabel(aide.statut) }}
                        </span>
                        <span class="date">{{ aide.dateAccord | date:'dd/MM/yyyy' }}</span>
                        <span class="source">{{ aideService.getSourceDebitLabel(aide.sourceDebit) }}</span>
                      </div>
                    </mat-card-content>
                    <mat-card-actions>
                      @if (aide.statut === 'en_attente') {
                        <button mat-button color="primary" (click)="approuverAide(aide)">
                          <mat-icon>check</mat-icon> Approuver
                        </button>
                        <button mat-button color="warn" (click)="refuserAide(aide)">
                          <mat-icon>close</mat-icon> Refuser
                        </button>
                      }
                      @if (aide.statut === 'approuve') {
                        <button mat-raised-button color="primary" (click)="payerAide(aide)">
                          <mat-icon>payment</mat-icon> Payer
                        </button>
                        <button mat-button color="warn" (click)="refuserAide(aide)">
                          <mat-icon>close</mat-icon> Refuser
                        </button>
                      }
                      @if (aide.statut === 'paye') {
                        <button mat-button color="warn" (click)="annulerAide(aide)">
                          <mat-icon>undo</mat-icon> Annuler
                        </button>
                      }
                    </mat-card-actions>
                  </mat-card>
                }
              </div>
            }
          </div>
        </mat-tab>

        <!-- Tab Catégories -->
        <mat-tab label="Catégories d'aide">
          <div class="tab-content">
            <div class="section-header">
              <h2>Catégories d'aide</h2>
              <div class="section-actions">
                <button mat-stroked-button (click)="initCategories()">
                  <mat-icon>refresh</mat-icon>
                  Initialiser par défaut
                </button>
                <button mat-raised-button color="primary" (click)="openNewCategorieDialog()">
                  <mat-icon>add</mat-icon>
                  Nouvelle catégorie
                </button>
              </div>
            </div>

            <div class="categories-grid">
              @for (cat of categories(); track cat._id) {
                <mat-card class="categorie-card" [style.border-left-color]="aideService.getTypeColor(cat.type)">
                  <mat-card-header>
                    <mat-card-title>{{ cat.nom }}</mat-card-title>
                    <mat-card-subtitle>{{ aideService.getTypeLabel(cat.type) }}</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <p class="description">{{ cat.description || 'Aucune description' }}</p>
                    <div class="montant-defaut">
                      <strong>Montant par défaut:</strong> {{ cat.montantDefaut | number:'1.0-0' }} FCFA
                    </div>
                    <div class="status">
                      @if (cat.isActive) {
                        <span class="active">Active</span>
                      } @else {
                        <span class="inactive">Inactive</span>
                      }
                    </div>
                  </mat-card-content>
                  <mat-card-actions>
                    <button mat-icon-button (click)="editCategorie(cat)" matTooltip="Modifier">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="deleteCategorie(cat)" matTooltip="Supprimer">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </mat-card-actions>
                </mat-card>
              }
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>

    <!-- Dialog Nouvelle Aide -->
    @if (showAideDialog) {
      <div class="dialog-overlay" (click)="closeDialogs()">
        <div class="dialog-content" (click)="$event.stopPropagation()">
          <h2>Nouvelle demande d'aide</h2>
          <form (ngSubmit)="submitAide()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Membre bénéficiaire</mat-label>
              <mat-select [(ngModel)]="newAide.membre" name="membre" required>
                @for (m of membresEligibles(); track m._id) {
                  <mat-option [value]="m._id">{{ m.nom }} {{ m.prenom }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Catégorie d'aide</mat-label>
              <mat-select [(ngModel)]="newAide.categorie" name="categorie" required (selectionChange)="onCategorieChange($event)">
                @for (cat of categories(); track cat._id) {
                  <mat-option [value]="cat._id">{{ cat.nom }} ({{ cat.montantDefaut | number:'1.0-0' }} FCFA)</mat-option>
                }
              </mat-select>
              @if (categories().length === 0) {
                <mat-hint class="warn-hint">Aucune catégorie disponible. Allez dans l'onglet "Catégories d'aide" pour les initialiser.</mat-hint>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Montant</mat-label>
              <input matInput type="number" [(ngModel)]="newAide.montant" name="montant" required>
              <span matSuffix>FCFA</span>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Motif</mat-label>
              <input matInput [(ngModel)]="newAide.motif" name="motif" required>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description (optionnel)</mat-label>
              <textarea matInput [(ngModel)]="newAide.description" name="description" rows="3"></textarea>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Date de l'événement</mat-label>
              <input matInput type="date" [(ngModel)]="newAide.dateEvenement" name="dateEvenement">
            </mat-form-field>

            <div class="dialog-actions">
              <button mat-button type="button" (click)="closeDialogs()">Annuler</button>
              <button mat-raised-button color="primary" type="submit">Créer l'aide</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Dialog Nouvelle Catégorie -->
    @if (showCategorieDialog) {
      <div class="dialog-overlay" (click)="closeDialogs()">
        <div class="dialog-content" (click)="$event.stopPropagation()">
          <h2>{{ editingCategorie ? 'Modifier' : 'Nouvelle' }} catégorie</h2>
          <form (ngSubmit)="submitCategorie()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nom</mat-label>
              <input matInput [(ngModel)]="newCategorie.nom" name="nom" required>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Type</mat-label>
              <mat-select [(ngModel)]="newCategorie.type" name="type" required>
                <mat-option value="malheureux">Événement malheureux</mat-option>
                <mat-option value="heureux">Événement heureux</mat-option>
                <mat-option value="chefferie">Chefferie</mat-option>
                <mat-option value="repas">Aide repas</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description</mat-label>
              <textarea matInput [(ngModel)]="newCategorie.description" name="description" rows="2"></textarea>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Montant par défaut</mat-label>
              <input matInput type="number" [(ngModel)]="newCategorie.montantDefaut" name="montantDefaut" required>
              <span matSuffix>FCFA</span>
            </mat-form-field>

            <div class="dialog-actions">
              <button mat-button type="button" (click)="closeDialogs()">Annuler</button>
              <button mat-raised-button color="primary" type="submit">{{ editingCategorie ? 'Modifier' : 'Créer' }}</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .aides-container {
      padding: 32px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;

      .header-left {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .page-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #8b5cf6;
      }

      h1 {
        font-size: 32px;
        font-weight: 700;
        margin: 0;
      }

      .subtitle {
        color: #64748b;
        margin: 4px 0 0 0;
      }
    }

    .filter-card {
      margin-bottom: 24px;
      border-radius: 12px !important;
    }

    .filters-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;

      mat-form-field {
        min-width: 200px;
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      border-radius: 12px !important;
      border-left: 4px solid #8b5cf6;

      &.total { border-left-color: #10b981; }
      &.count { border-left-color: #3b82f6; }
      &.type { border-left-width: 4px; }

      mat-card-content {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px !important;

        mat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
          color: #8b5cf6;
        }

        .stat-content {
          h3 {
            font-size: 20px;
            font-weight: 700;
            margin: 0;
          }
          p {
            margin: 4px 0 0 0;
            color: #64748b;
            font-size: 13px;
          }
        }
      }
    }

    .tab-content {
      padding: 24px 0;
    }

    .loading, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #cbd5e1;
        margin-bottom: 16px;
      }

      h3 {
        font-size: 20px;
        font-weight: 600;
        margin: 0 0 8px 0;
      }

      p {
        color: #64748b;
        margin: 0;
      }
    }

    .aides-list {
      display: grid;
      gap: 16px;
    }

    .aide-card {
      border-radius: 12px !important;
      border-left: 4px solid #8b5cf6;

      &.statut-en_attente { border-left-color: #f59e0b; }
      &.statut-approuve { border-left-color: #3b82f6; }
      &.statut-paye { border-left-color: #10b981; }
      &.statut-refuse { border-left-color: #ef4444; }
      &.statut-annule { border-left-color: #6b7280; }

      .aide-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        width: 100%;

        .aide-info {
          .type-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            color: white;
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 8px;
          }

          h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
          }
        }

        .aide-montant {
          font-size: 24px;
          font-weight: 700;
          color: #10b981;
        }
      }

      .motif {
        margin: 12px 0 8px 0;
      }

      .description {
        color: #64748b;
        font-size: 14px;
      }

      .aide-meta {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-top: 12px;
        flex-wrap: wrap;

        .statut-chip {
          padding: 4px 12px;
          border-radius: 20px;
          color: white;
          font-size: 12px;
          font-weight: 500;
        }

        .date, .source {
          color: #64748b;
          font-size: 13px;
        }
      }
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;

      h2 {
        font-size: 20px;
        font-weight: 600;
        margin: 0;
      }

      .section-actions {
        display: flex;
        gap: 12px;
      }
    }

    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }

    .categorie-card {
      border-radius: 12px !important;
      border-left: 4px solid #8b5cf6;

      .description {
        color: #64748b;
        font-size: 14px;
        margin: 12px 0;
      }

      .montant-defaut {
        margin: 12px 0;
        font-size: 16px;

        strong {
          color: #64748b;
        }
      }

      .status {
        .active {
          color: #10b981;
          font-weight: 500;
        }
        .inactive {
          color: #ef4444;
          font-weight: 500;
        }
      }
    }

    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog-content {
      background: white;
      border-radius: 16px;
      padding: 32px;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;

      h2 {
        margin: 0 0 24px 0;
        font-size: 24px;
        font-weight: 600;
      }

      .full-width {
        width: 100%;
      }

      .warn-hint {
        color: #f59e0b !important;
        font-size: 12px;
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 24px;
      }
    }

    @media (max-width: 768px) {
      .aides-container {
        padding: 16px;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .filters-row {
        flex-direction: column;

        mat-form-field {
          width: 100%;
        }
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .categories-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AidesComponent implements OnInit {
  aideService = inject(AideService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // Signals
  loading = signal(false);
  aides = signal<AideAccordee[]>([]);
  categories = signal<CategorieAide[]>([]);
  stats = signal<AideStats | null>(null);
  membresEligibles = signal<any[]>([]);

  // Filtres
  selectedYear = new Date().getFullYear();
  selectedType = '';
  selectedStatut = '';
  availableYears = [2024, 2025, 2026, 2027];

  // Dialogs
  showAideDialog = false;
  showCategorieDialog = false;
  editingCategorie: CategorieAide | null = null;

  // Formulaires
  newAide: any = {
    membre: '',
    categorie: '',
    montant: 0,
    motif: '',
    description: '',
    dateEvenement: ''
  };

  newCategorie: any = {
    nom: '',
    type: 'malheureux',
    description: '',
    montantDefaut: 0
  };

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loadCategories();
    this.loadAides();
    this.loadStats();
    this.loadMembresEligibles();
  }

  loadCategories() {
    this.aideService.getCategories().subscribe({
      next: (res) => {
        if (res.success) {
          this.categories.set(res.data);
        }
      }
    });
  }

  loadAides() {
    this.loading.set(true);
    const filters: any = { annee: this.selectedYear };
    if (this.selectedType) filters.type = this.selectedType;
    if (this.selectedStatut) filters.statut = this.selectedStatut;

    this.aideService.getAides(filters).subscribe({
      next: (res) => {
        if (res.success) {
          this.aides.set(res.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadStats() {
    this.aideService.getStats(this.selectedYear).subscribe({
      next: (res) => {
        if (res.success) {
          this.stats.set(res.data);
        }
      }
    });
  }

  loadMembresEligibles() {
    this.aideService.getMembresEligibles(this.selectedYear).subscribe({
      next: (res) => {
        if (res.success) {
          this.membresEligibles.set(res.data);
        }
      }
    });
  }

  onTabChange(event: any) {
    if (event.index === 1) {
      this.loadCategories();
    }
  }

  // Actions sur les aides
  approuverAide(aide: AideAccordee) {
    if (!confirm(`Approuver l'aide de ${aide.montant} FCFA pour ${aide.membre.nom} ${aide.membre.prenom} ?`)) return;

    this.aideService.approuverAide(aide._id).subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open('Aide approuvée', 'Fermer', { duration: 3000 });
          this.loadAides();
          this.loadStats();
        }
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Erreur', 'Fermer', { duration: 3000 });
      }
    });
  }

  payerAide(aide: AideAccordee) {
    if (!confirm(`Payer ${aide.montant} FCFA à ${aide.membre.nom} ${aide.membre.prenom} ? Ce montant sera débité de la banque.`)) return;

    this.aideService.payerAide(aide._id).subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open('Aide payée et débitée', 'Fermer', { duration: 3000 });
          this.loadAides();
          this.loadStats();
        }
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Erreur', 'Fermer', { duration: 3000 });
      }
    });
  }

  refuserAide(aide: AideAccordee) {
    const raison = prompt('Raison du refus (optionnel):');
    if (raison === null) return;

    this.aideService.refuserAide(aide._id, raison).subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open('Aide refusée', 'Fermer', { duration: 3000 });
          this.loadAides();
          this.loadStats();
        }
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Erreur', 'Fermer', { duration: 3000 });
      }
    });
  }

  annulerAide(aide: AideAccordee) {
    if (!confirm(`Annuler cette aide ? Le montant sera re-crédité à la banque.`)) return;

    this.aideService.annulerAide(aide._id).subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open('Aide annulée', 'Fermer', { duration: 3000 });
          this.loadAides();
          this.loadStats();
        }
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Erreur', 'Fermer', { duration: 3000 });
      }
    });
  }

  // Dialogs
  openNewAideDialog() {
    this.newAide = {
      membre: '',
      categorie: '',
      montant: 0,
      motif: '',
      description: '',
      dateEvenement: ''
    };
    // Recharger les catégories et membres avant d'ouvrir le dialog
    this.loadCategories();
    this.loadMembresEligibles();
    this.showAideDialog = true;
  }

  openNewCategorieDialog() {
    this.editingCategorie = null;
    this.newCategorie = {
      nom: '',
      type: 'malheureux',
      description: '',
      montantDefaut: 0
    };
    this.showCategorieDialog = true;
  }

  editCategorie(cat: CategorieAide) {
    this.editingCategorie = cat;
    this.newCategorie = {
      nom: cat.nom,
      type: cat.type,
      description: cat.description || '',
      montantDefaut: cat.montantDefaut
    };
    this.showCategorieDialog = true;
  }

  closeDialogs() {
    this.showAideDialog = false;
    this.showCategorieDialog = false;
    this.editingCategorie = null;
  }

  onCategorieChange(event: any) {
    const cat = this.categories().find(c => c._id === event.value);
    if (cat) {
      this.newAide.montant = cat.montantDefaut;
    }
  }

  submitAide() {
    if (!this.newAide.membre || !this.newAide.categorie || !this.newAide.motif) {
      this.snackBar.open('Veuillez remplir tous les champs obligatoires', 'Fermer', { duration: 3000 });
      return;
    }

    this.aideService.createAide(this.newAide).subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open('Aide créée avec succès', 'Fermer', { duration: 3000 });
          this.closeDialogs();
          this.loadAides();
          this.loadStats();
        }
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Erreur', 'Fermer', { duration: 3000 });
      }
    });
  }

  submitCategorie() {
    if (!this.newCategorie.nom || !this.newCategorie.type) {
      this.snackBar.open('Veuillez remplir tous les champs obligatoires', 'Fermer', { duration: 3000 });
      return;
    }

    const obs = this.editingCategorie
      ? this.aideService.updateCategorie(this.editingCategorie._id, this.newCategorie)
      : this.aideService.createCategorie(this.newCategorie);

    obs.subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open(this.editingCategorie ? 'Catégorie modifiée' : 'Catégorie créée', 'Fermer', { duration: 3000 });
          this.closeDialogs();
          this.loadCategories();
        }
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Erreur', 'Fermer', { duration: 3000 });
      }
    });
  }

  deleteCategorie(cat: CategorieAide) {
    if (!confirm(`Supprimer la catégorie "${cat.nom}" ?`)) return;

    this.aideService.deleteCategorie(cat._id).subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open('Catégorie supprimée', 'Fermer', { duration: 3000 });
          this.loadCategories();
        }
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Erreur', 'Fermer', { duration: 3000 });
      }
    });
  }

  initCategories() {
    if (!confirm('Initialiser les catégories par défaut ?')) return;

    this.aideService.initCategories().subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open('Catégories initialisées', 'Fermer', { duration: 3000 });
          this.loadCategories();
        }
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Erreur', 'Fermer', { duration: 3000 });
      }
    });
  }
}
