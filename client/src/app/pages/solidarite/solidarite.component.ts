import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SolidariteService, SolidariteConfig, PaiementSolidarite, MembreSolidariteStatut, MembreDetailStatut } from '../../services/solidarite.service';
import { MemberService } from '../../services/member.service';
import { AuthService } from '../../services/auth.service';
import { Member } from '../../models';
import { MemberFilterComponent } from '../../shared/member-filter.component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-solidarite',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
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
    MatInputModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatProgressBarModule
    ,MemberFilterComponent
  ],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <mat-icon class="page-icon">favorite</mat-icon>
          <div>
            <h1>❤️ Solidarités</h1>
            <p class="subtitle">Gestion des cotisations de solidarité</p>
          </div>
        </div>
        <div class="header-actions">
          <mat-form-field appearance="outline" class="year-select">
            <mat-label>Année</mat-label>
            <mat-select [(value)]="selectedAnnee" (selectionChange)="loadData()">
              @for (annee of annees(); track annee) {
                <mat-option [value]="annee">{{ annee }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          @if (isAdmin()) {
            <button mat-stroked-button color="primary" (click)="showConfigModal = true">
              <mat-icon>settings</mat-icon>
              Configuration
            </button>
          }
          <button mat-raised-button color="primary" (click)="openPaiementModal()">
            <mat-icon>add</mat-icon>
            Nouveau paiement
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
          <p>Chargement...</p>
        </div>
      } @else {
        <!-- Statistiques globales -->
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
                <mat-icon class="stat-icon">{{ getTypeIcon(entry.key) }}</mat-icon>
                <div class="stat-content">
                  <h3>{{ entry.value.totalCollecte | number:'1.0-0' }} FCFA</h3>
                  <p>{{ entry.value.libelle }}</p>
                  <mat-progress-bar mode="determinate" [value]="entry.value.tauxCollecte"></mat-progress-bar>
                  <span class="progress-label">{{ entry.value.tauxCollecte }}%</span>
                </div>
              </mat-card>
            }
          </div>

          <!-- Résumé membres -->
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
        }

        <!-- Onglets -->
        <mat-tab-group [(selectedIndex)]="selectedTabIndex" (selectedTabChange)="onTabChange($event)">
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>people</mat-icon>
              <span class="tab-label">Statuts des membres</span>
            </ng-template>

            <!-- Filtres -->
            <mat-card class="filter-card">
              <mat-card-content>
                <div class="filters-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Type de solidarité</mat-label>
                    <mat-select [(value)]="filterType" (selectionChange)="loadData()">
                      <mat-option value="">Toutes les solidarités</mat-option>
                      @for (config of configs(); track config._id) {
                        <mat-option [value]="config.nom">{{ config.libelle }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Statut</mat-label>
                    <mat-select [(value)]="filterStatut">
                      <mat-option value="">Tous</mat-option>
                      <mat-option value="a_jour">À jour</mat-option>
                      <mat-option value="en_retard">En retard</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <app-member-filter (memberSelected)="onMemberFilter($event)"></app-member-filter>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Tableau des statuts -->
            <mat-card class="table-card">
              <div class="table-container">
                <table mat-table [dataSource]="filteredStatuts()" class="full-width-table">
                  <ng-container matColumnDef="nomMembre">
                    <th mat-header-cell *matHeaderCellDef>Membre</th>
                    <td mat-cell *matCellDef="let statut">
                      <div class="membre-cell">
                        <strong>{{ statut.membre.nom }} {{ statut.membre.prenom }}</strong>
                        @if (statut.membre.telephone) {
                          <span class="telephone">{{ statut.membre.telephone }}</span>
                        }
                      </div>
                    </td>
                  </ng-container>

                  @for (config of configs(); track config._id) {
                    @if (!filterType || filterType === config.nom) {
                      <ng-container [matColumnDef]="config.nom">
                        <th mat-header-cell *matHeaderCellDef class="text-center">{{ config.libelle }}</th>
                        <td mat-cell *matCellDef="let statut" class="text-center">
                          @if (statut.solidarites[config.nom]) {
                            @if (statut.solidarites[config.nom].statut === 'a_jour') {
                              <mat-chip class="chip-success chip-small">
                                <mat-icon>check_circle</mat-icon>
                                À jour
                              </mat-chip>
                            } @else {
                              <mat-chip class="chip-danger chip-small">
                                <mat-icon>warning</mat-icon>
                                {{ statut.solidarites[config.nom].moisEnRetard.length }} mois
                              </mat-chip>
                            }
                            <div class="montant-cell">{{ statut.solidarites[config.nom].totalPaye | number:'1.0-0' }} FCFA</div>
                          } @else {
                            <mat-chip class="chip-neutral chip-small">Non configuré</mat-chip>
                          }
                        </td>
                      </ng-container>
                    }
                  }

                  <ng-container matColumnDef="statutGlobal">
                    <th mat-header-cell *matHeaderCellDef class="text-center">Statut Global</th>
                    <td mat-cell *matCellDef="let statut" class="text-center">
                      @if (getStatutGlobal(statut) === 'a_jour') {
                        <mat-chip class="chip-success">
                          <mat-icon>verified</mat-icon>
                          À jour
                        </mat-chip>
                      } @else {
                        <mat-chip class="chip-danger">
                          <mat-icon>error</mat-icon>
                          En retard
                        </mat-chip>
                      }
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef class="text-center">Actions</th>
                    <td mat-cell *matCellDef="let statut" class="text-center">
                      <button mat-icon-button color="primary" (click)="openDetailModal(statut.membre._id)" matTooltip="Voir détails">
                        <mat-icon>visibility</mat-icon>
                      </button>
                      <button mat-icon-button color="accent" (click)="openPaiementModal(statut.membre._id)" matTooltip="Ajouter paiement">
                        <mat-icon>add_circle</mat-icon>
                      </button>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="displayedColumns()"></tr>
                  <tr mat-row *matRowDef="let row; columns: displayedColumns();"></tr>
                </table>

                @if (filteredStatuts().length === 0) {
                  <div class="empty-state">
                    <mat-icon>inbox</mat-icon>
                    <p>Aucun membre trouvé</p>
                  </div>
                }
              </div>
            </mat-card>
          </mat-tab>

          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>receipt_long</mat-icon>
              <span class="tab-label">Historique des paiements</span>
            </ng-template>

            <!-- Filtres paiements -->
            <mat-card class="filter-card">
              <mat-card-content>
                <div class="filters-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Type de solidarité</mat-label>
                    <mat-select [(value)]="paiementFilterType" (selectionChange)="loadPaiements()">
                      <mat-option value="">Tous les types</mat-option>
                      @for (config of configs(); track config._id) {
                        <mat-option [value]="config.nom">{{ config.libelle }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Mois</mat-label>
                    <mat-select [(value)]="paiementFilterMois" (selectionChange)="loadPaiements()">
                      <mat-option value="">Tous les mois</mat-option>
                      @for (mois of moisOptions; track mois.value) {
                        <mat-option [value]="mois.value">{{ mois.label }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Tableau des paiements -->
            <mat-card class="table-card">
              <div class="table-container">
                <table mat-table [dataSource]="paiements()" class="full-width-table">
                  <ng-container matColumnDef="datePaiement">
                    <th mat-header-cell *matHeaderCellDef>Date</th>
                    <td mat-cell *matCellDef="let paiement">{{ paiement.datePaiement | date:'dd/MM/yyyy' }}</td>
                  </ng-container>

                  <ng-container matColumnDef="membrePaiement">
                    <th mat-header-cell *matHeaderCellDef>Membre</th>
                    <td mat-cell *matCellDef="let paiement">{{ paiement.membre.nom }} {{ paiement.membre.prenom }}</td>
                  </ng-container>

                  <ng-container matColumnDef="typePaiement">
                    <th mat-header-cell *matHeaderCellDef>Type</th>
                    <td mat-cell *matCellDef="let paiement">
                      <mat-chip [ngClass]="'type-chip-' + paiement.typeSolidarite">
                        {{ getTypeLabel(paiement.typeSolidarite) }}
                      </mat-chip>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="periodePaiement">
                    <th mat-header-cell *matHeaderCellDef>Période</th>
                    <td mat-cell *matCellDef="let paiement">{{ getPeriodeLabel(paiement) }}</td>
                  </ng-container>

                  <ng-container matColumnDef="montantPaiement">
                    <th mat-header-cell *matHeaderCellDef class="text-right">Montant</th>
                    <td mat-cell *matCellDef="let paiement" class="text-right montant">{{ paiement.montant | number:'1.0-0' }} FCFA</td>
                  </ng-container>

                  <ng-container matColumnDef="methodePaiement">
                    <th mat-header-cell *matHeaderCellDef>Méthode</th>
                    <td mat-cell *matCellDef="let paiement">{{ paiement.methodePaiement || '-' }}</td>
                  </ng-container>

                  <ng-container matColumnDef="actionsPaiement">
                    <th mat-header-cell *matHeaderCellDef class="text-center">Actions</th>
                    <td mat-cell *matCellDef="let paiement" class="text-center">
                      @if (isAdmin()) {
                        <button mat-icon-button color="warn" (click)="deletePaiement(paiement._id)" matTooltip="Supprimer">
                          <mat-icon>delete</mat-icon>
                        </button>
                      }
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="paiementColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: paiementColumns;"></tr>
                </table>

                @if (paiements().length === 0) {
                  <div class="empty-state">
                    <mat-icon>receipt_long</mat-icon>
                    <p>Aucun paiement trouvé</p>
                  </div>
                }
              </div>
            </mat-card>
          </mat-tab>
        </mat-tab-group>
      }
    </div>

    <!-- Modal Configuration -->
    @if (showConfigModal) {
      <div class="modal-overlay" (click)="showConfigModal = false">
        <mat-card class="modal-card modal-lg" (click)="$event.stopPropagation()">
          <mat-card-header>
            <mat-icon mat-card-avatar>settings</mat-icon>
            <mat-card-title>Configuration des Solidarités</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (configs().length === 0) {
              <div class="empty-state">
                <mat-icon>settings_applications</mat-icon>
                <p>Aucune configuration trouvée.</p>
                <button mat-raised-button color="primary" (click)="initConfigs()">
                  <mat-icon>auto_fix_high</mat-icon>
                  Initialiser les configurations par défaut
                </button>
              </div>
            } @else {
              <table mat-table [dataSource]="configs()" class="full-width-table">
                <ng-container matColumnDef="configType">
                  <th mat-header-cell *matHeaderCellDef>Type</th>
                  <td mat-cell *matCellDef="let config">
                    <strong>{{ config.libelle }}</strong>
                    @if (config.description) {
                      <br><small class="text-muted">{{ config.description }}</small>
                    }
                  </td>
                </ng-container>

                <ng-container matColumnDef="configMensuel">
                  <th mat-header-cell *matHeaderCellDef class="text-right">Mensuel</th>
                  <td mat-cell *matCellDef="let config" class="text-right">{{ config.montantMensuel | number:'1.0-0' }} FCFA</td>
                </ng-container>

                <ng-container matColumnDef="configTrimestriel">
                  <th mat-header-cell *matHeaderCellDef class="text-right">Trimestriel</th>
                  <td mat-cell *matCellDef="let config" class="text-right">{{ config.montantTrimestriel | number:'1.0-0' }} FCFA</td>
                </ng-container>

                <ng-container matColumnDef="configAnnuel">
                  <th mat-header-cell *matHeaderCellDef class="text-right">Annuel</th>
                  <td mat-cell *matCellDef="let config" class="text-right">{{ config.montantAnnuel | number:'1.0-0' }} FCFA</td>
                </ng-container>

                <ng-container matColumnDef="configActif">
                  <th mat-header-cell *matHeaderCellDef class="text-center">Actif</th>
                  <td mat-cell *matCellDef="let config" class="text-center">
                    <mat-chip [ngClass]="config.isActive ? 'chip-success' : 'chip-neutral'">
                      {{ config.isActive ? 'Oui' : 'Non' }}
                    </mat-chip>
                  </td>
                </ng-container>

                <ng-container matColumnDef="configActions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let config">
                    <button mat-icon-button color="primary" (click)="editConfig(config)" matTooltip="Modifier">
                      <mat-icon>edit</mat-icon>
                    </button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="configColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: configColumns;"></tr>
              </table>

              @if (editingConfig) {
                <mat-card class="edit-config-card">
                  <mat-card-header>
                    <mat-card-title>Modifier: {{ editingConfig.libelle }}</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="form-row">
                      <mat-form-field appearance="outline">
                        <mat-label>Montant Mensuel</mat-label>
                        <input matInput type="number" [(ngModel)]="editingConfig.montantMensuel">
                        <span matTextSuffix>FCFA</span>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Montant Trimestriel</mat-label>
                        <input matInput type="number" [(ngModel)]="editingConfig.montantTrimestriel">
                        <span matTextSuffix>FCFA</span>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Montant Annuel</mat-label>
                        <input matInput type="number" [(ngModel)]="editingConfig.montantAnnuel">
                        <span matTextSuffix>FCFA</span>
                      </mat-form-field>
                    </div>
                    <mat-slide-toggle [(ngModel)]="editingConfig.isActive">Actif</mat-slide-toggle>
                  </mat-card-content>
                  <mat-card-actions align="end">
                    <button mat-button (click)="editingConfig = null">Annuler</button>
                    <button mat-raised-button color="primary" (click)="saveConfig()">
                      <mat-icon>save</mat-icon>
                      Enregistrer
                    </button>
                  </mat-card-actions>
                </mat-card>
              }
            }
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-button (click)="showConfigModal = false">Fermer</button>
          </mat-card-actions>
        </mat-card>
      </div>
    }

    <!-- Modal Nouveau Paiement -->
    @if (showPaiementModal) {
      <div class="modal-overlay" (click)="showPaiementModal = false">
        <mat-card class="modal-card" (click)="$event.stopPropagation()">
          <mat-card-header>
            <mat-icon mat-card-avatar>add_circle</mat-icon>
            <mat-card-title>Nouveau Paiement</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-column">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Membre</mat-label>
                <mat-select [(value)]="paiementForm.membre" required>
                  @for (membre of membres(); track membre._id) {
                    <mat-option [value]="membre._id">{{ membre.nom }} {{ membre.prenom }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Type de solidarité</mat-label>
                <mat-select [(value)]="paiementForm.typeSolidarite" (selectionChange)="onTypeChange()" required>
                  @for (config of configs(); track config._id) {
                    <mat-option [value]="config.nom">{{ config.libelle }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Fréquence</mat-label>
                <mat-select [(value)]="paiementForm.frequence" (selectionChange)="onFrequenceChange()" required>
                  <mat-option value="mensuel">Mensuel</mat-option>
                  <mat-option value="trimestriel">Trimestriel</mat-option>
                  <mat-option value="annuel">Annuel</mat-option>
                </mat-select>
              </mat-form-field>

              @if (paiementForm.frequence === 'mensuel') {
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Mois</mat-label>
                  <mat-select [(value)]="paiementForm.mois" required>
                    @for (mois of moisOptions; track mois.value) {
                      <mat-option [value]="mois.value">{{ mois.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }

              @if (paiementForm.frequence === 'trimestriel') {
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Trimestre</mat-label>
                  <mat-select [(value)]="paiementForm.trimestre" required>
                    <mat-option [value]="1">T1 (Jan-Mars)</mat-option>
                    <mat-option [value]="2">T2 (Avr-Juin)</mat-option>
                    <mat-option [value]="3">T3 (Juil-Sept)</mat-option>
                    <mat-option [value]="4">T4 (Oct-Déc)</mat-option>
                  </mat-select>
                </mat-form-field>
              }

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Montant</mat-label>
                <input matInput type="number" [(ngModel)]="paiementForm.montant" required>
                <span matTextSuffix>FCFA</span>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Méthode de paiement</mat-label>
                <mat-select [(value)]="paiementForm.methodePaiement">
                  <mat-option value="">Sélectionner</mat-option>
                  <mat-option value="especes">Espèces</mat-option>
                  <mat-option value="mobile_money">Mobile Money</mat-option>
                  <mat-option value="virement">Virement bancaire</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Référence transaction</mat-label>
                <input matInput [(ngModel)]="paiementForm.referenceTransaction">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Notes</mat-label>
                <textarea matInput [(ngModel)]="paiementForm.notes" rows="2"></textarea>
              </mat-form-field>
            </div>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-button (click)="showPaiementModal = false">Annuler</button>
            <button mat-raised-button color="primary" (click)="submitPaiement()" [disabled]="!isPaiementValid()">
              <mat-icon>check</mat-icon>
              Enregistrer
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    }

    <!-- Modal Détail Membre -->
    @if (showDetailModal && membreDetail()) {
      <div class="modal-overlay" (click)="showDetailModal = false">
        <mat-card class="modal-card modal-xl" (click)="$event.stopPropagation()">
          <mat-card-header>
            <mat-icon mat-card-avatar>person</mat-icon>
            <mat-card-title>{{ membreDetail()!.membre.nom }} {{ membreDetail()!.membre.prenom }}</mat-card-title>
            <mat-card-subtitle>Détails Solidarités {{ selectedAnnee }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="detail-grid">
              @for (entry of membreDetailEntries(); track entry.key) {
                <mat-card class="detail-type-card" [ngClass]="entry.value.statut === 'a_jour' ? 'border-success' : 'border-danger'">
                  <mat-card-header [ngClass]="entry.value.statut === 'a_jour' ? 'header-success' : 'header-danger'">
                    <mat-card-title>{{ entry.value.config.libelle }}</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="amounts-row">
                      <div class="amount-item">
                        <span class="label">Payé</span>
                        <span class="value success">{{ entry.value.totalPaye | number:'1.0-0' }}</span>
                      </div>
                      <div class="amount-item">
                        <span class="label">Attendu</span>
                        <span class="value">{{ entry.value.montantAttendu | number:'1.0-0' }}</span>
                      </div>
                      <div class="amount-item">
                        <span class="label">Reste</span>
                        <span class="value danger">{{ entry.value.montantRestant | number:'1.0-0' }}</span>
                      </div>
                    </div>

                    <div class="mois-section">
                      <p><strong>Mois payés:</strong></p>
                      <mat-chip-set>
                        @for (mois of entry.value.moisPayes; track mois) {
                          <mat-chip class="chip-success chip-small">{{ getMoisNom(mois) }}</mat-chip>
                        }
                        @if (entry.value.moisPayes.length === 0) {
                          <span class="text-muted">Aucun</span>
                        }
                      </mat-chip-set>
                    </div>

                    @if (entry.value.moisEnRetard.length > 0) {
                      <div class="mois-section">
                        <p><strong>Mois en retard:</strong></p>
                        <mat-chip-set>
                          @for (mois of entry.value.moisEnRetard; track mois) {
                            <mat-chip class="chip-danger chip-small">{{ getMoisNom(mois) }}</mat-chip>
                          }
                        </mat-chip-set>
                      </div>
                    }
                  </mat-card-content>
                </mat-card>
              }
            </div>

            <!-- Historique des paiements du membre -->
            <h3 class="section-title">
              <mat-icon>history</mat-icon>
              Historique des paiements
            </h3>
            <table mat-table [dataSource]="membreDetailPaiements()" class="full-width-table">
              <ng-container matColumnDef="detailDate">
                <th mat-header-cell *matHeaderCellDef>Date</th>
                <td mat-cell *matCellDef="let paiement">{{ paiement.datePaiement | date:'dd/MM/yyyy' }}</td>
              </ng-container>
              <ng-container matColumnDef="detailType">
                <th mat-header-cell *matHeaderCellDef>Type</th>
                <td mat-cell *matCellDef="let paiement">{{ getTypeLabel(paiement.typeSolidarite) }}</td>
              </ng-container>
              <ng-container matColumnDef="detailPeriode">
                <th mat-header-cell *matHeaderCellDef>Période</th>
                <td mat-cell *matCellDef="let paiement">{{ getPeriodeLabel(paiement) }}</td>
              </ng-container>
              <ng-container matColumnDef="detailMontant">
                <th mat-header-cell *matHeaderCellDef class="text-right">Montant</th>
                <td mat-cell *matCellDef="let paiement" class="text-right montant">{{ paiement.montant | number:'1.0-0' }} FCFA</td>
              </ng-container>
              <ng-container matColumnDef="detailMethode">
                <th mat-header-cell *matHeaderCellDef>Méthode</th>
                <td mat-cell *matCellDef="let paiement">{{ paiement.methodePaiement || '-' }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="detailPaiementColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: detailPaiementColumns;"></tr>
            </table>

            @if (membreDetailPaiements().length === 0) {
              <div class="empty-state small">
                <mat-icon>receipt_long</mat-icon>
                <p>Aucun paiement</p>
              </div>
            }
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-stroked-button color="primary" (click)="printMembreReport()">
              <mat-icon>download</mat-icon>
              Télécharger PDF
            </button>
            <button mat-button (click)="showDetailModal = false">Fermer</button>
          </mat-card-actions>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    .page-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
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
      color: #e91e63;
    }

    .header-left h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }

    .subtitle {
      margin: 0;
      color: #64748b;
      font-size: 14px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .year-select {
      width: 120px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      color: #64748b;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      padding: 20px;
      gap: 16px;
    }

    .stat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      opacity: 0.8;
    }

    .stat-content h3 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }

    .stat-content p {
      margin: 4px 0;
      color: #64748b;
      font-size: 14px;
    }

    .stat-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      background: rgba(0,0,0,0.1);
    }

    .total-card {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
    }

    .total-card .stat-icon,
    .total-card .stat-content p {
      color: rgba(255,255,255,0.8);
    }

    .total-card .stat-badge {
      background: rgba(255,255,255,0.2);
    }

    .type-repas { border-left: 4px solid #10b981; }
    .type-membre { border-left: 4px solid #f59e0b; }
    .type-assurance_rapatriement { border-left: 4px solid #8b5cf6; }

    mat-progress-bar {
      margin-top: 8px;
      border-radius: 4px;
    }

    .progress-label {
      font-size: 12px;
      color: #64748b;
    }

    /* Summary Chips */
    .summary-chips {
      margin-bottom: 24px;
    }

    .summary-chips mat-chip-set {
      display: flex;
      gap: 8px;
    }

    .chip-success {
      background-color: #10b981 !important;
      color: white !important;
    }

    .chip-danger {
      background-color: #ef4444 !important;
      color: white !important;
    }

    .chip-neutral {
      background-color: #94a3b8 !important;
      color: white !important;
    }

    .chip-small {
      font-size: 12px !important;
      min-height: 24px !important;
      padding: 0 8px !important;
    }

    .chip-small mat-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
    }

    /* Tabs - Labels bien visibles */
    ::ng-deep .mat-mdc-tab-labels {
      background-color: #f8fafc;
      border-radius: 8px;
      padding: 4px;
    }

    ::ng-deep .mat-mdc-tab {
      min-width: 180px !important;
    }

    ::ng-deep .mat-mdc-tab .mdc-tab__text-label {
      color: #1e293b !important;
      font-weight: 600 !important;
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

    .tab-label {
      margin-left: 8px;
      font-weight: 600;
      color: #1e293b;
    }

    /* Filter Card - Labels bien contrastés */
    .filter-card {
      margin: 16px 0;
      background-color: #f1f5f9;
      border: 1px solid #e2e8f0;
    }

    .filters-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    /* Form Field Labels - Haute visibilité */
    ::ng-deep .filter-card .mat-mdc-form-field {
      min-width: 200px;
    }

    ::ng-deep .mat-mdc-form-field .mat-mdc-floating-label {
      color: #1e293b !important;
      font-weight: 600 !important;
      font-size: 15px !important;
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-floating-label {
      color: #2563eb !important;
    }

    ::ng-deep .mat-mdc-select-value-text {
      color: #0f172a !important;
      font-weight: 500 !important;
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

    /* Year Select - Très visible */
    .year-select {
      width: 140px;
    }

    .year-select ::ng-deep .mat-mdc-floating-label {
      color: #0f172a !important;
      font-weight: 700 !important;
      font-size: 16px !important;
    }

    .year-select ::ng-deep .mat-mdc-select-value-text {
      color: #2563eb !important;
      font-weight: 700 !important;
      font-size: 18px !important;
    }

    /* Table Card */
    .table-card {
      margin-top: 16px;
      border: 1px solid #e2e8f0;
    }

    .table-container {
      overflow-x: auto;
    }

    .full-width-table {
      width: 100%;
    }

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

    .text-center {
      text-align: center !important;
    }

    .text-right {
      text-align: right !important;
    }

    .membre-cell {
      display: flex;
      flex-direction: column;
    }

    .membre-cell strong {
      color: #0f172a;
      font-size: 15px;
    }

    .membre-cell .telephone {
      font-size: 13px;
      color: #475569;
      margin-top: 2px;
    }

    .montant-cell {
      font-size: 13px;
      color: #475569;
      margin-top: 4px;
      font-weight: 500;
    }

    .montant {
      font-weight: 700;
      color: #059669;
      font-size: 15px;
    }

    .type-chip-repas {
      background-color: #10b981 !important;
      color: white !important;
    }

    .type-chip-membre {
      background-color: #f59e0b !important;
      color: white !important;
    }

    .type-chip-assurance_rapatriement {
      background-color: #8b5cf6 !important;
      color: white !important;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px;
      color: #94a3b8;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
    }

    .empty-state.small {
      padding: 20px;
    }

    .empty-state.small mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    /* Modal */
    .modal-overlay {
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
      padding: 24px;
    }

    .modal-card {
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-lg {
      max-width: 800px;
    }

    .modal-xl {
      max-width: 1100px;
    }

    .form-column {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .form-row mat-form-field {
      flex: 1;
      min-width: 200px;
    }

    .full-width {
      width: 100%;
    }

    .text-muted {
      color: #64748b;
    }

    /* Config Edit Card */
    .edit-config-card {
      margin-top: 16px;
      background-color: #f8fafc;
    }

    .configColumns {
      width: 100%;
    }

    /* Detail Grid */
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .detail-type-card {
      border-width: 2px;
      border-style: solid;
    }

    .border-success {
      border-color: #10b981;
    }

    .border-danger {
      border-color: #ef4444;
    }

    .header-success {
      background-color: #10b981 !important;
      color: white !important;
    }

    .header-danger {
      background-color: #ef4444 !important;
      color: white !important;
    }

    .amounts-row {
      display: flex;
      justify-content: space-around;
      padding: 16px 0;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 16px;
    }

    .amount-item {
      text-align: center;
    }

    .amount-item .label {
      display: block;
      font-size: 12px;
      color: #64748b;
    }

    .amount-item .value {
      display: block;
      font-size: 18px;
      font-weight: 600;
    }

    .amount-item .value.success {
      color: #10b981;
    }

    .amount-item .value.danger {
      color: #ef4444;
    }

    .mois-section {
      margin-top: 12px;
    }

    .mois-section p {
      margin-bottom: 8px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 24px 0 16px;
      font-size: 18px;
    }

    .section-title mat-icon {
      color: #64748b;
    }

    @media print {
      .modal-overlay {
        position: static;
        background: none;
        padding: 0;
      }
      .modal-card {
        max-width: 100%;
        max-height: none;
        box-shadow: none;
      }
      mat-card-actions {
        display: none !important;
      }
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .header-actions {
        flex-wrap: wrap;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SolidariteComponent implements OnInit {
  private solidariteService = inject(SolidariteService);
  private memberService = inject(MemberService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // États
  loading = signal(false);
  selectedTabIndex = 0;
  selectedAnnee = new Date().getFullYear();
  filterType = '';
  filterStatut = '';
  paiementFilterType = '';
  paiementFilterMois: number | '' = '';

  // Modals
  showConfigModal = false;
  showPaiementModal = false;
  showDetailModal = false;
  editingConfig: SolidariteConfig | null = null;

  // Données
  configs = this.solidariteService.configs;
  statuts = this.solidariteService.statuts;
  paiements = this.solidariteService.paiements;
  stats = this.solidariteService.stats;
  membres = signal<Member[]>([]);
  membreDetail = signal<MembreDetailStatut | null>(null);
  selectedMemberId = signal<string | null>(null);

  // Formulaire paiement
  paiementForm = {
    membre: '',
    typeSolidarite: '' as '' | 'repas' | 'membre' | 'assurance_rapatriement',
    frequence: '' as '' | 'mensuel' | 'trimestriel' | 'annuel',
    montant: 0,
    mois: new Date().getMonth() + 1,
    trimestre: Math.ceil((new Date().getMonth() + 1) / 3),
    methodePaiement: '',
    referenceTransaction: '',
    notes: ''
  };

  // Colonnes des tableaux
  configColumns = ['configType', 'configMensuel', 'configTrimestriel', 'configAnnuel', 'configActif', 'configActions'];
  paiementColumns = ['datePaiement', 'membrePaiement', 'typePaiement', 'periodePaiement', 'montantPaiement', 'methodePaiement', 'actionsPaiement'];
  detailPaiementColumns = ['detailDate', 'detailType', 'detailPeriode', 'detailMontant', 'detailMethode'];

  // Options
  moisOptions = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' }
  ];

  // Computed
  annees = computed(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  });

  isAdmin = computed(() => {
    const role = this.authService.getCurrentUser()?.role;
    return role === 'admin' || role === 'tresorier';
  });

  statsEntries = computed(() => {
    const s = this.stats();
    if (!s) return [];
    return Object.entries(s.solidarites).map(([key, value]) => ({ key, value }));
  });

  membresAJour = computed(() => {
    return this.statuts().filter(s => 
      Object.values(s.solidarites).every(sol => sol.statut === 'a_jour')
    );
  });

  membresEnRetard = computed(() => {
    return this.statuts().filter(s => 
      Object.values(s.solidarites).some(sol => sol.statut === 'en_retard')
    );
  });

  filteredStatuts = computed(() => {
    let result = this.statuts();
    
    if (this.filterStatut === 'a_jour') {
      result = result.filter(s => 
        Object.values(s.solidarites).every(sol => sol.statut === 'a_jour')
      );
    } else if (this.filterStatut === 'en_retard') {
      result = result.filter(s => 
        Object.values(s.solidarites).some(sol => sol.statut === 'en_retard')
      );
    }
    const memberId = this.selectedMemberId();
    if (memberId) {
      result = result.filter(s => {
        const m = s.membre;
        if (!m) return false;
        return typeof m === 'string' ? m === memberId : m._id === memberId;
      });
    }
    
    return result;
  });

  displayedColumns = computed(() => {
    const cols = ['nomMembre'];
    this.configs().forEach(config => {
      if (!this.filterType || this.filterType === config.nom) {
        cols.push(config.nom);
      }
    });
    cols.push('statutGlobal', 'actions');
    return cols;
  });

  membreDetailEntries = computed(() => {
    const detail = this.membreDetail();
    if (!detail) return [];
    return Object.entries(detail.solidarites).map(([key, value]) => ({ key, value }));
  });

  membreDetailPaiements = computed(() => {
    const detail = this.membreDetail();
    if (!detail) return [];
    const allPaiements: PaiementSolidarite[] = [];
    Object.values(detail.solidarites).forEach(sol => {
      allPaiements.push(...sol.paiements);
    });
    return allPaiements.sort((a, b) => 
      new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime()
    );
  });

  ngOnInit() {
    this.loadData();
    this.loadMembres();
  }

  loadData() {
    this.loading.set(true);
    console.log('Loading solidarite data for year:', this.selectedAnnee);
    
    this.solidariteService.getStatuts(this.selectedAnnee, this.filterType || undefined).subscribe({
      next: (res) => {
        console.log('Statuts loaded:', res);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading statuts:', err);
        this.loading.set(false);
        this.snackBar.open('Erreur lors du chargement des données', 'OK', { duration: 5000 });
      }
    });
    
    this.solidariteService.getStats(this.selectedAnnee).subscribe({
      next: (res) => console.log('Stats loaded:', res),
      error: (err) => console.error('Error loading stats:', err)
    });
    
    this.solidariteService.getConfigs().subscribe({
      next: (res) => console.log('Configs loaded:', res),
      error: (err) => console.error('Error loading configs:', err)
    });
  }

  loadMembres() {
    this.memberService.getMembers().subscribe(res => {
      if (res.success && res.data) {
        this.membres.set(res.data.filter((m: Member) => m.isActive));
      }
    });
  }

  loadPaiements() {
    const filters: any = { annee: this.selectedAnnee };
    if (this.paiementFilterType) filters.typeSolidarite = this.paiementFilterType;
    if (this.paiementFilterMois) filters.mois = this.paiementFilterMois;
    if (this.selectedMemberId()) filters.membre = this.selectedMemberId();
    this.solidariteService.getPaiements(filters).subscribe();
  }

  onTabChange(event: any) {
    if (event.index === 1) {
      this.loadPaiements();
    }
  }

  onMemberFilter(memberId: string | null) {
    this.selectedMemberId.set(memberId);
    // refresh paiements when filter changes
    this.loadPaiements();
  }

  initConfigs() {
    this.solidariteService.initConfigs().subscribe({
      next: (res) => {
        this.snackBar.open(res.message || 'Configurations initialisées', 'OK', { duration: 3000 });
        this.loadData();
      },
      error: (err) => {
        this.snackBar.open('Erreur lors de l\'initialisation', 'OK', { duration: 3000 });
      }
    });
  }

  editConfig(config: SolidariteConfig) {
    console.log('Edit config clicked:', config);
    // Créer une copie mutable avec Object.assign
    this.editingConfig = Object.assign({}, config);
    console.log('editingConfig set:', this.editingConfig);
  }

  saveConfig() {
    if (!this.editingConfig) {
      console.log('No editingConfig, returning');
      return;
    }
    
    console.log('Saving config:', this.editingConfig);
    console.log('Montant mensuel:', this.editingConfig.montantMensuel);
    
    const updateData = {
      montantMensuel: Number(this.editingConfig.montantMensuel),
      montantTrimestriel: Number(this.editingConfig.montantTrimestriel),
      montantAnnuel: Number(this.editingConfig.montantAnnuel),
      isActive: this.editingConfig.isActive
    };
    
    console.log('Update data:', updateData);
    
    this.solidariteService.updateConfig(this.editingConfig.nom, updateData).subscribe({
      next: (res) => {
        console.log('Config saved:', res);
        this.snackBar.open('Configuration mise à jour', 'OK', { duration: 3000 });
        this.editingConfig = null;
        this.showConfigModal = false;
        this.loadData();
      },
      error: (err) => {
        console.error('Error saving config:', err);
        this.snackBar.open(err.error?.error || 'Erreur lors de la mise à jour', 'OK', { duration: 3000 });
      }
    });
  }

  openPaiementModal(membreId?: string) {
    this.paiementForm = {
      membre: membreId || '',
      typeSolidarite: '',
      frequence: '',
      montant: 0,
      mois: new Date().getMonth() + 1,
      trimestre: Math.ceil((new Date().getMonth() + 1) / 3),
      methodePaiement: '',
      referenceTransaction: '',
      notes: ''
    };
    this.showPaiementModal = true;
  }

  onTypeChange() {
    const config = this.configs().find(c => c.nom === this.paiementForm.typeSolidarite);
    if (config && this.paiementForm.frequence) {
      this.updateMontant(config);
    }
  }

  onFrequenceChange() {
    const config = this.configs().find(c => c.nom === this.paiementForm.typeSolidarite);
    if (config) {
      this.updateMontant(config);
    }
  }

  private updateMontant(config: SolidariteConfig) {
    switch (this.paiementForm.frequence) {
      case 'mensuel':
        this.paiementForm.montant = config.montantMensuel;
        break;
      case 'trimestriel':
        this.paiementForm.montant = config.montantTrimestriel;
        break;
      case 'annuel':
        this.paiementForm.montant = config.montantAnnuel;
        break;
    }
  }

  isPaiementValid(): boolean {
    return !!(
      this.paiementForm.membre &&
      this.paiementForm.typeSolidarite &&
      this.paiementForm.frequence &&
      this.paiementForm.montant > 0 &&
      (this.paiementForm.frequence !== 'mensuel' || this.paiementForm.mois) &&
      (this.paiementForm.frequence !== 'trimestriel' || this.paiementForm.trimestre)
    );
  }

  submitPaiement() {
    if (!this.isPaiementValid()) return;

    const data: any = {
      membre: this.paiementForm.membre,
      typeSolidarite: this.paiementForm.typeSolidarite,
      montant: this.paiementForm.montant,
      frequence: this.paiementForm.frequence,
      annee: this.selectedAnnee
    };

    if (this.paiementForm.frequence === 'mensuel') {
      data.mois = this.paiementForm.mois;
    }
    if (this.paiementForm.frequence === 'trimestriel') {
      data.trimestre = this.paiementForm.trimestre;
    }
    if (this.paiementForm.methodePaiement) {
      data.methodePaiement = this.paiementForm.methodePaiement;
    }
    if (this.paiementForm.referenceTransaction) {
      data.referenceTransaction = this.paiementForm.referenceTransaction;
    }
    if (this.paiementForm.notes) {
      data.notes = this.paiementForm.notes;
    }

    this.solidariteService.createPaiement(data).subscribe({
      next: () => {
        this.snackBar.open('Paiement enregistré avec succès', 'OK', { duration: 3000 });
        this.showPaiementModal = false;
        this.loadData();
        if (this.selectedTabIndex === 1) {
          this.loadPaiements();
        }
      },
      error: (err) => {
        this.snackBar.open(err.error?.error || 'Erreur lors de l\'enregistrement', 'OK', { duration: 3000 });
      }
    });
  }

  async deletePaiement(id: string) {
    const { ConfirmDialogComponent } = await import('../../shared/confirm-dialog.component');
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '520px',
      data: {
        title: 'Supprimer le paiement',
        message: 'Êtes-vous sûr de vouloir supprimer ce paiement ?',
        confirmLabel: 'Supprimer',
        cancelLabel: 'Annuler',
        requireReason: false
      }
    } as any);

    dialogRef.afterClosed().subscribe((result: any) => {
      if (!result || !result.confirmed) return;

      this.solidariteService.deletePaiement(id).subscribe({
        next: () => {
          this.snackBar.open('Paiement supprimé', 'OK', { duration: 3000 });
          this.loadPaiements();
          this.loadData();
        },
        error: () => {
          this.snackBar.open('Erreur lors de la suppression', 'OK', { duration: 3000 });
        }
      });
    });
  }

  openDetailModal(membreId: string) {
    this.solidariteService.getMembreStatut(membreId, this.selectedAnnee).subscribe({
      next: (res) => {
        if (res.success) {
          this.membreDetail.set(res.data);
          this.showDetailModal = true;
        }
      },
      error: () => {
        this.snackBar.open('Erreur lors du chargement des détails', 'OK', { duration: 3000 });
      }
    });
  }

  printMembreReport() {
    const detail = this.membreDetail();
    if (!detail) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Titre
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Rapport Solidarités', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Informations du membre
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Membre: ${detail.membre.nom} ${detail.membre.prenom}`, 20, yPosition);
    yPosition += 10;

    if (detail.membre.telephone) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Téléphone: ${detail.membre.telephone}`, 20, yPosition);
      yPosition += 10;
    }

    doc.text(`Année: ${this.selectedAnnee}`, 20, yPosition);
    yPosition += 10;

    doc.text(`Date d'impression: ${new Date().toLocaleDateString('fr-FR')}`, 20, yPosition);
    yPosition += 20;

    // Pour chaque type de solidarité
    Object.entries(detail.solidarites).forEach(([typeKey, solidarite]) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // Titre du type
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${solidarite.config.libelle}`, 20, yPosition);
      yPosition += 10;

      // Statistiques
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Payé: ${solidarite.totalPaye.toLocaleString('fr-FR')} FCFA`, 30, yPosition);
      yPosition += 8;
      doc.text(`Attendu: ${solidarite.montantAttendu.toLocaleString('fr-FR')} FCFA`, 30, yPosition);
      yPosition += 8;
      doc.text(`Reste: ${solidarite.montantRestant.toLocaleString('fr-FR')} FCFA`, 30, yPosition);
      yPosition += 8;
      doc.text(`Statut: ${solidarite.statut === 'a_jour' ? 'À jour' : 'En retard'}`, 30, yPosition);
      yPosition += 15;

      // Mois payés
      if (solidarite.moisPayes.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Mois payés:', 30, yPosition);
        yPosition += 8;

        doc.setFont('helvetica', 'normal');
        const moisPayesText = solidarite.moisPayes.map(m => this.getMoisNom(m)).join(', ');
        const splitMois = doc.splitTextToSize(moisPayesText, pageWidth - 40);
        doc.text(splitMois, 40, yPosition);
        yPosition += splitMois.length * 5 + 5;
      }

      // Mois en retard
      if (solidarite.moisEnRetard.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Mois en retard:', 30, yPosition);
        yPosition += 8;

        doc.setFont('helvetica', 'normal');
        const moisRetardText = solidarite.moisEnRetard.map(m => this.getMoisNom(m)).join(', ');
        const splitRetard = doc.splitTextToSize(moisRetardText, pageWidth - 40);
        doc.text(splitRetard, 40, yPosition);
        yPosition += splitRetard.length * 5 + 10;
      }
    });

    // Historique des paiements
    if (this.membreDetailPaiements().length > 0) {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Historique des paiements', 20, yPosition);
      yPosition += 15;

      // Préparer les données pour le tableau
      const tableData = this.membreDetailPaiements().map(paiement => [
        new Date(paiement.datePaiement).toLocaleDateString('fr-FR'),
        this.getTypeLabel(paiement.typeSolidarite),
        this.getPeriodeLabel(paiement),
        `${paiement.montant.toLocaleString('fr-FR')} FCFA`,
        paiement.methodePaiement || '-'
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Date', 'Type', 'Période', 'Montant', 'Méthode']],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });
    }

    // Télécharger le PDF
    const fileName = `rapport_solidarite_${detail.membre.nom}_${detail.membre.prenom}_${this.selectedAnnee}.pdf`;
    doc.save(fileName);
  }

  getStatutGlobal(statut: MembreSolidariteStatut): 'a_jour' | 'en_retard' {
    return Object.values(statut.solidarites).every(s => s.statut === 'a_jour') ? 'a_jour' : 'en_retard';
  }

  getTypeLabel(type: string): string {
    return this.solidariteService.getTypeSolidariteLibelle(type);
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'repas': return 'restaurant';
      case 'membre': return 'group';
      case 'assurance_rapatriement': return 'flight';
      default: return 'payments';
    }
  }

  getPeriodeLabel(paiement: PaiementSolidarite): string {
    if (paiement.frequence === 'mensuel' && paiement.mois) {
      return `${this.solidariteService.getMoisNom(paiement.mois)} ${paiement.annee}`;
    } else if (paiement.frequence === 'trimestriel' && paiement.trimestre) {
      return `T${paiement.trimestre} ${paiement.annee}`;
    } else {
      return `Année ${paiement.annee}`;
    }
  }

  getMoisNom(mois: number): string {
    return this.solidariteService.getMoisNom(mois);
  }
}
