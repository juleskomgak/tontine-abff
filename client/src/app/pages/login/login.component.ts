import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>
            <h1>🎯 Tontine ABFF</h1>
            <p>Connexion à votre compte</p>
          </mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" placeholder="exemple@email.com">
              <mat-icon matPrefix>email</mat-icon>
              @if (loginForm.get('email')?.hasError('email') && loginForm.get('email')?.touched) {
                <mat-error>Email invalide</mat-error>
              }
              @if (loginForm.get('email')?.hasError('required') && loginForm.get('email')?.touched) {
                <mat-error>Email requis</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Mot de passe</mat-label>
              <input matInput 
                     [type]="hidePassword() ? 'password' : 'text'" 
                     formControlName="password"
                     placeholder="Votre mot de passe">
              <mat-icon matPrefix>lock</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="togglePasswordVisibility()">
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (loginForm.get('password')?.hasError('required') && loginForm.get('password')?.touched) {
                <mat-error>Mot de passe requis</mat-error>
              }
            </mat-form-field>

            <button mat-raised-button 
                    color="primary" 
                    type="submit" 
                    class="full-width login-button"
                    [disabled]="loginForm.invalid || loading()">
              @if (loading()) {
                <span>Connexion en cours...</span>
              } @else {
                <span>Se connecter</span>
              }
            </button>
          </form>

          <div class="register-link">
            <p>Pas encore de compte ? <a href="/register">S'inscrire</a></p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #8b5cf6 100%);
      padding: 20px;
      position: relative;
      overflow: hidden;
      
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%),
                    radial-gradient(circle at 80% 80%, rgba(255,255,255,0.15) 0%, transparent 50%);
        animation: pulse 8s ease-in-out infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
      }
    }

    .login-card {
      max-width: 480px;
      width: 100%;
      border-radius: 20px !important;
      box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25) !important;
      position: relative;
      z-index: 1;
      border: 2px solid rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.98) !important;
      backdrop-filter: blur(10px);
    }

    mat-card-header {
      justify-content: center;
      text-align: center;
      margin-bottom: 24px;
      padding: 40px 32px 0 32px;
      
      h1 {
        font-size: 2.8rem;
        margin: 0;
        background: linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #8b5cf6 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-weight: 800;
        letter-spacing: -0.5px;
      }
      
      p {
        margin: 12px 0 0 0;
        color: #64748b;
        font-size: 17px;
        font-weight: 500;
      }
    }
    
    mat-card-content {
      padding: 0 32px 32px 32px !important;
    }

    .full-width {
      width: 100%;
      margin-bottom: 20px;
    }
    
    ::ng-deep .mat-mdc-form-field {
      .mat-mdc-text-field-wrapper {
        background-color: #f8fafc !important;
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
            border-color: #3b82f6 !important;
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
        font-size: 16px;
        font-weight: 500;
        
        &::placeholder {
          color: #94a3b8 !important;
        }
      }
      
      .mat-mdc-form-field-label {
        color: #475569 !important;
        font-weight: 600;
      }
    }

    .login-button {
      height: 52px;
      font-size: 17px;
      font-weight: 700;
      margin-top: 12px;
      border-radius: 10px;
      background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%) !important;
      box-shadow: 0 4px 6px -1px rgb(37 99 235 / 0.4) !important;
      letter-spacing: 0.3px;
      text-transform: none;
      
      &:hover:not(:disabled) {
        box-shadow: 0 10px 15px -3px rgb(37 99 235 / 0.5) !important;
        transform: translateY(-2px);
        transition: all 0.3s ease;
      }
      
      &:disabled {
        background: #cbd5e1 !important;
        color: #94a3b8 !important;
        box-shadow: none !important;
      }
    }

    .register-link {
      text-align: center;
      margin-top: 28px;
      padding-top: 28px;
      border-top: 2px solid #e2e8f0;
      
      p {
        color: #64748b;
        margin: 0;
        font-size: 15px;
      }
      
      a {
        color: #2563eb;
        text-decoration: none;
        font-weight: 700;
        transition: all 0.2s ease;
        
        &:hover {
          text-decoration: underline;
          color: #1e40af;
        }
      }
    }
    
    @media (max-width: 600px) {
      .login-card {
        max-width: 100%;
      }
      
      mat-card-header {
        padding: 24px 20px 0 20px;
        
        h1 {
          font-size: 2rem;
        }
      }
      
      mat-card-content {
        padding: 0 20px 24px 20px !important;
      }
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  hidePassword = signal(true);
  loading = signal(false);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  togglePasswordVisibility(): void {
    this.hidePassword.set(!this.hidePassword());
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading.set(true);
      
      this.authService.login(this.loginForm.value).subscribe({
        next: (response) => {
          this.loading.set(false);
          this.snackBar.open('Connexion réussie !', 'Fermer', { duration: 3000 });
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.loading.set(false);
          this.snackBar.open(
            error.error?.message || 'Erreur de connexion',
            'Fermer',
            { duration: 5000 }
          );
        }
      });
    }
  }
}
