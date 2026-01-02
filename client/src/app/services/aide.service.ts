import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CategorieAide {
  _id: string;
  nom: string;
  type: 'malheureux' | 'heureux' | 'chefferie' | 'repas';
  description?: string;
  montantDefaut: number;
  isActive: boolean;
  createdBy?: {
    _id: string;
    nom: string;
    prenom: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AideAccordee {
  _id: string;
  membre: {
    _id: string;
    nom: string;
    prenom: string;
    telephone?: string;
  };
  categorie: {
    _id: string;
    nom: string;
    type: string;
    montantDefaut: number;
  };
  montant: number;
  motif: string;
  description?: string;
  dateEvenement?: Date;
  dateAccord: Date;
  statut: 'en_attente' | 'approuve' | 'paye' | 'refuse' | 'annule';
  datePaiement?: Date;
  tour?: {
    _id: string;
    numeroTour: number;
    dateReceptionPrevue: Date;
  };
  tontine?: {
    _id: string;
    nom: string;
  };
  approuvePar?: {
    _id: string;
    nom: string;
    prenom: string;
  };
  dateApprobation?: Date;
  payePar?: {
    _id: string;
    nom: string;
    prenom: string;
  };
  sourceDebit: 'cotisation_membre' | 'solidarite_repas' | 'caisse_chefferie';
  notes?: string;
  createdBy: {
    _id: string;
    nom: string;
    prenom: string;
  };
  annee: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AideStats {
  annee: number;
  totalGeneral: {
    totalMontant: number;
    nombreAides: number;
  };
  parCategorie: Array<{
    _id: string;
    nomCategorie: string;
    typeCategorie: string;
    totalMontant: number;
    nombreAides: number;
  }>;
  parType: Array<{
    _id: string;
    totalMontant: number;
    nombreAides: number;
  }>;
  parStatut: Array<{
    _id: string;
    totalMontant: number;
    nombre: number;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class AideService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/aides`;

  // Signals
  categories = signal<CategorieAide[]>([]);
  aides = signal<AideAccordee[]>([]);
  stats = signal<AideStats | null>(null);
  loading = signal(false);

  // ============== CATEGORIES ==============

  getCategories(): Observable<ApiResponse<CategorieAide[]>> {
    return this.http.get<ApiResponse<CategorieAide[]>>(`${this.apiUrl}/categories`)
      .pipe(tap(res => {
        if (res.success) {
          this.categories.set(res.data);
        }
      }));
  }

  createCategorie(data: Partial<CategorieAide>): Observable<ApiResponse<CategorieAide>> {
    return this.http.post<ApiResponse<CategorieAide>>(`${this.apiUrl}/categories`, data);
  }

  updateCategorie(id: string, data: Partial<CategorieAide>): Observable<ApiResponse<CategorieAide>> {
    return this.http.put<ApiResponse<CategorieAide>>(`${this.apiUrl}/categories/${id}`, data);
  }

  deleteCategorie(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/categories/${id}`);
  }

  initCategories(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/categories/init`, {});
  }

  // ============== AIDES ==============

  getAides(filters?: {
    annee?: number;
    categorie?: string;
    membre?: string;
    statut?: string;
    type?: string;
    sourceDebit?: string;
  }): Observable<ApiResponse<AideAccordee[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }
    return this.http.get<ApiResponse<AideAccordee[]>>(this.apiUrl, { params })
      .pipe(tap(res => {
        if (res.success) {
          this.aides.set(res.data);
        }
      }));
  }

  getStats(annee?: number): Observable<ApiResponse<AideStats>> {
    let params = new HttpParams();
    if (annee) params = params.set('annee', annee.toString());
    
    return this.http.get<ApiResponse<AideStats>>(`${this.apiUrl}/stats`, { params })
      .pipe(tap(res => {
        if (res.success) {
          this.stats.set(res.data);
        }
      }));
  }

  getMembresEligibles(annee?: number): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (annee) params = params.set('annee', annee.toString());
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/membres-eligibles`, { params });
  }

  getToursEligibles(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/tours-eligibles`);
  }

  createAide(data: {
    membre: string;
    categorie: string;
    montant?: number;
    motif: string;
    description?: string;
    dateEvenement?: Date;
    tour?: string;
    tontine?: string;
    sourceDebit?: string;
    notes?: string;
  }): Observable<ApiResponse<AideAccordee>> {
    return this.http.post<ApiResponse<AideAccordee>>(this.apiUrl, data);
  }

  approuverAide(id: string): Observable<ApiResponse<AideAccordee>> {
    return this.http.put<ApiResponse<AideAccordee>>(`${this.apiUrl}/${id}/approuver`, {});
  }

  payerAide(id: string): Observable<ApiResponse<AideAccordee>> {
    return this.http.put<ApiResponse<AideAccordee>>(`${this.apiUrl}/${id}/payer`, {});
  }

  refuserAide(id: string, raison?: string): Observable<ApiResponse<AideAccordee>> {
    return this.http.put<ApiResponse<AideAccordee>>(`${this.apiUrl}/${id}/refuser`, { raison });
  }

  annulerAide(id: string): Observable<ApiResponse<AideAccordee>> {
    return this.http.put<ApiResponse<AideAccordee>>(`${this.apiUrl}/${id}/annuler`, {});
  }

  deleteAide(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  // ============== HELPERS ==============

  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'malheureux': 'Événement malheureux',
      'heureux': 'Événement heureux',
      'chefferie': 'Chefferie',
      'repas': 'Aide repas'
    };
    return labels[type] || type;
  }

  getTypeColor(type: string): string {
    const colors: { [key: string]: string } = {
      'malheureux': '#ef4444',
      'heureux': '#10b981',
      'chefferie': '#8b5cf6',
      'repas': '#f59e0b'
    };
    return colors[type] || '#6b7280';
  }

  getStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'en_attente': 'En attente',
      'approuve': 'Approuvée',
      'paye': 'Payée',
      'refuse': 'Refusée',
      'annule': 'Annulée'
    };
    return labels[statut] || statut;
  }

  getStatutColor(statut: string): string {
    const colors: { [key: string]: string } = {
      'en_attente': '#f59e0b',
      'approuve': '#3b82f6',
      'paye': '#10b981',
      'refuse': '#ef4444',
      'annule': '#6b7280'
    };
    return colors[statut] || '#6b7280';
  }

  getSourceDebitLabel(source: string): string {
    const labels: { [key: string]: string } = {
      'cotisation_membre': 'Cotisation Membre',
      'solidarite_repas': 'Solidarité Repas',
      'caisse_chefferie': 'Caisse Chefferie'
    };
    return labels[source] || source;
  }
}
