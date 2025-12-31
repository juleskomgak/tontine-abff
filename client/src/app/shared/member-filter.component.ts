import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, startWith } from 'rxjs';
import { MemberService } from '../services/member.service';

@Component({
  selector: 'app-member-filter',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatAutocompleteModule, MatIconModule],
  template: `
    <mat-form-field appearance="outline" class="member-filter">
      <input matInput [formControl]="control" [matAutocomplete]="auto" placeholder="Rechercher un membre">
      <button mat-icon-button matSuffix *ngIf="control.value" (click)="clear()" aria-label="Clear">
        <mat-icon>close</mat-icon>
      </button>
      <mat-autocomplete #auto="matAutocomplete" [displayWith]="displayFn" (optionSelected)="select($event.option.value)">
        <mat-option *ngFor="let m of options" [value]="m">
          {{ m.nom }} {{ m.prenom }} <small *ngIf="m.telephone"> — {{ m.telephone }}</small>
        </mat-option>
      </mat-autocomplete>
    </mat-form-field>
  `,
  styles: [`
    .member-filter { width: 320px; }
    @media (max-width: 768px) { .member-filter { width: 100%; } }
  `]
})
export class MemberFilterComponent {
  private memberService = inject(MemberService);

  @Output() memberSelected = new EventEmitter<string | null>();
  @Output() search = new EventEmitter<string>();

  control = new FormControl('');
  options: any[] = [];

  private input$ = new Subject<string>();

  constructor() {
    this.control.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe((value: any) => {
      const q = typeof value === 'string' ? value : (value && (value.nom + ' ' + value.prenom)) || '';
      // If an object was selected, emit selection
      if (value && typeof value === 'object' && value._id) {
        this.memberSelected.emit(value._id);
        this.search.emit('');
        return;
      }
      this.search.emit(q || '');
      this.fetch(q || '');
    });
  }

  displayFn = (member: any) => {
    if (!member) return '';
    if (typeof member === 'string') return member;
    return `${member.nom || ''} ${member.prenom || ''}`.trim();
  }

  fetch(q: string) {
    this.memberService.getMembers(q || undefined).subscribe(res => {
      if (res.success && res.data) {
        this.options = res.data;
      } else {
        this.options = [];
      }
    });
  }

  select(member: any) {
    if (!member) return;
    this.control.setValue(member);
    this.memberSelected.emit(member._id);
  }

  clear() {
    this.control.setValue('');
    this.options = [];
    this.memberSelected.emit(null);
    this.search.emit('');
  }
}
