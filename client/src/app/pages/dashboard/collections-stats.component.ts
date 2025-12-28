import { Component, OnInit, inject, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { ContributionService } from '../../services/contribution.service';
import { TontineService } from '../../services/tontine.service';
import { Tontine } from '../../models';

Chart.register(...registerables);

interface MonthlyData {
  month: number;
  especes: number;
  mobile_money: number;
  virement: number;
  cheque: number;
}

interface TontineData {
  tontineId: string;
  tontineName: string;
  especes: number;
  mobile_money: number;
  virement: number;
  cheque: number;
  total: number;
}

@Component({
  selector: 'app-collections-stats',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  template: `
    <mat-card class="stats-card">
      <mat-card-header>
        <mat-card-title>
          <div class="header-content">
            <div>
              <mat-icon class="header-icon">analytics</mat-icon>
              📊 Statistiques des Collectes
            </div>
            <div class="filters">
              <mat-form-field appearance="outline" class="year-select">
                <mat-label>Année</mat-label>
                <mat-select [value]="selectedYear" (selectionChange)="selectedYear = $event.value; loadStats()">
                  @for (year of availableYears; track year) {
                    <mat-option [value]="year">{{ year }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              
              <mat-form-field appearance="outline" class="tontine-select">
                <mat-label>Tontine</mat-label>
                <mat-select [value]="selectedTontine" (selectionChange)="selectedTontine = $event.value; loadStats()">
                  <mat-option [value]="null">Toutes les tontines</mat-option>
                  @for (tontine of tontines(); track tontine._id) {
                    <mat-option [value]="tontine._id">{{ tontine.nom }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          </div>
        </mat-card-title>
      </mat-card-header>
      
      <mat-card-content>
        @if (loading()) {
          <div class="loading-container">
            <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
            <p>Chargement des statistiques...</p>
          </div>
        } @else {
          <!-- Graphique par mois -->
          <div class="chart-section">
            <h3>💰 Collectes Mensuelles par Méthode de Paiement</h3>
            <div class="chart-container">
              <canvas #monthlyChart></canvas>
            </div>
          </div>

          <!-- Graphique par tontine -->
          <div class="chart-section">
            <h3>🏦 Collectes par Tontine</h3>
            <div class="chart-container">
              <canvas #tontineChart></canvas>
            </div>
          </div>

          <!-- Tableau récapitulatif -->
          <div class="summary-section">
            <h3>📋 Récapitulatif par Tontine</h3>
            <div class="summary-table">
              @if (tontineData().length === 0) {
                <div class="empty-state">
                  <mat-icon>inbox</mat-icon>
                  <p>Aucune donnée disponible pour cette période</p>
                </div>
              } @else {
                <table>
                  <thead>
                    <tr>
                      <th>Tontine</th>
                      <th class="amount-col especes">Espèces</th>
                      <th class="amount-col mobile-money">Mobile Money</th>
                      <th class="amount-col virement">Virement</th>
                      <th class="amount-col cheque">Chèque</th>
                      <th class="amount-col total">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (data of tontineData(); track data.tontineId) {
                      <tr>
                        <td class="tontine-name">{{ data.tontineName }}</td>
                        <td class="amount-col especes">{{ data.especes | number:'1.0-0' }} FCFA</td>
                        <td class="amount-col mobile-money">{{ data.mobile_money | number:'1.0-0' }} FCFA</td>
                        <td class="amount-col virement">{{ data.virement | number:'1.0-0' }} FCFA</td>
                        <td class="amount-col cheque">{{ data.cheque | number:'1.0-0' }} FCFA</td>
                        <td class="amount-col total"><strong>{{ data.total | number:'1.0-0' }} FCFA</strong></td>
                      </tr>
                    }
                    <tr class="total-row">
                      <td><strong>Total Général</strong></td>
                      <td class="amount-col especes"><strong>{{ getTotalByMethod('especes') | number:'1.0-0' }} FCFA</strong></td>
                      <td class="amount-col mobile-money"><strong>{{ getTotalByMethod('mobile_money') | number:'1.0-0' }} FCFA</strong></td>
                      <td class="amount-col virement"><strong>{{ getTotalByMethod('virement') | number:'1.0-0' }} FCFA</strong></td>
                      <td class="amount-col cheque"><strong>{{ getTotalByMethod('cheque') | number:'1.0-0' }} FCFA</strong></td>
                      <td class="amount-col total"><strong>{{ getGrandTotal() | number:'1.0-0' }} FCFA</strong></td>
                    </tr>
                  </tbody>
                </table>
              }
            </div>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .stats-card {
      margin: 24px 0;
      border-radius: 12px !important;
      border: 1px solid var(--border-color);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      gap: 20px;
      flex-wrap: wrap;
      
      > div:first-child {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 20px;
        font-weight: 600;
        color: var(--text-primary);
      }
    }

    .header-icon {
      color: #2563eb;
    }

    .filters {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      
      mat-form-field {
        margin: 0;
        min-width: 140px;
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

    .chart-section {
      margin-bottom: 40px;
      
      h3 {
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 20px 0;
        color: var(--text-primary);
      }
    }

    .chart-container {
      position: relative;
      height: 350px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 12px;
    }

    .summary-section {
      margin-top: 40px;
      
      h3 {
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 20px 0;
        color: var(--text-primary);
      }
    }

    .summary-table {
      overflow-x: auto;
      
      table {
        width: 100%;
        border-collapse: collapse;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      
      thead {
        background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
        
        th {
          padding: 16px;
          text-align: left;
          font-weight: 600;
          color: white;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      }
      
      tbody {
        tr {
          border-bottom: 1px solid #e2e8f0;
          transition: background-color 0.2s;
          
          &:hover {
            background-color: #f8fafc;
          }
          
          &.total-row {
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            border-top: 2px solid #2563eb;
            
            &:hover {
              background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
            }
          }
        }
        
        td {
          padding: 14px 16px;
          color: var(--text-primary);
          font-size: 14px;
          
          &.tontine-name {
            font-weight: 500;
          }
          
          &.amount-col {
            text-align: right;
            font-family: 'Courier New', monospace;
            
            &.especes {
              color: #059669;
            }
            
            &.mobile-money {
              color: #dc2626;
            }
            
            &.virement {
              color: #2563eb;
            }
            
            &.cheque {
              color: #7c3aed;
            }
            
            &.total {
              color: #1e293b;
              font-weight: 600;
            }
          }
        }
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px 20px;
      
      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #cbd5e1;
        margin-bottom: 16px;
      }
      
      p {
        color: #64748b;
        font-size: 16px;
        margin: 0;
      }
    }

    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .filters {
        width: 100%;
        
        mat-form-field {
          flex: 1;
        }
      }
      
      .chart-container {
        height: 280px;
        padding: 10px;
      }
      
      .summary-table {
        font-size: 12px;
        
        thead th,
        tbody td {
          padding: 10px 8px;
        }
      }
    }
  `]
})
export class CollectionsStatsComponent implements OnInit, AfterViewInit {
  @ViewChild('monthlyChart') monthlyChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('tontineChart') tontineChartRef!: ElementRef<HTMLCanvasElement>;

  private contributionService = inject(ContributionService);
  private tontineService = inject(TontineService);

  loading = signal(true);
  tontines = signal<Tontine[]>([]);
  monthlyData = signal<MonthlyData[]>([]);
  tontineData = signal<TontineData[]>([]);

  selectedYear = new Date().getFullYear();
  selectedTontine: string | null = null;
  availableYears = [2023, 2024, 2025, 2026];

  private monthlyChart?: Chart;
  private tontineChart?: Chart;

  private readonly PAYMENT_COLORS = {
    especes: '#059669',
    mobile_money: '#dc2626',
    virement: '#2563eb',
    cheque: '#7c3aed'
  };

  private readonly PAYMENT_LABELS = {
    especes: 'Espèces',
    mobile_money: 'Mobile Money',
    virement: 'Virement',
    cheque: 'Chèque'
  };

  ngOnInit() {
    this.loadTontines();
    this.loadStats();
  }

  ngAfterViewInit() {
    // S'assurer que les graphiques sont créés après que la vue soit complètement initialisée
    // Si des données sont déjà chargées, créer les graphiques
    setTimeout(() => {
      if (this.monthlyData().length > 0) {
        this.createMonthlyChart();
      }
      if (this.tontineData().length > 0) {
        this.createTontineChart();
      }
    }, 100);
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

  loadStats() {
    this.loading.set(true);
    
    console.log('Chargement des stats pour année:', this.selectedYear, 'tontine:', this.selectedTontine);
    
    this.contributionService.getMonthlyStats(this.selectedYear, this.selectedTontine || undefined).subscribe({
      next: (response) => {
        console.log('Réponse stats reçue:', response);
        if (response.success && response.data) {
          console.log('monthlyStats:', response.data.monthlyStats);
          console.log('tontineStats:', response.data.tontineStats);
          
          this.processMonthlyData(response.data.monthlyStats);
          this.processTontineData(response.data.tontineStats);
          
          console.log('Monthly data processed:', this.monthlyData());
          console.log('Tontine data processed:', this.tontineData());
          
          // Attendre que la vue soit mise à jour puis créer les graphiques
          setTimeout(() => {
            if (this.monthlyChartRef && this.tontineChartRef) {
              this.createMonthlyChart();
              this.createTontineChart();
            } else {
              console.error('Canvas refs non disponibles');
            }
          }, 100);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des statistiques', error);
        this.loading.set(false);
      }
    });
  }

  private processMonthlyData(rawData: any[]) {
    const monthlyMap = new Map<number, MonthlyData>();
    
    // Initialiser tous les mois avec 0
    for (let month = 1; month <= 12; month++) {
      monthlyMap.set(month, {
        month,
        especes: 0,
        mobile_money: 0,
        virement: 0,
        cheque: 0
      });
    }
    
    // Remplir avec les données réelles
    rawData.forEach(item => {
      const month = item._id.month;
      const data = monthlyMap.get(month)!;
      const method = item._id.methodePaiement as keyof Omit<MonthlyData, 'month'>;
      data[method] = item.montantTotal;
    });
    
    this.monthlyData.set(Array.from(monthlyMap.values()));
  }

  private processTontineData(rawData: any[]) {
    const tontineMap = new Map<string, TontineData>();
    
    rawData.forEach(item => {
      const tontineId = item._id.tontine._id;
      const tontineName = item._id.tontine.nom;
      
      if (!tontineMap.has(tontineId)) {
        tontineMap.set(tontineId, {
          tontineId,
          tontineName,
          especes: 0,
          mobile_money: 0,
          virement: 0,
          cheque: 0,
          total: 0
        });
      }
      
      const data = tontineMap.get(tontineId)!;
      const method = item._id.methodePaiement as keyof Omit<TontineData, 'tontineId' | 'tontineName' | 'total'>;
      data[method] = item.montantTotal;
      data.total += item.montantTotal;
    });
    
    this.tontineData.set(Array.from(tontineMap.values()));
  }

  private createMonthlyChart() {
    if (this.monthlyChart) {
      this.monthlyChart.destroy();
    }

    if (!this.monthlyChartRef) {
      console.error('monthlyChartRef non disponible');
      return;
    }

    const ctx = this.monthlyChartRef.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Contexte canvas non disponible pour monthly chart');
      return;
    }

    const data = this.monthlyData();
    console.log('Création du graphique mensuel avec:', data);
    const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    this.monthlyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: this.PAYMENT_LABELS.especes,
            data: data.map(d => d.especes),
            backgroundColor: this.PAYMENT_COLORS.especes,
            borderRadius: 6
          },
          {
            label: this.PAYMENT_LABELS.mobile_money,
            data: data.map(d => d.mobile_money),
            backgroundColor: this.PAYMENT_COLORS.mobile_money,
            borderRadius: 6
          },
          {
            label: this.PAYMENT_LABELS.virement,
            data: data.map(d => d.virement),
            backgroundColor: this.PAYMENT_COLORS.virement,
            borderRadius: 6
          },
          {
            label: this.PAYMENT_LABELS.cheque,
            data: data.map(d => d.cheque),
            backgroundColor: this.PAYMENT_COLORS.cheque,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: { size: 12, weight: 'bold' }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y ?? 0;
                return `${context.dataset.label}: ${value.toLocaleString('fr-FR')} FCFA`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              callback: (value) => {
                return (value as number).toLocaleString('fr-FR') + ' FCFA';
              }
            }
          }
        }
      }
    });
  }

  private createTontineChart() {
    if (this.tontineChart) {
      this.tontineChart.destroy();
    }

    if (!this.tontineChartRef) {
      console.error('tontineChartRef non disponible');
      return;
    }

    const ctx = this.tontineChartRef.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Contexte canvas non disponible pour tontine chart');
      return;
    }

    const data = this.tontineData();
    console.log('Création du graphique par tontine avec:', data);

    this.tontineChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.tontineName),
        datasets: [
          {
            label: this.PAYMENT_LABELS.especes,
            data: data.map(d => d.especes),
            backgroundColor: this.PAYMENT_COLORS.especes,
            borderRadius: 6
          },
          {
            label: this.PAYMENT_LABELS.mobile_money,
            data: data.map(d => d.mobile_money),
            backgroundColor: this.PAYMENT_COLORS.mobile_money,
            borderRadius: 6
          },
          {
            label: this.PAYMENT_LABELS.virement,
            data: data.map(d => d.virement),
            backgroundColor: this.PAYMENT_COLORS.virement,
            borderRadius: 6
          },
          {
            label: this.PAYMENT_LABELS.cheque,
            data: data.map(d => d.cheque),
            backgroundColor: this.PAYMENT_COLORS.cheque,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: { size: 12, weight: 'bold' }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.x ?? 0;
                return `${context.dataset.label}: ${value.toLocaleString('fr-FR')} FCFA`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              callback: (value) => {
                return (value as number).toLocaleString('fr-FR') + ' FCFA';
              }
            }
          },
          y: {
            stacked: true,
            grid: { display: false }
          }
        }
      }
    });
  }

  getTotalByMethod(method: 'especes' | 'mobile_money' | 'virement' | 'cheque'): number {
    return this.tontineData().reduce((sum, data) => sum + data[method], 0);
  }

  getGrandTotal(): number {
    return this.tontineData().reduce((sum, data) => sum + data.total, 0);
  }
}
