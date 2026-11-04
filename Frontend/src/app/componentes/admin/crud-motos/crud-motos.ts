import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MotosService } from '../../../services/motos-service';
import { Moto } from '../../../interfaces/motos';

@Component({
  selector: 'app-crud-motos',
  standalone: true,
  imports: [FormsModule],
  styleUrl: './crud-motos.css',
  templateUrl: './crud-motos.html',
})
export class CrudMotos implements OnInit {
  private service = inject(MotosService);
  motos = signal<Moto[]>([]);
  formulario = signal(false);
  modo = signal<'crear' | 'editar'>('crear');
  archivo = signal<File | null>(null);
  imagenBaseURL = 'http://localhost:8080/imagenes/';
  form: Moto = this.vacio();
  categorias = [
    'Urbana / De trabajo',
    'Scooters y MaxiScooters',
    'Naked',
    'Deportivas (Sport)',
    'Trail / Adventure / Doble propósito',
    'Cruiser y Chopper',
    'Touring / Sport Touring',
    'Enduro y Motocross',
    'Eléctricas',
  ];

  ngOnInit(): void { this.obtener(); }
  vacio(): Moto {
    return { modelo: '', marca: '', referencia: '', categoria: '', cilindraje: 0, precio: 0, stock: 0, Foto: '' };
  }
  obtener(): void {
    this.service.getAll().subscribe({
      next: (resp: any) => this.motos.set(Array.isArray(resp.datos) ? resp.datos : []),
      error: (err) => console.error('Error al cargar motos', err),
    });
  }
  nuevo(): void { this.modo.set('crear'); this.form = this.vacio(); this.archivo.set(null); this.formulario.set(true); }
  editar(moto: Moto): void { this.modo.set('editar'); this.form = { ...moto }; this.archivo.set(null); this.formulario.set(true); }
  cancelar(): void { this.formulario.set(false); this.form = this.vacio(); this.archivo.set(null); }
  archivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.archivo.set(input.files[0]);
  }
  guardar(): void {
    const file = this.archivo();
    if (this.modo() === 'crear' && !file) { alert('Por favor selecciona una imagen'); return; }
    const data = new FormData();
    data.append('modelo', this.form.modelo);
    data.append('marca', this.form.marca);
    data.append('referencia', this.form.referencia);
    data.append('categoria', this.form.categoria);
    data.append('cilindraje', this.form.cilindraje.toString());
    data.append('precio', this.form.precio.toString());
    data.append('stock', this.form.stock.toString());
    if (file) data.append('Foto', file);
    const request = this.modo() === 'crear'
      ? this.service.crear(data)
      : this.service.actualizar(this.form._id!, data);
    request.subscribe({
      next: () => {
        alert(`Moto ${this.modo() === 'crear' ? 'creada' : 'actualizada'} correctamente`);
        this.cancelar();
        this.obtener();
      },
      error: (err) => { console.error('Error al guardar moto', err); alert('Error al guardar moto'); },
    });
  }
  eliminar(id: string): void {
    if (!confirm('Estás seguro de eliminar esta moto?')) return;
    this.service.delete(id).subscribe({
      next: () => this.obtener(),
      error: (err) => console.error('Error al eliminar moto', err),
    });
  }
}
