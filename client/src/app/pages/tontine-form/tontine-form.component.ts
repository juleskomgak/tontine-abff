import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TontineService } from '../../services/tontine.service';
import { MemberService } from '../../services/member.service';
import { Member } from '../../models';

@Component({
  selector: 'app-tontine-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatSnackBarModule
  ],
  templateUrl: './tontine-form.component.html',
  styleUrls: ['./tontine-form.component.scss']
})
export class TontineFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private tontineService = inject(TontineService);
  private memberService = inject(MemberService);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  tontineId = signal<string | null>(null);
  searchText = signal('');
  availableMembers = signal<Member[]>([]);
  selectedMemberIds = signal<Set<string>>(new Set());

  // Computed signals
  isEditing = computed(() => !!this.tontineId());
  selectedMembers = computed(() => 
    this.availableMembers().filter(m => this.selectedMemberIds().has(m._id))
  );
  filteredMembers = computed(() => {
    const search = this.searchText().toLowerCase().trim();
    if (!search) return this.availableMembers();
    
    return this.availableMembers().filter(member => 
      member.nom.toLowerCase().includes(search) ||
      member.prenom.toLowerCase().includes(search) ||
      (member.email && member.email.toLowerCase().includes(search)) ||
      member.telephone.includes(search)
    );
  });

  tontineForm: FormGroup = this.fb.group({
    nom: ['', Validators.required],
    description: [''],
    montantCotisation: ['', [Validators.required, Validators.min(1000)]],
    frequence: ['mensuel', Validators.required],
    dateDebut: ['', Validators.required],
    dateFin: ['', Validators.required],
    statut: ['planifie', Validators.required]
  });

  ngOnInit() {
    this.loadMembers();
    
    // Check if editing
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.tontineId.set(id);
      this.loadTontine(id);
    }
  }

  loadMembers() {
    this.memberService.getMembers('', true).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.availableMembers.set(response.data);
        }
      },
      error: (error) => {
        this.snackBar.open('Erreur lors du chargement des membres', 'Fermer', { duration: 3000 });
      }
    });
  }

  loadTontine(id: string) {
    this.tontineService.getTontine(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const tontine = response.data;
          this.tontineForm.patchValue({
            nom: tontine.nom,
            description: tontine.description,
            montantCotisation: tontine.montantCotisation,
            frequence: tontine.frequence,
            dateDebut: tontine.dateDebut,
            dateFin: tontine.dateFin,
            statut: tontine.statut
          });
          
          // Set selected members
          const memberIds = tontine.membres.map(m => 
            typeof m.membre === 'string' ? m.membre : m.membre._id
          );
          this.selectedMemberIds.set(new Set(memberIds));
        }
      },
      error: (error) => {
        this.snackBar.open('Erreur lors du chargement de la tontine', 'Fermer', { duration: 3000 });
      }
    });
  }

  isMemberSelected(memberId: string): boolean {
    return this.selectedMemberIds().has(memberId);
  }

  toggleMember(member: Member) {
    const currentIds = new Set(this.selectedMemberIds());
    if (currentIds.has(member._id)) {
      currentIds.delete(member._id);
    } else {
      currentIds.add(member._id);
    }
    this.selectedMemberIds.set(currentIds);
  }

  onSubmit() {
    if (this.tontineForm.valid && this.selectedMembers().length > 0) {
      this.loading.set(true);
      
      const formData = {
        ...this.tontineForm.value,
        membres: Array.from(this.selectedMemberIds()).map(memberId => ({
          membre: memberId,
          dateAdhesion: new Date(),
          isActive: true
        }))
      };

      const operation = this.isEditing()
        ? this.tontineService.updateTontine(this.tontineId()!, formData)
        : this.tontineService.createTontine(formData);

      operation.subscribe({
        next: (response) => {
          this.loading.set(false);
          const message = this.isEditing() 
            ? 'Tontine modifiée avec succès !'
            : 'Tontine créée avec succès !';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          this.router.navigate(['/tontines']);
        },
        error: (error) => {
          this.loading.set(false);
          const message = this.isEditing()
            ? 'Erreur lors de la modification'
            : 'Erreur lors de la création';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  goBack() {
    this.router.navigate(['/tontines']);
  }
}
