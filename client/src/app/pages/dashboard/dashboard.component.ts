import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { AuthService } from '../../services/auth.service';
import { TontineService } from '../../services/tontine.service';
import { MemberService } from '../../services/member.service';
import { ContributionService } from '../../services/contribution.service';
import { CollectionsStatsComponent } from './collections-stats.component';

interface RecentActivity {
  id: string;
  type: 'tontine' | 'member' | 'contribution' | 'tour' | 'system';
  icon: string;
  title: string;
  description: string;
  time: string;
  date: Date;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatGridListModule,
    CollectionsStatsComponent
  ],
  template: `
    <div class="dashboard-container">
      <div class="welcome-section">
        <h1>👋 Bienvenue, {{ authService.getCurrentUser()?.prenom }} !</h1>
        <p class="subtitle">Tableau de bord de gestion des tontines</p>
      </div>

      <div class="stats-grid">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-icon tontines">
              <mat-icon>account_balance</mat-icon>
            </div>
            <div class="stat-info">
              <h2>{{ stats().tontines }}</h2>
              <p>Tontines Actives</p>
            </div>
            <a mat-button color="primary" [routerLink]="['/tontines']">Voir tout</a>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-icon members">
              <mat-icon>people</mat-icon>
            </div>
            <div class="stat-info">
              <h2>{{ stats().members }}</h2>
              <p>Membres</p>
            </div>
            <a mat-button color="primary" [routerLink]="['/members']">Voir tout</a>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-icon contributions">
              <mat-icon>payments</mat-icon>
            </div>
            <div class="stat-info">
              <h2>{{ stats().contributions }}</h2>
              <p>Cotisations ce mois</p>
            </div>
            <a mat-button color="primary" [routerLink]="['/contributions']">Voir tout</a>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-icon tours">
              <mat-icon>casino</mat-icon>
            </div>
            <div class="stat-info">
              <h2>{{ stats().tours }}</h2>
              <p>Tours Attribués</p>
            </div>
            <a mat-button color="primary" [routerLink]="['/tours']">Voir tout</a>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="actions-section">
        <h2>Actions Rapides</h2>
        <div class="action-buttons">
          @if (authService.hasRole('admin', 'tresorier')) {
            <button mat-raised-button color="primary" [routerLink]="['/tontines/new']">
              <mat-icon>add</mat-icon>
              Nouvelle Tontine
            </button>
            <button mat-raised-button color="accent" [routerLink]="['/members']">
              <mat-icon>person_add</mat-icon>
              Ajouter un Membre
            </button>
            <button mat-raised-button [routerLink]="['/contributions']">
              <mat-icon>payment</mat-icon>
              Enregistrer Cotisation
            </button>
          }
        </div>
      </div>

      <div class="recent-section">
        <mat-card>
          <mat-card-header>
            <mat-card-title>📊 Activités Récentes</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (recentActivities().length === 0) {
              <div class="empty-activities">
                <mat-icon>history</mat-icon>
                <p>Aucune activité récente</p>
              </div>
            } @else {
              <div class="activities-list">
                @for (activity of recentActivities(); track activity.id) {
                  <div class="activity-item">
                    <div class="activity-icon" [class]="activity.type">
                      <mat-icon>{{ activity.icon }}</mat-icon>
                    </div>
                    <div class="activity-content">
                      <h4>{{ activity.title }}</h4>
                      <p>{{ activity.description }}</p>
                      <span class="activity-time">{{ activity.time }}</span>
                    </div>
                  </div>
                }
              </div>
            }
          </mat-card-content>
        </mat-card>

      <!-- Statistiques des collectes -->
      <app-collections-stats></app-collections-stats>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 32px;
      max-width: 1400px;
      margin: 0 auto;
      background: transparent;
    }

    .welcome-section {
      margin-bottom: 40px;
      padding: 24px;
      background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
      border-radius: 16px;
      color: white;
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
      
      h1 {
        font-size: 36px;
        font-weight: 700;
        margin: 0 0 8px 0;
        color: white;
      }
      
      .subtitle {
        color: rgba(255, 255, 255, 0.9);
        font-size: 18px;
        margin: 0;
        font-weight: 400;
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      margin-bottom: 40px;
    }

    .stat-card {
      transition: transform 0.2s, box-shadow 0.2s;
      border-radius: 12px !important;
      border: 1px solid var(--border-color);
      
      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 25px -3px rgb(0 0 0 / 0.15) !important;
      }
      
      mat-card-content {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 24px !important;
      }
    }

    .stat-icon {
      width: 64px;
      height: 64px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      
      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: white;
      }
      
      &.tontines {
        background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
        box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.39);
      }
      
      &.members {
        background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
        box-shadow: 0 4px 14px 0 rgba(236, 72, 153, 0.39);
      }
      
      &.contributions {
        background: linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%);
        box-shadow: 0 4px 14px 0 rgba(6, 182, 212, 0.39);
      }
      
      &.tours {
        background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
        box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.39);
      }
    }

    .stat-info {
      flex: 1;
      
      h2 {
        font-size: 36px;
        font-weight: 700;
        margin: 0 0 4px 0;
        color: var(--text-primary);
        line-height: 1;
      }
      
      p {
        margin: 0;
        color: var(--text-secondary);
        font-size: 14px;
        font-weight: 500;
      }
    }
    
    .stat-card a {
      color: var(--primary-color) !important;
      font-weight: 600;
      font-size: 13px;
    }

    .actions-section {
      margin-bottom: 40px;
      padding: 24px;
      background: white;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow);
      
      h2 {
        font-size: 24px;
        font-weight: 600;
        margin: 0 0 20px 0;
        color: var(--text-primary);
      }
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      
      button {
        height: 44px;
        font-weight: 600;
        border-radius: 8px;
        
        mat-icon {
          margin-right: 8px;
        }
      }
    }

    .recent-section {
      mat-card {
        border-radius: 12px !important;
        border: 1px solid var(--border-color);
      }
      
      mat-card-header {
        margin-bottom: 16px;
        
        mat-card-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
        }
      }
      
      .empty-activities {
        text-align: center;
        padding: 60px 20px;
        
        mat-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          color: #94a3b8;
          margin-bottom: 12px;
        }
        
        p {
          color: #64748b;
          font-size: 16px;
          margin: 0;
        }
      }
      
      .activities-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-height: 500px;
        overflow-y: auto;
        padding: 8px;
      }
      
      .activity-item {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 16px;
        background: #f8fafc;
        border-radius: 12px;
        border-left: 4px solid transparent;
        transition: all 0.2s ease;
        
        &:hover {
          background: #f1f5f9;
          transform: translateX(4px);
        }
      }
      
      .activity-icon {
        width: 48px;
        height: 48px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        
        mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
          color: white;
        }
        
        &.tontine {
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
        }
        
        &.member {
          background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
        }
        
        &.contribution {
          background: linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%);
        }
        
        &.tour {
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
        }
        
        &.system {
          background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
        }
      }
      
      .activity-content {
        flex: 1;
        min-width: 0;
        
        h4 {
          margin: 0 0 6px 0;
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
        }
        
        p {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #64748b;
          line-height: 1.5;
        }
        
        .activity-time {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
        }
      }
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: 16px;
      }
      
      .welcome-section {
        padding: 20px;
        
        h1 {
          font-size: 28px;
        }
        
        .subtitle {
          font-size: 16px;
        }
      }
      
      .stats-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
      
      .action-buttons {
        flex-direction: column;
        
        button {
          width: 100%;
        }
      }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  private router = inject(Router);
  private tontineService = inject(TontineService);
  private memberService = inject(MemberService);
  private contributionService = inject(ContributionService);
  private navigationSubscription?: Subscription;

  stats = signal({
    tontines: 0,
    members: 0,
    contributions: 0,
    tours: 0
  });

  recentActivities = signal<RecentActivity[]>([]);

  ngOnInit() {
    this.loadStats();
    this.loadRecentActivities();
    
    // Rafraîchir les données quand on revient au dashboard
    this.navigationSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        if (event.url === '/dashboard') {
          this.loadStats();
          this.loadRecentActivities();
        }
      });
  }

  ngOnDestroy() {
    this.navigationSubscription?.unsubscribe();
  }

  loadStats() {
    this.tontineService.getTontines('actif').subscribe({
      next: (response) => {
        if (response.success) {
          this.stats.update(s => ({ ...s, tontines: response.count || 0 }));
        }
      }
    });

    this.memberService.getMembers().subscribe({
      next: (response) => {
        if (response.success) {
          this.stats.update(s => ({ ...s, members: response.count || 0 }));
        }
      }
    });
  }

  loadRecentActivities() {
    const activities: RecentActivity[] = [];

    this.tontineService.getTontines().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const recentTontines = response.data
            .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
            .slice(0, 3);
          
          recentTontines.forEach(tontine => {
            const desc = tontine.nom + ' - ' + tontine.montantCotisation.toLocaleString('fr-FR') + ' FCFA (' + tontine.frequence + ')';
            activities.push({
              id: 'tontine-' + tontine._id,
              type: 'tontine',
              icon: 'account_balance',
              title: 'Nouvelle tontine créée',
              description: desc,
              time: this.getRelativeTime(new Date(tontine.createdAt!)),
              date: new Date(tontine.createdAt!)
            });
          });
        }
        this.updateActivities(activities);
      }
    });

    this.memberService.getMembers().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const recentMembers = response.data
            .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
            .slice(0, 3);
          
          recentMembers.forEach(member => {
            const desc = member.nom + ' ' + member.prenom + ' - ' + member.telephone;
            activities.push({
              id: 'member-' + member._id,
              type: 'member',
              icon: 'person_add',
              title: 'Nouveau membre ajouté',
              description: desc,
              time: this.getRelativeTime(new Date(member.createdAt!)),
              date: new Date(member.createdAt!)
            });
          });
        }
        this.updateActivities(activities);
      }
    });

    this.contributionService.getContributions().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const recentContributions = response.data
            .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
            .slice(0, 5);
          
          recentContributions.forEach(contribution => {
            const memberName = typeof contribution.membre === 'string' 
              ? 'Membre' 
              : contribution.membre.nom + ' ' + contribution.membre.prenom;
            
            const desc = memberName + ' - ' + contribution.montant.toLocaleString('fr-FR') + ' FCFA (' + contribution.methodePaiement + ')';
            activities.push({
              id: 'contribution-' + contribution._id,
              type: 'contribution',
              icon: 'payments',
              title: 'Cotisation enregistrée',
              description: desc,
              time: this.getRelativeTime(new Date(contribution.createdAt!)),
              date: new Date(contribution.createdAt!)
            });
          });
        }
        this.updateActivities(activities);
      }
    });
  }

  private updateActivities(activities: RecentActivity[]) {
    const sorted = activities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);
    
    this.recentActivities.set(sorted);
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return 'Il y a ' + diffMins + ' minute' + (diffMins > 1 ? 's' : '');
    if (diffHours < 24) return 'Il y a ' + diffHours + ' heure' + (diffHours > 1 ? 's' : '');
    if (diffDays < 7) return 'Il y a ' + diffDays + ' jour' + (diffDays > 1 ? 's' : '');
    
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  }
}
