import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

const adminSections = ['Usuarios', 'Productos', 'Motos', 'Repuestos'] as const;

type AdminSection = (typeof adminSections)[number];

interface Usuario {
  _id?: string;
  nombre: string;
  apellido: string;
  correo: string;
  edad?: number;
  rol: string;
}

interface UsuariosResponse {
  resultado?: unknown;
  mensaje?: unknown;
  datos?: unknown;
}

function isUsuario(value: unknown): value is Usuario {
  return (
    typeof value === 'object' &&
    value !== null &&
    'nombre' in value &&
    typeof value.nombre === 'string' &&
    'apellido' in value &&
    typeof value.apellido === 'string' &&
    'correo' in value &&
    typeof value.correo === 'string' &&
    'rol' in value &&
    typeof value.rol === 'string'
  );
}

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.css',
})
export class AdminPanelComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly sections = adminSections;
  activeSection: AdminSection = 'Usuarios';
  @ViewChild('fotoInput') private fotoInput?: ElementRef<HTMLInputElement>;

  readonly usuarioForm = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    apellido: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$@$!%?&*])[A-Za-z\d$@$!%?&*]{8,15}$/),
      ],
    }),
    edad: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d+$/), Validators.min(0)],
    }),
    rol: new FormControl('usuario', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    foto: new FormControl<File | null>(null, Validators.required),
  });
  usuarios: Usuario[] = [];
  creandoUsuario = false;

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const token = window.localStorage.getItem('token');
    if (!token) {
      console.error('No se puede listar usuarios: no hay token de sesión.');
      return;
    }

    this.http
      .get<UsuariosResponse>('http://localhost:8080/usuarios', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .subscribe({
        next: (response) => {
          if (
            response.resultado !== 'bien' ||
            !Array.isArray(response.datos) ||
            !response.datos.every(isUsuario)
          ) {
            console.error('El servidor devolvió una lista de usuarios no válida:', response);
            window.alert('El servidor devolvió una lista de usuarios no válida.');
            return;
          }

          this.usuarios = response.datos;
        },
        error: (error: unknown) => {
          console.error('Error al consultar GET /usuarios:', error);
          this.handleRequestError(error);
        },
      });
  }

  onFotoSeleccionada(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    this.usuarioForm.controls.foto.setValue(input.files?.item(0) ?? null);
    this.usuarioForm.controls.foto.markAsTouched();
  }

  crearUsuario(): void {
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const token = window.localStorage.getItem('token');
    if (!token) {
      console.error('No se puede crear el usuario: no hay token de sesión.');
      window.alert('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      void this.router.navigate(['/login']);
      return;
    }

    const { nombre, apellido, correo, password, edad, rol, foto } =
      this.usuarioForm.getRawValue();

    if (!foto) {
      this.usuarioForm.controls.foto.markAsTouched();
      return;
    }

    const formData = new FormData();
    formData.append('nombre', nombre.trim());
    formData.append('apellido', apellido.trim());
    formData.append('correo', correo.trim());
    formData.append('password', password);
    formData.append('edad', edad);
    formData.append('rol', rol);
    formData.append('Foto', foto);

    this.creandoUsuario = true;
    this.http
      .post<UsuariosResponse>('http://localhost:8080/usuarios', formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .subscribe({
        next: (response) => {
          this.creandoUsuario = false;

          if (response.resultado !== 'bien') {
            const message =
              typeof response.mensaje === 'string'
                ? response.mensaje
                : 'No se pudo crear el usuario.';
            window.alert(message);
            return;
          }

          window.alert(
            typeof response.mensaje === 'string'
              ? response.mensaje
              : 'Usuario creado satisfactoriamente.',
          );
          this.usuarioForm.reset({ edad: '', rol: 'usuario' });
          if (this.fotoInput) {
            this.fotoInput.nativeElement.value = '';
          }
          this.cargarUsuarios();
        },
        error: (error: unknown) => {
          this.creandoUsuario = false;
          console.error('Error al crear el usuario:', error);
          this.handleRequestError(error);
        },
      });
  }

  private handleRequestError(error: unknown): void {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    const body: unknown = error instanceof HttpErrorResponse ? error.error : null;
    const backendMessage =
      typeof body === 'object' &&
      body !== null &&
      'mensaje' in body &&
      typeof body.mensaje === 'string'
        ? body.mensaje
        : null;

    if (typeof window === 'undefined') {
      return;
    }

    if (status === 401 || status === 403) {
      window.alert('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      window.localStorage.removeItem('token');
      void this.router.navigate(['/login']);
      return;
    }

    window.alert(backendMessage ?? 'Error al cargar los datos. Intenta de nuevo más tarde.');
  }

  selectSection(section: AdminSection): void {
    this.activeSection = section;
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('token');
    }

    void this.router.navigate(['/login']);
  }
}
