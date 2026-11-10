import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
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
  imports: [RouterLink],
  selector: 'app-footer',
  styleUrl: './footer.css',
  templateUrl: './footer.html',
})
export class Footer {
  private readonly http = inject(HttpClient);

  readonly mensajesChat = signal<ChatMessage[]>([
    {
      role: 'assistant',
      content: '¡Hola! Cuéntame qué tipo de moto estás buscando y te ayudo a elegir.'
    }
  ]);
  readonly enviandoMensaje = signal(false);
  readonly errorChat = signal<string | null>(null);
  textoChat = '';

  actualizarTextoChat(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      this.textoChat = input.value;
    }
  }

  enviarMensajeChat(event?: Event): void {
    event?.preventDefault();

    const texto = this.textoChat.trim();
    if (!texto || this.enviandoMensaje()) {
      return;
    }

    const historial = this.mensajesChat()
      .slice(1)
      .slice(-12)
      .map((mensaje) => ({
        rol: mensaje.role,
        contenido: mensaje.content
      }));

    this.mensajesChat.update((mensajes) => [...mensajes, { role: 'user', content: texto }]);
    this.textoChat = '';
    this.enviandoMensaje.set(true);
    this.errorChat.set(null);

    this.http.post<AsesorResponse>('http://localhost:8080/asesor', {
      mensaje: texto,
      historial
    }).subscribe({
      next: (response) => {
        this.enviandoMensaje.set(false);
        const respuesta = response.datos?.respuesta;

        if (response.resultado !== 'bien' || typeof respuesta !== 'string' || !respuesta.trim()) {
          this.errorChat.set(
            typeof response.mensaje === 'string'
              ? response.mensaje
              : 'El asesor no pudo generar una respuesta.'
          );
          return;
        }

        this.mensajesChat.update((mensajes) => [
          ...mensajes,
          { role: 'assistant', content: respuesta.trim() }
        ]);
      },
      error: (requestError: HttpErrorResponse) => {
        this.enviandoMensaje.set(false);
        const body: unknown = requestError.error;
        const backendMessage =
          typeof body === 'object' &&
          body !== null &&
          'mensaje' in body &&
          typeof body.mensaje === 'string'
            ? body.mensaje
            : null;

        console.error('Error al enviar mensaje desde el chat flotante:', requestError);
        this.errorChat.set(backendMessage ?? 'No se pudo conectar con el asesor. Inténtalo de nuevo.');
      }
    });
  }

  usarSugerenciaChat(texto: string): void {
    this.textoChat = texto;
    this.enviarMensajeChat();
  }
}
