import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AsesorResponse {
  resultado?: unknown;
  mensaje?: unknown;
  datos?: {
    respuesta?: unknown;
  };
}

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-asesor',
  styleUrl: './asesor.css',
  templateUrl: './asesor.html',
})
export class Asesor {
  private readonly http = inject(HttpClient);

  readonly mensajes = signal<ChatMessage[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy el asesor virtual de JAJ Motos. Cuéntame qué uso le darás a tu moto y qué presupuesto tienes en mente.'
    }
  ]);
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  textoMensaje = '';

  enviarMensaje(): void {
    const texto = this.textoMensaje.trim();
    if (!texto || this.enviando()) {
      return;
    }

    const historial = this.mensajes()
      .slice(1)
      .slice(-12)
      .map((mensaje) => ({
        rol: mensaje.role,
        contenido: mensaje.content
      }));

    this.mensajes.update((mensajes) => [...mensajes, { role: 'user', content: texto }]);
    this.textoMensaje = '';
    this.enviando.set(true);
    this.error.set(null);

    this.http.post<AsesorResponse>('http://localhost:8080/asesor', {
      mensaje: texto,
      historial
    }).subscribe({
      next: (response) => {
        this.enviando.set(false);
        const respuesta = response.datos?.respuesta;

        if (response.resultado !== 'bien' || typeof respuesta !== 'string' || !respuesta.trim()) {
          this.error.set(
            typeof response.mensaje === 'string'
              ? response.mensaje
              : 'El asesor devolvió una respuesta no válida.'
          );
          return;
        }

        this.mensajes.update((mensajes) => [
          ...mensajes,
          { role: 'assistant', content: respuesta.trim() }
        ]);
      },
      error: (requestError: HttpErrorResponse) => {
        this.enviando.set(false);
        const body: unknown = requestError.error;
        const backendMessage =
          typeof body === 'object' &&
          body !== null &&
          'mensaje' in body &&
          typeof body.mensaje === 'string'
            ? body.mensaje
            : null;

        console.error('Error al enviar mensaje al asesor:', requestError);
        this.error.set(backendMessage ?? 'No se pudo conectar con el asesor. Inténtalo de nuevo.');
      }
    });
  }

  usarSugerencia(sugerencia: string): void {
    this.textoMensaje = sugerencia;
    this.enviarMensaje();
  }
}
