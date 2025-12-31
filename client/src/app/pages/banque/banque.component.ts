import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BanqueService } from '../../services/banque.service';
import { TontineService } from '../../services/tontine.service';
import { CarteCodebafService } from '../../services/carte-codebaf.service';
import { SolidariteService } from '../../services/solidarite.service';
import { AuthService } from '../../services/auth.service';
import { BanqueTontine, Tontine, CarteCodebafStats } from '../../models';

@Component({
  selector: 'app-banque',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatSnackBarModule],
  template: `
    <div class="banque-page-container">
      <div class="banque-page-header">
        <div class="banque-header-left">
          <mat-icon class="banque-page-icon">account_balance</mat-icon>
          <div>
            <h1 class="banque-h1">Banque centrale</h1>
            <p class="banque-subtitle">Monitoring centralise: Tontines, Solidarites et Cartes CODEBAF</p>
          </div>
        </div>
      </div>

      <mat-card class="banque-filter-card">
        <mat-card-content>
          <div class="banque-filters-row">
            <mat-form-field appearance="outline" class="banque-filter-field">
              <mat-label>Vue</mat-label>
              <mat-select [value]="selectedView()" (selectionChange)="selectedView.set($event.value)">
                <mat-option value="tontine">Tontine</mat-option>
                <mat-option value="solidarite">Solidarites</mat-option>
                <mat-option value="cartes">Cartes CODEBAF</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <div *ngIf="banque()">
        <div class="banque-stats-grid">
          <mat-card class="banque-stat-card solde">
            <mat-icon class="banque-stat-icon">account_balance_wallet</mat-icon>
            <div class="banque-stat-content">
              <h3>{{ banque()!.soldeTotal | number:'1.0-0' }} FCFA</h3>
              <p>Solde</p>
            </div>
          </mat-card>
        </div>
      </div>
    </div>
  `
})
export class BanqueComponent implements OnInit {
  private banqueService = inject(BanqueService);
  private tontineService = inject(TontineService);
  private carteCodebafService = inject(CarteCodebafService);
  private solidariteService = inject(SolidariteService);
  authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  banque = signal<BanqueTontine | null>(null);
  tontines = signal<Tontine[]>([]);
  selectedView = signal<'tontine'|'solidarite'|'cartes'>('tontine');
  cartesStats = signal<CarteCodebafStats | null>(null);

  ngOnInit() {
    this.loadTontines();
  }

  loadTontines() {
    this.tontineService.getTontines().subscribe({ next: () => {}, error: () => {} });
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  }
}
