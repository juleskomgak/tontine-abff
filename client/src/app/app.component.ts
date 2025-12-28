import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSidenavModule,
    MatListModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  authService = inject(AuthService);
  router = inject(Router);
  
  title = 'Tontine ABFF';
  
  menuItems = [
    { icon: 'dashboard', label: 'Tableau de bord', route: '/dashboard' },
    { icon: 'people', label: 'Membres', route: '/members' },
    { icon: 'account_balance', label: 'Tontines', route: '/tontines' },
    { icon: 'payments', label: 'Cotisations', route: '/contributions' },
    { icon: 'casino', label: 'Tours', route: '/tours' },
    { icon: 'account_balance_wallet', label: 'Bénéficiaires & Paiements', route: '/beneficiaires' }
  ];
  
  logout(): void {
    this.authService.logout();
  }
}
