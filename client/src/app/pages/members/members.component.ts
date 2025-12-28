import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MemberService } from '../../services/member.service';
import { Member } from '../../models';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
    MatChipsModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>� Gestion des Membres</h1>
          <p class="subtitle">{{ members().length }} membre(s) enregistré(s)</p>
        </div>
        <button mat-raised-button color="primary" (click)="showAddForm()">
          <mat-icon>add</mat-icon>
          Ajouter un Membre
        </button>
      </div>

      @if (showForm()) {
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>
              {{ editingMember() ? '✏️ Modifier le Membre' : '➕ Nouveau Membre' }}
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="memberForm" (ngSubmit)="onSubmit()">
              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Nom</mat-label>
                  <input matInput formControlName="nom" placeholder="Nom du membre">
                  <mat-icon matPrefix>person</mat-icon>
                  @if (memberForm.get('nom')?.hasError('required') && memberForm.get('nom')?.touched) {
                    <mat-error>Nom requis</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Prénom</mat-label>
                  <input matInput formControlName="prenom" placeholder="Prénom du membre">
                  @if (memberForm.get('prenom')?.hasError('required') && memberForm.get('prenom')?.touched) {
                    <mat-error>Prénom requis</mat-error>
                  }
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Email</mat-label>
                  <input matInput type="email" formControlName="email" placeholder="email@example.com">
                  <mat-icon matPrefix>email</mat-icon>
                  @if (memberForm.get('email')?.hasError('email') && memberForm.get('email')?.touched) {
                    <mat-error>Email invalide</mat-error>
                  }
                  @if (memberForm.get('email')?.hasError('required') && memberForm.get('email')?.touched) {
                    <mat-error>Email requis</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Téléphone</mat-label>
                  <input matInput formControlName="telephone" placeholder="+237 6 XX XX XX XX">
                  <mat-icon matPrefix>phone</mat-icon>
                  @if (memberForm.get('telephone')?.hasError('required') && memberForm.get('telephone')?.touched) {
                    <mat-error>Téléphone requis</mat-error>
                  }
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Adresse</mat-label>
                <textarea matInput formControlName="adresse" rows="2" placeholder="Adresse complète"></textarea>
                <mat-icon matPrefix>location_on</mat-icon>
              </mat-form-field>

              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Profession</mat-label>
                  <input matInput formControlName="profession" placeholder="Ex: Commerçant">
                  <mat-icon matPrefix>work</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Statut</mat-label>
                  <mat-select formControlName="statut">
                    <mat-option value="actif">Actif</mat-option>
                    <mat-option value="inactif">Inactif</mat-option>
                    <mat-option value="suspendu">Suspendu</mat-option>
                  </mat-select>
                  <mat-icon matPrefix>info</mat-icon>
                </mat-form-field>
              </div>

              <div class="form-actions">
                <button mat-button type="button" (click)="cancelForm()">
                  <mat-icon>close</mat-icon>
                  Annuler
                </button>
                <button mat-raised-button color="primary" type="submit" [disabled]="memberForm.invalid || loading()">
                  <mat-icon>{{ editingMember() ? 'save' : 'add' }}</mat-icon>
                  {{ editingMember() ? 'Enregistrer' : 'Ajouter' }}
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }

      <mat-card class="table-card">
        <mat-card-content>
          @if (members().length === 0) {
            <div class="empty-state">
              <mat-icon>people_outline</mat-icon>
              <h3>Aucun membre enregistré</h3>
              <p>Commencez par ajouter votre premier membre</p>
            </div>
          } @else {
            <div class="table-container">
              <table mat-table [dataSource]="members()" class="members-table">
                <ng-container matColumnDef="nom">
                  <th mat-header-cell *matHeaderCellDef>Nom Complet</th>
                  <td mat-cell *matCellDef="let member">
                    <strong>{{ member.nom }} {{ member.prenom }}</strong>
                  </td>
                </ng-container>

                <ng-container matColumnDef="email">
                  <th mat-header-cell *matHeaderCellDef>Email</th>
                  <td mat-cell *matCellDef="let member">{{ member.email }}</td>
                </ng-container>

                <ng-container matColumnDef="telephone">
                  <th mat-header-cell *matHeaderCellDef>Téléphone</th>
                  <td mat-cell *matCellDef="let member">{{ member.telephone }}</td>
                </ng-container>

                <ng-container matColumnDef="profession">
                  <th mat-header-cell *matHeaderCellDef>Profession</th>
                  <td mat-cell *matCellDef="let member">{{ member.profession || '-' }}</td>
                </ng-container>

                <ng-container matColumnDef="statut">
                  <th mat-header-cell *matHeaderCellDef>Statut</th>
                  <td mat-cell *matCellDef="let member">
                    <mat-chip [class]="'status-' + member.statut">
                      {{ member.statut }}
                    </mat-chip>
                  </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Actions</th>
                  <td mat-cell *matCellDef="let member">
                    <button mat-icon-button color="primary" [routerLink]="['/members', member._id]">
                      <mat-icon>visibility</mat-icon>
                    </button>
                    <button mat-icon-button color="accent" (click)="editMember(member)">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="deleteMember(member)">
                      <mat-icon>delete</mat-icon>
                    </button>
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
      background-color: #f8fafc;
      min-height: 100vh;
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
        color: #1e293b;
        background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .subtitle {
        color: #64748b;
        margin: 0;
        font-size: 16px;
        font-weight: 500;
      }

      button {
        height: 48px;
        font-weight: 700;
        font-size: 15px;
        border-radius: 10px;
        background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%) !important;
        box-shadow: 0 4px 6px -1px rgb(37 99 235 / 0.4) !important;
        letter-spacing: 0.3px;
        
        &:hover {
          box-shadow: 0 10px 15px -3px rgb(37 99 235 / 0.5) !important;
          transform: translateY(-2px);
          transition: all 0.3s ease;
        }
      }
    }

    .form-card {
      margin-bottom: 32px;
      border-radius: 16px !important;
      border: none;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
      background: white;

      mat-card-header {
        margin-bottom: 24px;
        padding: 24px 24px 0 24px;
      }

      mat-card-title {
        font-size: 22px;
        font-weight: 700;
        color: #1e293b;
      }
      
      mat-card-content {
        padding: 24px !important;
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
      margin-bottom: 20px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 20px;
    }
    
    ::ng-deep .mat-mdc-form-field {
      width: 100%;
      
      .mat-mdc-text-field-wrapper {
        background-color: #ffffff !important;
        border-radius: 10px;
      }
      
      .mdc-text-field--outlined {
        .mdc-notched-outline__leading,
        .mdc-notched-outline__notch,
        .mdc-notched-outline__trailing {
          border-color: #cbd5e1 !important;
          border-width: 2px !important;
        }
        
        &:hover .mdc-notched-outline__leading,
        &:hover .mdc-notched-outline__notch,
        &:hover .mdc-notched-outline__trailing {
          border-color: #94a3b8 !important;
        }
        
        &.mdc-text-field--focused {
          .mdc-notched-outline__leading,
          .mdc-notched-outline__notch,
          .mdc-notched-outline__trailing {
            border-color: #2563eb !important;
            border-width: 2px !important;
          }
        }
      }
      
      .mat-mdc-form-field-icon-prefix {
        color: #3b82f6 !important;
        padding-right: 12px;
      }
      
      .mat-mdc-input-element {
        color: #1e293b !important;
        font-size: 15px;
        font-weight: 500;
        
        &::placeholder {
          color: #94a3b8 !important;
        }
      }
      
      .mat-mdc-form-field-label {
        color: #475569 !important;
        font-weight: 600;
      }
      
      .mat-mdc-form-field-error {
        color: #ef4444 !important;
        font-weight: 500;
      }
    }
    
    ::ng-deep .mat-mdc-select {
      .mat-mdc-select-value {
        color: #1e293b !important;
        font-weight: 500;
      }
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 2px solid #e2e8f0;
      
      button {
        min-width: 130px;
        height: 44px;
        font-weight: 600;
        font-size: 15px;
        border-radius: 8px;
        text-transform: none;
        letter-spacing: 0.3px;
      }
      
      .mat-mdc-raised-button.mat-primary {
        background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%) !important;
        box-shadow: 0 4px 6px -1px rgb(37 99 235 / 0.3) !important;
        
        &:hover:not(:disabled) {
          box-shadow: 0 10px 15px -3px rgb(37 99 235 / 0.4) !important;
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
        
        &:disabled {
          background: #cbd5e1 !important;
          color: #94a3b8 !important;
          box-shadow: none !important;
        }
      }
      
      .mat-mdc-button:not(.mat-mdc-raised-button) {
        color: #64748b !important;
        font-weight: 500;
        
        &:hover {
          background-color: #f1f5f9 !important;
        }
      }
    }

    .table-card {
      border-radius: 16px !important;
      border: none;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
      background: white;
      
      mat-card-content {
        padding: 0 !important;
      }
    }

    .table-container {
      overflow-x: auto;
      border-radius: 16px;
    }

    .members-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;

      th {
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        color: #1e293b !important;
        font-weight: 700 !important;
        font-size: 14px;
        padding: 20px 24px !important;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 2px solid #bfdbfe !important;
      }

      td {
        padding: 20px 24px !important;
        color: #1e293b !important;
        font-size: 15px;
        border-bottom: 1px solid #e2e8f0;
        background-color: #ffffff;
        
        strong {
          font-weight: 700;
          color: #0f172a;
          font-size: 15px;
        }
      }
      
      // Alternance de couleurs pour les lignes (rayures)
      tbody tr:nth-child(even) td {
        background-color: #f8fafc !important;
      }
      
      tbody tr:nth-child(odd) td {
        background-color: #ffffff !important;
      }

      tbody tr:hover td {
        background-color: #dbeafe !important;
        transition: background-color 0.2s ease;
      }
      
      tr:last-child td {
        border-bottom: none;
      }
    }

    .status-actif {
      background-color: #d1fae5 !important;
      color: #065f46 !important;
      font-weight: 700 !important;
      padding: 6px 16px !important;
      border-radius: 20px;
      font-size: 13px;
      text-transform: capitalize;
    }

    .status-inactif {
      background-color: #fee2e2 !important;
      color: #991b1b !important;
      font-weight: 700 !important;
      padding: 6px 16px !important;
      border-radius: 20px;
      font-size: 13px;
      text-transform: capitalize;
    }

    .status-suspendu {
      background-color: #fef3c7 !important;
      color: #92400e !important;
      font-weight: 700 !important;
      padding: 6px 16px !important;
      border-radius: 20px;
      font-size: 13px;
      text-transform: capitalize;
    }
    
    ::ng-deep .mat-mdc-icon-button {
      &.mat-primary {
        color: #3b82f6 !important;
        
        &:hover {
          background-color: #dbeafe !important;
        }
      }
      
      &.mat-accent {
        color: #10b981 !important;
        
        &:hover {
          background-color: #d1fae5 !important;
        }
      }
      
      &.mat-warn {
        color: #ef4444 !important;
        
        &:hover {
          background-color: #fee2e2 !important;
        }
      }
    }

    .empty-state {
      text-align: center;
      padding: 80px 20px;

      mat-icon {
        font-size: 80px;
        width: 80px;
        height: 80px;
        color: #94a3b8;
      }

      h3 {
        margin: 20px 0 10px 0;
        color: #1e293b;
        font-weight: 700;
        font-size: 20px;
      }

      p {
        color: #64748b;
        margin: 0;
        font-size: 15px;
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
      
      .form-actions {
        flex-direction: column;
        
        button {
          width: 100%;
        }
      }
      
      .members-table {
        th, td {
          padding: 12px 16px !important;
          font-size: 13px;
        }
      }
    }
  `]
})
export class MembersComponent implements OnInit {
  private memberService = inject(MemberService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  members = signal<Member[]>([]);
  showForm = signal(false);
  loading = signal(false);
  editingMember = signal<Member | null>(null);

  displayedColumns: string[] = ['nom', 'email', 'telephone', 'profession', 'statut', 'actions'];

  memberForm: FormGroup = this.fb.group({
    nom: ['', Validators.required],
    prenom: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telephone: ['', Validators.required],
    adresse: [''],
    profession: [''],
    statut: ['actif', Validators.required]
  });

  ngOnInit() {
    this.loadMembers();
  }

  loadMembers() {
    this.memberService.getMembers().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.members.set(response.data);
        }
      },
      error: (error) => {
        this.snackBar.open('Erreur lors du chargement des membres', 'Fermer', { duration: 3000 });
      }
    });
  }

  showAddForm() {
    this.editingMember.set(null);
    this.memberForm.reset({ statut: 'actif' });
    this.showForm.set(true);
  }

  editMember(member: Member) {
    this.editingMember.set(member);
    this.memberForm.patchValue(member);
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelForm() {
    this.showForm.set(false);
    this.editingMember.set(null);
    this.memberForm.reset();
  }

  onSubmit() {
    if (this.memberForm.valid) {
      this.loading.set(true);
      const formData = this.memberForm.value;

      if (this.editingMember()) {
        // Mise à jour
        this.memberService.updateMember(this.editingMember()!._id, formData).subscribe({
          next: (response) => {
            this.loading.set(false);
            this.snackBar.open('Membre modifié avec succès !', 'Fermer', { duration: 3000 });
            this.loadMembers();
            this.cancelForm();
          },
          error: (error) => {
            this.loading.set(false);
            this.snackBar.open('Erreur lors de la modification', 'Fermer', { duration: 3000 });
          }
        });
      } else {
        // Création
        this.memberService.createMember(formData).subscribe({
          next: (response) => {
            this.loading.set(false);
            this.snackBar.open('Membre ajouté avec succès !', 'Fermer', { duration: 3000 });
            this.loadMembers();
            this.cancelForm();
          },
          error: (error) => {
            this.loading.set(false);
            this.snackBar.open('Erreur lors de l\'ajout', 'Fermer', { duration: 3000 });
          }
        });
      }
    }
  }

  deleteMember(member: Member) {
    if (confirm(`Voulez-vous vraiment supprimer ${member.nom} ${member.prenom} ?`)) {
      this.memberService.deleteMember(member._id).subscribe({
        next: (response) => {
          this.snackBar.open('Membre supprimé avec succès !', 'Fermer', { duration: 3000 });
          this.loadMembers();
        },
        error: (error) => {
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
        }
      });
    }
  }
}
