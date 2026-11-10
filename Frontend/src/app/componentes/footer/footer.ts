import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MensajeChat } from '../../interfaces/asesor';
import { AsesorService } from '../../services/asesor-service';

@Component({
  imports: [RouterLink, FormsModule],
  selector: 'app-footer',
  styleUrl: './footer.css',
  templateUrl: './footer.html',
})
export class Footer {
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
