import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';

interface MensajeContacto {
  _id: string;
  nombre: string;
  correo: string;
  asunto: string;
  mensaje: string;
  estado?: 'pendiente' | 'respondido';
  respuesta?: string;
  fecha?: string;
}

interface MensajesResponse {
  resultado?: unknown;
  mensaje?: unknown;
  datos?: unknown;
}

interface ResponderMensajeResponse {
  resultado?: unknown;
  mensaje?: unknown;
}

function isMensajeContacto(value: unknown): value is MensajeContacto {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_id' in value &&
    typeof value._id === 'string' &&
    'nombre' in value &&
    typeof value.nombre === 'string' &&
    'correo' in value &&
    typeof value.correo === 'string' &&
    'asunto' in value &&
    typeof value.asunto === 'string' &&
    'mensaje' in value &&
    typeof value.mensaje === 'string' &&
    (!('estado' in value) ||
      value.estado === 'pendiente' ||
      value.estado === 'respondido') &&
    (!('respuesta' in value) || typeof value.respuesta === 'string') &&
    (!('fecha' in value) || typeof value.fecha === 'string')
  );
}

@Component({
  selector: 'app-admin-solicitudes',
  standalone: true,
  templateUrl: './admin-solicitudes.html',
  styleUrl: './admin-solicitudes.css',
})
export class AdminSolicitudesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly mensajes = signal<MensajeContacto[]>([]);
  readonly respuestas = signal<Record<string, string>>({});
  readonly cargandoMensajes = signal(false);
  readonly errorMensajes = signal<string | null>(null);
  readonly exitoMensajes = signal<string | null>(null);
  readonly respondiendoIds = signal<ReadonlySet<string>>(new Set());

  ngOnInit(): void {
    this.cargarMensajes();
  }

  cargarMensajes(): void {
    if (typeof window === 'undefined' || this.cargandoMensajes()) {
      return;
    }

    const token = window.localStorage.getItem('token');
    if (!token) {
      this.errorMensajes.set('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      return;
    }

    this.cargandoMensajes.set(true);
    this.errorMensajes.set(null);
    this.http
      .get<MensajesResponse>('http://localhost:8080/contacto', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .subscribe({
        next: (response) => {
          this.cargandoMensajes.set(false);
          if (
            response.resultado !== 'bien' ||
            !Array.isArray(response.datos) ||
            !response.datos.every(isMensajeContacto)
          ) {
            this.errorMensajes.set('El servidor devolvió una lista de mensajes no válida.');
            return;
          }

          this.mensajes.set(response.datos);
        },
        error: (error: unknown) => {
          this.cargandoMensajes.set(false);
          console.error('Error al consultar GET /contacto:', error);
          this.handleRequestError(error);
        },
      });
  }

  actualizarRespuesta(id: string, event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLTextAreaElement)) {
      return;
    }

    this.respuestas.update((actuales) => ({ ...actuales, [id]: input.value }));
  }

  responderMensaje(id: string, respuesta: string): void {
    const respuestaLimpia = respuesta.trim();
    if (!respuestaLimpia || this.respondiendoIds().has(id)) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const token = window.localStorage.getItem('token');
    if (!token) {
      this.handleRequestError(new HttpErrorResponse({ status: 401 }));
      return;
    }

    this.errorMensajes.set(null);
    this.exitoMensajes.set(null);
    this.respondiendoIds.update((ids) => new Set(ids).add(id));
    this.http
      .put<ResponderMensajeResponse>(
        `http://localhost:8080/contacto/${encodeURIComponent(id)}/responder`,
        { respuesta: respuestaLimpia },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      .subscribe({
        next: (response) => {
          this.respondiendoIds.update((ids) => {
            const actualizados = new Set(ids);
            actualizados.delete(id);
            return actualizados;
          });

          if (response.resultado !== 'bien') {
            this.errorMensajes.set(
              typeof response.mensaje === 'string'
                ? response.mensaje
                : 'No se pudo enviar la respuesta.',
            );
            return;
          }

          this.mensajes.update((mensajes) =>
            mensajes.map((mensaje) =>
              mensaje._id === id
                ? { ...mensaje, estado: 'respondido', respuesta: respuestaLimpia }
                : mensaje,
            ),
          );
          this.respuestas.update((respuestas) => {
            const actualizadas = { ...respuestas };
            delete actualizadas[id];
            return actualizadas;
          });
          this.exitoMensajes.set('Respuesta enviada.');
        },
        error: (error: unknown) => {
          this.respondiendoIds.update((ids) => {
            const actualizados = new Set(ids);
            actualizados.delete(id);
            return actualizados;
          });
          console.error(`Error al responder el mensaje ${id}:`, error);
          this.handleRequestError(error);
        },
      });
  }

  private handleRequestError(error: unknown): void {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    const body: unknown = error instanceof HttpErrorResponse ? error.error : null;
    const backendMessage =
      typeof body === 'object' &&
      body !== null &&
      'mensaje' in body &&
      typeof body.mensaje === 'string'
        ? body.mensaje
        : null;

    if (typeof window === 'undefined') {
      return;
    }

    if (status === 401 || status === 403) {
      window.localStorage.removeItem('token');
      void this.router.navigate(['/login']);
      return;
    }

    this.errorMensajes.set(
      backendMessage ?? 'No se pudieron cargar o actualizar las solicitudes. Intenta de nuevo.',
    );
  }
}
