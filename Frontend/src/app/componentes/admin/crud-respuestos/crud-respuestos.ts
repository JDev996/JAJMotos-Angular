import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RespuestosService } from '../../../services/respuestos-service';
import { Repuesto } from '../../../interfaces/respuestos';

@Component({
  selector: 'app-crud-respuestos',
  standalone: true,
  imports: [FormsModule],
  styleUrl: './crud-respuestos.css',
  templateUrl: './crud-respuestos.html',
})
export class CrudRespuestos implements OnInit {
  private service = inject(RespuestosService);
  repuestos = signal<Repuesto[]>([]);
  formulario = signal(false);
  modo = signal<'crear' | 'editar'>('crear');
  archivo = signal<File | null>(null);
  imagenBaseURL = 'http://localhost:8080/imagenes/';
  form: Repuesto = this.vacio();

  ngOnInit(): void { this.obtener(); }
  vacio(): Repuesto {
    return { marca: '', referencia: '', precio: 0, stock: 0, Foto: '' };
  }
  obtener(): void {
    this.service.getAll().subscribe({
      next: (resp: any) => this.repuestos.set(Array.isArray(resp.datos) ? resp.datos : []),
      error: (err) => console.error('Error al cargar repuestos', err),
    });
  }
  nuevo(): void { this.modo.set('crear'); this.form = this.vacio(); this.archivo.set(null); this.formulario.set(true); }
  editar(repuesto: Repuesto): void { this.modo.set('editar'); this.form = { ...repuesto }; this.archivo.set(null); this.formulario.set(true); }
  cancelar(): void { this.formulario.set(false); this.form = this.vacio(); this.archivo.set(null); }
  archivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.archivo.set(input.files[0]);
  }
  guardar(): void {
    const file = this.archivo();
    if (this.modo() === 'crear' && !file) { alert('Por favor selecciona una imagen'); return; }
    const data = new FormData();
    data.append('marca', this.form.marca);
    data.append('referencia', this.form.referencia);
    data.append('precio', this.form.precio.toString());
    data.append('stock', this.form.stock.toString());
    if (file) data.append('Foto', file);
    const request = this.modo() === 'crear'
      ? this.service.crear(data)
      : this.service.actualizar(this.form._id!, data);
    request.subscribe({
      next: () => {
        alert(`Repuesto ${this.modo() === 'crear' ? 'creado' : 'actualizado'} correctamente`);
        this.cancelar();
        this.obtener();
      },
      error: (err) => { console.error('Error al guardar repuesto', err); alert('Error al guardar repuesto'); },
    });
  }
  eliminar(id: string): void {
    if (!confirm('Estás seguro de eliminar este repuesto?')) return;
    this.service.delete(id).subscribe({
      next: () => this.obtener(),
      error: (err) => console.error('Error al eliminar repuesto', err),
    });
  }
}
