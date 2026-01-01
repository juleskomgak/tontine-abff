import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, BanqueCentrale, BanqueStats } from '../models';

@Injectable({
  providedIn: 'root'
})
export class BanqueService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/banque`;

  getBanqueTontine(tontineId: string): Observable<ApiResponse<BanqueCentrale>> {
    return this.http.get<ApiResponse<BanqueCentrale>>(`${this.apiUrl}/tontine/${tontineId}`);
  }

  getStatistiques(tontineId: string): Observable<ApiResponse<BanqueStats>> {
    return this.http.get<ApiResponse<BanqueStats>>(`${this.apiUrl}/tontine/${tontineId}/statistiques`);
  }

  enregistrerCotisation(tontineId: string, contributionId: string, montant: number): Observable<ApiResponse<BanqueCentrale>> {
    return this.http.post<ApiResponse<BanqueCentrale>>(
      `${this.apiUrl}/tontine/${tontineId}/cotisation`,
      { contributionId, montant }
    );
  }

  enregistrerPaiementTour(tontineId: string, tourId: string, montant: number): Observable<ApiResponse<BanqueCentrale>> {
    return this.http.post<ApiResponse<BanqueCentrale>>(
      `${this.apiUrl}/tontine/${tontineId}/paiement-tour`,
      { tourId, montant }
    );
  }

  enregistrerRefusTour(tontineId: string, tourId: string, raison?: string): Observable<ApiResponse<BanqueCentrale>> {
    return this.http.post<ApiResponse<BanqueCentrale>>(
      `${this.apiUrl}/tontine/${tontineId}/refus-tour`,
      { tourId, raison }
    );
  }

  annulerRefusTour(tontineId: string, tourId: string, nouveauStatut: 'attribue' | 'paye'): Observable<ApiResponse<BanqueCentrale>> {
    return this.http.post<ApiResponse<BanqueCentrale>>(
      `${this.apiUrl}/tontine/${tontineId}/annuler-refus`,
      { tourId, nouveauStatut }
    );
  }

  annulerPaiementTour(tontineId: string, tourId: string): Observable<ApiResponse<BanqueCentrale>> {
    return this.http.post<ApiResponse<BanqueCentrale>>(
      `${this.apiUrl}/tontine/${tontineId}/annuler-paiement`,
      { tourId }
    );
  }

  redistribuerFonds(
    tontineId: string, 
    beneficiaires: Array<{ membreId: string, montant: number }>
  ): Observable<ApiResponse<BanqueCentrale>> {
    return this.http.post<ApiResponse<BanqueCentrale>>(
      `${this.apiUrl}/tontine/${tontineId}/redistribuer`,
      { beneficiaires }
    );
  }

  getAllBanques(): Observable<ApiResponse<BanqueCentrale[]>> {
    return this.http.get<ApiResponse<BanqueCentrale[]>>(this.apiUrl);
  }

  nettoyerOrphelines(): Observable<ApiResponse<{orphelinesSuprimees: number, centralesOrphelinesSuprimees: number, banquesRecalculees: number}>> {
    return this.http.post<ApiResponse<{orphelinesSuprimees: number, centralesOrphelinesSuprimees: number, banquesRecalculees: number}>>(
      `${this.apiUrl}/nettoyer-orphelines`,
      {}
    );
  }

  recalculerToutes(): Observable<ApiResponse<any[]>> {
    return this.http.post<ApiResponse<any[]>>(
      `${this.apiUrl}/recalculer-toutes`,
      {}
    );
  }
}
