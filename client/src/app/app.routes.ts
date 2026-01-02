import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'members',
    loadComponent: () => import('./pages/members/members.component').then(m => m.MembersComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] }
  },
  {
    path: 'members/:id',
    loadComponent: () => import('./pages/member-detail/member-detail.component').then(m => m.MemberDetailComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] }
  },
  {
    path: 'tontines',
    loadComponent: () => import('./pages/tontines/tontines.component').then(m => m.TontinesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'tontines/new',
    loadComponent: () => import('./pages/tontine-form/tontine-form.component').then(m => m.TontineFormComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'tresorier'] }
  },
  {
    path: 'tontines/edit/:id',
    loadComponent: () => import('./pages/tontine-form/tontine-form.component').then(m => m.TontineFormComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'tresorier'] }
  },
  {
    path: 'tontines/:id',
    loadComponent: () => import('./pages/tontine-detail/tontine-detail.component').then(m => m.TontineDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'contributions',
    loadComponent: () => import('./pages/contributions/contributions.component').then(m => m.ContributionsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'tours',
    loadComponent: () => import('./pages/tours/tours.component').then(m => m.ToursComponent),
    canActivate: [authGuard]
  },
  {
    path: 'beneficiaires',
    loadComponent: () => import('./pages/beneficiaires/beneficiaires.component').then(m => m.BeneficiairesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'banque',
    loadComponent: () => import('./pages/banque/banque.component').then(m => m.BanqueComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'tresorier'] }
  },
  {
    path: 'solidarite',
    loadComponent: () => import('./pages/solidarite/solidarite.component').then(m => m.SolidariteComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'membre', 'tresorier'] }
  },
  {
    path: 'aides',
    loadComponent: () => import('./pages/aides/aides.component').then(m => m.AidesComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'tresorier'] }
  },
  {
    path: 'cartes-codebaf',
    loadComponent: () => import('./pages/cartes-codebaf/cartes-codebaf.component').then(m => m.CartesCodebafComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'tresorier'] }
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] }
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
