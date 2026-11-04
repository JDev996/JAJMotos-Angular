import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NuevoUsuario } from '../interfaces/nuevo-usuario';

export interface RegistroResponse {
  resultado: 'bien' | 'mal';
  mensaje: string;
  datos: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class RegistroService {
  private readonly http = inject(HttpClient);
  private readonly url = 'http://localhost:8080/register';

  registrar(nuevoUsuario: NuevoUsuario): Observable<RegistroResponse> {
    return this.http.post<RegistroResponse>(this.url, nuevoUsuario);
  }
}
