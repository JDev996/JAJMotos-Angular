import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiAsesor, MensajeChat } from '../interfaces/asesor';

@Injectable({ providedIn: 'root' })
export class AsesorService {
  private http = inject(HttpClient);
  private API_URL = 'http://localhost:8080/asesor';

  preguntar(mensajes: MensajeChat[]): Observable<string> {
    return this.http.post<ApiAsesor>(this.API_URL, { mensajes }).pipe(map(resp => resp.data ?? ''));
  }
}
