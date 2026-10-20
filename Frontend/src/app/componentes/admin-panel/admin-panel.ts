import { Component, inject, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

const adminSections = ['Usuarios', 'Productos', 'Motos', 'Repuestos'] as const;

type AdminSection = (typeof adminSections)[number];

interface UsuariosResponse {
  resultado?: unknown;
  mensaje?: unknown;
  datos?: unknown;
}

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.css',
})
export class AdminPanelComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly sections = adminSections;
  activeSection: AdminSection = 'Usuarios';

  ngOnInit(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const token = window.localStorage.getItem('token');
    if (!token) {
      console.error('No se puede listar usuarios: no hay token de sesión.');
      return;
    }

    this.http
      .get<UsuariosResponse>('http://localhost:8080/usuarios', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .subscribe({
        next: (response) => {
          console.log('Respuesta de GET /usuarios:', response);
          console.log('Resultado:', response.resultado);
          console.log('Mensaje:', response.mensaje);
          console.log('Datos:', response.datos);
        },
        error: (error: unknown) => {
          console.error('Error al consultar GET /usuarios:', error);
          this.handleRequestError(error);
        },
      });
  }

  private handleRequestError(error: unknown): void {
    const status = error instanceof HttpErrorResponse ? error.status : 0;

    if (typeof window === 'undefined') {
      return;
    }

    if (status === 401 || status === 403) {
      window.alert('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      window.localStorage.removeItem('token');
      void this.router.navigate(['/login']);
      return;
    }

    window.alert('Error al cargar los datos. Intenta de nuevo más tarde.');
  }

  selectSection(section: AdminSection): void {
    this.activeSection = section;
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('token');
    }

    void this.router.navigate(['/login']);
  }
}
