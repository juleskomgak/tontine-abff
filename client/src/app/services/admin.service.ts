import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models';

export interface DatabaseStatus {
  tontines: number;
  tours: number;
  contributions: number;
  banques: number;
  paiementsSolidarite: number;
  solidarites: number;
  cartesCodebaf: number;
  donneesOrphelines: {
    banquesOrphelines: number;
    toursOrphelins: number;
    contributionsOrphelines: number;
    totalOrphelines: number;
  };
}

export interface CleanResult {
  banquesSupprimees: number;
  toursSupprimes: number;
  cotisationsSupprimees: number;
  totalElementsSupprimes: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin`;

  getDatabaseStatus(): Observable<ApiResponse<DatabaseStatus>> {
    return this.http.get<ApiResponse<DatabaseStatus>>(`${this.apiUrl}/database-status`);
  }

  cleanOrphanedData(): Observable<ApiResponse<CleanResult>> {
    return this.http.post<ApiResponse<CleanResult>>(`${this.apiUrl}/clean-orphaned-data`, {});
  }
}