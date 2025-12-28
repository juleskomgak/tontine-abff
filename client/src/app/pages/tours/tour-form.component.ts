import { Component, Inject, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatRadioModule } from '@angular/material/radio';
import { TourService } from '../../services/tour.service';
import { MemberService } from '../../services/member.service';
import { Tontine, Member } from '../../models';

@Component({
  selector: 'app-tour-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatRadioModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2>
          @if (data.mode === 'random') {
            <mat-icon>shuffle</mat-icon>
            Tirage Aléatoire
          } @else {
            <mat-icon>person_add</mat-icon>
            Attribution Manuelle
          }
        </h2>
        <button mat-icon-button (click)="dialogRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      @if (data.mode === 'random') {
        <!-- Mode Tirage Aléatoire -->
        <div class="dialog-content">
          <div class="info-box">
            <mat-icon>info</mat-icon>
            <p>Le système choisira aléatoirement un membre parmi ceux qui n'ont pas encore reçu leur tour.</p>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Sélectionner une tontine</mat-label>
            <mat-select [value]="selectedTontineId()" (selectionChange)="selectedTontineId.set($event.value); onTontineSelect()">
              @for (tontine of data.tontines; track tontine._id) {
                @if (tontine.statut === 'actif') {
                  <mat-option [value]="tontine._id">
                    {{ tontine.nom }} ({{ tontine.nombreMembres }} membres)
                  </mat-option>
                }
              }
            </mat-select>
          </mat-form-field>

          @if (selectedTontine()) {
            <div class="tontine-info">
              <div class="info-row">
                <span class="label">Montant du tour:</span>
                <span class="value">{{ selectedTontine()!.montantTotal | number:'1.0-0' }} FCFA</span>
              </div>
              <div class="info-row">
                <span class="label">Cycle actuel:</span>
                <span class="value">Cycle {{ selectedTontine()!.cycleCourant }}</span>
              </div>
              <div class="info-row">
                <span class="label">Membres disponibles:</span>
                <span class="value">{{ availableMembersCount() }} / {{ selectedTontine()!.nombreMembres }}</span>
              </div>
            </div>

            @if (availableMembersCount() === 0) {
              <div class="warning-box">
                <mat-icon>warning</mat-icon>
                <p>Tous les membres ont déjà reçu leur tour pour cette tontine.</p>
              </div>
            }
          }
        </div>

        <div class="dialog-actions">
          <button mat-button (click)="dialogRef.close()">Annuler</button>
          <button mat-raised-button color="primary" 
                  [disabled]="!selectedTontineId() || loading() || availableMembersCount() === 0"
                  (click)="performRandomDraw()">
            @if (loading()) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              <mat-icon>shuffle</mat-icon>
            }
            Effectuer le tirage
          </button>
        </div>
      } @else {
        <!-- Mode Attribution Manuelle -->
        <form [formGroup]="manualForm" (ngSubmit)="onSubmitManual()">
          <div class="dialog-content">
            <div class="info-box">
              <mat-icon>info</mat-icon>
              <p>Sélectionnez manuellement le bénéficiaire du prochain tour.</p>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Tontine</mat-label>
              <mat-select formControlName="tontine" (selectionChange)="onTontineSelectManual()">
                @for (tontine of data.tontines; track tontine._id) {
                  @if (tontine.statut === 'actif') {
                    <mat-option [value]="tontine._id">
                      {{ tontine.nom }}
                    </mat-option>
                  }
                }
              </mat-select>
              @if (manualForm.get('tontine')?.hasError('required') && manualForm.get('tontine')?.touched) {
                <mat-error>Tontine requise</mat-error>
              }
            </mat-form-field>

            @if (manualForm.get('tontine')?.value) {
              @if (loadingMembers()) {
                <div class="loading-members">
                  <mat-progress-spinner diameter="30" mode="indeterminate"></mat-progress-spinner>
                  <span>Chargement des membres...</span>
                </div>
              } @else {
                @if (availableMembers().length === 0) {
                  <div class="warning-box">
                    <mat-icon>warning</mat-icon>
                    <p>Tous les membres ont déjà reçu leur tour.</p>
                  </div>
                } @else {
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Bénéficiaire</mat-label>
                    <mat-select formControlName="beneficiaire">
                      @for (member of availableMembers(); track member._id) {
                        <mat-option [value]="member._id">
                          {{ member.nom }} {{ member.prenom }} - {{ member.telephone }}
                        </mat-option>
                      }
                    </mat-select>
                    @if (manualForm.get('beneficiaire')?.hasError('required') && manualForm.get('beneficiaire')?.touched) {
                      <mat-error>Bénéficiaire requis</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Mode d'attribution</mat-label>
                    <mat-select formControlName="modeAttribution">
                      <mat-option value="manuel">Manuel</mat-option>
                      <mat-option value="ordre_alphabetique">Ordre alphabétique</mat-option>
                      <mat-option value="urgence">Urgence</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Notes (optionnel)</mat-label>
                    <textarea matInput formControlName="notes" rows="3" 
                              placeholder="Raison de l'attribution, remarques..."></textarea>
                  </mat-form-field>
                }
              }
            }
          </div>

          <div class="dialog-actions">
            <button mat-button type="button" (click)="dialogRef.close()">Annuler</button>
            <button mat-raised-button color="primary" type="submit"
                    [disabled]="manualForm.invalid || loading() || availableMembers().length === 0">
              @if (loading()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>check</mat-icon>
              }
              Attribuer le tour
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .dialog-container {
      display: flex;
      flex-direction: column;
      min-height: 400px;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-color);

      h2 {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: var(--text-primary);

        mat-icon {
          color: #2563eb;
        }
      }
    }

    .dialog-content {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
    }

    .info-box {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #e0f2fe;
      border-left: 4px solid #0284c7;
      border-radius: 8px;
      margin-bottom: 24px;

      mat-icon {
        color: #0284c7;
        flex-shrink: 0;
      }

      p {
        margin: 0;
        color: #0c4a6e;
        font-size: 14px;
        line-height: 1.5;
      }
    }

    .warning-box {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      margin-bottom: 24px;

      mat-icon {
        color: #f59e0b;
        flex-shrink: 0;
      }

      p {
        margin: 0;
        color: #78350f;
        font-size: 14px;
        line-height: 1.5;
      }
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .tontine-info {
      background: #f8fafc;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;

      &:last-child {
        border-bottom: none;
      }

      .label {
        color: var(--text-secondary);
        font-size: 14px;
      }

      .value {
        font-weight: 600;
        color: var(--text-primary);
        font-size: 14px;
      }
    }

    .loading-members {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px;
      justify-content: center;
      background: #f8fafc;
      border-radius: 8px;
      margin-bottom: 16px;

      span {
        color: var(--text-secondary);
      }
    }

    button mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }
  `]
})
export class TourFormComponent implements OnInit {
  dialogRef = inject(MatDialogRef<TourFormComponent>);
  private fb = inject(FormBuilder);
  private tourService = inject(TourService);
  private memberService = inject(MemberService);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  loadingMembers = signal(false);
  availableMembers = signal<Member[]>([]);

  selectedTontineId = signal<string | null>(null);
  
  selectedTontine = computed(() => {
    const tontineId = this.selectedTontineId();
    if (!tontineId) return null;
    return this.data.tontines.find(t => t._id === tontineId) || null;
  });

  availableMembersCount = computed(() => this.availableMembers().length);

  manualForm: FormGroup = this.fb.group({
    tontine: ['', Validators.required],
    beneficiaire: ['', Validators.required],
    modeAttribution: ['manuel', Validators.required],
    notes: ['']
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: { mode: 'random' | 'manual', tontines: Tontine[] }) {}

  ngOnInit() {
    // Si mode manuel et une seule tontine active, la sélectionner automatiquement
    if (this.data.mode === 'manual') {
      const activeTontines = this.data.tontines.filter(t => t.statut === 'actif');
      if (activeTontines.length === 1) {
        this.manualForm.patchValue({ tontine: activeTontines[0]._id });
        this.onTontineSelectManual();
      }
    }
  }

  onTontineSelect() {
    const tontineId = this.selectedTontineId();
    if (tontineId) {
      this.loadAvailableMembers(tontineId);
    }
  }

  onTontineSelectManual() {
    const tontineId = this.manualForm.get('tontine')?.value;
    if (tontineId) {
      this.manualForm.patchValue({ beneficiaire: '' });
      this.loadAvailableMembers(tontineId);
    }
  }

  loadAvailableMembers(tontineId: string) {
    this.loadingMembers.set(true);
    const tontine = this.data.tontines.find(t => t._id === tontineId);
    
    if (!tontine) {
      this.loadingMembers.set(false);
      return;
    }

    // Obtenir tous les membres de la tontine
    const tontineMemberIds = tontine.membres
      .filter(m => m.isActive && m.membre)
      .map(m => typeof m.membre === 'string' ? m.membre : m.membre!._id);

    // Obtenir les tours déjà attribués pour cette tontine
    this.tourService.getTours(tontineId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const assignedMemberIds = response.data
            .filter(t => t.beneficiaire)
            .map(t => 
              typeof t.beneficiaire === 'string' ? t.beneficiaire : t.beneficiaire!._id
            );

          // Charger tous les membres
          this.memberService.getMembers().subscribe({
            next: (membersResponse) => {
              if (membersResponse.success && membersResponse.data) {
                // Filtrer les membres disponibles (dans la tontine et sans tour attribué)
                const available = membersResponse.data.filter(member => 
                  tontineMemberIds.includes(member._id) && !assignedMemberIds.includes(member._id)
                );
                this.availableMembers.set(available);
              }
              this.loadingMembers.set(false);
            },
            error: () => {
              this.loadingMembers.set(false);
              this.snackBar.open('Erreur lors du chargement des membres', 'Fermer', { duration: 3000 });
            }
          });
        }
      },
      error: () => {
        this.loadingMembers.set(false);
        this.snackBar.open('Erreur lors de la vérification des tours', 'Fermer', { duration: 3000 });
      }
    });
  }

  performRandomDraw() {
    const tontineId = this.selectedTontineId();
    if (!tontineId) return;

    this.loading.set(true);
    this.tourService.tirageAuSort(tontineId).subscribe({
      next: (response) => {
        if (response.success) {
          const beneficiaire = response.data?.beneficiaire;
          const memberName = !beneficiaire || typeof beneficiaire === 'string' 
            ? 'un membre' 
            : `${beneficiaire.nom} ${beneficiaire.prenom}`;
          
          this.snackBar.open(`🎉 Tirage réussi ! Le tour a été attribué à ${memberName}`, 'Fermer', { duration: 5000 });
          this.dialogRef.close(true);
        }
        this.loading.set(false);
      },
      error: (error) => {
        const message = error.error?.message || 'Erreur lors du tirage';
        this.snackBar.open(message, 'Fermer', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  onSubmitManual() {
    if (this.manualForm.invalid) return;

    const tontine = this.data.tontines.find(t => t._id === this.manualForm.value.tontine);
    if (!tontine) return;

    // Envoyer 0 pour que le backend calcule le montant réel des cotisations
    const tourData = {
      tontine: this.manualForm.value.tontine,
      beneficiaire: this.manualForm.value.beneficiaire,
      cycle: tontine.cycleCourant,
      montantRecu: 0, // Le backend calculera le montant réel des cotisations
      modeAttribution: this.manualForm.value.modeAttribution,
      notes: this.manualForm.value.notes || undefined
    };

    this.loading.set(true);
    this.tourService.createTour(tourData).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('✅ Tour attribué avec succès', 'Fermer', { duration: 3000 });
          this.dialogRef.close(true);
        }
        this.loading.set(false);
      },
      error: (error) => {
        const message = error.error?.message || 'Erreur lors de l\'attribution';
        this.snackBar.open(message, 'Fermer', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }
}
