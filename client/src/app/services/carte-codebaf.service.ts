import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, CarteCodebaf, CarteCodebafStats } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CarteCodebafService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/cartes-codebaf`;

  // Obtenir toutes les cartes avec filtres optionnels
  getCartes(filters?: { annee?: number; statut?: string; typeCarte?: string; membre?: string }): Observable<ApiResponse<CarteCodebaf[]>> {
    let params: any = {};
    if (filters) {
      if (filters.annee) params.annee = filters.annee;
      if (filters.statut) params.statut = filters.statut;
      if (filters.typeCarte) params.typeCarte = filters.typeCarte;
      if (filters.membre) params.membre = filters.membre;
    }
    return this.http.get<ApiResponse<CarteCodebaf[]>>(this.apiUrl, { params });
  }

  // Obtenir les statistiques
  getStatistiques(annee?: number): Observable<ApiResponse<CarteCodebafStats>> {
    let params: Record<string, string | number> = {};
    if (annee) params['annee'] = annee;
    return this.http.get<ApiResponse<CarteCodebafStats>>(`${this.apiUrl}/statistiques`, { params });
  }

  // Obtenir les cartes d'un membre
  getCartesMembre(membreId: string): Observable<ApiResponse<CarteCodebaf[]>> {
    return this.http.get<ApiResponse<CarteCodebaf[]>>(`${this.apiUrl}/membre/${membreId}`);
  }

  // Obtenir une carte par ID
  getCarte(id: string): Observable<ApiResponse<CarteCodebaf>> {
    return this.http.get<ApiResponse<CarteCodebaf>>(`${this.apiUrl}/${id}`);
  }

  // Créer une nouvelle carte
  createCarte(data: {
    membre: string;
    annee: number;
    montantTotal: number;
    frequencePaiement?: 'annuel' | 'trimestriel' | 'mensuel';
    notes?: string;
  }): Observable<ApiResponse<CarteCodebaf>> {
    return this.http.post<ApiResponse<CarteCodebaf>>(this.apiUrl, data);
  }

  // Modifier une carte
  updateCarte(id: string, data: {
    montantTotal?: number;
    frequencePaiement?: 'annuel' | 'trimestriel' | 'mensuel';
    notes?: string;
    statut?: 'en_cours' | 'complete' | 'annule';
  }): Observable<ApiResponse<CarteCodebaf>> {
    return this.http.put<ApiResponse<CarteCodebaf>>(`${this.apiUrl}/${id}`, data);
  }

  // Enregistrer un paiement
  enregistrerPaiement(carteId: string, data: {
    montant: number;
    methodePaiement?: 'especes' | 'mobile_money' | 'virement' | 'cheque';
    referenceTransaction?: string;
    notes?: string;
  }): Observable<ApiResponse<CarteCodebaf>> {
    return this.http.post<ApiResponse<CarteCodebaf>>(`${this.apiUrl}/${carteId}/paiement`, data);
  }

  // Supprimer un paiement
  supprimerPaiement(carteId: string, paiementId: string): Observable<ApiResponse<CarteCodebaf>> {
    return this.http.delete<ApiResponse<CarteCodebaf>>(`${this.apiUrl}/${carteId}/paiement/${paiementId}`);
  }

  // Supprimer une carte
  deleteCarte(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  // Obtenir la liste des années
  getAnnees(): Observable<ApiResponse<number[]>> {
    return this.http.get<ApiResponse<number[]>>(`${this.apiUrl}/annees/liste`);
  }

  // Utilitaires pour déterminer le type de carte
  determinerTypeCarte(montant: number): 'classique' | 'bronze' | 'silver' | 'gold' {
    if (montant >= 1000000) return 'gold';
    if (montant >= 500000) return 'silver';
    if (montant >= 100000) return 'bronze';
    return 'classique';
  }

  // Obtenir le libellé du type de carte
  getTypeCarteLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'classique': 'Classique',
      'bronze': 'Bronze',
      'silver': 'Silver',
      'gold': 'Gold'
    };
    return labels[type] || type;
  }

  // Obtenir la couleur du type de carte
  getTypeCarteColor(type: string): string {
    const colors: { [key: string]: string } = {
      'classique': '#6b7280',
      'bronze': '#cd7f32',
      'silver': '#c0c0c0',
      'gold': '#ffd700'
    };
    return colors[type] || '#6b7280';
  }
}
