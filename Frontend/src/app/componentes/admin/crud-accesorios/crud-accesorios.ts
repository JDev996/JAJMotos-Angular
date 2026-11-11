import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Accesorio } from '../../../interfaces/accesorios';
import { AccesoriosService } from '../../../services/accesorios-service';

interface AccesoriosResponse {
  result?: unknown;
  message?: unknown;
  data?: unknown;
}

function isAccesorio(value: unknown): value is Accesorio {
  if (typeof value !== 'object' || value === null) return false;
  const accesorio = value as Record<string, unknown>;
  return (
    (accesorio['nombre'] === undefined || typeof accesorio['nombre'] === 'string') &&
    typeof accesorio['marca'] === 'string' &&
    typeof accesorio['referencia'] === 'string' &&
    typeof accesorio['precio'] === 'number' &&
    typeof accesorio['stock'] === 'number' &&
    typeof accesorio['Foto'] === 'string'
  );
}

@Component({
  selector: 'app-crud-accesorios',
  standalone: true,
  imports: [CurrencyPipe, FormsModule],
  styleUrl: './crud-accesorios.css',
  templateUrl: './crud-accesorios.html',
})
export class CrudAccesorios implements OnInit {
  private readonly service = inject(AccesoriosService);
  @ViewChild('imagenInput') private imagenInput?: ElementRef<HTMLInputElement>;

  readonly accesorios = signal<Accesorio[]>([]);
  readonly formulario = signal(false);
  readonly modo = signal<'crear' | 'editar'>('crear');
  readonly archivo = signal<File | null>(null);
  readonly guardando = signal(false);
  readonly imagenBaseURL = 'http://localhost:8080/imagenes/';
  form: Accesorio = this.vacio();

  ngOnInit(): void {
    this.obtener();
  }

  private vacio(): Accesorio {
    return { nombre: '', marca: '', referencia: '', descripcion: '', precio: 0, stock: 0, Foto: '' };
  }

  obtener(): void {
    this.service.getAll().subscribe({
      next: (response: AccesoriosResponse) => {
        if (
          response.result !== 'fine' ||
          !Array.isArray(response.data) ||
          !response.data.every(isAccesorio)
        ) {
          console.error('El servidor devolvió una lista de accesorios no válida:', response);
          window.alert('No se pudo cargar la lista de accesorios.');
          return;
        }
        this.accesorios.set(response.data);
      },
      error: (error: unknown) => {
        console.error('Error al cargar accesorios:', error);
        window.alert('Error al cargar accesorios. Intenta de nuevo.');
      },
    });
  }

  nuevo(): void {
    this.modo.set('crear');
    this.form = this.vacio();
    this.archivo.set(null);
    this.limpiarInputImagen();
    this.formulario.set(true);
  }

  editar(accesorio: Accesorio): void {
    this.modo.set('editar');
    this.form = { ...accesorio };
    this.archivo.set(null);
    this.limpiarInputImagen();
    this.formulario.set(true);
  }

  cancelar(): void {
    this.formulario.set(false);
    this.form = this.vacio();
    this.archivo.set(null);
    this.limpiarInputImagen();
  }

  archivoSeleccionado(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    this.archivo.set(input.files?.item(0) ?? null);
  }

  guardar(): void {
    const file = this.archivo();
    if (this.modo() === 'crear' && !file) {
      window.alert('Selecciona una imagen para el accesorio.');
      return;
    }

    const data = new FormData();
    data.append('nombre', this.form.nombre?.trim() ?? '');
    data.append('marca', this.form.marca.trim());
    data.append('referencia', this.form.referencia.trim());
    data.append('descripcion', this.form.descripcion?.trim() ?? '');
    data.append('precio', String(this.form.precio));
    data.append('stock', String(this.form.stock));
    if (file) data.append('Foto', file);

    const modoActual = this.modo();
    if (modoActual === 'editar' && !this.form._id) {
      console.error('No se puede actualizar el accesorio: falta su identificador.');
      window.alert('No se pudo identificar el accesorio que deseas actualizar.');
      return;
    }

    this.guardando.set(true);
    const request = modoActual === 'crear'
      ? this.service.crear(data)
      : this.service.actualizar(this.form._id!, data);
    request.subscribe({
      next: (response: AccesoriosResponse) => {
        this.guardando.set(false);
        if (response.result !== 'fine') {
          const message = typeof response.message === 'string'
            ? response.message
            : 'No se pudo guardar el accesorio.';
          console.error('El servidor no pudo guardar el accesorio:', response);
          window.alert(message);
          return;
        }

        window.alert(`Accesorio ${modoActual === 'crear' ? 'creado' : 'actualizado'} correctamente.`);
        this.cancelar();
        this.obtener();
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        console.error('Error al guardar accesorio:', error);
        window.alert('Error al guardar el accesorio. Intenta de nuevo.');
      },
    });
  }

  eliminar(accesorio: Accesorio): void {
    if (!accesorio._id || !window.confirm(`¿Eliminar el accesorio "${accesorio.referencia}"?`)) {
      return;
    }

    this.service.delete(accesorio._id).subscribe({
      next: (response: AccesoriosResponse) => {
        if (response.result !== 'fine') {
          const message = typeof response.message === 'string'
            ? response.message
            : 'No se pudo eliminar el accesorio.';
          console.error('El servidor no pudo eliminar el accesorio:', response);
          window.alert(message);
          return;
        }
        this.obtener();
      },
      error: (error: unknown) => {
        console.error('Error al eliminar accesorio:', error);
        window.alert('Error al eliminar el accesorio. Intenta de nuevo.');
      },
    });
  }

  private limpiarInputImagen(): void {
    if (this.imagenInput) this.imagenInput.nativeElement.value = '';
  }
}
