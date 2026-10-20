import { ChangeDetectorRef, Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
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
  private readonly cdr = inject(ChangeDetectorRef);

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

  errorMensaje = '';
  isLoading = false;

  handleSubmit(): void {
    this.errorMensaje = '';

    if (this.credentialsForm.invalid) {
      this.credentialsForm.markAllAsTouched();
      this.errorMensaje = 'Completa el correo y la contraseña.';
      return;
    }

    const { correo, password } = this.credentialsForm.getRawValue();

    if (typeof correo !== 'string' || typeof password !== 'string') {
      this.errorMensaje = 'El correo y la contraseña deben ser texto.';
      return;
    }

    const credential: Credential = {
      correo: correo.trim(),
      password,
    };

    if (!credential.correo) {
      this.errorMensaje = 'Ingresa tu correo electrónico.';
      this.credentialsForm.controls.correo.markAsTouched();
      return;
    }

    this.isLoading = true;

    this.loginService
      .login(credential)
      .subscribe({
        next: (response) => {
          this.isLoading = false;

          if (!isLoginResponse(response)) {
            this.showError('El servidor devolvió una respuesta no válida.');
            return;
          }

          if (response.resultado === 'mal') {
            this.showError(response.mensaje);
            return;
          }

          if (!response.datos.trim()) {
            this.showError('El servidor no devolvió un token válido.');
            return;
          }

          if (typeof window === 'undefined') {
            this.showError('No se puede guardar la sesión en este entorno.');
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
            this.showError('El servidor devolvió un token no válido.');
          }
        },
        error: (error: HttpErrorResponse) => {
          const body: unknown = error.error;
          let backendMessage: string | null = null;

          if (
            typeof body === 'object' &&
            body !== null &&
            'resultado' in body &&
            body.resultado === 'mal' &&
            'mensaje' in body &&
            typeof body.mensaje === 'string'
          ) {
            backendMessage = body.mensaje;
          } else if (
            typeof body === 'object' &&
            body !== null &&
            'mensaje' in body &&
            typeof body.mensaje === 'string'
          ) {
            backendMessage = body.mensaje;
          }

          this.errorMensaje = backendMessage ?? 'Error al conectar con el servidor';
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  private showError(message: string): void {
    this.errorMensaje = message;
    this.isLoading = false;
    this.cdr.detectChanges();
  }
}
