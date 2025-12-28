import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { TontineService } from '../../services/tontine.service';
import { MemberService } from '../../services/member.service';
import { ContributionService } from '../../services/contribution.service';
import { TourService } from '../../services/tour.service';
import { AuthService } from '../../services/auth.service';
import { Tontine, Member, Contribution, Tour } from '../../models';

@Component({
  selector: 'app-tontine-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  template: `
    <div class="page-container">
      @if (loading()) {
        <div class="loading-container">
          <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
          <p>Chargement des détails...</p>
        </div>
      } @else if (tontine()) {
        <!-- Header -->
        <div class="page-header">
          <div class="header-left">
            <button mat-icon-button [routerLink]="['/tontines']">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div>
              <h1>{{ tontine()!.nom }}</h1>
              <mat-chip [class]="'status-' + tontine()!.statut">
                {{ getStatutLabel(tontine()!.statut) }}
              </mat-chip>
            </div>
          </div>
          
          <div class="header-actions">
            @if (authService.hasRole('admin', 'tresorier')) {
              <button mat-raised-button color="accent" [routerLink]="['/tontines', 'edit', tontine()!._id]">
                <mat-icon>edit</mat-icon>
                Modifier
              </button>
            }
          </div>
        </div>

        @if (tontine()!.description) {
          <mat-card class="description-card">
            <mat-card-content>
              <p>{{ tontine()!.description }}</p>
            </mat-card-content>
          </mat-card>
        }

        <!-- Stats Cards -->
        <div class="stats-grid">
          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon primary">payments</mat-icon>
              <div class="stat-content">
                <h3>{{ tontine()!.montantCotisation | number:'1.0-0' }} FCFA</h3>
                <p>Cotisation {{ tontine()!.frequence }}</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon success">people</mat-icon>
              <div class="stat-content">
                <h3>{{ getActiveMembersCount() }}</h3>
                <p>Membres participants</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon warning">account_balance_wallet</mat-icon>
              <div class="stat-content">
                <h3>{{ getCalculatedTotal() | number:'1.0-0' }} FCFA</h3>
                <p>Montant total collecté</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon info">autorenew</mat-icon>
              <div class="stat-content">
                <h3>{{ tontine()!.cycleCourant }} / {{ getActiveMembersCount() }}</h3>
                <p>Cycles (Tours)</p>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Dates Info -->
        <mat-card class="dates-card">
          <mat-card-content>
            <div class="dates-grid">
              <div class="date-item">
                <mat-icon>event</mat-icon>
                <div>
                  <strong>Date de début</strong>
                  <p>{{ formatDate(tontine()!.dateDebut) }}</p>
                </div>
              </div>
              @if (tontine()!.dateFin) {
                <div class="date-item">
                  <mat-icon>event_available</mat-icon>
                  <div>
                    <strong>Date de fin prévue</strong>
                    <p>{{ formatDate(tontine()!.dateFin!) }}</p>
                  </div>
                </div>
              }
              <div class="date-item">
                <mat-icon>access_time</mat-icon>
                <div>
                  <strong>Créée le</strong>
                  <p>{{ formatDate(tontine()!.createdAt!) }}</p>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Tabs -->
        <mat-tab-group class="detail-tabs" animationDuration="300ms">
          <!-- Membres Tab -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>people</mat-icon>
              Membres ({{ tontine()!.membres.length }})
            </ng-template>
            
            <div class="tab-content">
              @if (authService.hasRole('admin', 'tresorier') && !showAddMemberForm()) {
                <div class="add-member-header">
                  <button mat-raised-button color="primary" (click)="showAddMemberFormToggle()">
                    <mat-icon>person_add</mat-icon>
                    Ajouter un membre
                  </button>
                </div>
              }

              @if (showAddMemberForm()) {
                <mat-card class="add-member-card">
                  <mat-card-content>
                    <h3>Ajouter un membre à la tontine</h3>
                    <form [formGroup]="addMemberForm" (ngSubmit)="onAddMember()">
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Sélectionner un membre</mat-label>
                        <mat-select formControlName="membreId">
                          @for (member of availableMembers(); track member._id) {
                            <mat-option [value]="member._id">
                              {{ member.nom }} {{ member.prenom }} - {{ member.telephone }}
                            </mat-option>
                          }
                        </mat-select>
                        <mat-icon matPrefix>person</mat-icon>
                        @if (addMemberForm.get('membreId')?.hasError('required') && addMemberForm.get('membreId')?.touched) {
                          <mat-error>Membre requis</mat-error>
                        }
                      </mat-form-field>

                      <div class="form-actions">
                        <button mat-button type="button" (click)="cancelAddMember()">
                          <mat-icon>close</mat-icon>
                          Annuler
                        </button>
                        <button mat-raised-button color="primary" type="submit" [disabled]="addMemberForm.invalid || addingMember()">
                          <mat-icon>add</mat-icon>
                          Ajouter
                        </button>
                      </div>
                    </form>
                  </mat-card-content>
                </mat-card>
              }

              @if (tontine()!.membres.length === 0) {
                <div class="empty-state">
                  <mat-icon>people_outline</mat-icon>
                  <h3>Aucun membre</h3>
                  <p>Cette tontine n'a pas encore de membres</p>
                </div>
              } @else {
                <div class="members-grid">
                  @for (tontineMember of tontine()!.membres; track getMemberId(tontineMember)) {
                    <mat-card class="member-card">
                      <mat-card-content>
                        <div class="member-header">
                          <div class="member-avatar">
                            {{ getMemberInitials(tontineMember) }}
                          </div>
                          <div class="member-info">
                            <h4>{{ getMemberName(tontineMember) }}</h4>
                            @if (getMemberEmail(tontineMember)) {
                              <p class="member-email">{{ getMemberEmail(tontineMember) }}</p>
                            }
                            <p class="member-phone">{{ getMemberPhone(tontineMember) }}</p>
                          </div>
                        </div>
                        <div class="member-meta">
                          <div class="meta-item">
                            <mat-icon>event</mat-icon>
                            <span>Adhésion: {{ formatDate(tontineMember.dateAdhesion) }}</span>
                          </div>
                          <mat-chip [class]="tontineMember.isActive ? 'status-actif' : 'status-suspendu'">
                            {{ tontineMember.isActive ? 'Actif' : 'Inactif' }}
                          </mat-chip>
                        </div>
                      </mat-card-content>
                    </mat-card>
                  }
                </div>
              }
            </div>
          </mat-tab>

          <!-- Cotisations Tab -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>receipt</mat-icon>
              Cotisations
            </ng-template>
            
            <div class="tab-content">
              <p class="info-message">
                <mat-icon>info</mat-icon>
                Consultez la page des cotisations pour voir l'historique complet
              </p>
              <button mat-raised-button color="primary" [routerLink]="['/contributions']" [queryParams]="{tontine: tontine()!._id}">
                <mat-icon>visibility</mat-icon>
                Voir les cotisations
              </button>
            </div>
          </mat-tab>

          <!-- Tours Tab -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>casino</mat-icon>
              Tours
            </ng-template>
            
            <div class="tab-content">
              <p class="info-message">
                <mat-icon>info</mat-icon>
                Consultez la page des tours pour voir l'historique des attributions
              </p>
              <button mat-raised-button color="primary" [routerLink]="['/tours']" [queryParams]="{tontine: tontine()!._id}">
                <mat-icon>visibility</mat-icon>
                Voir les tours
              </button>
            </div>
          </mat-tab>
        </mat-tab-group>
      } @else {
        <mat-card class="error-card">
          <mat-card-content>
            <div class="empty-state">
              <mat-icon color="warn">error_outline</mat-icon>
              <h3>Tontine introuvable</h3>
              <p>Cette tontine n'existe pas ou a été supprimée</p>
              <button mat-raised-button color="primary" [routerLink]="['/tontines']">
                <mat-icon>arrow_back</mat-icon>
                Retour à la liste
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .page-container {
      padding: 32px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      gap: 20px;

      p {
        color: var(--text-secondary);
        font-size: 16px;
      }
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;

      .header-left {
        display: flex;
        align-items: center;
        gap: 16px;

        h1 {
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: var(--text-primary);
        }
      }

      .header-actions {
        display: flex;
        gap: 12px;
      }
    }

    .description-card {
      margin-bottom: 24px;
      border-radius: 12px !important;
      border: 1px solid var(--border-color);

      mat-card-content {
        padding: 20px !important;

        p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 15px;
          line-height: 1.6;
        }
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    .stat-card {
      border-radius: 12px !important;
      border: 1px solid var(--border-color);

      mat-card-content {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 24px !important;

        .stat-icon {
          font-size: 40px;
          width: 40px;
          height: 40px;

          &.primary { color: #3b82f6; }
          &.success { color: #10b981; }
          &.warning { color: #f59e0b; }
          &.info { color: #8b5cf6; }
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
            color: var(--text-secondary);
            font-size: 14px;
          }
        }
      }
    }

    .dates-card {
      margin-bottom: 24px;
      border-radius: 12px !important;
      border: 1px solid var(--border-color);

      mat-card-content {
        padding: 24px !important;
      }
    }

    .dates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
    }

    .date-item {
      display: flex;
      align-items: center;
      gap: 12px;

      mat-icon {
        color: var(--primary-color);
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      strong {
        display: block;
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 4px;
      }

      p {
        margin: 0;
        color: var(--text-secondary);
        font-size: 14px;
      }
    }

    .detail-tabs {
      margin-top: 32px;
      
      ::ng-deep .mat-mdc-tab-labels {
        border-bottom: 2px solid var(--border-color);
      }

      ::ng-deep .mat-mdc-tab-label {
        height: 56px;
        min-width: 120px;

        mat-icon {
          margin-right: 8px;
        }
      }
    }

    .tab-content {
      padding: 32px 0;
    }

    .add-member-header {
      margin-bottom: 24px;
    }

    .add-member-card {
      margin-bottom: 24px;
      border-radius: 12px !important;
      border: 1px solid var(--border-color);
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);

      mat-card-content {
        padding: 24px !important;

        h3 {
          margin: 0 0 20px 0;
          color: var(--text-primary);
          font-size: 18px;
          font-weight: 600;
        }
      }

      .full-width {
        width: 100%;
        margin-bottom: 16px;
      }

      .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        padding-top: 12px;
        border-top: 1px solid #bfdbfe;
      }
    }

    .info-message {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      color: #1e40af;
      margin-bottom: 16px;

      mat-icon {
        color: #3b82f6;
      }
    }

    .members-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .member-card {
      border-radius: 12px !important;
      border: 1px solid var(--border-color);

      mat-card-content {
        padding: 20px !important;
      }
    }

    .member-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;

      .member-avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 20px;
      }

      .member-info {
        flex: 1;

        h4 {
          margin: 0 0 4px 0;
          color: var(--text-primary);
          font-size: 16px;
          font-weight: 600;
        }

        .member-email {
          margin: 0;
          color: var(--text-secondary);
          font-size: 13px;
        }

        .member-phone {
          margin: 4px 0 0 0;
          color: var(--text-secondary);
          font-size: 13px;
        }
      }
    }

    .member-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid var(--border-color);

      .meta-item {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--text-secondary);
        font-size: 12px;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    .status-actif {
      background-color: #d1fae5 !important;
      color: #065f46 !important;
    }

    .status-planifie {
      background-color: #dbeafe !important;
      color: #1e40af !important;
    }

    .status-termine {
      background-color: #e5e7eb !important;
      color: #374151 !important;
    }

    .status-suspendu {
      background-color: #fef3c7 !important;
      color: #92400e !important;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;

      mat-icon {
        font-size: 72px;
        width: 72px;
        height: 72px;
        color: var(--text-secondary);
        opacity: 0.5;
      }

      h3 {
        margin: 20px 0 10px 0;
        color: var(--text-primary);
      }

      p {
        color: var(--text-secondary);
        margin: 0 0 24px 0;
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

        .header-actions {
          width: 100%;
          
          button {
            flex: 1;
          }
        }
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .dates-grid {
        grid-template-columns: 1fr;
      }

      .members-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TontineDetailComponent implements OnInit {
  authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tontineService = inject(TontineService);
  private memberService = inject(MemberService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  loading = signal(true);
  tontine = signal<Tontine | null>(null);
  availableMembers = signal<Member[]>([]);
  showAddMemberForm = signal(false);
  addingMember = signal(false);

  addMemberForm: FormGroup = this.fb.group({
    membreId: ['', Validators.required]
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTontine(id);
    } else {
      this.loading.set(false);
    }
    this.loadAvailableMembers();
  }

  loadTontine(id: string) {
    this.loading.set(true);
    this.tontineService.getTontine(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tontine.set(response.data);
        } else {
          this.tontine.set(null);
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.snackBar.open('Erreur lors du chargement de la tontine', 'Fermer', { duration: 3000 });
        this.tontine.set(null);
        this.loading.set(false);
      }
    });
  }

  loadAvailableMembers() {
    this.memberService.getMembers().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Filtrer les membres qui ne sont pas déjà dans la tontine
          const tontineMemberIds = this.tontine()?.membres.map(tm => 
            typeof tm.membre === 'string' ? tm.membre : tm.membre._id
          ) || [];
          
          const available = response.data.filter(member => 
            !tontineMemberIds.includes(member._id)
          );
          
          this.availableMembers.set(available);
        }
      }
    });
  }

  showAddMemberFormToggle() {
    this.showAddMemberForm.set(true);
    this.addMemberForm.reset();
  }

  cancelAddMember() {
    this.showAddMemberForm.set(false);
    this.addMemberForm.reset();
  }

  onAddMember() {
    if (this.addMemberForm.valid && this.tontine()) {
      this.addingMember.set(true);
      
      const membreId = this.addMemberForm.value.membreId;
      const tontineId = this.tontine()!._id;

      this.tontineService.addMember(tontineId, membreId).subscribe({
        next: (response) => {
          this.addingMember.set(false);
          if (response.success && response.data) {
            // Mettre à jour directement avec les nouvelles données
            const updatedTontine = { ...response.data };
            this.tontine.set(updatedTontine);
            
            // Forcer la détection des changements
            this.cdr.detectChanges();
            
            this.snackBar.open('Membre ajouté avec succès !', 'Fermer', { duration: 3000 });
            this.loadAvailableMembers();
            this.cancelAddMember();
          }
        },
        error: (error) => {
          this.addingMember.set(false);
          const errorMsg = error.error?.message || 'Erreur lors de l\'ajout du membre';
          this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  // Rafraîchir la tontine sans afficher le spinner de chargement
  refreshTontine(id: string) {
    this.tontineService.getTontine(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tontine.set(response.data);
        }
      }
    });
  }

  getStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'actif': 'Active',
      'planifie': 'Planifiée',
      'termine': 'Terminée',
      'suspendu': 'Suspendue'
    };
    return labels[statut] || statut;
  }

  // Calculer le nombre de membres actifs basé sur le tableau membres
  getActiveMembersCount(): number {
    if (!this.tontine()) return 0;
    return this.tontine()!.membres.filter(m => m.isActive).length;
  }

  // Calculer le montant total basé sur le nombre de membres actifs
  getCalculatedTotal(): number {
    if (!this.tontine()) return 0;
    const activeCount = this.getActiveMembersCount();
    return activeCount * this.tontine()!.montantCotisation;
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  getMemberId(tontineMember: any): string {
    return typeof tontineMember.membre === 'string' 
      ? tontineMember.membre 
      : tontineMember.membre._id;
  }

  getMemberName(tontineMember: any): string {
    const member = typeof tontineMember.membre === 'string' ? null : tontineMember.membre;
    if (!member) return 'Membre inconnu';
    return `${member.nom} ${member.prenom}`;
  }

  getMemberEmail(tontineMember: any): string {
    const member = typeof tontineMember.membre === 'string' ? null : tontineMember.membre;
    return member?.email || '';
  }

  getMemberPhone(tontineMember: any): string {
    const member = typeof tontineMember.membre === 'string' ? null : tontineMember.membre;
    return member?.telephone || '';
  }

  getMemberInitials(tontineMember: any): string {
    const member = typeof tontineMember.membre === 'string' ? null : tontineMember.membre;
    if (!member) return '?';
    return `${member.nom.charAt(0)}${member.prenom.charAt(0)}`.toUpperCase();
  }
}
