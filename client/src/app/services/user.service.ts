import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, User } from '../models';

export interface UserStats {
  total: number;
  actifs: number;
  inactifs: number;
  valides: number;
  enAttente: number;
  parRole: {
    admin: number;
    tresorier: number;
    membre: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;
  private authUrl = `${environment.apiUrl}/auth`;

  getUsers(validated?: boolean): Observable<ApiResponse<User[]>> {
    const params: any = {};
    if (validated !== undefined) {
      params.validated = validated.toString();
    }
    return this.http.get<ApiResponse<User[]>>(`${this.authUrl}/users`, { params });
  }

  getUser(id: string): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/${id}`);
  }

  createUser(user: Partial<User> & { password: string }): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(this.apiUrl, user);
  }

  updateUser(id: string, user: Partial<User>): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.apiUrl}/${id}`, user);
  }

  resetPassword(id: string, newPassword: string): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(`${this.apiUrl}/${id}/password`, { newPassword });
  }

  deleteUser(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.authUrl}/users/${id}`);
  }

  getStats(): Observable<ApiResponse<UserStats>> {
    return this.http.get<ApiResponse<UserStats>>(`${this.apiUrl}/stats/summary`);
  }

  // Nouvelles méthodes pour la validation des comptes
  validateUser(id: string): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.authUrl}/users/${id}/validate`, {});
  }

  invalidateUser(id: string): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.authUrl}/users/${id}/invalidate`, {});
  }

  changeUserRole(id: string, role: string): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.authUrl}/users/${id}/role`, { role });
  }
}
