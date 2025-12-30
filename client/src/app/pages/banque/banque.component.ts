import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { BanqueService } from '../../services/banque.service';
import { TontineService } from '../../services/tontine.service';
import { CarteCodebafService } from '../../services/carte-codebaf.service';
import { SolidariteService } from '../../services/solidarite.service';
import { AuthService } from '../../services/auth.service';
import { BanqueTontine, Tontine, Transaction, TourRefuse, Member, CarteCodebafStats } from '../../models';

@Component({
  selector: 'app-banque',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatDialogModule,
    MatSnackBarModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatExpansionModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-left">
          <mat-icon class="page-icon">account_balance</mat-icon>
          <div>
            <h1>🏦 Banque centrale</h1>
            <p class="subtitle">Monitoring centralisé : Tontines, Solidarités et Cartes CODEBAF</p>
          </div>
        </div>
      </div>

      <!-- Sélection de la tontine -->
      <mat-card class="filter-card">
        <mat-card-content>
          <div class="filters-row">
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Vue</mat-label>
              <mat-select [value]="selectedView()" (selectionChange)="onViewChange($event.value)">
                <mat-option value="tontine">Tontine</mat-option>
                <mat-option value="solidarite">Solidarités</mat-option>
                <mat-option value="cartes">Cartes CODEBAF</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-field" *ngIf="selectedView() === 'tontine'">
              <mat-label>Sélectionner une tontine</mat-label>
              <mat-select [value]="selectedTontineId()" (selectionChange)="onTontineChange($event.value)">
                <mat-option *ngFor="let tontine of tontines()" [value]="tontine._id">{{ tontine.nom }}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-field" *ngIf="availableCycles().length > 0 && selectedView() === 'tontine'">
              <mat-label>Filtrer par cycle</mat-label>
              <mat-select [value]="selectedCycle()" (selectionChange)="selectedCycle.set($event.value)">
                <mat-option value="all">Tous les cycles</mat-option>
                <mat-option *ngFor="let cycle of availableCycles()" [value]="cycle">Cycle {{ cycle }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Main content -->
      @if (loading()) {
        <div class="loading-container">
          <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
          <p>Chargement...</p>
        </div>
      } @else {

        @if (selectedView() === 'tontine') {
          @if (selectedTontineId() && banque()) {
            <!-- Statistiques -->
            <div class="stats-grid">
              <mat-card class="stat-card solde">
                <mat-icon class="stat-icon">account_balance_wallet</mat-icon>
                <div class="stat-content">
                  <h3>{{ banque()!.soldeTotal | number:'1.0-0' }} FCFA</h3>
                  <p>Solde Total</p>
                </div>
              </mat-card>

              <mat-card class="stat-card cotisations">
                <mat-icon class="stat-icon">savings</mat-icon>
                <div class="stat-content">
                  <h3>{{ banque()!.soldeCotisations | number:'1.0-0' }} FCFA</h3>
                  <p>Solde Cotisations</p>
                </div>
              </mat-card>

              <mat-card class="stat-card refus clickable" (click)="showFondsRefusesDetails.set(!showFondsRefusesDetails())">
                <mat-icon class="stat-icon">money_off</mat-icon>
                <div class="stat-content">
                  <h3>{{ banque()!.soldeRefus | number:'1.0-0' }} FCFA</h3>
                  <p>Fonds Refusés</p>
                </div>
                <button mat-icon-button class="expand-button" [matTooltip]="showFondsRefusesDetails() ? 'Masquer les détails' : 'Voir les détails'">
                  <mat-icon>{{ showFondsRefusesDetails() ? 'expand_less' : 'expand_more' }}</mat-icon>
                </button>
              </mat-card>

              <mat-card class="stat-card total">
                <mat-icon class="stat-icon">trending_up</mat-icon>
                <div class="stat-content">
                  <h3>{{ banque()!.totalCotise | number:'1.0-0' }} FCFA</h3>
                  <p>Total Cotisé</p>
                </div>
              </mat-card>

              <mat-card class="stat-card distribue clickable" (click)="showDistribueDetails.set(!showDistribueDetails())">
                <mat-icon class="stat-icon">payments</mat-icon>
                <div class="stat-content">
                  <h3>{{ banque()!.totalDistribue | number:'1.0-0' }} FCFA</h3>
                  <p>Total Distribué</p>
                </div>
                <button mat-icon-button class="expand-button" [matTooltip]="showDistribueDetails() ? 'Masquer les détails' : 'Voir les détails'">
                  <mat-icon>{{ showDistribueDetails() ? 'expand_less' : 'expand_more' }}</mat-icon>
                </button>
              </mat-card>

              <mat-card class="stat-card tours-refus">
                <mat-icon class="stat-icon">block</mat-icon>
                <div class="stat-content">
                  <h3>{{ banque()!.toursRefuses.length }}</h3>
                  <p>Tours Refusés</p>
                </div>
              </mat-card>
            </div>

            <!-- Détails Total Distribué -->
            @if (showDistribueDetails() && toursPayes().length > 0) {
              <mat-card class="details-card distribue-details">
                <div class="details-header">
                  <div class="header-title">
                    <mat-icon>payments</mat-icon>
                    <h3>Détails du Total Distribué</h3>
                  </div>
                  <button mat-icon-button (click)="showDistribueDetails.set(false); $event.stopPropagation()">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
                <div class="details-content">
                  <div class="summary-row">
                    <span class="label">Nombre de tours payés:</span>
                    <span class="value">{{ toursPayes().length }}</span>
                  </div>
                  <div class="summary-row">
                    <span class="label">Montant total distribué:</span>
                    <span class="value highlight">{{ banque()!.totalDistribue | number:'1.0-0' }} FCFA</span>
                  </div>
                  <div class="summary-row">
                    <span class="label">Montant moyen par tour:</span>
                    <span class="value">{{ (banque()!.totalDistribue / toursPayes().length) | number:'1.0-0' }} FCFA</span>
                  </div>
                  <div class="divider"></div>
                  <h4>Liste des tours payés</h4>
                  <div class="tours-list">
                    @for (tour of toursPayes(); track tour._id) {
                      <div class="tour-item">
                        <div class="tour-info">
                          <mat-icon class="tour-icon">check_circle</mat-icon>
                          <div class="tour-details">
                            <span class="tour-number">Tour {{ tour.numeroTour }}</span>
                            <span class="beneficiaire">{{ getMemberName(tour.beneficiaire) }}</span>
                            <span class="date">{{ formatDate(tour.dateReceptionPrevue) }}</span>
                          </div>
                        </div>
                        <span class="montant-tour">{{ tour.montantRecu | number:'1.0-0' }} FCFA</span>
                      </div>
                    }
                  </div>
                </div>
              </mat-card>
            }

            <!-- Détails Fonds Refusés -->
            @if (showFondsRefusesDetails() && banque()!.toursRefuses.length > 0) {
              <mat-card class="details-card refus-details">
                <div class="details-header">
                  <div class="header-title">
                    <mat-icon>money_off</mat-icon>
                    <h3>Détails des Fonds Refusés</h3>
                  </div>
                  <button mat-icon-button (click)="showFondsRefusesDetails.set(false); $event.stopPropagation()">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
                <div class="details-content">
                  <div class="summary-row">
                    <span class="label">Nombre de tours refusés:</span>
                    <span class="value">{{ banque()!.toursRefuses.length }}</span>
                  </div>
                  <div class="summary-row">
                    <span class="label">Montant total refusé:</span>
                    <span class="value highlight">{{ banque()!.soldeRefus | number:'1.0-0' }} FCFA</span>
                  </div>
                  <div class="summary-row">
                    <span class="label">Montant moyen par refus:</span>
                    <span class="value">{{ (banque()!.soldeRefus / banque()!.toursRefuses.length) | number:'1.0-0' }} FCFA</span>
                  </div>
                  <div class="summary-row">
                    <span class="label">Statut redistribution:</span>
                    <span class="value" [ngClass]="banque()!.redistribue ? 'status-done' : 'status-pending'">
                      {{ banque()!.redistribue ? '✓ Redistribué' : '⏳ En attente' }}
                    </span>
                  </div>
                  <div class="divider"></div>
                  <h4>Liste des tours refusés</h4>
                  <div class="refus-items">
                    @for (refus of banque()!.toursRefuses; track refus.tour) {
                      <div class="refus-item-detail">
                        <div class="refus-info">
                          <mat-icon class="refus-icon">block</mat-icon>
                          <div class="refus-details-content">
                            <div class="refus-main">
                              <span class="beneficiaire-refus">{{ getMemberName(refus.beneficiaire) }}</span>
                              <span class="cycle-info">Cycle {{ refus.cycle }}</span>
                            </div>
                            <span class="date-refus">{{ formatDate(refus.dateRefus) }}</span>
                            @if (refus.raison) {
                              <span class="raison">{{ refus.raison }}</span>
                            }
                          </div>
                        </div>
                        <span class="montant-refus-detail">{{ refus.montant | number:'1.0-0' }} FCFA</span>
                      </div>
                    }
                  </div>

                  @if (!banque()!.redistribue && authService.hasRole('admin')) {
                    <div class="action-section">
                      <button mat-raised-button color="accent" (click)="openRedistributionDialog()">
                        <mat-icon>share</mat-icon>
                        Redistribuer les fonds ({{ banque()!.soldeRefus | number:'1.0-0' }} FCFA)
                      </button>
                    </div>
                  }
                </div>
              </mat-card>
            }

            <!-- Onglets -->
            <mat-tab-group>
              <!-- Transactions -->
              <mat-tab>
                <ng-template mat-tab-label>
                  <span class="tab-label-bold">Transactions ({{ filteredTransactions().length }})</span>
                </ng-template>
                <mat-card class="tab-content">
                  @if (filteredTransactions().length === 0) {
                    <div class="empty-state">
                      <mat-icon>receipt_long</mat-icon>
                      <h3>Aucune transaction</h3>
                      <p>Les transactions apparaîtront ici</p>
                    </div>
                  } @else {
                    <div class="table-container">
                      <table mat-table [dataSource]="filteredTransactions()" class="transactions-table">
                        <ng-container matColumnDef="date">
                          <th mat-header-cell *matHeaderCellDef>Date</th>
                          <td mat-cell *matCellDef="let transaction">{{ formatDate(transaction.date) }}</td>
                        </ng-container>
                        <ng-container matColumnDef="type">
                          <th mat-header-cell *matHeaderCellDef>Type</th>
                          <td mat-cell *matCellDef="let transaction">
                            <span class="type-chip" [ngClass]="'type-' + transaction.type">{{ getTypeLabel(transaction.type) }}</span>
                          </td>
                        </ng-container>
                        <ng-container matColumnDef="cycle">
                          <th mat-header-cell *matHeaderCellDef>Cycle</th>
                          <td mat-cell *matCellDef="let transaction"><span class="cycle-badge">{{ getCycleNumber(transaction) }}</span></td>
                        </ng-container>
                        <ng-container matColumnDef="description">
                          <th mat-header-cell *matHeaderCellDef>Description</th>
                          <td mat-cell *matCellDef="let transaction">{{ transaction.description || '-' }}</td>
                        </ng-container>
                        <ng-container matColumnDef="montant">
                          <th mat-header-cell *matHeaderCellDef>Montant</th>
                          <td mat-cell *matCellDef="let transaction">
                            <span [ngClass]="transaction.montant >= 0 ? 'montant-positif' : 'montant-negatif'">{{ transaction.montant >= 0 ? '+' : '' }}{{ transaction.montant | number:'1.0-0' }} FCFA</span>
                          </td>
                        </ng-container>
                        <ng-container matColumnDef="effectuePar">
                          <th mat-header-cell *matHeaderCellDef>Effectué par</th>
                          <td mat-cell *matCellDef="let transaction">{{ getUserName(transaction.effectuePar) }}</td>
                        </ng-container>

                        <tr mat-header-row *matHeaderRowDef="transactionColumns"></tr>
                        <tr mat-row *matRowDef="let row; columns: transactionColumns;"></tr>
                      </table>
                    </div>
                  }
                </mat-card>
              </mat-tab>

              <!-- Tours Refusés -->
              <mat-tab>
                <ng-template mat-tab-label>
                  <span class="tab-label-bold">Tours Refusés ({{ banque()!.toursRefuses.length }})</span>
                </ng-template>
                <mat-card class="tab-content">
                  @if (banque()!.toursRefuses.length === 0) {
                    <div class="empty-state">
                      <mat-icon>check_circle</mat-icon>
                      <h3>Aucun tour refusé</h3>
                      <p>Tous les membres ont accepté leurs tours</p>
                    </div>
                  } @else {
                    <div class="refus-list">
                      @for (refus of banque()!.toursRefuses; track refus.tour) {
                        <mat-expansion-panel>
                          <mat-expansion-panel-header>
                            <mat-panel-title>
                              <div class="refus-header">
                                <mat-icon>block</mat-icon>
                                <span class="beneficiaire-name">{{ getMemberName(refus.beneficiaire) }}</span>
                                <span class="montant-refus">{{ refus.montant | number:'1.0-0' }} FCFA</span>
                              </div>
                            </mat-panel-title>
                            <mat-panel-description>
                              <span class="cycle-badge">Cycle {{ refus.cycle }}</span>
                              <span class="date-refus">{{ formatDate(refus.dateRefus) }}</span>
                            </mat-panel-description>
                          </mat-expansion-panel-header>

                          <div class="refus-details">
                            @if (refus.raison) {
                              <div class="detail-row">
                                <mat-icon>info</mat-icon>
                                <span><strong>Raison:</strong> {{ refus.raison }}</span>
                              </div>
                            }
                            <div class="detail-row">
                              <mat-icon>calendar_today</mat-icon>
                              <span><strong>Date du refus:</strong> {{ formatDate(refus.dateRefus) }}</span>
                            </div>
                          </div>
                        </mat-expansion-panel>
                      }
                    </div>

                    @if (!banque()!.redistribue && authService.hasRole('admin')) {
                      <div class="redistribution-section">
                        <button mat-raised-button color="primary" (click)="openRedistributionDialog()">
                          <mat-icon>share</mat-icon>
                          Redistribuer les fonds ({{ banque()!.soldeRefus | number:'1.0-0' }} FCFA)
                        </button>
                      </div>
                    }
                  }
                </mat-card>
              </mat-tab>

              <!-- Redistribution -->
              <mat-tab>
                <ng-template mat-tab-label>
                  <span class="tab-label-bold">Redistribution</span>
                </ng-template>
                <mat-card class="tab-content">
                  @if (!banque()!.redistribue) {
                    <div class="empty-state">
                      <mat-icon>pending_actions</mat-icon>
                      <h3>Redistribution en attente</h3>
                      <p>Les fonds refusés n'ont pas encore été redistribués</p>
                      @if (banque()!.soldeRefus > 0 && authService.hasRole('admin')) {
                        <button mat-raised-button color="primary" (click)="openRedistributionDialog()">
                          <mat-icon>share</mat-icon>
                          Redistribuer {{ banque()!.soldeRefus | number:'1.0-0' }} FCFA
                        </button>
                      }
                    </div>
                  } @else {
                    <div class="redistribution-info">
                      <div class="info-header">
                        <mat-icon class="success-icon">check_circle</mat-icon>
                        <h3>Redistribution effectuée</h3>
                        <p>{{ formatDate(banque()!.dateRedistribution!) }}</p>
                      </div>

                      <div class="beneficiaires-list">
                        @for (beneficiaire of banque()!.beneficiairesRedistribution; track beneficiaire.membre) {
                          <div class="beneficiaire-item">
                            <div class="beneficiaire-info">
                              <mat-icon>person</mat-icon>
                              <span>{{ getMemberName(beneficiaire.membre) }}</span>
                            </div>
                            <span class="montant-redistribue">{{ beneficiaire.montant | number:'1.0-0' }} FCFA</span>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </mat-card>
              </mat-tab>
            </mat-tab-group>
          } @else {
            <mat-card>
              <div class="empty-state">
                <mat-icon>info</mat-icon>
                <h3>Sélectionnez une tontine</h3>
                <p>Aucune tontine sélectionnée ou données indisponibles.</p>
              </div>
            </mat-card>
          }

        }

        @else if (selectedView() === 'solidarite') {
          <mat-card class="tab-content solidarites-tab">
            @if (loadingSolidarites()) {
              <div class="loading-container small"><mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner></div>
            } @else {
              @if (stats()) {
                <div class="stats-grid">
                  <mat-card class="stat-card total-card">
                    <mat-icon class="stat-icon">account_balance_wallet</mat-icon>
                    <div class="stat-content">
                      <h3>{{ stats()!.totalGlobal.totalCollecte | number:'1.0-0' }} FCFA</h3>
                      <p>Total Collecté</p>
                      <span class="stat-badge">{{ stats()!.totalGlobal.tauxCollecte }}% collecté</span>
                    </div>
                  </mat-card>

                  @for (entry of statsEntries(); track entry.key) {
                    <mat-card class="stat-card" [ngClass]="'type-' + entry.key">
                      <mat-icon class="stat-icon">payments</mat-icon>
                      <div class="stat-content">
                        <h3>{{ entry.value.totalCollecte | number:'1.0-0' }} FCFA</h3>
                        <p>{{ entry.value.libelle }}</p>
                        <mat-progress-bar mode="determinate" [value]="entry.value.tauxCollecte"></mat-progress-bar>
                        <span class="progress-label">{{ entry.value.tauxCollecte }}%</span>
                      </div>
                    </mat-card>
                  }
                </div>

                <div class="summary-chips">
                  <mat-chip-set>
                    <mat-chip color="primary" highlighted>
                      <mat-icon>people</mat-icon>
                      {{ stats()!.totalMembres }} membres
                    </mat-chip>
                    <mat-chip class="chip-success">
                      <mat-icon>check_circle</mat-icon>
                      {{ membresAJour().length }} à jour
                    </mat-chip>
                    <mat-chip class="chip-danger">
                      <mat-icon>warning</mat-icon>
                      {{ membresEnRetard().length }} en retard
                    </mat-chip>
                  </mat-chip-set>
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>inbox</mat-icon>
                  <p>Aucune statistique disponible</p>
                </div>
              }
            }
          </mat-card>

        } @else {
          <!-- Cartes view -->
          <mat-card class="tab-content codebaf-tab">
            @if (loadingCartes()) {
              <div class="loading-container small">
                <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
              </div>
            } @else {
              <div class="codebaf-summary">
                <div class="codebaf-header">
                  <h3>💳 Fonds des Cartes de Développement CODEBAF</h3>
                  <button mat-raised-button color="primary" routerLink="/cartes-codebaf">
                    <mat-icon>open_in_new</mat-icon>
                    Gérer les cartes
                  </button>
                </div>

                <div class="codebaf-stats-grid">
                  <div class="codebaf-stat total">
                    <mat-icon>credit_card</mat-icon>
                    <div class="stat-info">
                      <span class="stat-value">{{ cartesStats()?.global?.totalCartes || 0 }}</span>
                      <span class="stat-label">Total Cartes</span>
                    </div>
                  </div>
                  <div class="codebaf-stat attendu">
                    <mat-icon>account_balance_wallet</mat-icon>
                    <div class="stat-info">
                      <span class="stat-value">{{ (cartesStats()?.global?.totalMontantAttendu || 0) | number:'1.0-0' }}</span>
                      <span class="stat-label">Montant Attendu (FCFA)</span>
                    </div>
                  </div>
                  <div class="codebaf-stat paye">
                    <mat-icon>payments</mat-icon>
                    <div class="stat-info">
                      <span class="stat-value">{{ (cartesStats()?.global?.totalMontantPaye || 0) | number:'1.0-0' }}</span>
                      <span class="stat-label">Montant Encaissé (FCFA)</span>
                    </div>
                  </div>
                  <div class="codebaf-stat restant">
                    <mat-icon>pending</mat-icon>
                    <div class="stat-info">
                      <span class="stat-value">{{ (cartesStats()?.global?.totalMontantRestant || 0) | number:'1.0-0' }}</span>
                      <span class="stat-label">Montant Restant (FCFA)</span>
                    </div>
                  </div>
                </div>

                <div class="codebaf-progress-section">
                  <div class="progress-header">
                    <span>Taux de recouvrement</span>
                    <span class="taux">{{ cartesStats()?.global?.tauxRecouvrement || 0 }}%</span>
                  </div>
                  <mat-progress-bar mode="determinate" [value]="parseFloat(cartesStats()?.global?.tauxRecouvrement || '0')"></mat-progress-bar>
                </div>
              </div>
            }
          </mat-card>
        }
      }
    </div>
  `,
  styles: [`
    .page-container { padding: 32px; max-width: 1400px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .page-icon { font-size: 48px; width: 48px; height: 48px; color: #2563eb; }
    h1 { font-size: 32px; font-weight: 700; margin: 0; }
    .subtitle { font-size: 16px; color: var(--text-secondary); margin: 4px 0 0 0; }
    
    /* Filter Card - Haute visibilité */
    .filter-card { 
      margin-bottom: 24px; 
      border-left: 4px solid #667eea; 
      background-color: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #667eea;
    }
    .filters-row { display: flex; gap: 20px; flex-wrap: wrap; }
    .filter-field { flex: 1; min-width: 250px; }
    
    /* Form Field Labels - Très visible */
    ::ng-deep .filter-card .mat-mdc-form-field {
      min-width: 250px;
    }
    
    ::ng-deep .mat-mdc-form-field .mat-mdc-floating-label {
      color: #0f172a !important;
      font-weight: 700 !important;
      font-size: 16px !important;
    }
    
    ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-floating-label {
      color: #2563eb !important;
    }
    
    ::ng-deep .mat-mdc-select-value-text {
      color: #0f172a !important;
      font-weight: 600 !important;
      font-size: 15px !important;
    }
    
    /* Options du dropdown - Fond blanc, texte sombre */
    ::ng-deep .mat-mdc-select-panel {
      background-color: #ffffff !important;
    }

    ::ng-deep .mat-mdc-option {
      background-color: #ffffff !important;
    }

    ::ng-deep .mat-mdc-option .mdc-list-item__primary-text {
      color: #1e293b !important;
      font-weight: 500 !important;
      font-size: 14px !important;
    }

    ::ng-deep .mat-mdc-option:hover {
      background-color: #e0f2fe !important;
    }

    ::ng-deep .mat-mdc-option.mdc-list-item--selected {
      background-color: #dbeafe !important;
    }

    ::ng-deep .mat-mdc-option.mdc-list-item--selected .mdc-list-item__primary-text {
      color: #1d4ed8 !important;
      font-weight: 600 !important;
    }
    
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 32px; }
    .stat-card { display: flex; align-items: center; gap: 16px; padding: 24px !important; border-left: 4px solid; }
    .stat-card.solde { border-left-color: #2563eb; }
    .stat-card.cotisations { border-left-color: #10b981; }
    .stat-card.refus { border-left-color: #ef4444; }
    .stat-card.total { border-left-color: #8b5cf6; }
    .stat-card.distribue { border-left-color: #f59e0b; }
    .stat-card.tours-refus { border-left-color: #ec4899; }
    .stat-card.clickable { cursor: pointer; position: relative; transition: transform 0.2s; }
    .stat-card.clickable:hover { transform: translateY(-2px); }
    .expand-button { position: absolute; top: 8px; right: 8px; }
    .stat-icon { font-size: 40px; width: 40px; height: 40px; }
    .stat-content h3 { margin: 0; font-size: 24px; font-weight: 700; }
    .stat-content p { margin: 4px 0 0 0; font-size: 14px; color: var(--text-secondary); }
    
    /* Tabs - Labels très visibles */
    ::ng-deep .mat-mdc-tab-labels {
      background-color: #f8fafc;
      border-radius: 8px;
      padding: 4px;
    }
    
    ::ng-deep .mat-mdc-tab {
      min-width: 200px !important;
    }
    
    ::ng-deep .mat-mdc-tab .mdc-tab__text-label {
      color: #1e293b !important;
      font-weight: 700 !important;
      font-size: 15px !important;
      letter-spacing: 0.3px;
    }
    
    ::ng-deep .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label {
      color: #2563eb !important;
    }
    
    ::ng-deep .mat-mdc-tab .mat-icon {
      color: #475569 !important;
      margin-right: 8px;
    }
    
    ::ng-deep .mat-mdc-tab.mdc-tab--active .mat-icon {
      color: #2563eb !important;
    }
    
    .tab-label-bold { 
      font-weight: 700 !important; 
      font-size: 16px !important; 
      color: #0f172a !important;
      letter-spacing: 0.3px;
    }
    
    .tab-content { margin-top: 16px; min-height: 400px; border: 1px solid #e2e8f0; }
    .table-container { overflow-x: auto; }
    .transactions-table { width: 100%; }
    
    /* Table Headers - Haute visibilité */
    ::ng-deep .mat-mdc-header-cell {
      background-color: #1e293b !important;
      color: #ffffff !important;
      font-weight: 700 !important;
      font-size: 14px !important;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 16px 12px !important;
    }

    ::ng-deep .mat-mdc-cell {
      color: #1e293b !important;
      font-size: 14px !important;
      padding: 12px !important;
    }

    ::ng-deep .mat-mdc-row:nth-child(even) {
      background-color: #f8fafc;
    }

    ::ng-deep .mat-mdc-row:hover {
      background-color: #e0f2fe !important;
    }
    
    .type-chip { display: inline-block; padding: 6px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; color: white; }
    .type-cotisation { background: #10b981; }
    .type-paiement_tour { background: #f59e0b; }
    .type-refus_tour { background: #ef4444; }
    .type-redistribution { background: #8b5cf6; }
    .type-ajustement { background: #6b7280; }
    
    .montant-positif { color: #10b981; font-weight: 700; font-size: 15px; }
    .montant-negatif { color: #ef4444; font-weight: 700; font-size: 15px; }
    
    .cycle-badge { background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 700; }
    
    /* Expansion Panel - Tours Refusés */
    ::ng-deep .mat-expansion-panel-header-title {
      color: #0f172a !important;
      font-weight: 600 !important;
    }
    
    ::ng-deep .mat-expansion-panel-header-description {
      color: #475569 !important;
    }
    
    .refus-list { display: flex; flex-direction: column; gap: 12px; }
    .refus-header { display: flex; align-items: center; gap: 12px; flex: 1; }
    .beneficiaire-name { font-weight: 700; flex: 1; color: #0f172a; font-size: 15px; }
    .montant-refus { color: #ef4444; font-weight: 700; font-family: monospace; font-size: 16px; }
    .date-refus { color: #475569; font-size: 14px; font-weight: 500; }
    .refus-details { padding: 16px; background: #f9fafb; border-radius: 8px; }
    .detail-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .detail-row:last-child { margin-bottom: 0; }
    .detail-row mat-icon { color: #2563eb; }
    .detail-row span { color: #1e293b; font-size: 14px; }
    .detail-row strong { color: #0f172a; }
    
    /* Redistribution Section - Très visible */
    .redistribution-section, .action-section { 
      margin-top: 24px; 
      padding: 24px; 
      border-top: 3px solid #8b5cf6; 
      text-align: center; 
      background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
      border-radius: 8px;
    }
    
    .redistribution-section button, .action-section button {
      font-size: 16px !important;
      font-weight: 700 !important;
      padding: 12px 24px !important;
    }
    
    .redistribution-info { padding: 24px; }
    .info-header { text-align: center; margin-bottom: 32px; }
    .info-header .success-icon { font-size: 64px; width: 64px; height: 64px; color: #10b981; margin-bottom: 16px; }
    .info-header h3 { margin: 0 0 8px 0; font-size: 24px; color: #0f172a; }
    .info-header p { color: #475569; font-size: 15px; }
    
    .beneficiaires-list { display: flex; flex-direction: column; gap: 12px; }
    .beneficiaire-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #10b981; }
    .beneficiaire-info { display: flex; align-items: center; gap: 12px; }
    .beneficiaire-info mat-icon { color: #2563eb; }
    .beneficiaire-info span { font-weight: 700; color: #0f172a; font-size: 15px; }
    .montant-redistribue { color: #10b981; font-weight: 700; font-family: monospace; font-size: 16px; }
    
    .empty-state { text-align: center; padding: 60px 20px; color: #475569; }
    .empty-state mat-icon { font-size: 80px; width: 80px; height: 80px; margin-bottom: 20px; opacity: 0.5; }
    .empty-state h3 { font-size: 24px; margin: 0 0 8px 0; color: #1e293b; }
    .empty-state p { margin: 0 0 24px 0; color: #475569; }
    
    .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 20px; }
    
    .details-card { margin-bottom: 24px; animation: slideDown 0.3s ease-out; }
    .details-card.distribue-details { border-left: 4px solid #f59e0b; }
    .details-card.refus-details { border-left: 4px solid #ef4444; }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    
    .details-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 2px solid var(--border-color); background: #f9fafb; }
    .header-title { display: flex; align-items: center; gap: 12px; }
    .header-title mat-icon { color: #2563eb; font-size: 28px; width: 28px; height: 28px; }
    .header-title h3 { margin: 0; font-size: 18px; font-weight: 700; color: #0f172a; }
    .details-content { padding: 24px; }
    
    .summary-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color); }
    .summary-row:last-of-type { border-bottom: none; }
    .summary-row .label { font-size: 15px; color: #475569; font-weight: 500; }
    .summary-row .value { font-size: 16px; font-weight: 700; color: #0f172a; }
    .summary-row .value.highlight { color: #2563eb; font-size: 18px; }
    .summary-row .value.status-done { color: #10b981; }
    .summary-row .value.status-pending { color: #f59e0b; }
    
    .divider { height: 2px; background: var(--border-color); margin: 24px 0; }
    h4 { font-size: 18px; font-weight: 700; margin: 0 0 16px 0; color: #0f172a; }
    
    .tours-list, .refus-items { display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; }
    .tour-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981; }
    .tour-info, .refus-info { display: flex; align-items: center; gap: 12px; flex: 1; }
    .tour-icon { color: #10b981; }
    .tour-details, .refus-details-content { display: flex; flex-direction: column; gap: 4px; }
    .tour-number { font-weight: 700; font-size: 15px; color: #065f46; }
    .beneficiaire, .date { font-size: 13px; color: #475569; }
    .montant-tour { font-weight: 700; font-size: 16px; color: #10b981; font-family: monospace; }
    
    .refus-item-detail { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444; }
    .refus-icon { color: #ef4444; }
    .refus-main { display: flex; align-items: center; gap: 12px; }
    .beneficiaire-refus { font-weight: 700; font-size: 15px; color: #991b1b; }
    .cycle-info { background: #fecaca; color: #991b1b; padding: 2px 8px; border-radius: 8px; font-size: 12px; font-weight: 600; }
    .raison { font-size: 14px; font-style: italic; margin-top: 4px; color: #475569; }
    .montant-refus-detail { font-weight: 700; font-size: 16px; color: #ef4444; font-family: monospace; }

    /* Styles Cartes CODEBAF */
    .codebaf-tab { padding: 0 !important; }
    .codebaf-summary { padding: 24px; }
    .codebaf-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .codebaf-header h3 { margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; }

    .codebaf-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .codebaf-stat { display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 12px; background: #f9fafb; border-left: 4px solid; }
    .codebaf-stat.total { border-left-color: #8b5cf6; }
    .codebaf-stat.attendu { border-left-color: #2563eb; }
    .codebaf-stat.paye { border-left-color: #10b981; }
    .codebaf-stat.restant { border-left-color: #f59e0b; }
    .codebaf-stat mat-icon { font-size: 32px; width: 32px; height: 32px; color: #475569; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 20px; font-weight: 700; color: #0f172a; }
    .stat-label { font-size: 12px; color: #6b7280; }

    .codebaf-progress-section { margin-bottom: 24px; padding: 16px; background: #f0f9ff; border-radius: 12px; }
    .progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .progress-header span { font-weight: 500; color: #475569; }
    .progress-header .taux { font-size: 24px; font-weight: 700; color: #2563eb; }
    ::ng-deep .codebaf-progress-section .mat-mdc-progress-bar { height: 12px; border-radius: 6px; }
    ::ng-deep .codebaf-progress-section .mdc-linear-progress__bar-inner { background-color: #10b981 !important; }

    .types-section { margin-bottom: 24px; }
    .types-section h4 { font-size: 16px; font-weight: 700; margin: 0 0 16px 0; color: #0f172a; }
    .types-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .type-stat { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 8px; cursor: pointer; transition: transform 0.2s; }
    .type-stat:hover { transform: translateY(-2px); }
    .type-stat.type-classique { background: #f3f4f6; }
    .type-stat.type-bronze { background: #fef3c7; }
    .type-stat.type-silver { background: #e5e7eb; }
    .type-stat.type-gold { background: #fef9c3; }
    .type-emoji { font-size: 28px; }
    .type-info { display: flex; flex-direction: column; gap: 2px; }
    .type-name { font-weight: 600; color: #0f172a; font-size: 14px; }
    .type-count { font-size: 12px; color: #6b7280; }
    .type-montant { font-size: 11px; color: #475569; font-weight: 500; }

    .derniers-paiements-section h4 { font-size: 16px; font-weight: 700; margin: 0 0 16px 0; color: #0f172a; }
    .paiements-list { display: flex; flex-direction: column; gap: 8px; }
    .paiement-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #10b981; }
    .paiement-left { display: flex; align-items: center; gap: 12px; }
    .paiement-type-badge { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 18px; }
    .paiement-type-badge.classique { background: #f3f4f6; }
    .paiement-type-badge.bronze { background: #fef3c7; }
    .paiement-type-badge.silver { background: #e5e7eb; }
    .paiement-type-badge.gold { background: #fef9c3; }
    .paiement-details { display: flex; flex-direction: column; gap: 2px; }
    .paiement-membre { font-weight: 600; font-size: 14px; color: #0f172a; }
    .paiement-date { font-size: 12px; color: #6b7280; }
    .paiement-montant { font-weight: 700; font-family: monospace; font-size: 15px; }
    .paiement-montant.success { color: #10b981; }
    .loading-container.small { padding: 40px; }

    /* Solidarite summary styling (match Solidarite page) */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card { display: flex; align-items: center; padding: 20px; gap: 16px; }
    .stat-icon { font-size: 40px; width: 40px; height: 40px; opacity: 0.8; }
    .stat-content h3 { margin: 0; font-size: 24px; font-weight: 600; }
    .stat-content p { margin: 4px 0; color: #64748b; font-size: 14px; }
    .stat-badge { display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 12px; background: rgba(0,0,0,0.1); }
    .total-card { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; }
    .total-card .stat-icon, .total-card .stat-content p { color: rgba(255,255,255,0.8); }
    .total-card .stat-badge { background: rgba(255,255,255,0.2); }
    .type-repas { border-left: 4px solid #10b981; }
    .type-membre { border-left: 4px solid #f59e0b; }
    .type-assurance_rapatriement { border-left: 4px solid #8b5cf6; }
    mat-progress-bar { margin-top: 8px; border-radius: 4px; }
    .progress-label { font-size: 12px; color: #64748b; }
    .summary-chips { margin-bottom: 24px; }
    .summary-chips mat-chip-set { display: flex; gap: 8px; }
    .chip-success { background-color: #10b981 !important; color: white !important; }
    .chip-danger { background-color: #ef4444 !important; color: white !important; }
    .chip-neutral { background-color: #94a3b8 !important; color: white !important; }
    .chip-small { font-size: 12px !important; min-height: 24px !important; padding: 0 8px !important; }
  `]
})
export class BanqueComponent implements OnInit {
    private carteCodebafService = inject(CarteCodebafService);
    cartesStats = signal<CarteCodebafStats | null>(null);
    loadingCartes = signal(false);
    selectedView = signal<'tontine'|'solidarite'|'cartes'>('tontine');
  // Solidarites
  solidarites = signal<any[] | null>(null);
  loadingSolidarites = signal(false);
  private solidariteService = inject(SolidariteService);
  // Reuse service signals for detailed summary
  stats = this.solidariteService.stats;
  statuts = this.solidariteService.statuts;
  configs = this.solidariteService.configs;

  statsEntries = computed(() => {
    const s = this.stats();
    if (!s) return [];
    return Object.entries(s.solidarites).map(([key, value]) => ({ key, value }));
  });

  membresAJour = computed(() => {
    return this.statuts().filter((st: any) => Object.values(st.solidarites).every((sol: any) => sol.statut === 'a_jour'));
  });

  membresEnRetard = computed(() => {
    return this.statuts().filter((st: any) => Object.values(st.solidarites).some((sol: any) => sol.statut === 'en_retard'));
  });
  private banqueService = inject(BanqueService);
  private tontineService = inject(TontineService);
  authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  loading = signal(false);
  tontines = signal<Tontine[]>([]);
  selectedTontineId = signal<string | null>(null);
  banque = signal<BanqueTontine | null>(null);
  showDistribueDetails = signal(false);
  showFondsRefusesDetails = signal(false);
  selectedCycle = signal<number | 'all'>('all');
  availableCycles = computed(() => {
    const tontine = this.tontines().find(t => t._id === this.selectedTontineId());
    if (!tontine || !tontine.totalCycles) return [];
    return Array.from({ length: tontine.totalCycles }, (_, i) => i + 1);
  });

  transactionColumns = ['date', 'type', 'cycle', 'description', 'montant', 'effectuePar'];

  // Computed pour extraire les tours payés des transactions
  toursPayes = computed(() => {
    const banqueData = this.banque();
    if (!banqueData) return [];
    
    return banqueData.transactions
      .filter((t: Transaction) => t.type === 'paiement_tour' && t.tour && typeof t.tour !== 'string')
      .map((t: Transaction) => {
        const tour = t.tour as any; // Tour object
        return {
          _id: tour._id,
          numeroTour: tour.numeroTour,
          beneficiaire: tour.beneficiaire,
          montantRecu: Math.abs(t.montant),
          dateReceptionPrevue: tour.dateReceptionPrevue,
          datePaiement: t.date
        };
      })
      .sort((a, b) => a.numeroTour - b.numeroTour);
  });

  // Computed pour filtrer les transactions par cycle
  filteredTransactions = computed(() => {
    const banqueData = this.banque();
    const cycle = this.selectedCycle();
    if (!banqueData) return [];
    if (cycle === 'all') return banqueData.transactions;
    
    // Filtrer les transactions qui appartiennent au cycle sélectionné
    return banqueData.transactions.filter((t: Transaction) => {
      // Les transactions de type paiement_tour et refus_tour ont une référence au tour qui contient le cycle
      if ((t.type === 'paiement_tour' || t.type === 'refus_tour') && t.tour && typeof t.tour !== 'string') {
        const tour = t.tour as any;
        return tour.numeroTour === cycle;
      }
      // Les cotisations et autres transactions sont affichées dans tous les cycles
      return t.type === 'cotisation' || t.type === 'ajustement';
    });
  });

  ngOnInit() {
    this.loadTontines();
    this.loadCartesStats();
    this.loadSolidaritesStats();
  }

  onViewChange(view: 'tontine'|'solidarite'|'cartes') {
    this.selectedView.set(view);
    if (view === 'solidarite') {
      this.loadSolidaritesStats();
    } else if (view === 'cartes') {
      this.loadCartesStats();
    }
  }

  loadTontines() {
    this.tontineService.getTontines().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tontines.set(response.data);
          if (response.data.length > 0) {
            this.selectedTontineId.set(response.data[0]._id);
            this.loadBanque(response.data[0]._id);
          }
        }
      },
      error: (error) => {
        console.error('Erreur:', error);
        this.snackBar.open('Erreur lors du chargement des tontines', 'Fermer', { duration: 3000 });
      }
    });
  }

  onTontineChange(tontineId: string) {
    this.selectedTontineId.set(tontineId);
    this.selectedCycle.set('all'); // Réinitialiser le filtre de cycle
    this.loadBanque(tontineId);
    this.loadCartesStats();
  }
  loadCartesStats() {
    this.loadingCartes.set(true);
    this.carteCodebafService.getStatistiques().subscribe({
      next: (response) => {
        this.loadingCartes.set(false);
        if (response.success && response.data) {
          this.cartesStats.set(response.data);
        }
      },
      error: (error) => {
        this.loadingCartes.set(false);
        this.cartesStats.set(null);
      }
    });
  }

  loadSolidaritesStats() {
    this.loadingSolidarites.set(true);
    // Load both stats and statuts so we can display the same summary as the Solidarite page
    this.solidariteService.getStats().subscribe({
      next: () => this.loadingSolidarites.set(false),
      error: () => this.loadingSolidarites.set(false)
    });

    this.solidariteService.getStatuts().subscribe({
      next: () => this.loadingSolidarites.set(false),
      error: () => this.loadingSolidarites.set(false)
    });
  }

  getTypeEmoji(type: string): string {
    const emojis: { [key: string]: string } = {
      'classique': '🏷️',
      'bronze': '🥉',
      'silver': '🥈',
      'gold': '🥇'
    };
    return emojis[type] || '🏷️';
  }

  getTypeName(type: string): string {
    const labels: { [key: string]: string } = {
      'classique': 'Classique',
      'bronze': 'Bronze',
      'silver': 'Silver',
      'gold': 'Gold'
    };
    return labels[type] || type;
  }

  parseFloat(val: string): number {
    return Number.parseFloat(val);
  }

  loadBanque(tontineId: string) {
    this.loading.set(true);
    this.banqueService.getBanqueTontine(tontineId).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success && response.data) {
          this.banque.set(response.data);
        }
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Erreur:', error);
        this.snackBar.open('Erreur lors du chargement de la banque', 'Fermer', { duration: 3000 });
      }
    });
  }

  openRedistributionDialog() {
    // TODO: Implémenter le dialogue de redistribution
    this.snackBar.open('Fonctionnalité en cours de développement', 'Fermer', { duration: 3000 });
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'cotisation': 'Cotisation',
      'paiement_tour': 'Paiement',
      'refus_tour': 'Refus',
      'redistribution': 'Redistribution',
      'ajustement': 'Ajustement'
    };
    return labels[type] || type;
  }

  getUserName(user: any): string {
    if (!user) return '-';
    if (typeof user === 'string') return user;
    return `${user.nom} ${user.prenom}`;
  }

  getMemberName(member: any): string {
    if (!member) return 'Inconnu';
    if (typeof member === 'string') return member;
    return `${member.nom} ${member.prenom}`;
  }

  getCycleNumber(transaction: Transaction): string {
    // Pour les paiements de tour et refus, extraire le numéro du tour
    if ((transaction.type === 'paiement_tour' || transaction.type === 'refus_tour') && transaction.tour) {
      if (typeof transaction.tour !== 'string') {
        const tour = transaction.tour as any;
        return tour.numeroTour ? `${tour.numeroTour}` : '-';
      }
    }
    // Pour les cotisations et ajustements, afficher "Général"
    return 'Général';
  }
}
