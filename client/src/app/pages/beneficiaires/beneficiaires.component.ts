import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TourService } from '../../services/tour.service';
import { TontineService } from '../../services/tontine.service';
import { ContributionService } from '../../services/contribution.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { Tour, Tontine, Contribution } from '../../models';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MemberFilterComponent } from '../../shared/member-filter.component';

interface BeneficiaireDetail {
  tour: Tour;
  contributions: Contribution[];
  totalRecu: number;
  montantAttendu: number;
  tauxCollecte: number;
  membresAyantPaye: number;
  totalMembres: number;
}

@Component({
  selector: 'app-beneficiaires',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSelectModule,
    MatFormFieldModule,
    MatExpansionModule,
    MatTooltipModule
    ,MemberFilterComponent,
    MatDialogModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-left">
          <mat-icon class="page-icon">account_balance_wallet</mat-icon>
          <div>
            <h1>Bénéficiaires & Paiements</h1>
            <p class="subtitle">Suivi des bénéficiaires et de leurs paiements par tour</p>
          </div>
        </div>
      </div>

      <!-- Filtres -->
      <mat-card class="filter-card">
        <mat-card-content>
          <div class="filters">
            <mat-form-field appearance="outline">
              <mat-label>Tontine</mat-label>
              <mat-select [value]="selectedTontineId()" (selectionChange)="selectedTontineId.set($event.value)">
                <mat-option [value]="null">Toutes les tontines</mat-option>
                @for (tontine of tontines(); track tontine._id) {
                  <mat-option [value]="tontine._id">{{ tontine.nom }}</mat-option>
                }
              </mat-select>
              <mat-icon matPrefix>filter_list</mat-icon>
            </mat-form-field>

            @if (selectedTontineId()) {
              <mat-form-field appearance="outline">
                <mat-label>Cycle</mat-label>
                <mat-select [value]="selectedCycle()" (selectionChange)="selectedCycle.set($event.value)">
                  <mat-option [value]="null">Tous les cycles</mat-option>
                  @for (cycle of availableCycles(); track cycle) {
                    <mat-option [value]="cycle">Cycle {{ cycle }}</mat-option>
                  }
                </mat-select>
                <mat-icon matPrefix>autorenew</mat-icon>
              </mat-form-field>
            }

            <app-member-filter (memberSelected)="onMemberFilter($event)"></app-member-filter>

            @if (selectedTontineId()) {
              <button mat-raised-button color="primary" (click)="downloadPDF()">
                <mat-icon>picture_as_pdf</mat-icon>
                Télécharger PDF
              </button>
            }
          </div>
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <div class="loading-container">
          <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
          <p>Chargement des données...</p>
        </div>
      } @else if (!selectedTontineId()) {
        <mat-card class="empty-state-card">
          <mat-card-content>
            <div class="empty-state">
              <mat-icon>info</mat-icon>
              <h3>Sélectionnez une tontine</h3>
              <p>Choisissez une tontine dans le filtre ci-dessus pour voir les bénéficiaires et leurs paiements</p>
            </div>
          </mat-card-content>
        </mat-card>
      } @else if (beneficiaires().length === 0) {
        <mat-card class="empty-state-card">
          <mat-card-content>
            <div class="empty-state">
              <mat-icon>casino</mat-icon>
              <h3>Aucun bénéficiaire</h3>
              <p>Aucun tour n'a encore été attribué pour cette tontine</p>
            </div>
          </mat-card-content>
        </mat-card>
      } @else {
        <!-- Statistiques globales -->
        @if (selectedTontine()) {
          <div class="stats-row">
            <mat-card class="stat-mini">
              <mat-card-content>
                <mat-icon class="stat-icon primary">people</mat-icon>
                <div class="stat-content">
                  <h3>{{ beneficiaires().length }}</h3>
                  <p>Bénéficiaires</p>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-mini">
              <mat-card-content>
                <mat-icon class="stat-icon success">payments</mat-icon>
                <div class="stat-content">
                  <h3>{{ totalMontantCollecte() | number:'1.0-0' }} FCFA</h3>
                  <p>Total collecté</p>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-mini">
              <mat-card-content>
                <mat-icon class="stat-icon warning">trending_up</mat-icon>
                <div class="stat-content">
                  <h3>{{ tauxCollecteGlobal() }}%</h3>
                  <p>Taux de collecte</p>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-mini">
              <mat-card-content>
                <mat-icon class="stat-icon info">check_circle</mat-icon>
                <div class="stat-content">
                  <h3>{{ beneficiairesPayes() }} / {{ beneficiaires().length }}</h3>
                  <p>Payés</p>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        }

        <!-- Liste des bénéficiaires -->
        <mat-accordion multi>
          @for (beneficiaire of beneficiaires(); track beneficiaire.tour._id) {
            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <div class="beneficiaire-header">
                    <div class="beneficiaire-avatar">
                      {{ getMemberInitials(beneficiaire.tour.beneficiaire) }}
                    </div>
                    <div class="beneficiaire-info">
                      <h4>{{ getMemberName(beneficiaire.tour.beneficiaire) }}</h4>
                      <div class="beneficiaire-meta">
                        <span class="cycle-badge">Cycle {{ beneficiaire.tour.cycle }}</span>
                        <span class="amount">{{ beneficiaire.totalRecu | number:'1.0-0' }} FCFA / {{ beneficiaire.montantAttendu | number:'1.0-0' }} FCFA</span>
                      </div>
                    </div>
                  </div>
                </mat-panel-title>
                <mat-panel-description>
                  <div class="status-info">
                    <span class="status-chip" [ngClass]="'status-' + beneficiaire.tour.statut">
                      {{ getStatutLabel(beneficiaire.tour.statut) }}
                    </span>
                    <span class="progress-badge" [ngClass]="getProgressClass(beneficiaire.tauxCollecte)">
                      {{ beneficiaire.tauxCollecte }}%
                    </span>
                  </div>
                </mat-panel-description>
              </mat-expansion-panel-header>

              <div class="panel-content">
                <!-- Détails du tour -->
                <div class="tour-details">
                  <div class="detail-row">
                    <mat-icon>event</mat-icon>
                    <span><strong>Date attribution:</strong> {{ formatDate(beneficiaire.tour.dateAttribution) }}</span>
                  </div>
                  <div class="detail-row reception-prevue">
                    <mat-icon>calendar_today</mat-icon>
                    <span><strong>Date réception prévue:</strong> {{ formatDate(beneficiaire.tour.dateReceptionPrevue) }}</span>
                  </div>
                  @if (beneficiaire.tour.datePaiement) {
                    <div class="detail-row">
                      <mat-icon>check_circle</mat-icon>
                      <span><strong>Date paiement:</strong> {{ formatDate(beneficiaire.tour.datePaiement) }}</span>
                    </div>
                  }
                  <div class="detail-row">
                    <mat-icon>account_balance_wallet</mat-icon>
                    <span><strong>Montant attendu:</strong> {{ beneficiaire.montantAttendu | number:'1.0-0' }} FCFA</span>
                  </div>
                  <div class="detail-row">
                    <mat-icon>paid</mat-icon>
                    <span><strong>Montant reçu:</strong> {{ beneficiaire.totalRecu | number:'1.0-0' }} FCFA</span>
                  </div>
                  <div class="detail-row">
                    <mat-icon>people</mat-icon>
                    <span><strong>Membres ayant payé:</strong> {{ beneficiaire.membresAyantPaye }} / {{ beneficiaire.totalMembres }}</span>
                  </div>
                </div>

                <!-- Tableau des cotisations -->
                @if (beneficiaire.contributions.length > 0) {
                  <div class="contributions-section">
                    <h4 class="section-title">
                      <mat-icon>receipt</mat-icon>
                      Détail des cotisations reçues
                    </h4>
                    <table mat-table [dataSource]="beneficiaire.contributions" class="contributions-table">
                      <!-- Membre Column -->
                      <ng-container matColumnDef="membre">
                        <th mat-header-cell *matHeaderCellDef>Membre</th>
                        <td mat-cell *matCellDef="let contribution">
                          <div class="member-cell">
                            <div class="member-avatar-small">
                              {{ getContributionMemberInitials(contribution) }}
                            </div>
                            <span>{{ getContributionMemberName(contribution) }}</span>
                          </div>
                        </td>
                      </ng-container>

                      <!-- Montant Column -->
                      <ng-container matColumnDef="montant">
                        <th mat-header-cell *matHeaderCellDef>Montant</th>
                        <td mat-cell *matCellDef="let contribution">
                          <strong class="montant">{{ contribution.montant | number:'1.0-0' }} FCFA</strong>
                        </td>
                      </ng-container>

                      <!-- Méthode Column -->
                      <ng-container matColumnDef="methode">
                        <th mat-header-cell *matHeaderCellDef>Méthode</th>
                        <td mat-cell *matCellDef="let contribution">
                          <span class="methode-chip" [ngClass]="'methode-' + contribution.methodePaiement">
                            {{ getMethodeLabel(contribution.methodePaiement) }}
                          </span>
                        </td>
                      </ng-container>

                      <!-- Date Column -->
                      <ng-container matColumnDef="date">
                        <th mat-header-cell *matHeaderCellDef>Date</th>
                        <td mat-cell *matCellDef="let contribution">
                          {{ formatDate(contribution.datePaiement) }}
                        </td>
                      </ng-container>

                      <!-- Statut Column -->
                      <ng-container matColumnDef="statut">
                        <th mat-header-cell *matHeaderCellDef>Statut</th>
                        <td mat-cell *matCellDef="let contribution">
                          <span class="statut-chip" [ngClass]="'statut-' + contribution.statut">
                            {{ getContributionStatutLabel(contribution.statut) }}
                          </span>
                        </td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
                    </table>

                    <div class="contributions-summary">
                      <strong>Total des cotisations reçues:</strong>
                      <span class="total-amount">{{ beneficiaire.totalRecu | number:'1.0-0' }} FCFA</span>
                    </div>
                  </div>
                } @else {
                  <div class="no-contributions">
                    <mat-icon>info</mat-icon>
                    <p>Aucune cotisation enregistrée pour ce bénéficiaire</p>
                  </div>
                }

                <!-- Actions disponibles -->
                <div class="actions-section">
                  <h4 class="section-title">
                    <mat-icon>settings</mat-icon>
                    Actions
                  </h4>
                  <div class="actions-grid">
                    <button mat-raised-button color="primary" (click)="downloadBeneficiairePDF(beneficiaire)">
                      <mat-icon>picture_as_pdf</mat-icon>
                      Télécharger le reçu
                    </button>
                    
                    @if (authService.hasRole('admin') || authService.hasRole('tresorier')) {
                      <button mat-stroked-button color="accent" (click)="markAsPaid(beneficiaire)" 
                              [disabled]="beneficiaire.tour.statut === 'paye'">
                        <mat-icon>check_circle</mat-icon>
                        Marquer comme payé
                      </button>
                    }
                    
                    @if (authService.hasRole('admin')) {
                      <button mat-stroked-button color="warn" (click)="deleteBeneficiaire(beneficiaire)">
                        <mat-icon>delete</mat-icon>
                        Supprimer le bénéficiaire
                      </button>
                    }
                  </div>
                </div>
              </div>
            </mat-expansion-panel>
          }
        </mat-accordion>
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

      .header-left {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .page-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #2563eb;
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
    }

    .filter-card {
      margin-bottom: 24px;
      border-radius: 12px !important;
      border: 1px solid var(--border-color);
    }

    .filters {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;

      mat-form-field {
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

    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-mini {
      border-radius: 12px !important;
      border: 1px solid var(--border-color);

      mat-card-content {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px !important;
      }

      .stat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
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

        &.info {
          background: linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%);
          color: white;
        }
      }

      .stat-content {
        h3 {
          font-size: 24px;
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

    mat-accordion {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    mat-expansion-panel {
      border-radius: 12px !important;
      border: 1px solid var(--border-color);
      box-shadow: none !important;

      &:not(.mat-expanded) {
        &:hover {
          background: #f8fafc;
        }
      }
    }

    .beneficiaire-header {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;

      .beneficiaire-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 16px;
        flex-shrink: 0;
      }

      .beneficiaire-info {
        flex: 1;

        h4 {
          margin: 0 0 6px 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .beneficiaire-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;

          .cycle-badge {
            padding: 4px 10px;
            background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
            color: white;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
          }

          .amount {
            font-size: 13px;
            color: var(--text-secondary);
            font-weight: 500;
          }
        }
      }
    }

    .status-info {
      display: flex;
      align-items: center;
      gap: 8px;

      .status-chip, .progress-badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .status-chip {
        &.status-attribue {
          background: #3b82f6;
          color: white;
        }

        &.status-paye {
          background: #10b981;
          color: white;
        }

        &.status-en_attente {
          background: #f59e0b;
          color: white;
        }
      }

      .progress-badge {
        &.progress-low {
          background: #fef3c7;
          color: #92400e;
        }

        &.progress-medium {
          background: #dbeafe;
          color: #1e40af;
        }

        &.progress-high {
          background: #d1fae5;
          color: #065f46;
        }
      }
    }

    .panel-content {
      padding: 24px;
      background: #f8fafc;
    }

    .tour-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      border: 1px solid var(--border-color);

      .detail-row {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--text-secondary);
        font-size: 14px;

        mat-icon {
          color: #2563eb;
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        strong {
          color: var(--text-primary);
        }

        &.reception-prevue {
          background: #eff6ff;
          padding: 10px;
          border-radius: 8px;
          border-left: 4px solid #2563eb;

          mat-icon {
            color: #2563eb;
          }

          span {
            color: #1e40af;
            font-weight: 500;
          }
        }
      }
    }

    .contributions-section {
      background: white;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      overflow: hidden;

      .section-title {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 20px;
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
        border-bottom: 1px solid var(--border-color);

        mat-icon {
          color: #2563eb;
        }
      }
    }

    .contributions-table {
      width: 100%;

      th {
        background: #f8fafc;
        font-weight: 600;
        color: #475569;
        font-size: 12px;
        text-transform: uppercase;
      }

      td {
        padding: 16px;
      }

      tr:hover {
        background: #f8fafc;
      }
    }

    .member-cell {
      display: flex;
      align-items: center;
      gap: 10px;

      .member-avatar-small {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 12px;
      }
    }

    .montant {
      color: #059669;
      font-family: 'Courier New', monospace;
    }

    .methode-chip {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;

      &.methode-especes {
        background: #059669;
        color: white;
      }

      &.methode-mobile_money {
        background: #dc2626;
        color: white;
      }

      &.methode-virement {
        background: #2563eb;
        color: white;
      }

      &.methode-cheque {
        background: #7c3aed;
        color: white;
      }
    }

    .statut-chip {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;

      &.statut-recu {
        background: #10b981;
        color: white;
      }

      &.statut-en_attente {
        background: #f59e0b;
        color: white;
      }
    }

    .contributions-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      background: #f8fafc;
      border-top: 2px solid var(--border-color);
      font-size: 16px;

      strong {
        color: var(--text-primary);
      }

      .total-amount {
        font-size: 20px;
        font-weight: 700;
        color: #059669;
        font-family: 'Courier New', monospace;
      }
    }

    .no-contributions {
      text-align: center;
      padding: 40px 20px;
      background: white;
      border-radius: 12px;
      border: 1px solid var(--border-color);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #cbd5e1;
        margin-bottom: 12px;
      }

      p {
        color: var(--text-secondary);
        margin: 0;
      }
    }

    .actions-section {
      background: white;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      margin-bottom: 24px;

      .section-title {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 20px;
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
        border-bottom: 1px solid var(--border-color);

        mat-icon {
          color: #2563eb;
        }
      }

      .actions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        padding: 20px;

        button {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
          min-height: 44px;

          mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
          }

          &[disabled] {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }
      }
    }

    @media (max-width: 768px) {
      .page-container {
        padding: 16px;
      }

      .filters {
        flex-direction: column;

        mat-form-field {
          width: 100%;
        }
      }

      .stats-row {
        grid-template-columns: 1fr;
      }

      .tour-details {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BeneficiairesComponent implements OnInit {
  private tourService = inject(TourService);
  private tontineService = inject(TontineService);
  private contributionService = inject(ContributionService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  authService = inject(AuthService);

  loading = signal(true);
  tours = signal<Tour[]>([]);
  tontines = signal<Tontine[]>([]);
  contributions = signal<Contribution[]>([]);
  selectedMemberId = signal<string | null>(null);

  selectedTontineId = signal<string | null>(null);
  selectedCycle = signal<number | null>(null);

  displayedColumns = ['membre', 'montant', 'methode', 'date', 'statut'];

  beneficiaires = computed(() => {
    const tontineId = this.selectedTontineId();
    if (!tontineId) return [];

    const cycle = this.selectedCycle();
    const filtered = this.tours().filter(tour => {
      if (!tour.tontine) return false;
      const tourTontineId = typeof tour.tontine === 'string' ? tour.tontine : tour.tontine._id;
      const matchTontine = tourTontineId === tontineId;
      const matchCycle = cycle ? tour.cycle === cycle : true;
      return matchTontine && matchCycle;
    });

    const memberId = this.selectedMemberId();
    const final = memberId ? filtered.filter(t => {
      if (!t.beneficiaire) return false;
      const bId = typeof t.beneficiaire === 'string' ? t.beneficiaire : t.beneficiaire._id;
      return bId === memberId;
    }) : filtered;

    return final.map(tour => this.buildBeneficiaireDetail(tour));
  });

  selectedTontine = computed(() => {
    const tontineId = this.selectedTontineId();
    if (!tontineId) return null;
    return this.tontines().find(t => t._id === tontineId) || null;
  });

  availableCycles = computed(() => {
    const tontineId = this.selectedTontineId();
    if (!tontineId) return [];
    const cycles = this.tours()
      .filter(tour => {
        if (!tour.tontine) return false;
        const tId = typeof tour.tontine === 'string' ? tour.tontine : tour.tontine._id;
        return tId === tontineId;
      })
      .map(tour => tour.cycle);
    return [...new Set(cycles)].sort((a, b) => a - b);
  });

  totalMontantCollecte = computed(() => {
    return this.beneficiaires().reduce((sum, b) => sum + b.totalRecu, 0);
  });

  tauxCollecteGlobal = computed(() => {
    const beneficiaires = this.beneficiaires();
    if (beneficiaires.length === 0) return 0;
    const total = beneficiaires.reduce((sum, b) => sum + b.tauxCollecte, 0);
    return Math.round(total / beneficiaires.length);
  });

  beneficiairesPayes = computed(() => {
    return this.beneficiaires().filter(b => b.tour.statut === 'paye').length;
  });

  ngOnInit() {
    this.loadTontines();
    this.loadTours();
    this.loadContributions();
  }

  onMemberFilter(memberId: string | null) {
    this.selectedMemberId.set(memberId);
  }

  loadTontines() {
    this.tontineService.getTontines().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tontines.set(response.data);
        }
      }
    });
  }

  loadTours() {
    this.tourService.getTours().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tours.set(response.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Erreur lors du chargement des tours', 'Fermer', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  loadContributions() {
    this.contributionService.getContributions().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.contributions.set(response.data);
        }
      }
    });
  }

  onFilterChange() {
    // Les computed properties se mettront à jour automatiquement
  }

  buildBeneficiaireDetail(tour: Tour): BeneficiaireDetail {
    if (!tour.tontine || !tour.beneficiaire) {
      return {
        tour,
        contributions: [],
        totalRecu: 0,
        montantAttendu: 0,
        tauxCollecte: 0,
        membresAyantPaye: 0,
        totalMembres: 0
      };
    }

    const tontineId = typeof tour.tontine === 'string' ? tour.tontine : tour.tontine._id;
    const beneficiaireId = typeof tour.beneficiaire === 'string' ? tour.beneficiaire : tour.beneficiaire._id;

    // Récupérer les cotisations pour ce cycle et cette tontine
    const tourContributions = this.contributions().filter(c => {
      if (!c.tontine) return false;
      const cTontineId = typeof c.tontine === 'string' ? c.tontine : c.tontine._id;
      return cTontineId === tontineId && c.cycle === tour.cycle && c.statut === 'recu';
    });

    const totalRecu = tourContributions.reduce((sum, c) => sum + c.montant, 0);
    const tontine = this.selectedTontine();
    const montantAttendu = tontine ? tontine.montantCotisation * tontine.nombreMembres : 0;
    const tauxCollecte = montantAttendu > 0 ? Math.round((totalRecu / montantAttendu) * 100) : 0;
    
    // Compter les membres uniques ayant payé
    const membresAyantPaye = new Set(
      tourContributions
        .filter(c => c.membre)
        .map(c => typeof c.membre === 'string' ? c.membre : c.membre!._id)
    ).size;

    return {
      tour,
      contributions: tourContributions,
      totalRecu,
      montantAttendu,
      tauxCollecte,
      membresAyantPaye,
      totalMembres: tontine?.nombreMembres || 0
    };
  }

  downloadPDF() {
    if (!this.selectedTontine()) {
      this.snackBar.open('Veuillez sélectionner une tontine', 'Fermer', { duration: 3000 });
      return;
    }

    const doc = new jsPDF();
    const tontine = this.selectedTontine()!;
    const beneficiaires = this.beneficiaires();

    // En-tête
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Rapport des Bénéficiaires', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tontine: ${tontine.nom}`, 20, 35);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 20, 42);
    
    if (this.selectedCycle) {
      doc.text(`Cycle: ${this.selectedCycle()}`, 20, 49);
    }

    // Statistiques globales
    let yPos = this.selectedCycle() ? 60 : 53;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos, 170, 25, 'F');
    doc.setFontSize(10);
    doc.text(`Nombre de bénéficiaires: ${beneficiaires.length}`, 25, yPos + 7);
    doc.text(`Total collecté: ${this.totalMontantCollecte().toLocaleString('fr-FR')} FCFA`, 25, yPos + 14);
    doc.text(`Taux de collecte moyen: ${this.tauxCollecteGlobal()}%`, 25, yPos + 21);

    // Tableau des bénéficiaires
    yPos += 35;
    const tableData = beneficiaires.map(b => [
      this.getMemberName(b.tour.beneficiaire),
      `Cycle ${b.tour.cycle}`,
      `${b.totalRecu.toLocaleString('fr-FR')} FCFA`,
      `${b.montantAttendu.toLocaleString('fr-FR')} FCFA`,
      `${b.tauxCollecte}%`,
      `${b.membresAyantPaye}/${b.totalMembres}`,
      this.getStatutLabel(b.tour.statut)
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Bénéficiaire', 'Cycle', 'Reçu', 'Attendu', 'Taux', 'Payeurs', 'Statut']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' }
      }
    });

    // Pied de page
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Page ${i} sur ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    const fileName = `beneficiaires_${tontine.nom}_${new Date().getTime()}.pdf`;
    doc.save(fileName);
    this.snackBar.open('PDF téléchargé avec succès', 'Fermer', { duration: 3000 });
  }

  downloadBeneficiairePDF(beneficiaire: BeneficiaireDetail) {
    const doc = new jsPDF();
    const tontine = this.selectedTontine()!;
    const tour = beneficiaire.tour;

    // En-tête
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Reçu de Paiement - Bénéficiaire', 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tontine: ${tontine.nom}`, 20, 35);
    doc.text(`Bénéficiaire: ${this.getMemberName(tour.beneficiaire)}`, 20, 42);
    doc.text(`Cycle: ${tour.cycle}`, 20, 49);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 20, 56);

    // Résumé
    let yPos = 70;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos, 170, 32, 'F');
    doc.setFontSize(10);
    doc.text(`Montant attendu: ${beneficiaire.montantAttendu.toLocaleString('fr-FR')} FCFA`, 25, yPos + 7);
    doc.text(`Montant reçu: ${beneficiaire.totalRecu.toLocaleString('fr-FR')} FCFA`, 25, yPos + 14);
    doc.text(`Taux de collecte: ${beneficiaire.tauxCollecte}%`, 25, yPos + 21);
    doc.text(`Membres ayant payé: ${beneficiaire.membresAyantPaye} / ${beneficiaire.totalMembres}`, 25, yPos + 28);

    // Détail des cotisations
    if (beneficiaire.contributions.length > 0) {
      yPos += 42;
      doc.setFont('helvetica', 'bold');
      doc.text('Détail des cotisations reçues:', 20, yPos);
      
      const tableData = beneficiaire.contributions.map(c => [
        this.getContributionMemberName(c),
        `${c.montant.toLocaleString('fr-FR')} FCFA`,
        this.getMethodeLabel(c.methodePaiement),
        new Date(c.datePaiement).toLocaleDateString('fr-FR'),
        this.getContributionStatutLabel(c.statut)
      ]);

      autoTable(doc, {
        startY: yPos + 5,
        head: [['Membre', 'Montant', 'Méthode', 'Date', 'Statut']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          1: { halign: 'right' }
        }
      });
    }

    const fileName = `recu_${this.getMemberName(tour.beneficiaire).replace(/\s+/g, '_')}_cycle${tour.cycle}_${new Date().getTime()}.pdf`;
    doc.save(fileName);
    this.snackBar.open('Reçu téléchargé avec succès', 'Fermer', { duration: 3000 });
  }

  async deleteBeneficiaire(beneficiaire: BeneficiaireDetail) {
    const tour = beneficiaire.tour;
    const message = `Êtes-vous sûr de vouloir supprimer le bénéficiaire ${this.getMemberName(tour.beneficiaire)} pour le cycle ${tour.cycle} ? Cette action supprimera le tour associé.`;

    const { ConfirmDialogComponent } = await import('../../shared/confirm-dialog.component');

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '520px',
      data: {
        title: 'Confirmer la suppression',
        message,
        confirmLabel: 'Supprimer',
        cancelLabel: 'Annuler',
        requireReason: false
      }
    } as any);

    dialogRef.afterClosed().subscribe((result: any) => {
      if (!result || !result.confirmed) return;

      this.tourService.deleteTour(tour._id).subscribe({
        next: () => {
          this.snackBar.open('Bénéficiaire (tour) supprimé avec succès', 'Fermer', { duration: 3000 });
          this.loadTours();
        },
        error: (error) => {
          const msg = error.error?.message || 'Erreur lors de la suppression';
          this.snackBar.open(msg, 'Fermer', { duration: 3000 });
        }
      });
    });
  }

  async markAsPaid(beneficiaire: BeneficiaireDetail) {
    const tour = beneficiaire.tour;
    const message = `Êtes-vous sûr de vouloir marquer le bénéficiaire ${this.getMemberName(tour.beneficiaire)} comme payé ? Cette action mettra à jour le statut du tour et les transactions bancaires.`;

    const { ConfirmDialogComponent } = await import('../../shared/confirm-dialog.component');

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '520px',
      data: {
        title: 'Confirmer le paiement',
        message,
        confirmLabel: 'Marquer comme payé',
        cancelLabel: 'Annuler',
        requireReason: false
      }
    } as any);

    dialogRef.afterClosed().subscribe((result: any) => {
      if (!result || !result.confirmed) return;

      this.tourService.updateStatus(tour._id, 'paye').subscribe({
        next: () => {
          this.snackBar.open('Bénéficiaire marqué comme payé avec succès', 'Fermer', { duration: 3000 });
          this.loadTours();
        },
        error: (error) => {
          const msg = error.error?.message || 'Erreur lors de la mise à jour du statut';
          this.snackBar.open(msg, 'Fermer', { duration: 3000 });
        }
      });
    });
  }

  getMemberInitials(member: any): string {
    if (typeof member === 'string') return '?';
    return `${member.nom.charAt(0)}${member.prenom.charAt(0)}`.toUpperCase();
  }

  getMemberName(member: any): string {
    if (typeof member === 'string') return 'Membre inconnu';
    return `${member.nom} ${member.prenom}`;
  }

  getContributionMemberInitials(contribution: Contribution): string {
    const member = typeof contribution.membre === 'string' ? null : contribution.membre;
    if (!member) return '?';
    return `${member.nom.charAt(0)}${member.prenom.charAt(0)}`.toUpperCase();
  }

  getContributionMemberName(contribution: Contribution): string {
    const member = typeof contribution.membre === 'string' ? null : contribution.membre;
    if (!member) return 'Membre inconnu';
    return `${member.nom} ${member.prenom}`;
  }

  getStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'attribue': 'Attribué',
      'paye': 'Payé',
      'en_attente': 'En attente'
    };
    return labels[statut] || statut;
  }

  getContributionStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'recu': 'Reçu',
      'en_attente': 'En attente'
    };
    return labels[statut] || statut;
  }

  getMethodeLabel(methode: string): string {
    const labels: { [key: string]: string } = {
      'especes': 'Espèces',
      'mobile_money': 'Mobile Money',
      'virement': 'Virement',
      'cheque': 'Chèque'
    };
    return labels[methode] || methode;
  }

  getProgressClass(taux: number): string {
    if (taux < 50) return 'progress-low';
    if (taux < 90) return 'progress-medium';
    return 'progress-high';
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
