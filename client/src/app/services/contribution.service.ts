import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, Contribution, ContributionStats } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ContributionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/contributions`;

  getContributions(
    tontineId?: string,
    membreId?: string,
    cycle?: number,
    statut?: string
  ): Observable<ApiResponse<Contribution[]>> {
    let params = new HttpParams();
    if (tontineId) params = params.set('tontineId', tontineId);
    if (membreId) params = params.set('membreId', membreId);
    if (cycle) params = params.set('cycle', cycle.toString());
    if (statut) params = params.set('statut', statut);

    return this.http.get<ApiResponse<Contribution[]>>(this.apiUrl, { params });
  }

  getContribution(id: string): Observable<ApiResponse<Contribution>> {
    return this.http.get<ApiResponse<Contribution>>(`${this.apiUrl}/${id}`);
  }

  createContribution(contribution: Partial<Contribution>): Observable<ApiResponse<Contribution>> {
    return this.http.post<ApiResponse<Contribution>>(this.apiUrl, contribution);
  }

  updateContribution(id: string, contribution: Partial<Contribution>): Observable<ApiResponse<Contribution>> {
    return this.http.put<ApiResponse<Contribution>>(`${this.apiUrl}/${id}`, contribution);
  }

  deleteContribution(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  getStats(tontineId: string, cycle?: number): Observable<ApiResponse<ContributionStats>> {
    let params = new HttpParams();
    if (cycle) params = params.set('cycle', cycle.toString());

    return this.http.get<ApiResponse<ContributionStats>>(
      `${this.apiUrl}/tontine/${tontineId}/stats`,
      { params }
    );
  }

  getContributionsByTour(tourId: string): Observable<ApiResponse<{
    contributions: Contribution[];
    stats: {
      totalCotise: number;
      nombreCotisants: number;
      montantAttendu: number;
      tauxCollecte: number;
      resteACollecter: number;
    };
  }>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/tour/${tourId}`);
  }

  getMonthlyStats(year?: number, tontineId?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    if (tontineId) params = params.set('tontineId', tontineId);

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/stats/monthly`, { params });
  }
}
