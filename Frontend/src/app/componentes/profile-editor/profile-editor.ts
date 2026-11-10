import { Component, EventEmitter, inject, OnDestroy, OnInit, Output } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { timeout } from 'rxjs';
import { ProfileState, UsuarioPerfil } from '../../services/profile-state';

interface PerfilResponse {
  resultado?: unknown;
  mensaje?: unknown;
  datos?: unknown;
}

function isUsuarioPerfil(value: unknown): value is Pick<UsuarioPerfil, 'nombre' | 'apellido'> &
  Partial<UsuarioPerfil> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'nombre' in value &&
    typeof value.nombre === 'string' &&
    'apellido' in value &&
    typeof value.apellido === 'string' &&
    (!('correo' in value) || typeof value.correo === 'string') &&
    (!('rol' in value) || typeof value.rol === 'string') &&
    (!('Foto' in value) || typeof value.Foto === 'string')
  );
}

@Component({
  selector: 'app-profile-editor',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './profile-editor.html',
  styleUrl: './profile-editor.css',
})
export class ProfileEditor implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly profileState = inject(ProfileState);

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly profileUpdated = new EventEmitter<UsuarioPerfil>();

  readonly profileForm = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    apellido: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  fotoActual = '';
  fotoPrevisualizacion = '';
  fotoSeleccionada: File | null = null;
  guardando = false;
  cerrando = false;
  errorMensaje = '';
  private objectUrl = '';
  private closeTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    const perfil = this.profileState.currentProfile;
    if (perfil) {
      this.profileForm.setValue({
        nombre: perfil.nombre,
        apellido: perfil.apellido,
      });
      this.fotoActual = perfil.Foto ?? '';
      this.fotoPrevisualizacion = this.urlFoto(this.fotoActual);
    }
    this.cargarPerfil();
  }

  ngOnDestroy(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
    }
    this.liberarPrevisualizacion();
  }

  onFotoSeleccionada(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const file = input.files?.item(0) ?? null;
    this.liberarPrevisualizacion();
    this.fotoSeleccionada = file;
    this.fotoPrevisualizacion = file
      ? (this.objectUrl = URL.createObjectURL(file))
      : this.urlFoto(this.fotoActual);
  }

  guardarPerfil(): void {
    this.errorMensaje = '';
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    if (typeof window === 'undefined') {
      this.errorMensaje = 'No se puede actualizar el perfil en este entorno.';
      return;
    }

    const token = window.localStorage.getItem('token');
    if (!token) {
      this.errorMensaje = 'Tu sesión ha expirado. Inicia sesión de nuevo.';
      return;
    }

    const formData = new FormData();
    formData.append('nombre', this.profileForm.controls.nombre.value.trim());
    formData.append('apellido', this.profileForm.controls.apellido.value.trim());
    if (this.fotoSeleccionada) {
      formData.append('Foto', this.fotoSeleccionada);
    }

    this.guardando = true;
    this.http
      .put<PerfilResponse>('http://localhost:8080/usuarios/perfil', formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .subscribe({
        next: (response) => {
          this.guardando = false;
          if (response.resultado !== 'bien' || !isUsuarioPerfil(response.datos)) {
            this.errorMensaje =
              typeof response.mensaje === 'string'
                ? response.mensaje
                : 'El servidor devolvió una respuesta no válida.';
            return;
          }

          const currentProfile = this.profileState.currentProfile;
          const updatedProfile: UsuarioPerfil = {
            _id: response.datos._id ?? currentProfile?._id,
            nombre: response.datos.nombre,
            apellido: response.datos.apellido,
            correo: response.datos.correo ?? currentProfile?.correo ?? '',
            rol: response.datos.rol ?? currentProfile?.rol ?? '',
            Foto: response.datos.Foto ?? currentProfile?.Foto,
          };

          this.fotoActual = updatedProfile.Foto ?? '';
          this.liberarPrevisualizacion();
          this.fotoPrevisualizacion = this.urlFoto(this.fotoActual);
          this.fotoSeleccionada = null;
          this.profileState.setProfile(updatedProfile);
          this.profileUpdated.emit(updatedProfile);
          this.cerrar();
        },
        error: (error: unknown) => {
          this.guardando = false;
          console.error('Error al actualizar el perfil:', error);
          this.errorMensaje = this.mensajeError(error);
        },
      });
  }

  cerrar(): void {
    if (this.cerrando) {
      return;
    }

    this.cerrando = true;
    this.closeTimer = setTimeout(() => this.closed.emit(), 220);
  }

  finalizarCierre(event: AnimationEvent): void {
    if (
      this.cerrando &&
      event.target === event.currentTarget &&
      event.animationName === 'profileBackdropOut'
    ) {
      if (this.closeTimer) {
        clearTimeout(this.closeTimer);
      }
      this.closed.emit();
    }
  }

  private cargarPerfil(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const token = window.localStorage.getItem('token');
    if (!token) {
      this.errorMensaje = 'Tu sesión ha expirado. Inicia sesión de nuevo.';
      return;
    }

    this.http
      .get<PerfilResponse>('http://localhost:8080/usuarios/perfil', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .pipe(timeout({ first: 10_000 }))
      .subscribe({
        next: (response) => {
          if (response.resultado !== 'bien' || !isUsuarioPerfil(response.datos)) {
            this.errorMensaje =
              typeof response.mensaje === 'string'
                ? response.mensaje
                : 'No se pudo cargar el perfil.';
            return;
          }

          const currentProfile = this.profileState.currentProfile;
          const profile: UsuarioPerfil = {
            _id: response.datos._id ?? currentProfile?._id,
            nombre: response.datos.nombre,
            apellido: response.datos.apellido,
            correo: response.datos.correo ?? currentProfile?.correo ?? '',
            rol: response.datos.rol ?? currentProfile?.rol ?? '',
            Foto: response.datos.Foto ?? currentProfile?.Foto,
          };

          if (this.profileForm.pristine) {
            this.profileForm.setValue({
              nombre: profile.nombre,
              apellido: profile.apellido,
            });
          }
          this.fotoActual = profile.Foto ?? '';
          this.fotoPrevisualizacion = this.urlFoto(this.fotoActual);
          this.profileState.setProfile(profile);
        },
        error: (error: unknown) => {
          console.error('Error al consultar el perfil:', error);
          this.errorMensaje = this.mensajeError(error);
        },
      });
  }

  private urlFoto(filename: string): string {
    return filename
      ? `http://localhost:8080/imagenes/${encodeURIComponent(filename)}`
      : '';
  }

  private liberarPrevisualizacion(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = '';
    }
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body: unknown = error.error;
      if (
        typeof body === 'object' &&
        body !== null &&
        'mensaje' in body &&
        typeof body.mensaje === 'string'
      ) {
        return body.mensaje;
      }
      if (error.status === 401 || error.status === 403) {
        return 'Tu sesión expiró o no tiene permiso para editar el perfil.';
      }
    }
    return 'No se pudo actualizar el perfil. Intenta de nuevo.';
  }
}
