import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { CarteCodebafService } from '../../services/carte-codebaf.service';
import { MemberService } from '../../services/member.service';
import { AuthService } from '../../services/auth.service';
import { CarteCodebaf, CarteCodebafStats, Member, PaiementCarte } from '../../models';

@Component({
  selector: 'app-cartes-codebaf',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
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
    MatInputModule,
    MatTooltipModule,
    MatExpansionModule,
    MatMenuModule,
    MatBadgeModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-left">
          <mat-icon class="page-icon">card_membership</mat-icon>
          <div>
            <h1>🎴 Cartes CODEBAF</h1>
            <p class="subtitle">Gestion des cartes du comité de développement du village Bangang-Fokam</p>
          </div>
        </div>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="showCreateForm.set(true)" *ngIf="authService.hasRole('admin') || authService.hasRole('tresorier')">
            <mat-icon>add</mat-icon>
            Nouvelle carte
          </button>
        </div>
      </div>

      <!-- Filtres -->
      <mat-card class="filter-card">
        <mat-card-content>
          <div class="filters-row">
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Année</mat-label>
              <mat-select [value]="selectedAnnee()" (selectionChange)="selectedAnnee.set($event.value); loadCartes()">
                <mat-option [value]="null">Toutes les années</mat-option>
                @for (annee of availableAnnees(); track annee) {
                  <mat-option [value]="annee">{{ annee }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Type de carte</mat-label>
              <mat-select [value]="selectedType()" (selectionChange)="selectedType.set($event.value); loadCartes()">
                <mat-option [value]="null">Tous les types</mat-option>
                <mat-option value="classique">🏷️ Classique (< 100K)</mat-option>
                <mat-option value="bronze">🥉 Bronze (100K - 499K)</mat-option>
                <mat-option value="silver">🥈 Silver (500K - 999K)</mat-option>
                <mat-option value="gold">🥇 Gold (≥ 1M)</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Statut</mat-label>
              <mat-select [value]="selectedStatut()" (selectionChange)="selectedStatut.set($event.value); loadCartes()">
                <mat-option [value]="null">Tous les statuts</mat-option>
                <mat-option value="en_cours">⏳ En cours</mat-option>
                <mat-option value="complete">✅ Complète</mat-option>
                <mat-option value="annule">❌ Annulée</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Formulaire de création -->
      @if (showCreateForm()) {
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>add_card</mat-icon>
              Nouvelle carte CODEBAF
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="carteForm" (ngSubmit)="createCarte()">
              <div class="form-row">
                <mat-form-field appearance="outline" class="form-field">
                  <mat-label>Membre</mat-label>
                  <mat-select formControlName="membre" required>
                    @for (membre of membres(); track membre._id) {
                      <mat-option [value]="membre._id">{{ membre.nom }} {{ membre.prenom }}</mat-option>
                    }
                  </mat-select>
                  <mat-error *ngIf="carteForm.get('membre')?.hasError('required')">Membre requis</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="form-field">
                  <mat-label>Année</mat-label>
                  <mat-select formControlName="annee" required>
                    @for (annee of futureAnnees(); track annee) {
                      <mat-option [value]="annee">{{ annee }}</mat-option>
                    }
                  </mat-select>
                  <mat-error *ngIf="carteForm.get('annee')?.hasError('required')">Année requise</mat-error>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="form-field">
                  <mat-label>Montant total (FCFA)</mat-label>
                  <input matInput type="number" formControlName="montantTotal" min="1000" required>
                  <mat-hint>Type: {{ getTypeFromMontant(carteForm.get('montantTotal')?.value) }}</mat-hint>
                  <mat-error *ngIf="carteForm.get('montantTotal')?.hasError('required')">Montant requis</mat-error>
                  <mat-error *ngIf="carteForm.get('montantTotal')?.hasError('min')">Minimum 1000 FCFA</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="form-field">
                  <mat-label>Fréquence de paiement</mat-label>
                  <mat-select formControlName="frequencePaiement">
                    <mat-option value="annuel">Annuel (1 paiement)</mat-option>
                    <mat-option value="trimestriel">Trimestriel (4 paiements)</mat-option>
                    <mat-option value="mensuel">Mensuel (12 paiements)</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="form-field full-width">
                <mat-label>Notes</mat-label>
                <textarea matInput formControlName="notes" rows="2"></textarea>
              </mat-form-field>

              <!-- Statut (visible en édition) -->
              @if (editingCarteId()) {
                <mat-form-field appearance="outline" class="form-field">
                  <mat-label>Statut</mat-label>
                  <mat-select formControlName="statut">
                    <mat-option value="en_cours">⏳ En cours</mat-option>
                    <mat-option value="complete">✅ Complète</mat-option>
                    <mat-option value="annule">❌ Annulée</mat-option>
                  </mat-select>
                </mat-form-field>
              }

              <div class="form-actions">
                <button mat-button type="button" (click)="cancelCreateOrEdit()">Annuler</button>
                <button mat-raised-button color="primary" type="submit" [disabled]="carteForm.invalid || creating()">
                  @if (creating()) {
                    <mat-progress-spinner mode="indeterminate" diameter="20"></mat-progress-spinner>
                  } @else {
                    <mat-icon>save</mat-icon>
                  }
                  {{ editingCarteId() ? 'Enregistrer les modifications' : 'Créer la carte' }}
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }


      @if (loading()) {
        <div class="loading-container">
          <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
          <p>Chargement...</p>
        </div>
      } @else {
        <!-- Statistiques -->
        <div class="stats-grid">
          <mat-card class="stat-card total-cartes">
            <mat-icon class="stat-icon">credit_card</mat-icon>
            <div class="stat-content">
              <h3>{{ stats()?.global?.totalCartes || 0 }}</h3>
              <p>Total Cartes</p>
            </div>
          </mat-card>

          <mat-card class="stat-card montant-attendu">
            <mat-icon class="stat-icon">account_balance_wallet</mat-icon>
            <div class="stat-content">
              <h3>{{ (stats()?.global?.totalMontantAttendu || 0) | number:'1.0-0' }} FCFA</h3>
              <p>Montant Attendu</p>
            </div>
          </mat-card>

          <mat-card class="stat-card montant-paye">
            <mat-icon class="stat-icon">payments</mat-icon>
            <div class="stat-content">
              <h3>{{ (stats()?.global?.totalMontantPaye || 0) | number:'1.0-0' }} FCFA</h3>
              <p>Montant Payé</p>
            </div>
          </mat-card>

          <mat-card class="stat-card montant-restant">
            <mat-icon class="stat-icon">pending</mat-icon>
            <div class="stat-content">
              <h3>{{ (stats()?.global?.totalMontantRestant || 0) | number:'1.0-0' }} FCFA</h3>
              <p>Montant Restant</p>
            </div>
          </mat-card>

          <mat-card class="stat-card taux">
            <mat-icon class="stat-icon">trending_up</mat-icon>
            <div class="stat-content">
              <h3>{{ stats()?.global?.tauxRecouvrement || 0 }}%</h3>
              <p>Taux Recouvrement</p>
            </div>
          </mat-card>
        </div>

        <!-- Répartition par type -->
        <div class="types-grid">
          <mat-card class="type-card classique" (click)="selectedType.set('classique'); loadCartes()">
            <div class="type-icon">🏷️</div>
            <div class="type-info">
              <h4>Classique</h4>
              <p>< 100 000 FCFA</p>
              <span class="count">{{ getTypeCount('classique') }} cartes</span>
            </div>
          </mat-card>
          <mat-card class="type-card bronze" (click)="selectedType.set('bronze'); loadCartes()">
            <div class="type-icon">🥉</div>
            <div class="type-info">
              <h4>Bronze</h4>
              <p>100K - 499K FCFA</p>
              <span class="count">{{ getTypeCount('bronze') }} cartes</span>
            </div>
          </mat-card>
          <mat-card class="type-card silver" (click)="selectedType.set('silver'); loadCartes()">
            <div class="type-icon">🥈</div>
            <div class="type-info">
              <h4>Silver</h4>
              <p>500K - 999K FCFA</p>
              <span class="count">{{ getTypeCount('silver') }} cartes</span>
            </div>
          </mat-card>
          <mat-card class="type-card gold" (click)="selectedType.set('gold'); loadCartes()">
            <div class="type-icon">🥇</div>
            <div class="type-info">
              <h4>Gold</h4>
              <p>≥ 1 000 000 FCFA</p>
              <span class="count">{{ getTypeCount('gold') }} cartes</span>
            </div>
          </mat-card>
        </div>

        <!-- Liste des cartes -->
        <mat-card class="cartes-list-card">
          <mat-card-header>
            <mat-card-title>Liste des cartes ({{ cartes().length }})</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (cartes().length === 0) {
              <div class="empty-state">
                <mat-icon>credit_card_off</mat-icon>
                <h3>Aucune carte trouvée</h3>
                <p>Créez une nouvelle carte pour commencer</p>
              </div>
            } @else {
              <div class="cartes-grid">
                @for (carte of cartes(); track carte._id) {
                  <mat-card class="carte-item" [ngClass]="'type-' + carte.typeCarte">
                    <div class="carte-header">
                      <div class="carte-type-badge" [ngClass]="carte.typeCarte">
                        {{ getTypeEmoji(carte.typeCarte) }} {{ carteService.getTypeCarteLabel(carte.typeCarte) }}
                      </div>
                      <div class="carte-annee">{{ carte.annee }}</div>
                      <!-- Auto-complete badge: only when backend flagged this card as autoComputed -->
                      <div *ngIf="carte.autoComputed" class="auto-complete-badge" matBadge="Auto-complete" matBadgePosition="above after" matBadgeColor="primary" aria-hidden="false">
                      </div>
                      <button mat-icon-button [matMenuTriggerFor]="carteMenu" *ngIf="authService.hasRole('admin') || authService.hasRole('tresorier')">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #carteMenu="matMenu">
                        <button mat-menu-item (click)="openEditForm(carte)" *ngIf="authService.hasRole('admin') || authService.hasRole('tresorier')">
                          <mat-icon>edit</mat-icon>
                          Modifier
                        </button>
                        <button mat-menu-item (click)="openPaiementForm(carte)" *ngIf="carte.statut === 'en_cours'">
                          <mat-icon>payment</mat-icon>
                          Enregistrer un paiement
                        </button>
                        <button mat-menu-item (click)="viewDetails(carte)">
                          <mat-icon>visibility</mat-icon>
                          Voir les détails
                        </button>
                        <button mat-menu-item (click)="deleteCarte(carte)" *ngIf="authService.hasRole('admin')" class="delete-action">
                          <mat-icon>delete</mat-icon>
                          Supprimer
                        </button>
                      </mat-menu>
                    </div>

                    <div class="carte-membre">
                      <mat-icon>person</mat-icon>
                      <span>{{ getMemberName(carte.membre) }}</span>
                    </div>

                    <div class="carte-montants">
                      <div class="montant-total">
                        <span class="label">Total:</span>
                        <span class="value">{{ carte.montantTotal | number:'1.0-0' }} FCFA</span>
                      </div>
                      <div class="montant-paye">
                        <span class="label">Payé:</span>
                        <span class="value success">{{ carte.montantPaye | number:'1.0-0' }} FCFA</span>
                      </div>
                      <div class="montant-restant" *ngIf="carte.montantRestant > 0">
                        <span class="label">Restant:</span>
                        <span class="value warning">{{ carte.montantRestant | number:'1.0-0' }} FCFA</span>
                      </div>
                    </div>

                    <div class="carte-progress">
                      <mat-progress-bar 
                        mode="determinate" 
                        [value]="(carte.montantPaye / carte.montantTotal) * 100"
                        [ngClass]="getProgressClass(carte)">
                      </mat-progress-bar>
                      <span class="progress-text">{{ ((carte.montantPaye / carte.montantTotal) * 100) | number:'1.0-0' }}%</span>
                    </div>

                    <div class="carte-footer">
                      <span class="frequence">{{ getFrequenceLabel(carte.frequencePaiement) }}</span>
                      <span class="statut" [ngClass]="'statut-' + carte.statut">
                        {{ getStatutLabel(carte.statut) }}
                      </span>
                    </div>

                    <!-- Historique paiements (collapsible) -->
                    @if (carte.paiements && carte.paiements.length > 0) {
                      <mat-expansion-panel class="paiements-panel">
                        <mat-expansion-panel-header>
                          <mat-panel-title>
                            <mat-icon>receipt_long</mat-icon>
                            {{ carte.paiements.length }} paiement(s)
                          </mat-panel-title>
                        </mat-expansion-panel-header>
                        <div class="paiements-list">
                          @for (paiement of carte.paiements; track paiement._id) {
                            <div class="paiement-item">
                              <div class="paiement-info">
                                <span class="paiement-date">{{ formatDate(paiement.datePaiement) }}</span>
                                <span class="paiement-methode">{{ getMethodeLabel(paiement.methodePaiement) }}</span>
                              </div>
                              <span class="paiement-montant">{{ paiement.montant | number:'1.0-0' }} FCFA</span>
                            </div>
                          }
                        </div>
                      </mat-expansion-panel>
                    }
                  </mat-card>
                }
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Formulaire de paiement (modal) -->
        @if (showPaiementForm() && selectedCarte()) {
          <div class="modal-overlay" (click)="closePaiementForm()">
            <mat-card class="paiement-modal" (click)="$event.stopPropagation()">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>payment</mat-icon>
                  Enregistrer un paiement
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="paiement-info-header">
                  <p><strong>Membre:</strong> {{ getMemberName(selectedCarte()!.membre) }}</p>
                  <p><strong>Carte:</strong> {{ carteService.getTypeCarteLabel(selectedCarte()!.typeCarte) }} {{ selectedCarte()!.annee }}</p>
                  <p><strong>Restant à payer:</strong> {{ selectedCarte()!.montantRestant | number:'1.0-0' }} FCFA</p>
                </div>
                <form [formGroup]="paiementForm" (ngSubmit)="enregistrerPaiement()">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Montant (FCFA)</mat-label>
                    <input matInput type="number" formControlName="montant" [max]="selectedCarte()!.montantRestant" required>
                    <mat-error *ngIf="paiementForm.get('montant')?.hasError('required')">Montant requis</mat-error>
                    <mat-error *ngIf="paiementForm.get('montant')?.hasError('max')">
                      Maximum {{ selectedCarte()!.montantRestant | number:'1.0-0' }} FCFA
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Méthode de paiement</mat-label>
                    <mat-select formControlName="methodePaiement">
                      <mat-option value="especes">💵 Espèces</mat-option>
                      <mat-option value="mobile_money">📱 Mobile Money</mat-option>
                      <mat-option value="virement">🏦 Virement</mat-option>
                      <mat-option value="cheque">📝 Chèque</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Référence transaction (optionnel)</mat-label>
                    <input matInput formControlName="referenceTransaction">
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Notes (optionnel)</mat-label>
                    <textarea matInput formControlName="notes" rows="2"></textarea>
                  </mat-form-field>

                  <div class="form-actions">
                    <button mat-button type="button" (click)="closePaiementForm()">Annuler</button>
                    <button mat-raised-button color="primary" type="submit" [disabled]="paiementForm.invalid || savingPaiement()">
                      @if (savingPaiement()) {
                        <mat-progress-spinner mode="indeterminate" diameter="20"></mat-progress-spinner>
                      } @else {
                        <mat-icon>check</mat-icon>
                      }
                      Enregistrer
                    </button>
                  </div>
                </form>
              </mat-card-content>
            </mat-card>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page-container { padding: 32px; max-width: 1600px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .page-icon { font-size: 48px; width: 48px; height: 48px; color: #8b5cf6; }
    h1 { font-size: 32px; font-weight: 700; margin: 0; }
    .subtitle { font-size: 16px; color: var(--text-secondary); margin: 4px 0 0 0; }

    .filter-card { margin-bottom: 24px; border-left: 4px solid #8b5cf6; }
    .filters-row { display: flex; gap: 20px; flex-wrap: wrap; }
    .filter-field { flex: 1; min-width: 200px; }

    .form-card { margin-bottom: 24px; border-left: 4px solid #10b981; animation: slideDown 0.3s ease-out; }
    .form-card mat-card-title { display: flex; align-items: center; gap: 8px; }
    .form-row { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 16px; }
    .form-field { flex: 1; min-width: 200px; }
    .form-field.full-width { flex: 100%; }
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }

    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 24px; }
    .stat-card { display: flex; align-items: center; gap: 16px; padding: 20px !important; border-left: 4px solid; }
    .stat-card.total-cartes { border-left-color: #8b5cf6; }
    .stat-card.montant-attendu { border-left-color: #2563eb; }
    .stat-card.montant-paye { border-left-color: #10b981; }
    .stat-card.montant-restant { border-left-color: #f59e0b; }
    .stat-card.taux { border-left-color: #06b6d4; }
    .stat-icon { font-size: 36px; width: 36px; height: 36px; }
    .stat-content h3 { margin: 0; font-size: 20px; font-weight: 700; }
    .stat-content p { margin: 4px 0 0 0; font-size: 13px; color: var(--text-secondary); }

    .types-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .type-card { display: flex; align-items: center; gap: 16px; padding: 16px !important; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
    .type-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .type-card.classique { border-left: 4px solid #6b7280; }
    .type-card.bronze { border-left: 4px solid #cd7f32; }
    .type-card.silver { border-left: 4px solid #c0c0c0; }
    .type-card.gold { border-left: 4px solid #ffd700; }
    .type-icon { font-size: 32px; }
    .type-info h4 { margin: 0; font-size: 16px; font-weight: 600; }
    .type-info p { margin: 2px 0 0 0; font-size: 12px; color: var(--text-secondary); }
    .type-info .count { font-size: 14px; font-weight: 700; color: #2563eb; }

    .cartes-list-card { margin-bottom: 24px; }
    .cartes-list-card mat-card-title { font-size: 20px; font-weight: 700; }
    .cartes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }

    .carte-item { padding: 0 !important; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
    .carte-item:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .carte-item.type-classique { border-top: 4px solid #6b7280; }
    .carte-item.type-bronze { border-top: 4px solid #cd7f32; }
    .carte-item.type-silver { border-top: 4px solid #c0c0c0; }
    .carte-item.type-gold { border-top: 4px solid #ffd700; }

    .carte-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
    .carte-type-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .carte-type-badge.classique { background: #f3f4f6; color: #374151; }
    .carte-type-badge.bronze { background: #fef3c7; color: #92400e; }
    .carte-type-badge.silver { background: #e5e7eb; color: #1f2937; }
    .carte-type-badge.gold { background: #fef9c3; color: #854d0e; }
    .carte-annee { margin-left: auto; font-weight: 700; font-size: 18px; color: #1f2937; }
    .auto-complete-badge { margin-left: 8px; display: flex; align-items: center; }
    .auto-complete-badge::ng-deep .mat-badge-content { background-color: #06b6d4 !important; color: white !important; font-weight: 700; }

    .carte-membre { display: flex; align-items: center; gap: 8px; padding: 12px 16px; font-weight: 600; color: #1f2937; }
    .carte-membre mat-icon { color: #6b7280; }

    .carte-montants { padding: 0 16px 12px; }
    .carte-montants > div { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .carte-montants .label { color: #6b7280; font-size: 13px; }
    .carte-montants .value { font-weight: 600; font-size: 14px; }
    .carte-montants .value.success { color: #10b981; }
    .carte-montants .value.warning { color: #f59e0b; }

    .carte-progress { padding: 0 16px 12px; display: flex; align-items: center; gap: 12px; }
    .carte-progress mat-progress-bar { flex: 1; height: 8px; border-radius: 4px; }
    .carte-progress .progress-text { font-weight: 700; font-size: 14px; color: #1f2937; min-width: 45px; text-align: right; }
    
    ::ng-deep .carte-progress .mat-mdc-progress-bar.complete .mdc-linear-progress__bar-inner { background-color: #10b981 !important; }
    ::ng-deep .carte-progress .mat-mdc-progress-bar.warning .mdc-linear-progress__bar-inner { background-color: #f59e0b !important; }
    ::ng-deep .carte-progress .mat-mdc-progress-bar.low .mdc-linear-progress__bar-inner { background-color: #ef4444 !important; }

    .carte-footer { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
    .carte-footer .frequence { font-size: 12px; color: #6b7280; }
    .carte-footer .statut { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .carte-footer .statut-en_cours { background: #fef3c7; color: #92400e; }
    .carte-footer .statut-complete { background: #d1fae5; color: #065f46; }
    .carte-footer .statut-annule { background: #fee2e2; color: #991b1b; }

    .paiements-panel { margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; border-top: 1px solid #e5e7eb; }
    ::ng-deep .paiements-panel .mat-expansion-panel-body { padding: 8px 16px !important; }
    .paiements-list { display: flex; flex-direction: column; gap: 8px; }
    .paiement-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f3f4f6; border-radius: 6px; }
    .paiement-info { display: flex; flex-direction: column; gap: 2px; }
    .paiement-date { font-size: 13px; font-weight: 500; color: #1f2937; }
    .paiement-methode { font-size: 11px; color: #6b7280; }
    .paiement-montant { font-weight: 700; color: #10b981; }

    .empty-state { text-align: center; padding: 60px 20px; color: #6b7280; }
    .empty-state mat-icon { font-size: 80px; width: 80px; height: 80px; margin-bottom: 20px; opacity: 0.5; }
    .empty-state h3 { font-size: 20px; margin: 0 0 8px 0; color: #374151; }
    .empty-state p { margin: 0; }

    .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 20px; }

    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .paiement-modal { width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
    .paiement-modal mat-card-title { display: flex; align-items: center; gap: 8px; }
    .paiement-info-header { padding: 16px; background: #f3f4f6; border-radius: 8px; margin-bottom: 16px; }
    .paiement-info-header p { margin: 4px 0; }
    .full-width { width: 100%; }

    .delete-action { color: #ef4444 !important; }
    .delete-action mat-icon { color: #ef4444 !important; }

    /* Dark mode adjustments */
    ::ng-deep .mat-mdc-option .mdc-list-item__primary-text { color: #1e293b !important; }
    ::ng-deep .mat-mdc-select-panel { background-color: #ffffff !important; }
    ::ng-deep .mat-mdc-option:hover { background-color: #e0f2fe !important; }
  `]
})
export class CartesCodebafComponent implements OnInit {
  carteService = inject(CarteCodebafService);
  private memberService = inject(MemberService);
  authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);

  loading = signal(false);
  creating = signal(false);
  savingPaiement = signal(false);
  showCreateForm = signal(false);
  showPaiementForm = signal(false);
  // Editing state
  editingCarteId = signal<string | null>(null);

  cartes = signal<CarteCodebaf[]>([]);
  membres = signal<Member[]>([]);
  stats = signal<CarteCodebafStats | null>(null);
  selectedCarte = signal<CarteCodebaf | null>(null);

  selectedAnnee = signal<number | null>(null);
  selectedType = signal<string | null>(null);
  selectedStatut = signal<string | null>(null);

  availableAnnees = signal<number[]>([]);
  futureAnnees = computed(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  });

  carteForm: FormGroup;
  paiementForm: FormGroup;

  constructor() {
    this.carteForm = this.fb.group({
      membre: ['', Validators.required],
      annee: [new Date().getFullYear(), Validators.required],
      montantTotal: ['', [Validators.required, Validators.min(1000)]],
      frequencePaiement: ['annuel'],
      notes: [''],
      statut: ['en_cours']
    });

    this.paiementForm = this.fb.group({
      montant: ['', Validators.required],
      methodePaiement: ['especes'],
      referenceTransaction: [''],
      notes: ['']
    });
  }

  ngOnInit() {
    this.loadCartes();
    this.loadMembres();
    this.loadAnnees();
  }

  loadCartes() {
    this.loading.set(true);
    const filters: any = {};
    if (this.selectedAnnee()) filters.annee = this.selectedAnnee();
    if (this.selectedType()) filters.typeCarte = this.selectedType();
    if (this.selectedStatut()) filters.statut = this.selectedStatut();

    this.carteService.getCartes(filters).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success && response.data) {
          this.cartes.set(response.data);
        }
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Erreur:', error);
        this.snackBar.open('Erreur lors du chargement des cartes', 'Fermer', { duration: 3000 });
      }
    });

    // Charger les statistiques
    this.carteService.getStatistiques(this.selectedAnnee() || undefined).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.stats.set(response.data);
        }
      },
      error: (error) => console.error('Erreur stats:', error)
    });
  }

  loadMembres() {
    this.memberService.getMembers().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.membres.set(response.data);
        }
      },
      error: (error) => console.error('Erreur membres:', error)
    });
  }

  loadAnnees() {
    const currentYear = new Date().getFullYear();
    // Générer les années de 2020 à l'année prochaine
    const annees = [];
    for (let i = currentYear + 1; i >= 2020; i--) {
      annees.push(i);
    }
    this.availableAnnees.set(annees);
  }

  createCarte() {
    if (this.carteForm.invalid) return;

    this.creating.set(true);

    const payload: any = {
      montantTotal: Number(this.carteForm.value.montantTotal),
      frequencePaiement: this.carteForm.value.frequencePaiement,
      notes: this.carteForm.value.notes
    };

    // If editing, call update endpoint
    if (this.editingCarteId()) {
      // allow updating statut if present in the form
      if (this.carteForm.value.statut) payload.statut = this.carteForm.value.statut;

      this.carteService.updateCarte(this.editingCarteId()!, payload).subscribe({
        next: (response) => {
          this.creating.set(false);
          if (response.success) {
            this.snackBar.open('Carte mise à jour avec succès', 'Fermer', { duration: 3000 });
            this.editingCarteId.set(null);
            this.showCreateForm.set(false);
            this.carteForm.reset({ annee: new Date().getFullYear(), frequencePaiement: 'annuel' });
            this.loadCartes();
          }
        },
        error: (error) => {
          this.creating.set(false);
          const message = error.error?.message || 'Erreur lors de la mise à jour';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
        }
      });
      return;
    }

    // Otherwise create new
    this.carteService.createCarte(this.carteForm.value).subscribe({
      next: (response) => {
        this.creating.set(false);
        if (response.success) {
          this.snackBar.open('Carte créée avec succès', 'Fermer', { duration: 3000 });
          this.showCreateForm.set(false);
          this.carteForm.reset({ annee: new Date().getFullYear(), frequencePaiement: 'annuel' });
          this.loadCartes();
        }
      },
      error: (error) => {
        this.creating.set(false);
        const message = error.error?.message || 'Erreur lors de la création';
        this.snackBar.open(message, 'Fermer', { duration: 3000 });
      }
    });
  }

  openEditForm(carte: CarteCodebaf) {
    // Prefill form with carte values and open form for editing
    this.editingCarteId.set(carte._id as unknown as string);
    this.carteForm.patchValue({
      membre: typeof carte.membre === 'object' ? (carte.membre as any)._id : carte.membre,
      annee: carte.annee,
      montantTotal: carte.montantTotal,
      frequencePaiement: carte.frequencePaiement,
      notes: carte.notes || '',
      statut: carte.statut
    });
    this.showCreateForm.set(true);
  }

  cancelCreateOrEdit() {
    this.editingCarteId.set(null);
    this.showCreateForm.set(false);
    this.carteForm.reset({ annee: new Date().getFullYear(), frequencePaiement: 'annuel' });
  }

  openPaiementForm(carte: CarteCodebaf) {
    this.selectedCarte.set(carte);
    this.paiementForm.reset({ methodePaiement: 'especes' });
    this.paiementForm.get('montant')?.setValidators([
      Validators.required,
      Validators.min(1),
      Validators.max(carte.montantRestant)
    ]);
    this.showPaiementForm.set(true);
  }

  closePaiementForm() {
    this.showPaiementForm.set(false);
    this.selectedCarte.set(null);
  }

  enregistrerPaiement() {
    if (this.paiementForm.invalid || !this.selectedCarte()) return;

    this.savingPaiement.set(true);
    this.carteService.enregistrerPaiement(this.selectedCarte()!._id, this.paiementForm.value).subscribe({
      next: (response) => {
        this.savingPaiement.set(false);
        if (response.success) {
          this.snackBar.open('Paiement enregistré avec succès', 'Fermer', { duration: 3000 });
          this.closePaiementForm();
          this.loadCartes();
        }
      },
      error: (error) => {
        this.savingPaiement.set(false);
        const message = error.error?.message || 'Erreur lors de l\'enregistrement';
        this.snackBar.open(message, 'Fermer', { duration: 3000 });
      }
    });
  }

  viewDetails(carte: CarteCodebaf) {
    // Pour l'instant, on ouvre simplement le panneau des paiements
    this.snackBar.open('Détails de la carte affichés', 'Fermer', { duration: 2000 });
  }

  deleteCarte(carte: CarteCodebaf) {
    (async () => {
      const { ConfirmDialogComponent } = await import('../../shared/confirm-dialog.component');
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '520px',
        data: {
          title: 'Supprimer la carte',
          message: `Êtes-vous sûr de vouloir supprimer la carte de ${this.getMemberName(carte.membre)} pour ${carte.annee}?`,
          confirmLabel: 'Supprimer',
          cancelLabel: 'Annuler',
          requireReason: false
        }
      } as any);

      dialogRef.afterClosed().subscribe((result: any) => {
        if (!result || !result.confirmed) return;

        this.carteService.deleteCarte(carte._id).subscribe({
          next: (response) => {
            if (response.success) {
              this.snackBar.open('Carte supprimée', 'Fermer', { duration: 3000 });
              this.loadCartes();
            }
          },
          error: (error) => {
            const message = error.error?.message || 'Erreur lors de la suppression';
            this.snackBar.open(message, 'Fermer', { duration: 3000 });
          }
        });
      });
    })();
  }

  getMemberName(member: Member | string): string {
    if (!member) return 'Inconnu';
    if (typeof member === 'string') return member;
    return `${member.nom} ${member.prenom}`;
  }

  getTypeFromMontant(montant: number): string {
    if (!montant) return 'Classique';
    const type = this.carteService.determinerTypeCarte(montant);
    return `${this.getTypeEmoji(type)} ${this.carteService.getTypeCarteLabel(type)}`;
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

  getTypeCount(type: string): number {
    return this.cartes().filter(c => c.typeCarte === type).length;
  }

  getFrequenceLabel(frequence: string): string {
    const labels: { [key: string]: string } = {
      'annuel': '📅 Annuel',
      'trimestriel': '📆 Trimestriel',
      'mensuel': '🗓️ Mensuel'
    };
    return labels[frequence] || frequence;
  }

  getStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'en_cours': 'En cours',
      'complete': 'Complète',
      'annule': 'Annulée'
    };
    return labels[statut] || statut;
  }

  getMethodeLabel(methode: string): string {
    const labels: { [key: string]: string } = {
      'especes': '💵 Espèces',
      'mobile_money': '📱 Mobile Money',
      'virement': '🏦 Virement',
      'cheque': '📝 Chèque'
    };
    return labels[methode] || methode;
  }

  getProgressClass(carte: CarteCodebaf): string {
    const percent = (carte.montantPaye / carte.montantTotal) * 100;
    if (percent >= 100) return 'complete';
    if (percent >= 50) return 'warning';
    return 'low';
  }

  formatDate(date: Date | string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}
