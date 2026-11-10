import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface RespuestaContacto {
  resultado: 'bien' | 'mal';
  mensaje: string;
}

function isRespuestaContacto(value: unknown): value is RespuestaContacto {
  return (
    typeof value === 'object' &&
    value !== null &&
    'resultado' in value &&
    (value.resultado === 'bien' || value.resultado === 'mal') &&
    'mensaje' in value &&
    typeof value.mensaje === 'string'
  );
}

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-contacto',
  styleUrl: './contacto.css',
  templateUrl: './contacto.html',
})
export class Contacto {
  private readonly http = inject(HttpClient);

  readonly mensaje = signal<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  readonly enviando = signal(false);

  readonly contactoForm = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    asunto: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    mensaje: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  enviarMensaje(): void {
    this.mensaje.set(null);

    if (this.contactoForm.invalid) {
      this.contactoForm.markAllAsTouched();
      this.mensaje.set({ tipo: 'error', texto: 'Revisa los campos obligatorios y el correo electrónico.' });
      return;
    }

    const datos = this.contactoForm.getRawValue();
    const payload = {
      nombre: datos.nombre.trim(),
      correo: datos.correo.trim(),
      asunto: datos.asunto,
      mensaje: datos.mensaje.trim()
    };

    this.enviando.set(true);
    this.http.post<unknown>('http://localhost:8080/contacto', payload).subscribe({
      next: (respuesta) => {
        this.enviando.set(false);

        if (!isRespuestaContacto(respuesta)) {
          this.mensaje.set({ tipo: 'error', texto: 'El servidor devolvió una respuesta no válida.' });
          return;
        }

        if (respuesta.resultado !== 'bien') {
          this.mensaje.set({ tipo: 'error', texto: respuesta.mensaje });
          return;
        }

        this.contactoForm.reset();
        this.mensaje.set({ tipo: 'exito', texto: respuesta.mensaje });
      },
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        const body: unknown = error.error;
        const mensajeError =
          isRespuestaContacto(body) && body.resultado === 'mal'
            ? body.mensaje
            : 'No se pudo enviar el mensaje. Inténtalo de nuevo más tarde.';

        console.error('Error al enviar mensaje de contacto:', error);
        this.mensaje.set({ tipo: 'error', texto: mensajeError });
      }
    });
  }
}
