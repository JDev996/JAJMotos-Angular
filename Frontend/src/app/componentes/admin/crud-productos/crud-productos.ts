import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductosService } from '../../../services/productos-service';
import { Productos } from '../../../interfaces/productos';

@Component({
  selector: 'app-crud-productos',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './crud-productos.html',
  styleUrl: './crud-productos.css',
})
export class CrudProductos implements OnInit {
  private productosService = inject(ProductosService);

  productos = signal<Productos[]>([]);
  mostrarFormulario = signal<boolean>(false);
  modo = signal<'crear' | 'editar'>('crear');
  selectedFile = signal<File | null>(null);
  imagenBaseURL = 'http://localhost:8080/imagenes/';

  productoForm: Productos = this.resetProducto();

  ngOnInit(): void {
    this.obtenerProductos();
  }

  obtenerProductos(): void {
    this.productosService.getAll().subscribe({
      next: (resp) => { this.productos.set(resp); },
      error: (err) => console.error('Error al cargar productos', err),
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
    }
  }

  resetProducto(): Productos {
    return { modelo: '', descripcion: '', precio: 0, color: '', imagen: '' };
  }

  prepararCrear(): void {
    this.modo.set('crear');
    this.productoForm = this.resetProducto();
    this.selectedFile.set(null);
    this.mostrarFormulario.set(true);
  }

  seleccionarParaEditar(producto: Productos): void {
    this.modo.set('editar');
    this.productoForm = { ...producto };
    this.selectedFile.set(null);
    this.mostrarFormulario.set(true);
  }

  cancelarFormulario(): void {
    this.mostrarFormulario.set(false);
    this.productoForm = this.resetProducto();
    this.selectedFile.set(null);
  }

  crearProducto(): void {
    const file = this.selectedFile();
    if (!file) {
      alert('Por favor selecciona una imagen');
      return;
    }

    const formData = new FormData();
    formData.append('modelo', this.productoForm.modelo);
    formData.append('descripcion', this.productoForm.descripcion);
    formData.append('precio', this.productoForm.precio.toString());
    formData.append('color', this.productoForm.color);
    formData.append('imagen', file);

    this.productosService.crear(formData).subscribe({
      next: () => {
        alert('Producto creado correctamente');
        this.cancelarFormulario();
        this.obtenerProductos();
      },
      error: (err) => {
        console.error('Error al crear producto', err);
        alert('Error al crear producto');
      },
    });
  }

  actualizarProducto(): void {
    if (!this.productoForm._id) {
      alert('No se encontró el ID del producto');
      return;
    }

    const formData = new FormData();
    formData.append('modelo', this.productoForm.modelo);
    formData.append('descripcion', this.productoForm.descripcion);
    formData.append('precio', this.productoForm.precio.toString());
    formData.append('color', this.productoForm.color);
    const file = this.selectedFile();
    if (file) {
      formData.append('imagen', file);
    }

    this.productosService.actualizar(this.productoForm._id, formData).subscribe({
      next: () => {
        alert('Producto actualizado correctamente');
        this.cancelarFormulario();
        this.obtenerProductos();
      },
      error: (err) => {
        console.error('Error al actualizar producto', err);
        alert('Error al actualizar producto');
      },
    });
  }

  eliminarProducto(id: string): void {
    if (confirm('Estás seguro de eliminar este producto?')) {
      this.productosService.delete(id).subscribe({
        next: () => { this.obtenerProductos(); },
        error: (err) => console.error('Error al eliminar', err),
      });
    }
  }
}
