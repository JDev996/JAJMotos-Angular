import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';

export interface UsuarioPerfil {
  _id?: string;
  nombre: string;
  apellido: string;
  correo: string;
  rol: string;
  Foto?: string;
}

interface TokenPerfil {
  nombre?: unknown;
  name?: unknown;
  apellido?: unknown;
  correo?: unknown;
  rol?: unknown;
}

interface PerfilResponse {
  resultado?: unknown;
  datos?: unknown;
}

function isUsuarioPerfil(value: unknown): value is UsuarioPerfil {
  return (
    typeof value === 'object' &&
    value !== null &&
    'nombre' in value &&
    typeof value.nombre === 'string' &&
    'apellido' in value &&
    typeof value.apellido === 'string' &&
    'correo' in value &&
    typeof value.correo === 'string' &&
    'rol' in value &&
    typeof value.rol === 'string'
  );
}

@Injectable({ providedIn: 'root' })
export class ProfileState {
  private readonly http = inject(HttpClient);
  readonly profile = signal<UsuarioPerfil | null>(null);
  private tokenActual: string | null | undefined;
  private profileVersion = 0;

  get currentProfile(): UsuarioPerfil | null {
    return this.profile();
  }

  loadForCurrentToken(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const token = window.localStorage.getItem('token');
    if (token === this.tokenActual) {
      return;
    }
    this.tokenActual = token;
    const requestVersion = ++this.profileVersion;

    if (!token) {
      this.profile.set(null);
      return;
    }

    try {
      const payload = jwtDecode<TokenPerfil>(token);
      const nombre = payload.nombre ?? payload.name;
      this.profile.set({
        nombre: typeof nombre === 'string' ? nombre : '',
        apellido: typeof payload.apellido === 'string' ? payload.apellido : '',
        correo: typeof payload.correo === 'string' ? payload.correo : '',
        rol: typeof payload.rol === 'string' ? payload.rol : '',
      });
    } catch (error: unknown) {
      console.error('No se pudo leer el perfil desde el token:', error);
      this.profile.set(null);
    }

    this.http
      .get<PerfilResponse>('http://localhost:8080/usuarios/perfil', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .subscribe({
        next: (response) => {
          if (token !== this.tokenActual || requestVersion !== this.profileVersion) {
            return;
          }
          if (response.resultado === 'bien' && isUsuarioPerfil(response.datos)) {
            this.profile.set(response.datos);
          } else {
            console.error('El servidor devolvió un perfil no válido:', response);
          }
        },
        error: (error: unknown) => {
          console.error('No se pudo cargar el perfil del usuario:', error);
        },
      });
  }

  setProfile(profile: UsuarioPerfil): void {
    this.profileVersion++;
    this.profile.set(profile);
  }
}
