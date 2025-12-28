import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TourService } from '../../services/tour.service';
import { TontineService } from '../../services/tontine.service';
import { BanqueService } from '../../services/banque.service';
import { AuthService } from '../../services/auth.service';
import { Tour, Tontine } from '../../models';
import { TourFormComponent } from './tour-form.component';

@Component({
  selector: 'app-tours',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-left">
          <mat-icon class="page-icon">casino</mat-icon>
          <div>
            <h1>🎰 Gestion des Tours</h1>
            <p class="subtitle">Attribution et suivi des tours de tontine</p>
          </div>
        </div>
        
        <div class="header-actions">
          @if (authService.hasRole('admin', 'tresorier')) {
            <button mat-raised-button color="primary" (click)="openTourForm('random')">
              <mat-icon>shuffle</mat-icon>
              Tirage Aléatoire
            </button>
            <button mat-raised-button color="accent" (click)="openTourForm('manual')">
              <mat-icon>person_add</mat-icon>
              Attribution Manuelle
            </button>
          }
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
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Statut</mat-label>
              <mat-select [value]="selectedStatut()" (selectionChange)="selectedStatut.set($event.value)">
                <mat-option [value]="null">Tous les statuts</mat-option>
                <mat-option value="attribue">Attribué</mat-option>
                <mat-option value="paye">Payé</mat-option>
                <mat-option value="refuse">Refusé</mat-option>
                <mat-option value="en_attente">En attente</mat-option>
              </mat-select>
            </mat-form-field>

            @if (selectedTontineId()) {
              <div class="filter-info">
                <mat-icon>info</mat-icon>
                <span>{{ filteredTours().length }} tour(s) pour cette tontine</span>
              </div>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Statistiques rapides -->
      @if (selectedTontineId() && selectedTontine()) {
        <div class="stats-row">
          <mat-card class="stat-mini">
            <mat-icon class="stat-icon primary">people</mat-icon>
            <div class="stat-content">
              <h3>{{ getActiveMembersCount() }}</h3>
              <p>Membres actifs</p>
            </div>
          </mat-card>

          <mat-card class="stat-mini">
            <mat-icon class="stat-icon success">check_circle</mat-icon>
            <div class="stat-content">
              <h3>{{ toursAttribuesCount() }}</h3>
              <p>Tours attribués</p>
            </div>
          </mat-card>

          <mat-card class="stat-mini">
            <mat-icon class="stat-icon warning">hourglass_empty</mat-icon>
            <div class="stat-content">
              <h3>{{ toursRestantsCount() }}</h3>
              <p>Tours restants</p>
            </div>
          </mat-card>

          <mat-card class="stat-mini">
            <mat-icon class="stat-icon info">payments</mat-icon>
            <div class="stat-content">
              <h3>{{ toursPagesCount() }}</h3>
              <p>Tours payés</p>
            </div>
          </mat-card>
        </div>
      }

      <!-- Liste des tours -->
      <mat-card class="table-card">
        @if (loading()) {
          <div class="loading-container">
            <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
            <p>Chargement des tours...</p>
          </div>
        } @else if (filteredTours().length === 0) {
          <div class="empty-state">
            <mat-icon>casino</mat-icon>
            <h3>Aucun tour trouvé</h3>
            <p>{{ selectedTontineId() ? 'Aucun tour n\'a encore été attribué pour cette tontine.' : 'Commencez par attribuer des tours aux membres.' }}</p>
            @if (authService.hasRole('admin', 'tresorier')) {
              <button mat-raised-button color="primary" (click)="openTourForm('random')">
                <mat-icon>shuffle</mat-icon>
                Effectuer un tirage
              </button>
            }
          </div>
        } @else {
          <div class="table-container">
            <table mat-table [dataSource]="filteredTours()" class="tours-table">
              <!-- Cycle Column -->
              <ng-container matColumnDef="cycle">
                <th mat-header-cell *matHeaderCellDef>Cycle</th>
                <td mat-cell *matCellDef="let tour">
                  <span class="cycle-badge">Cycle {{ tour.cycle }}</span>
                </td>
              </ng-container>

              <!-- Numéro de Tour Column -->
              <ng-container matColumnDef="numeroTour">
                <th mat-header-cell *matHeaderCellDef>N° Tour</th>
                <td mat-cell *matCellDef="let tour">
                  <span class="tour-number">{{ getTourNumber(tour) }}</span>
                </td>
              </ng-container>

              <!-- Bénéficiaire Column -->
              <ng-container matColumnDef="beneficiaire">
                <th mat-header-cell *matHeaderCellDef>Bénéficiaire</th>
                <td mat-cell *matCellDef="let tour">
                  <div class="member-info">
                    <div class="member-avatar">
                      {{ getMemberInitials(tour.beneficiaire) }}
                    </div>
                    <div>
                      <div class="member-name">{{ getMemberName(tour.beneficiaire) }}</div>
                      <div class="member-phone">{{ getMemberPhone(tour.beneficiaire) }}</div>
                    </div>
                  </div>
                </td>
              </ng-container>

              <!-- Tontine Column -->
              <ng-container matColumnDef="tontine">
                <th mat-header-cell *matHeaderCellDef>Tontine</th>
                <td mat-cell *matCellDef="let tour">
                  {{ getTontineName(tour.tontine) }}
                </td>
              </ng-container>

              <!-- Montant Column -->
              <ng-container matColumnDef="montant">
                <th mat-header-cell *matHeaderCellDef>Montant</th>
                <td mat-cell *matCellDef="let tour">
                  <strong class="montant">{{ tour.montantRecu | number:'1.0-0' }} FCFA</strong>
                </td>
              </ng-container>

              <!-- Mode d'attribution Column -->
              <ng-container matColumnDef="mode">
                <th mat-header-cell *matHeaderCellDef>Mode</th>
                <td mat-cell *matCellDef="let tour">
                  <span class="mode-chip" [ngClass]="'mode-' + tour.modeAttribution">
                    {{ getModeLabel(tour.modeAttribution) }}
                  </span>
                </td>
              </ng-container>

              <!-- Date Column -->
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Date attribution</th>
                <td mat-cell *matCellDef="let tour">
                  {{ formatDate(tour.dateAttribution) }}
                </td>
              </ng-container>

              <!-- Date Réception Prévue Column -->
              <ng-container matColumnDef="dateReception">
                <th mat-header-cell *matHeaderCellDef>Date réception prévue</th>
                <td mat-cell *matCellDef="let tour">
                  <div class="date-reception">
                    <mat-icon class="date-icon">event</mat-icon>
                    <span>{{ formatDate(tour.dateReceptionPrevue) }}</span>
                  </div>
                </td>
              </ng-container>

              <!-- Statut Column -->
              <ng-container matColumnDef="statut">
                <th mat-header-cell *matHeaderCellDef>Statut</th>
                <td mat-cell *matCellDef="let tour">
                  <span class="status-chip" [ngClass]="'status-' + tour.statut">
                    {{ getStatutLabel(tour.statut) }}
                  </span>
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let tour">
                  @if (authService.hasRole('admin', 'tresorier')) {
                    <div class="action-buttons">
                      @if (tour.statut === 'attribue') {
                        <button mat-icon-button color="primary" 
                                (click)="markAsPaid(tour)"
                                matTooltip="Marquer comme payé">
                          <mat-icon>payments</mat-icon>
                        </button>
                        <button mat-icon-button color="warn" 
                                (click)="markAsRefused(tour)"
                                matTooltip="Marquer comme refusé">
                          <mat-icon>block</mat-icon>
                        </button>
                      }
                      @if (tour.statut === 'refuse') {
                        <button mat-icon-button color="primary" 
                                (click)="cancelRefusal(tour, 'paye')"
                                matTooltip="Changement d'avis - Marquer comme payé">
                          <mat-icon>undo</mat-icon>
                        </button>
                        <button mat-icon-button color="accent" 
                                (click)="cancelRefusal(tour, 'attribue')"
                                matTooltip="Changement d'avis - Remettre en attente">
                          <mat-icon>replay</mat-icon>
                        </button>
                      }
                      @if (tour.statut !== 'paye' && tour.statut !== 'refuse' && authService.hasRole('admin')) {
                        <button mat-icon-button color="warn" 
                                (click)="deleteTour(tour)"
                                matTooltip="Supprimer">
                          <mat-icon>delete</mat-icon>
                        </button>
                      }
                    </div>
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>
        }
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

    .header-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
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
        min-width: 200px;
      }
    }

    .filter-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #e0f2fe;
      border-radius: 8px;
      color: #0369a1;
      font-weight: 500;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-mini {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px !important;
      border-radius: 12px !important;
      border: 1px solid var(--border-color);

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

    .table-card {
      border-radius: 12px !important;
      border: 1px solid var(--border-color);
      overflow: hidden;
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
      text-align: center;
      padding: 80px 20px;

      mat-icon {
        font-size: 80px;
        width: 80px;
        height: 80px;
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
        margin: 0 0 24px 0;
        font-size: 16px;
      }
    }

    .table-container {
      overflow-x: auto;
    }

    .tours-table {
      width: 100%;

      th {
        background: #f8fafc;
        font-weight: 600;
        color: #475569;
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
    }

    .cycle-badge {
      display: inline-block;
      padding: 6px 12px;
      background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
      color: white;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
    }

    .member-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .member-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
    }

    .member-name {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 14px;
    }

    .member-phone {
      color: var(--text-secondary);
      font-size: 12px;
    }

    .montant {
      color: #059669;
      font-family: 'Courier New', monospace;
    }

    .date-reception {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #2563eb;
      font-weight: 500;
    }

    .date-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #2563eb;
    }

    .tour-number {
      display: inline-block;
      padding: 6px 12px;
      background: linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%);
      color: white;
      border-radius: 6px;
      font-weight: 700;
      font-size: 14px;
    }

    .mode-chip, .status-chip {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .mode-chip {
      &.mode-tirage_au_sort {
        background: #2563eb;
        color: white;
      }

      &.mode-manuel {
        background: #ec4899;
        color: white;
      }

      &.mode-ordre_alphabetique {
        background: #8b5cf6;
        color: white;
      }

      &.mode-urgence {
        background: #f97316;
        color: white;
      }
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

      &.status-refuse {
        background: #dc2626;
        color: white;
      }
    }

    .action-buttons {
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
      }

      .header-actions {
        width: 100%;

        button {
          flex: 1;
        }
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
    }
  `]
})
export class ToursComponent implements OnInit {
  authService = inject(AuthService);
  private tourService = inject(TourService);
  private tontineService = inject(TontineService);
  private banqueService = inject(BanqueService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  loading = signal(true);
  tours = signal<Tour[]>([]);
  tontines = signal<Tontine[]>([]);

  selectedTontineId = signal<string | null>(null);
  selectedStatut = signal<string | null>(null);

  displayedColumns = ['cycle', 'numeroTour', 'beneficiaire', 'tontine', 'montant', 'mode', 'date', 'dateReception', 'statut', 'actions'];

  filteredTours = computed(() => {
    let filtered = this.tours();

    const tontineId = this.selectedTontineId();
    if (tontineId) {
      filtered = filtered.filter(t => {
        if (!t.tontine) return false;
        return (typeof t.tontine === 'string' ? t.tontine : t.tontine._id) === tontineId;
      });
    }

    const statut = this.selectedStatut();
    if (statut) {
      filtered = filtered.filter(t => t.statut === statut);
    }

    // Trier par cycle puis par numéro de tour croissant
    return filtered.sort((a, b) => {
      // D'abord par cycle
      if (a.cycle !== b.cycle) {
        return a.cycle - b.cycle;
      }
      // Ensuite par numéro de tour
      const numA = a.numeroTour || 0;
      const numB = b.numeroTour || 0;
      return numA - numB;
    });
  });

  selectedTontine = computed(() => {
    const tontineId = this.selectedTontineId();
    if (!tontineId) return null;
    return this.tontines().find(t => t._id === tontineId) || null;
  });

  // Calculer le nombre de membres actifs dynamiquement
  getActiveMembersCount(): number {
    const tontine = this.selectedTontine();
    if (!tontine || !tontine.membres) return 0;
    return tontine.membres.filter((m: any) => m.isActive !== false).length;
  }

  toursAttribuesCount = computed(() => this.filteredTours().length);
  toursRestantsCount = computed(() => {
    const membresActifs = this.getActiveMembersCount();
    if (membresActifs === 0) return 0;
    return membresActifs - this.toursAttribuesCount();
  });
  toursPagesCount = computed(() => 
    this.filteredTours().filter(t => t.statut === 'paye').length
  );

  ngOnInit() {
    this.loadTontines();
    this.loadTours();
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
    this.loading.set(true);
    this.tourService.getTours(
      this.selectedTontineId() || undefined,
      undefined,
      undefined,
      this.selectedStatut() || undefined
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tours.set(response.data);
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.snackBar.open('Erreur lors du chargement des tours', 'Fermer', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  openTourForm(mode: 'random' | 'manual') {
    const dialogRef = this.dialog.open(TourFormComponent, {
      width: '600px',
      data: { mode, tontines: this.tontines() }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTours();
      }
    });
  }

  markAsPaid(tour: Tour) {
    this.tourService.updateStatus(tour._id, 'paye', new Date()).subscribe({
      next: (response) => {
        this.snackBar.open('Tour marqué comme payé', 'Fermer', { duration: 3000 });
        this.loadTours();
      },
      error: (error) => {
        this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', { duration: 3000 });
      }
    });
  }

  markAsRefused(tour: Tour) {
    const raison = prompt('Raison du refus (optionnel):');
    
    if (raison === null) return; // L'utilisateur a annulé
    
    // Récupérer l'ID de la tontine
    const tontineId = typeof tour.tontine === 'string' ? tour.tontine : tour.tontine._id;
    
    // Enregistrer le refus dans la banque (ce qui met aussi à jour le statut du tour)
    this.banqueService.enregistrerRefusTour(tontineId, tour._id, raison || undefined).subscribe({
      next: (response) => {
        this.snackBar.open('Tour marqué comme refusé - Banque mise à jour', 'Fermer', { duration: 3000 });
        this.loadTours();
      },
      error: (error) => {
        const message = error.error?.message || 'Erreur lors du refus';
        this.snackBar.open(message, 'Fermer', { duration: 3000 });
      }
    });
  }

  cancelRefusal(tour: Tour, nouveauStatut: 'attribue' | 'paye') {
    const action = nouveauStatut === 'paye' ? 'payer ce tour' : 'remettre ce tour en attente';
    
    if (!confirm(`Le membre a changé d'avis. Voulez-vous ${action} ?`)) {
      return;
    }
    
    const tontineId = typeof tour.tontine === 'string' ? tour.tontine : tour.tontine._id;
    
    this.banqueService.annulerRefusTour(tontineId, tour._id, nouveauStatut).subscribe({
      next: (response) => {
        const message = nouveauStatut === 'paye' 
          ? 'Tour maintenant payé - Refus annulé' 
          : 'Tour remis en attente - Refus annulé';
        this.snackBar.open(message, 'Fermer', { duration: 3000 });
        this.loadTours();
      },
      error: (error) => {
        const message = error.error?.message || 'Erreur lors de l\'annulation du refus';
        this.snackBar.open(message, 'Fermer', { duration: 3000 });
      }
    });
  }

  deleteTour(tour: Tour) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ce tour ?`)) {
      this.tourService.deleteTour(tour._id).subscribe({
        next: () => {
          this.snackBar.open('Tour supprimé avec succès', 'Fermer', { duration: 3000 });
          this.loadTours();
        },
        error: (error) => {
          const message = error.error?.message || 'Erreur lors de la suppression';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  getMemberInitials(member: any): string {
    if (!member || typeof member === 'string') return '?';
    return `${member.nom.charAt(0)}${member.prenom.charAt(0)}`.toUpperCase();
  }

  getMemberName(member: any): string {
    if (!member || typeof member === 'string') return 'Membre inconnu';
    return `${member.nom} ${member.prenom}`;
  }

  getMemberPhone(member: any): string {
    if (!member || typeof member === 'string') return '';
    return member.telephone || '';
  }

  getTontineName(tontine: any): string {
    if (!tontine || typeof tontine === 'string') return 'Tontine';
    return tontine.nom || 'Tontine';
  }

  getTourNumber(tour: Tour): string {
    // Utiliser le numéro de tour stocké s'il existe
    if ((tour as any).numeroTour) {
      return `${(tour as any).numeroTour}`;
    }
    
    // Fallback: calcul dynamique pour les anciens tours
    if (!tour.tontine) return '?';
    const tontineId = typeof tour.tontine === 'string' ? tour.tontine : tour.tontine._id;
    
    // Filtrer les tours de la même tontine ET du même cycle
    const cycleTours = this.tours().filter(t => {
      if (!t.tontine) return false;
      const tId = typeof t.tontine === 'string' ? t.tontine : t.tontine._id;
      return tId === tontineId && t.cycle === tour.cycle;
    });
    
    // Trier par date d'attribution pour avoir l'ordre chronologique du tirage
    cycleTours.sort((a, b) => {
      const dateA = new Date(a.dateAttribution).getTime();
      const dateB = new Date(b.dateAttribution).getTime();
      return dateA - dateB;
    });
    
    // Trouver l'index du tour actuel (position dans l'ordre du tirage pour CE cycle)
    const index = cycleTours.findIndex(t => t._id === tour._id);
    
    // Le numéro de tour est 1-indexed et recommence à 1 pour chaque nouveau cycle
    return index >= 0 ? `${index + 1}` : '?';
  }

  getModeLabel(mode: string): string {
    const labels: { [key: string]: string } = {
      'tirage_au_sort': 'Tirage au sort',
      'manuel': 'Manuel',
      'ordre_alphabetique': 'Ordre alphabétique',
      'urgence': 'Urgence'
    };
    return labels[mode] || mode;
  }

  getStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'attribue': 'Attribué',
      'paye': 'Payé',
      'refuse': 'Refusé',
      'en_attente': 'En attente'
    };
    return labels[statut] || statut;
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
