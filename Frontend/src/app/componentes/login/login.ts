import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { Credential } from '../../interfaces/credential';
import { LoginResponse, LoginService } from '../../services/login-service';

interface LoginTokenPayload {
  role?: unknown;
  rol?: unknown;
}

function isLoginResponse(response: unknown): response is LoginResponse {
  if (typeof response !== 'object' || response === null || !('resultado' in response)) {
    return false;
  }

  if (response.resultado === 'bien') {
    return 'datos' in response && typeof response.datos === 'string';
  }

  return (
    response.resultado === 'mal' &&
    'mensaje' in response &&
    typeof response.mensaje === 'string'
  );
}

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);

  readonly credentialsForm = new FormGroup({
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  loginError = '';
  isSubmitting = false;

  handleSubmit(): void {
    this.loginError = '';

    if (this.credentialsForm.invalid) {
      this.credentialsForm.markAllAsTouched();
      this.loginError = 'Completa el correo y la contraseña.';
      return;
    }

    const { correo, password } = this.credentialsForm.getRawValue();

    if (typeof correo !== 'string' || typeof password !== 'string') {
      this.loginError = 'El correo y la contraseña deben ser texto.';
      return;
    }

    const credential: Credential = {
      correo: correo.trim(),
      password,
    };

    if (!credential.correo) {
      this.loginError = 'Ingresa tu correo electrónico.';
      this.credentialsForm.controls.correo.markAsTouched();
      return;
    }

    this.isSubmitting = true;

    this.loginService
      .login(credential)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (response) => {
          if (!isLoginResponse(response)) {
            this.loginError = 'El servidor devolvió una respuesta no válida.';
            return;
          }

          if (response.resultado === 'mal') {
            this.loginError = response.mensaje;
            return;
          }

          if (!response.datos.trim()) {
            this.loginError = 'El servidor no devolvió un token válido.';
            return;
          }

          if (typeof window === 'undefined') {
            this.loginError = 'No se puede guardar la sesión en este entorno.';
            return;
          }

          try {
            const payload = jwtDecode<LoginTokenPayload>(response.datos);
            const role = payload.role ?? payload.rol;
            let destination: string;

            if (role === 'admin') {
              destination = '/admin';
            } else {
              destination = '/user-panel';
            }

            window.localStorage.setItem('token', response.datos);
            void this.router.navigate([destination]);
          } catch {
            this.loginError = 'El servidor devolvió un token no válido.';
          }
        },
        error: (error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            isLoginResponse(error.error) &&
            error.error.resultado === 'mal'
          ) {
            this.loginError = error.error.mensaje;
            return;
          }

          this.loginError = 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
        },
      });
  }
}
