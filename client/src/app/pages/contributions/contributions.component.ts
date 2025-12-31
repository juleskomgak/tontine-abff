import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ContributionService } from '../../services/contribution.service';
import { TontineService } from '../../services/tontine.service';
import { MemberService } from '../../services/member.service';
import { TourService } from '../../services/tour.service';
import { AuthService } from '../../services/auth.service';
import { Contribution, Tontine, Member, Tour } from '../../models';
import { MemberFilterComponent } from '../../shared/member-filter.component';

@Component({
  selector: 'app-contributions',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
    ,MemberFilterComponent,
    MatDialogModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>💰 Gestion des Cotisations</h1>
          <p class="subtitle">{{ contributions().length }} cotisation(s) enregistrée(s)</p>
        </div>
        @if (authService.hasRole('admin', 'tresorier')) {
          <button mat-raised-button color="primary" (click)="showAddForm()">
            <mat-icon>add</mat-icon>
            Nouvelle Cotisation
          </button>
        }
      </div>

      @if (showForm()) {
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>➕ Enregistrer une Cotisation</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="contributionForm" (ngSubmit)="onSubmit()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Tontine</mat-label>
                <mat-select formControlName="tontine" (selectionChange)="onTontineChange($event.value)">
                  @for (tontine of tontines(); track tontine._id) {
                    <mat-option [value]="tontine._id">
                      {{ tontine.nom }} ({{ tontine.montantCotisation | number:'1.0-0' }} FCFA)
                    </mat-option>
                  }
                </mat-select>
                <mat-icon matPrefix>account_balance</mat-icon>
                @if (contributionForm.get('tontine')?.hasError('required') && contributionForm.get('tontine')?.touched) {
                  <mat-error>Tontine requise</mat-error>
                }
              </mat-form-field>

              @if (contributionForm.get('tontine')?.value) {
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Tour (Bénéficiaire)</mat-label>
                  <mat-select formControlName="tour" (selectionChange)="onTourChange($event.value)">
                    @if (loadingTours()) {
                      <mat-option disabled>Chargement des tours...</mat-option>
                    } @else if (availableTours().length === 0) {
                      <mat-option disabled>Aucun tour disponible - Effectuez d'abord un tirage</mat-option>
                    } @else {
                      @for (tour of availableTours(); track tour._id) {
                        <mat-option [value]="tour._id">
                          Tour {{ tour.numeroTour }} - {{ getTourBeneficiaireName(tour) }} 
                          ({{ tour.statut === 'paye' ? '✓ Payé' : tour.statut === 'attribue' ? '⏳ En cours' : tour.statut }})
                        </mat-option>
                      }
                    }
                  </mat-select>
                  <mat-icon matPrefix>casino</mat-icon>
                  @if (contributionForm.get('tour')?.hasError('required') && contributionForm.get('tour')?.touched) {
                    <mat-error>Tour requis - Les cotisations doivent être liées à un tour</mat-error>
                  }
                </mat-form-field>

                @if (selectedTourStats()) {
                  <div class="tour-stats-card">
                    <div class="tour-stat">
                      <mat-icon>people</mat-icon>
                      <span>{{ selectedTourStats()!.nombreCotisants }} / {{ getActiveMembersCount() }} cotisants</span>
                    </div>
                    <div class="tour-stat">
                      <mat-icon>payments</mat-icon>
                      <span>{{ selectedTourStats()!.totalCotise | number:'1.0-0' }} / {{ selectedTourStats()!.montantAttendu | number:'1.0-0' }} FCFA</span>
                    </div>
                    <div class="tour-stat progress">
                      <mat-icon>trending_up</mat-icon>
                      <span>{{ selectedTourStats()!.tauxCollecte }}% collecté</span>
                    </div>
                  </div>
                }
              }

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Membre</mat-label>
                <mat-select formControlName="membre">
                  @for (member of availableMembers(); track member._id) {
                    <mat-option [value]="member._id">
                      {{ member.nom }} {{ member.prenom }}
                      @if (hasMemberPaidForTour(member._id)) {
                        <span class="already-paid"> (Déjà payé ✓)</span>
                      }
                    </mat-option>
                  }
                </mat-select>
                <mat-icon matPrefix>person</mat-icon>
                @if (contributionForm.get('membre')?.hasError('required') && contributionForm.get('membre')?.touched) {
                  <mat-error>Membre requis</mat-error>
                }
              </mat-form-field>

              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Montant (FCFA)</mat-label>
                  <input matInput type="number" formControlName="montant" placeholder="50000">
                  <mat-icon matPrefix>payments</mat-icon>
                  @if (contributionForm.get('montant')?.hasError('required') && contributionForm.get('montant')?.touched) {
                    <mat-error>Montant requis</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Mode de Paiement</mat-label>
                  <mat-select formControlName="methodePaiement">
                    <mat-option value="especes">Espèces</mat-option>
                    <mat-option value="mobile_money">Mobile Money</mat-option>
                    <mat-option value="virement">Virement Bancaire</mat-option>
                    <mat-option value="cheque">Chèque</mat-option>
                  </mat-select>
                  <mat-icon matPrefix>payment</mat-icon>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Date de Paiement</mat-label>
                <input matInput [matDatepicker]="picker" formControlName="datePaiement">
                <mat-icon matPrefix>event</mat-icon>
                <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Notes</mat-label>
                <textarea matInput formControlName="notes" rows="2" 
                          placeholder="Notes ou remarques (optionnel)"></textarea>
                <mat-icon matPrefix>comment</mat-icon>
              </mat-form-field>

              <div class="form-actions">
                <button mat-button type="button" (click)="cancelForm()">
                  <mat-icon>close</mat-icon>
                  Annuler
                </button>
                <button mat-raised-button color="primary" type="submit" [disabled]="contributionForm.invalid || loading()">
                  <mat-icon>add</mat-icon>
                  Enregistrer
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }

      <mat-card class="table-card">
        <mat-card-content>
          <div class="filter-row" style="display:flex;justify-content:flex-end;margin-bottom:12px;">
            <app-member-filter (memberSelected)="onMemberFilter($event)"></app-member-filter>
          </div>
          @if (contributions().length === 0) {
            <div class="empty-state">
              <mat-icon>receipt_long</mat-icon>
              <h3>Aucune cotisation enregistrée</h3>
              <p>Commencez par enregistrer une cotisation</p>
            </div>
          } @else {
            <div class="table-container">
              <table mat-table [dataSource]="filteredContributions()" class="contributions-table">
                <ng-container matColumnDef="date">
                  <th mat-header-cell *matHeaderCellDef>Date</th>
                  <td mat-cell *matCellDef="let contrib">{{ formatDate(contrib.datePaiement) }}</td>
                </ng-container>

                <ng-container matColumnDef="membre">
                  <th mat-header-cell *matHeaderCellDef>Membre</th>
                  <td mat-cell *matCellDef="let contrib">
                    <strong>{{ contrib.membre?.nom }} {{ contrib.membre?.prenom }}</strong>
                  </td>
                </ng-container>

                <ng-container matColumnDef="tontine">
                  <th mat-header-cell *matHeaderCellDef>Tontine</th>
                  <td mat-cell *matCellDef="let contrib">{{ contrib.tontine?.nom }}</td>
                </ng-container>

                <ng-container matColumnDef="tour">
                  <th mat-header-cell *matHeaderCellDef>Tour</th>
                  <td mat-cell *matCellDef="let contrib">
                    @if (contrib.numeroTour) {
                      <span class="tour-badge">Tour {{ contrib.numeroTour }}</span>
                    } @else {
                      <span class="tour-badge legacy">-</span>
                    }
                  </td>
                </ng-container>

                <ng-container matColumnDef="montant">
                  <th mat-header-cell *matHeaderCellDef>Montant</th>
                  <td mat-cell *matCellDef="let contrib">
                    <strong class="montant">{{ contrib.montant | number:'1.0-0' }} FCFA</strong>
                  </td>
                </ng-container>

                <ng-container matColumnDef="mode">
                  <th mat-header-cell *matHeaderCellDef>Mode</th>
                  <td mat-cell *matCellDef="let contrib">
                    <mat-chip>{{ getModePaiementLabel(contrib.methodePaiement) }}</mat-chip>
                  </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Actions</th>
                  <td mat-cell *matCellDef="let contrib">
                    <button mat-icon-button color="primary">
                      <mat-icon>visibility</mat-icon>
                    </button>
                    @if (authService.hasRole('admin', 'tresorier')) {
                      <button mat-icon-button color="warn" (click)="deleteContribution(contrib)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    }
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>
          }
        </mat-card-content>
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

    .form-card {
      margin-bottom: 24px;
      border-radius: 12px !important;
      border: 1px solid var(--border-color);

      mat-card-header {
        margin-bottom: 20px;
      }

      mat-card-title {
        font-size: 20px;
        font-weight: 600;
        color: var(--text-primary);
      }
    }

    .form-row {
      display: flex;
      gap: 16px;

      @media (max-width: 768px) {
        flex-direction: column;
      }
    }

    .half-width {
      flex: 1;
      margin-bottom: 16px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--border-color);
    }

    .table-card {
      border-radius: 12px !important;
      border: 1px solid var(--border-color);
    }

    .table-container {
      overflow-x: auto;
    }

    .contributions-table {
      width: 100%;

      th {
        background-color: var(--background-color);
        color: var(--text-primary);
        font-weight: 600;
        padding: 16px;
      }

      td {
        padding: 16px;
        color: var(--text-primary);
      }

      tr:hover {
        background-color: var(--background-color);
      }

      .montant {
        color: var(--primary-color);
        font-size: 15px;
      }
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
        margin: 0;
      }
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
    }

    .tour-stats-card {
      display: flex;
      gap: 24px;
      padding: 16px;
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-radius: 12px;
      margin-bottom: 20px;
      border-left: 4px solid #2563eb;
    }

    .tour-stat {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #1e40af;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #2563eb;
      }

      &.progress {
        font-weight: 600;
        color: #059669;

        mat-icon {
          color: #059669;
        }
      }
    }

    .tour-badge {
      display: inline-block;
      padding: 4px 10px;
      background: linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%);
      color: white;
      border-radius: 6px;
      font-weight: 600;
      font-size: 12px;

      &.legacy {
        background: #9ca3af;
      }
    }

    .already-paid {
      color: #059669;
      font-weight: 600;
      font-size: 12px;
    }
  `]
})
export class ContributionsComponent implements OnInit {
  authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private contributionService = inject(ContributionService);
  private tontineService = inject(TontineService);
  private memberService = inject(MemberService);
  private tourService = inject(TourService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  contributions = signal<Contribution[]>([]);
  selectedMemberId = signal<string | null>(null);
  tontines = signal<Tontine[]>([]);
  members = signal<Member[]>([]);
  tours = signal<Tour[]>([]);
  tourContributions = signal<Contribution[]>([]);
  showForm = signal(false);
  loading = signal(false);
  loadingTours = signal(false);
  selectedTontineId = signal<string>('');

  displayedColumns: string[] = ['date', 'membre', 'tontine', 'tour', 'montant', 'mode', 'actions'];

  // Computed pour les tours disponibles de la tontine sélectionnée
  availableTours = computed(() => {
    const tontineId = this.selectedTontineId();
    if (!tontineId) return [];
    return this.tours().filter(t => {
      const tourTontineId = typeof t.tontine === 'string' ? t.tontine : t.tontine?._id;
      return tourTontineId === tontineId;
    }).sort((a, b) => a.numeroTour - b.numeroTour);
  });

  // Computed pour les membres de la tontine sélectionnée
  availableMembers = computed(() => {
    const tontineId = this.selectedTontineId();
    if (!tontineId) return [];
    const tontine = this.tontines().find(t => t._id === tontineId);
    if (!tontine || !tontine.membres || tontine.membres.length === 0) {
      // Retourner tous les membres si la tontine n'a pas de membres définis
      return this.members();
    }
    
    const memberIds = tontine.membres
      .filter(m => m.isActive)
      .map(m => typeof m.membre === 'string' ? m.membre : (m.membre as any)?._id);
    
    const filteredMembers = this.members().filter(m => memberIds.includes(m._id));
    
    // Si aucun membre trouvé après filtrage, retourner tous les membres
    return filteredMembers.length > 0 ? filteredMembers : this.members();
  });

  // Stats du tour sélectionné
  selectedTourStats = signal<{
    totalCotise: number;
    nombreCotisants: number;
    montantAttendu: number;
    tauxCollecte: number;
  } | null>(null);

  contributionForm: FormGroup = this.fb.group({
    tontine: ['', Validators.required],
    tour: ['', Validators.required],
    membre: ['', Validators.required],
    montant: ['', [Validators.required, Validators.min(1)]],
    datePaiement: [new Date(), Validators.required],
    methodePaiement: ['especes', Validators.required],
    notes: ['']
  });

  ngOnInit() {
    this.loadContributions();
    this.loadTontines();
    this.loadMembers();
  }

  filteredContributions = computed(() => {
    const memberId = this.selectedMemberId();
    if (!memberId) return this.contributions();
    return this.contributions().filter(c => {
      const cId = typeof c.membre === 'string' ? c.membre : (c.membre as any)?._id;
      return cId === memberId;
    });
  });

  onMemberFilter(memberId: string | null) {
    this.selectedMemberId.set(memberId);
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

  loadTontines() {
    this.tontineService.getTontines('actif').subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tontines.set(response.data);
        }
      }
    });
  }

  loadMembers() {
    this.memberService.getMembers().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.members.set(response.data);
        }
      }
    });
  }

  onTontineChange(tontineId: string) {
    this.selectedTontineId.set(tontineId);
    const tontine = this.tontines().find(t => t._id === tontineId);
    if (tontine) {
      this.contributionForm.patchValue({ 
        montant: tontine.montantCotisation,
        tour: '',
        membre: ''
      });
      this.selectedTourStats.set(null);
      this.loadToursForTontine(tontineId);
    }
  }

  loadToursForTontine(tontineId: string) {
    this.loadingTours.set(true);
    this.tourService.getTours(tontineId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tours.set(response.data);
        }
        this.loadingTours.set(false);
      },
      error: () => {
        this.loadingTours.set(false);
      }
    });
  }

  onTourChange(tourId: string) {
    if (!tourId) {
      this.selectedTourStats.set(null);
      this.tourContributions.set([]);
      return;
    }

    // Charger les cotisations pour ce tour
    this.contributionService.getContributionsByTour(tourId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tourContributions.set(response.data.contributions || []);
          this.selectedTourStats.set(response.data.stats);
        }
      },
      error: () => {
        this.tourContributions.set([]);
        this.selectedTourStats.set(null);
      }
    });
  }

  hasMemberPaidForTour(memberId: string): boolean {
    return this.tourContributions().some(c => {
      const cMemberId = typeof c.membre === 'string' ? c.membre : c.membre?._id;
      return cMemberId === memberId;
    });
  }

  getTourBeneficiaireName(tour: Tour): string {
    if (!tour.beneficiaire) return 'Non attribué';
    if (typeof tour.beneficiaire === 'string') return 'Membre';
    return `${tour.beneficiaire.nom} ${tour.beneficiaire.prenom}`;
  }

  getActiveMembersCount(): number {
    const tontineId = this.selectedTontineId();
    if (!tontineId) return 0;
    const tontine = this.tontines().find(t => t._id === tontineId);
    if (!tontine || !tontine.membres) return this.members().length;
    return tontine.membres.filter(m => m.isActive).length || this.members().length;
  }

  showAddForm() {
    this.contributionForm.reset({ 
      datePaiement: new Date(), 
      methodePaiement: 'especes'
    });
    this.selectedTontineId.set('');
    this.selectedTourStats.set(null);
    this.tourContributions.set([]);
    this.showForm.set(true);
  }

  cancelForm() {
    this.showForm.set(false);
    this.contributionForm.reset();
    this.selectedTontineId.set('');
    this.selectedTourStats.set(null);
    this.tourContributions.set([]);
  }

  onSubmit() {
    if (this.contributionForm.valid) {
      this.loading.set(true);
      
      const formData = this.contributionForm.value;

      this.contributionService.createContribution(formData).subscribe({
        next: (response) => {
          this.loading.set(false);
          this.snackBar.open('Cotisation enregistrée avec succès !', 'Fermer', { duration: 3000 });
          this.loadContributions();
          this.cancelForm();
        },
        error: (error) => {
          this.loading.set(false);
          const errorMsg = error.error?.message || error.error?.errors?.[0]?.msg || 'Erreur lors de l\'enregistrement';
          this.snackBar.open(errorMsg, 'Fermer', { duration: 5000 });
        }
      });
    }
  }

  async deleteContribution(contrib: Contribution) {
    const { ConfirmDialogComponent } = await import('../../shared/confirm-dialog.component');

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '520px',
      data: {
        title: 'Confirmer la suppression',
        message: 'Voulez-vous vraiment supprimer cette cotisation ?',
        confirmLabel: 'Supprimer',
        cancelLabel: 'Annuler',
        requireReason: false
      }
    } as any);

    dialogRef.afterClosed().subscribe((result: any) => {
      if (!result || !result.confirmed) return;

      this.contributionService.deleteContribution(contrib._id).subscribe({
        next: (response) => {
          this.snackBar.open('Cotisation supprimée avec succès !', 'Fermer', { duration: 3000 });
          this.loadContributions();
        },
        error: (error) => {
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
        }
      });
    });
  }

  getModePaiementLabel(mode: string): string {
    const labels: { [key: string]: string } = {
      'especes': 'Espèces',
      'mobile_money': 'Mobile Money',
      'virement': 'Virement',
      'cheque': 'Chèque'
    };
    return labels[mode] || mode;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
