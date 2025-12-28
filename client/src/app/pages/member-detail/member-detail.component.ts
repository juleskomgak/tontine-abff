import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-member-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="page-container">
      <h1>👤 Détails du Membre</h1>
      <mat-card>
        <mat-card-content>
          <p>Détails du membre en cours de développement...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }
    h1 { margin-bottom: 24px; }
  `]
})
export class MemberDetailComponent {}
