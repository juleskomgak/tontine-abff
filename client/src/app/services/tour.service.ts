import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, Tour } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TourService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tours`;

  getTours(
    tontineId?: string,
    beneficiaireId?: string,
    cycle?: number,
    statut?: string
  ): Observable<ApiResponse<Tour[]>> {
    let params = new HttpParams();
    if (tontineId) params = params.set('tontineId', tontineId);
    if (beneficiaireId) params = params.set('beneficiaireId', beneficiaireId);
    if (cycle) params = params.set('cycle', cycle.toString());
    if (statut) params = params.set('statut', statut);

    return this.http.get<ApiResponse<Tour[]>>(this.apiUrl, { params });
  }

  getTour(id: string): Observable<ApiResponse<Tour>> {
    return this.http.get<ApiResponse<Tour>>(`${this.apiUrl}/${id}`);
  }

  createTour(tour: Partial<Tour>): Observable<ApiResponse<Tour>> {
    return this.http.post<ApiResponse<Tour>>(this.apiUrl, tour);
  }

  tirageAuSort(tontineId: string): Observable<ApiResponse<Tour>> {
    return this.http.post<ApiResponse<Tour>>(`${this.apiUrl}/tirage/${tontineId}`, {});
  }

  updateStatus(id: string, statut: string, datePaiement?: Date): Observable<ApiResponse<Tour>> {
    return this.http.put<ApiResponse<Tour>>(`${this.apiUrl}/${id}/status`, {
      statut,
      datePaiement
    });
  }

  deleteTour(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }
}
