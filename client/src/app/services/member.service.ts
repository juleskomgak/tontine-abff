import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, Member } from '../models';

@Injectable({
  providedIn: 'root'
})
export class MemberService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/members`;

  getMembers(search?: string, isActive?: boolean): Observable<ApiResponse<Member[]>> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (isActive !== undefined) params = params.set('isActive', isActive.toString());

    return this.http.get<ApiResponse<Member[]>>(this.apiUrl, { params });
  }

  getMember(id: string): Observable<ApiResponse<Member>> {
    return this.http.get<ApiResponse<Member>>(`${this.apiUrl}/${id}`);
  }

  createMember(member: Partial<Member>): Observable<ApiResponse<Member>> {
    return this.http.post<ApiResponse<Member>>(this.apiUrl, member);
  }

  updateMember(id: string, member: Partial<Member>): Observable<ApiResponse<Member>> {
    return this.http.put<ApiResponse<Member>>(`${this.apiUrl}/${id}`, member);
  }

  deleteMember(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }
}
