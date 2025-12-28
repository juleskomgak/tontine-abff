import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, Tontine } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TontineService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tontines`;

  getTontines(statut?: string): Observable<ApiResponse<Tontine[]>> {
    let params = new HttpParams();
    if (statut) params = params.set('statut', statut);
    
    // Désactiver le cache pour obtenir les données à jour
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    return this.http.get<ApiResponse<Tontine[]>>(this.apiUrl, { params, headers });
  }

  getTontine(id: string): Observable<ApiResponse<Tontine>> {
    // Désactiver le cache pour obtenir les données à jour
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
    return this.http.get<ApiResponse<Tontine>>(`${this.apiUrl}/${id}`, { headers });
  }

  createTontine(tontine: Partial<Tontine>): Observable<ApiResponse<Tontine>> {
    return this.http.post<ApiResponse<Tontine>>(this.apiUrl, tontine);
  }

  updateTontine(id: string, tontine: Partial<Tontine>): Observable<ApiResponse<Tontine>> {
    return this.http.put<ApiResponse<Tontine>>(`${this.apiUrl}/${id}`, tontine);
  }

  updateStatus(id: string, statut: string): Observable<ApiResponse<Tontine>> {
    return this.http.put<ApiResponse<Tontine>>(`${this.apiUrl}/${id}/status`, { statut });
  }

  addMember(id: string, membreId: string): Observable<ApiResponse<Tontine>> {
    return this.http.post<ApiResponse<Tontine>>(`${this.apiUrl}/${id}/members`, { membreId });
  }

  deleteTontine(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }
}
