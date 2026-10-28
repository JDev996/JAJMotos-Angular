import { ChangeDetectorRef, Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { NuevoUsuario } from '../../interfaces/nuevo-usuario';
import { RegistroResponse, RegistroService } from '../../services/registro-service';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$@$!%?&*])[A-Za-z\d$@$!%?&*]{8,15}$/;

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,20}$/;

function passwordsIguales(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmarPassword = group.get('confirmarPassword')?.value;

  return password === confirmarPassword ? null : { passwordsDistintas: true };
}

function isRegistroResponse(response: unknown): response is RegistroResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'resultado' in response &&
    (response.resultado === 'bien' || response.resultado === 'mal') &&
    'mensaje' in response &&
    typeof response.mensaje === 'string'
  );
}

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-registro',
  styleUrl: './registro.css',
  templateUrl: './registro.html',
})
export class Registro {
  private readonly registroService = inject(RegistroService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly registroForm = new FormGroup(
    {
      nombre: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      apellido: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      nombreUsuario: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(USERNAME_PATTERN)],
      }),
      correo: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(PASSWORD_PATTERN)],
      }),
      confirmarPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: passwordsIguales },
  );

  errorMensaje = '';
  exitoMensaje = '';
  isLoading = false;

  handleSubmit(): void {
    this.errorMensaje = '';
    this.exitoMensaje = '';

    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      this.errorMensaje = 'Revisa los campos marcados en rojo.';
      return;
    }

    const { nombre, apellido, nombreUsuario, correo, password } = this.registroForm.getRawValue();

    const nuevoUsuario: NuevoUsuario = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      nombreUsuario: nombreUsuario.trim(),
      correo: correo.trim().toLowerCase(),
      password,
    };

    this.isLoading = true;

    this.registroService.registrar(nuevoUsuario).subscribe({
      next: (response) => {
        this.isLoading = false;

        if (!isRegistroResponse(response)) {
          this.showError('El servidor devolvió una respuesta no válida.');
          return;
        }

        if (response.resultado === 'mal') {
          this.showError(response.mensaje);
          return;
        }

        this.exitoMensaje = '¡Cuenta creada! Te llevamos al inicio de sesión...';
        this.cdr.detectChanges();
        setTimeout(() => void this.router.navigate(['/login']), 2000);
      },
      error: (error: HttpErrorResponse) => {
        const body: unknown = error.error;
        let backendMessage: string | null = null;

        if (
          typeof body === 'object' &&
          body !== null &&
          'mensaje' in body &&
          typeof body.mensaje === 'string'
        ) {
          backendMessage = body.mensaje;
        }

        console.error('Error en registro:', error);
        this.showError(backendMessage ?? 'Error al conectar con el servidor');
      },
    });
  }

  private showError(message: string): void {
    this.errorMensaje = message;
    this.isLoading = false;
    this.cdr.detectChanges();
  }
}
