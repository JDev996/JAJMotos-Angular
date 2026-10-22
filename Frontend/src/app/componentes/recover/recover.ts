import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

interface RecoverResponse {
  result: string;
  message: string;
}

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-recover',
  styleUrl: './recover.css',
  templateUrl: './recover.html',
})
export class Recover {
  private readonly http = inject(HttpClient);

  readonly recoverForm = new FormGroup({
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  readonly mensaje = signal<string>('');
  isLoading = false;

  handleRecover(): void {
    this.mensaje.set('');

    if (this.recoverForm.invalid) {
      this.recoverForm.markAllAsTouched();
      return;
    }

    const correo = this.recoverForm.controls.correo.value.trim().toLowerCase();
    this.isLoading = true;

    this.http
      .post<RecoverResponse>('http://localhost:8080/usuarios/forgotPassword', { correo })
      .subscribe({
        next: (response) => {
          this.mensaje.set(response.message);
          this.isLoading = false;
        },
        error: () => {
          this.mensaje.set('Error de red. No se pudo completar la recuperación.');
          this.isLoading = false;
        },
      });
  }
}
