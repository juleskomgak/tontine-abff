import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  template: `
    <div class="register-container">
      <mat-card class="register-card">
        <mat-card-header>
          <mat-card-title>
            <h1>🎯 Tontine ABFF</h1>
            <p>Créer un nouveau compte</p>
          </mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
            <div class="form-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Nom</mat-label>
                <input matInput formControlName="nom" placeholder="Votre nom">
                <mat-icon matPrefix>person</mat-icon>
                @if (registerForm.get('nom')?.hasError('required') && registerForm.get('nom')?.touched) {
                  <mat-error>Nom requis</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Prénom</mat-label>
                <input matInput formControlName="prenom" placeholder="Votre prénom">
                @if (registerForm.get('prenom')?.hasError('required') && registerForm.get('prenom')?.touched) {
                  <mat-error>Prénom requis</mat-error>
                }
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" placeholder="exemple@email.com">
              <mat-icon matPrefix>email</mat-icon>
              @if (registerForm.get('email')?.hasError('email') && registerForm.get('email')?.touched) {
                <mat-error>Email invalide</mat-error>
              }
              @if (registerForm.get('email')?.hasError('required') && registerForm.get('email')?.touched) {
                <mat-error>Email requis</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Téléphone</mat-label>
              <input matInput formControlName="telephone" placeholder="+237 6 XX XX XX XX">
              <mat-icon matPrefix>phone</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Mot de passe</mat-label>
              <input matInput 
                     [type]="hidePassword() ? 'password' : 'text'" 
                     formControlName="password"
                     placeholder="Au moins 6 caractères">
              <mat-icon matPrefix>lock</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="togglePasswordVisibility()">
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (registerForm.get('password')?.hasError('required') && registerForm.get('password')?.touched) {
                <mat-error>Mot de passe requis</mat-error>
              }
              @if (registerForm.get('password')?.hasError('minlength') && registerForm.get('password')?.touched) {
                <mat-error>Minimum 6 caractères</mat-error>
              }
            </mat-form-field>

            <button mat-raised-button 
                    color="primary" 
                    type="submit" 
                    class="full-width register-button"
                    [disabled]="registerForm.invalid || loading()">
              @if (loading()) {
                <span>Inscription en cours...</span>
              } @else {
                <span>S'inscrire</span>
              }
            </button>
          </form>

          <div class="login-link">
            <p>Déjà un compte ? <a routerLink="/login">Se connecter</a></p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .register-card {
      max-width: 500px;
      width: 100%;
    }

    mat-card-header {
      justify-content: center;
      text-align: center;
      margin-bottom: 20px;
      
      h1 {
        font-size: 2rem;
        margin: 0;
        color: #667eea;
      }
      
      p {
        margin: 5px 0 0 0;
        color: #666;
      }
    }

    .form-row {
      display: flex;
      gap: 15px;
    }

    .half-width {
      flex: 1;
      margin-bottom: 15px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 15px;
    }

    .register-button {
      height: 45px;
      font-size: 16px;
      margin-top: 10px;
    }

    .login-link {
      text-align: center;
      margin-top: 20px;
      
      a {
        color: #667eea;
        text-decoration: none;
        font-weight: 500;
        
        &:hover {
          text-decoration: underline;
        }
      }
    }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  hidePassword = signal(true);
  loading = signal(false);

  registerForm: FormGroup = this.fb.group({
    nom: ['', Validators.required],
    prenom: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telephone: [''],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  togglePasswordVisibility(): void {
    this.hidePassword.set(!this.hidePassword());
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.loading.set(true);
      
      this.authService.register(this.registerForm.value).subscribe({
        next: (response) => {
          this.loading.set(false);
          // Vérifier si le compte est en attente de validation
          if (response.data?.pendingValidation) {
            this.snackBar.open(
              'Compte créé ! En attente de validation par un administrateur.',
              'Fermer',
              { duration: 8000, panelClass: ['info-snackbar'] }
            );
            this.router.navigate(['/login']);
          } else {
            this.snackBar.open('Inscription réussie !', 'Fermer', { duration: 3000 });
            this.router.navigate(['/dashboard']);
          }
        },
        error: (error) => {
          this.loading.set(false);
          this.snackBar.open(
            error.error?.message || 'Erreur lors de l\'inscription',
            'Fermer',
            { duration: 5000 }
          );
        }
      });
    }
  }
}
