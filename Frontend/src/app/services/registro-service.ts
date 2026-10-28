import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, delay, of, switchMap, throwError, timer } from 'rxjs';
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
  private readonly url = 'http://localhost:8080/usuarios/registro';

  registrar(nuevoUsuario: NuevoUsuario): Observable<RegistroResponse> {
    if (nuevoUsuario.correo === 'repetido@correo.com') {
      return timer(1000).pipe(
        switchMap(() =>
          throwError(() => ({
            error: {
              resultado: 'mal' as const,
              mensaje: 'El correo ya está registrado',
              datos: null,
            },
          })),
        ),
      );
    }

    return of<RegistroResponse>({
      resultado: 'bien',
      mensaje: 'Cuenta creada satisfactoriamente',
      datos: null,
    }).pipe(delay(1000));
  }
}
