import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { BanqueService } from '../../services/banque.service';
import { TontineService } from '../../services/tontine.service';
import { AuthService } from '../../services/auth.service';
import { BanqueTontine, Tontine, Transaction, TourRefuse, Member } from '../../models';

@Component({
  selector: 'app-banque',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatChipsModule,
    MatProgressSpinnerModule,
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
            <h1>🏦 Banque Tontine</h1>
            <p class="subtitle">Gestion des fonds et redistribution</p>
          </div>
        </div>
      </div>

      <!-- Sélection de la tontine -->
      <mat-card class="filter-card">
        <mat-card-content>
          <div class="filters-row">
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Sélectionner une tontine</mat-label>
              <mat-select [value]="selectedTontineId()" (selectionChange)="onTontineChange($event.value)">
                @for (tontine of tontines(); track tontine._id) {
                  <mat-option [value]="tontine._id">{{ tontine.nom }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            @if (availableCycles().length > 0) {
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Filtrer par cycle</mat-label>
                <mat-select [value]="selectedCycle()" (selectionChange)="selectedCycle.set($event.value)">
                  <mat-option value="all">Tous les cycles</mat-option>
                  @for (cycle of availableCycles(); track cycle) {
                    <mat-option [value]="cycle">Cycle {{ cycle }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }
          </div>
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <div class="loading-container">
          <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
          <p>Chargement...</p>
        </div>
      } @else if (selectedTontineId() && banque()) {
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
                      <td mat-cell *matCellDef="let transaction">
                        {{ formatDate(transaction.date) }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="type">
                      <th mat-header-cell *matHeaderCellDef>Type</th>
                      <td mat-cell *matCellDef="let transaction">
                        <span class="type-chip" [ngClass]="'type-' + transaction.type">
                          {{ getTypeLabel(transaction.type) }}
                        </span>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="cycle">
                      <th mat-header-cell *matHeaderCellDef>Cycle</th>
                      <td mat-cell *matCellDef="let transaction">
                        <span class="cycle-badge">{{ getCycleNumber(transaction) }}</span>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="description">
                      <th mat-header-cell *matHeaderCellDef>Description</th>
                      <td mat-cell *matCellDef="let transaction">
                        {{ transaction.description || '-' }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="montant">
                      <th mat-header-cell *matHeaderCellDef>Montant</th>
                      <td mat-cell *matCellDef="let transaction">
                        <span [ngClass]="transaction.montant >= 0 ? 'montant-positif' : 'montant-negatif'">
                          {{ transaction.montant >= 0 ? '+' : '' }}{{ transaction.montant | number:'1.0-0' }} FCFA
                        </span>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="effectuePar">
                      <th mat-header-cell *matHeaderCellDef>Effectué par</th>
                      <td mat-cell *matCellDef="let transaction">
                        {{ getUserName(transaction.effectuePar) }}
                      </td>
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
      } @else if (selectedTontineId()) {
        <div class="empty-state">
          <mat-icon>account_balance</mat-icon>
          <h3>Banque non trouvée</h3>
          <p>Aucune donnée bancaire pour cette tontine</p>
        </div>
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
    
    .filter-card { margin-bottom: 24px; border-left: 4px solid #667eea; }
    .filters-row { display: flex; gap: 20px; flex-wrap: wrap; }
    .filter-field { flex: 1; min-width: 250px; }
    
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
    
    .tab-content { margin-top: 16px; min-height: 400px; }
    .table-container { overflow-x: auto; }
    .transactions-table { width: 100%; }
    
    .type-chip { display: inline-block; padding: 6px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; color: white; }
    .type-cotisation { background: #10b981; }
    .type-paiement_tour { background: #f59e0b; }
    .type-refus_tour { background: #ef4444; }
    .type-redistribution { background: #8b5cf6; }
    .type-ajustement { background: #6b7280; }
    
    .montant-positif { color: #10b981; font-weight: 600; }
    .montant-negatif { color: #ef4444; font-weight: 600; }
    
    .cycle-badge { background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    
    .refus-list { display: flex; flex-direction: column; gap: 12px; }
    .refus-header { display: flex; align-items: center; gap: 12px; flex: 1; }
    .beneficiaire-name { font-weight: 600; flex: 1; }
    .montant-refus { color: #ef4444; font-weight: 700; font-family: monospace; }
    .date-refus { color: var(--text-secondary); font-size: 14px; }
    .refus-details { padding: 16px; background: #f9fafb; border-radius: 8px; }
    .detail-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .detail-row:last-child { margin-bottom: 0; }
    .detail-row mat-icon { color: #2563eb; }
    
    .redistribution-section, .action-section { margin-top: 24px; padding-top: 24px; border-top: 2px solid var(--border-color); text-align: center; }
    .redistribution-info { padding: 24px; }
    .info-header { text-align: center; margin-bottom: 32px; }
    .info-header .success-icon { font-size: 64px; width: 64px; height: 64px; color: #10b981; margin-bottom: 16px; }
    .info-header h3 { margin: 0 0 8px 0; font-size: 24px; }
    .info-header p { color: var(--text-secondary); }
    
    .beneficiaires-list { display: flex; flex-direction: column; gap: 12px; }
    .beneficiaire-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #10b981; }
    .beneficiaire-info { display: flex; align-items: center; gap: 12px; }
    .beneficiaire-info mat-icon { color: #2563eb; }
    .beneficiaire-info span { font-weight: 600; }
    .montant-redistribue { color: #10b981; font-weight: 700; font-family: monospace; }
    
    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-secondary); }
    .empty-state mat-icon { font-size: 80px; width: 80px; height: 80px; margin-bottom: 20px; opacity: 0.5; }
    .empty-state h3 { font-size: 24px; margin: 0 0 8px 0; }
    .empty-state p { margin: 0 0 24px 0; }
    
    .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 20px; }
    .tab-label-bold { font-weight: 700; font-size: 15px; }
    
    .details-card { margin-bottom: 24px; animation: slideDown 0.3s ease-out; }
    .details-card.distribue-details { border-left: 4px solid #f59e0b; }
    .details-card.refus-details { border-left: 4px solid #ef4444; }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    
    .details-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 2px solid var(--border-color); background: #f9fafb; }
    .header-title { display: flex; align-items: center; gap: 12px; }
    .header-title mat-icon { color: #2563eb; font-size: 28px; width: 28px; height: 28px; }
    .header-title h3 { margin: 0; font-size: 18px; font-weight: 600; }
    .details-content { padding: 24px; }
    
    .summary-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color); }
    .summary-row:last-of-type { border-bottom: none; }
    .summary-row .label { font-size: 14px; color: var(--text-secondary); }
    .summary-row .value { font-size: 16px; font-weight: 600; }
    .summary-row .value.highlight { color: #2563eb; font-size: 18px; }
    .summary-row .value.status-done { color: #10b981; }
    .summary-row .value.status-pending { color: #f59e0b; }
    
    .divider { height: 2px; background: var(--border-color); margin: 24px 0; }
    h4 { font-size: 16px; font-weight: 600; margin: 0 0 16px 0; }
    
    .tours-list, .refus-items { display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; }
    .tour-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981; }
    .tour-info, .refus-info { display: flex; align-items: center; gap: 12px; flex: 1; }
    .tour-icon { color: #10b981; }
    .tour-details, .refus-details-content { display: flex; flex-direction: column; gap: 4px; }
    .tour-number { font-weight: 700; font-size: 14px; color: #065f46; }
    .beneficiaire, .date { font-size: 12px; color: var(--text-secondary); }
    .montant-tour { font-weight: 700; font-size: 16px; color: #10b981; font-family: monospace; }
    
    .refus-item-detail { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444; }
    .refus-icon { color: #ef4444; }
    .refus-main { display: flex; align-items: center; gap: 12px; }
    .beneficiaire-refus { font-weight: 700; font-size: 14px; color: #991b1b; }
    .cycle-info { background: #fecaca; color: #991b1b; padding: 2px 8px; border-radius: 8px; font-size: 11px; }
    .raison { font-size: 13px; font-style: italic; margin-top: 4px; }
    .montant-refus-detail { font-weight: 700; font-size: 16px; color: #ef4444; font-family: monospace; }
  `]
})
export class BanqueComponent implements OnInit {
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
