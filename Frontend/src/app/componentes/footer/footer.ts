import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MensajeChat } from '../../interfaces/asesor';
import { AsesorService } from '../../services/asesor-service';

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
  imports: [RouterLink, FormsModule],
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
  private asesorService = inject(AsesorService);

  @ViewChild('mensajesChat') private mensajesChat?: ElementRef<HTMLDivElement>;

  mensajes = signal<MensajeChat[]>([
    { rol: 'asesor', texto: '¡Hola! Contame qué buscás pues!: una moto económica, de ciudad o de ruta.' },
  ]);
  escribiendo = signal(false);
  textoMensaje = '';

  sugerencias = [
    { etiqueta: 'Barata', texto: 'Busco una moto económica' },
    { etiqueta: 'Ciudad', texto: 'Busco una moto para moverme por la ciudad' },
    { etiqueta: 'Ruta', texto: 'Busco una moto para viajar en ruta' },
  ];

  enviar(texto: string = this.textoMensaje): void {
    const pregunta = texto.trim();
    if (!pregunta || this.escribiendo()) return;

    this.mensajes.update(lista => [...lista, { rol: 'usuario', texto: pregunta }]);
    this.textoMensaje = '';
    this.escribiendo.set(true);
    this.bajarScroll();

    this.asesorService.preguntar(this.mensajes()).subscribe({
      next: (respuesta) => this.agregarRespuesta(respuesta),
      error: (error: HttpErrorResponse) => {
        console.error('Error en el asesor:', error);
        const mensajeBackend = error.status !== 0 ? error.error?.message : null;
        this.agregarRespuesta(mensajeBackend ?? 'No pude conectarme con el asesor. Revisá que el servidor esté encendido.');
      },
    });
  }

  private agregarRespuesta(texto: string): void {
    this.mensajes.update(lista => [...lista, { rol: 'asesor', texto }]);
    this.escribiendo.set(false);
    this.bajarScroll();
  }

  private bajarScroll(): void {
    setTimeout(() => {
      const caja = this.mensajesChat?.nativeElement;
      if (caja) caja.scrollTop = caja.scrollHeight;
    });
  }
}
