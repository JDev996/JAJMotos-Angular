import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MotosService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/motos';

  private headers() {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getAll(): Observable<any> {
    return this.http.get(this.apiUrl, { headers: this.headers() });
  }

  crear(data: FormData): Observable<any> {
    return this.http.post(this.apiUrl, data, { headers: this.headers() });
  }

  actualizar(id: string, data: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, { headers: this.headers() });
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.headers() });
  }
}
