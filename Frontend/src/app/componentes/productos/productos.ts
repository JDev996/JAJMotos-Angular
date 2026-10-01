import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface Especificacion {
  icono: string;
  valor: string;
  etiqueta: string;
}

interface Producto {
  id: string;
  nombre: string;
  marca: string;
  precio: number;
  imagenes: string[];
  especificaciones?: Especificacion[]; 
}

interface Categoria {
  id: string;
  titulo: string;
  productos: Producto[];
}

@Component({
  imports: [],
  selector: 'app-productos',
  styleUrl: './productos.css',
  templateUrl: './productos.html',
})
export class Productos {
  private route = inject(ActivatedRoute);

  categorias: Categoria[] = [
    {
      id: 'motos',
      titulo: 'Motos',
      productos: [
        {
          id: 'moto-suzuki-gsxr-1000r', nombre: 'GSXR 1000R', marca: 'SUZUKI', precio: 85000000,
          imagenes: ['img/productos/MOTOS/Suzuki1.png', 'img/productos/MOTOS/Suzuki2.png', 'img/productos/MOTOS/Suzuki3.png', 'img/productos/MOTOS/Suzuki4.png'],
          especificaciones: [
            { icono: '🔧', valor: '999cc', etiqueta: 'Cilindraje' },
            { icono: '⚡', valor: '199 HP', etiqueta: 'Potencia' },
            { icono: '⚖️', valor: '202 kg', etiqueta: 'Peso' },
            { icono: '⛽', valor: '20.499 km', etiqueta: 'Kilometraje' },
          ],
        },
        {
          id: 'moto-ducati-streetfighter-v4s', nombre: 'STREETFIGHTER V4S', marca: 'DUCATI', precio: 125000000,
          imagenes: ['img/productos/MOTOS/Ducati1.png', 'img/productos/MOTOS/Ducati2.png', 'img/productos/MOTOS/Ducati3.png', 'img/productos/MOTOS/Ducati4.png'],
          especificaciones: [
            { icono: '🔧', valor: '1.103cc', etiqueta: 'Cilindraje' },
            { icono: '⚡', valor: '214 HP', etiqueta: 'Potencia' },
            { icono: '⚖️', valor: '189 kg', etiqueta: 'Peso' },
            { icono: '⛽', valor: '4.839 km', etiqueta: 'Kilometraje' },
          ],
        },
        {
          id: 'moto-yamaha-mt09-sp', nombre: 'MT09 SP', marca: 'YAMAHA', precio: 75000000,
          imagenes: ['img/productos/MOTOS/yamaha1.png', 'img/productos/MOTOS/yamaha2.png', 'img/productos/MOTOS/yamaha3.png', 'img/productos/MOTOS/yamaha4.png'],
          especificaciones: [
            { icono: '🔧', valor: '890cc', etiqueta: 'Cilindraje' },
            { icono: '⚡', valor: '117.3 HP', etiqueta: 'Potencia' },
            { icono: '⚖️', valor: '194 kg', etiqueta: 'Peso' },
            { icono: '⛽', valor: '0 km', etiqueta: 'Kilometraje' },
          ],
        },
        {
          id: 'moto-bmw-m1000-rr', nombre: 'M1000 RR', marca: 'BMW', precio: 235000000,
          imagenes: ['img/productos/MOTOS/BMW1.png', 'img/productos/MOTOS/BMW2.png', 'img/productos/MOTOS/BMW3.png', 'img/productos/MOTOS/BMW4.png'],
          especificaciones: [
            { icono: '🔧', valor: '999cc', etiqueta: 'Cilindraje' },
            { icono: '⚡', valor: '218 HP', etiqueta: 'Potencia' },
            { icono: '⚖️', valor: '194 kg', etiqueta: 'Peso' },
            { icono: '⛽', valor: '440 km', etiqueta: 'Kilometraje' },
          ],
        },
        {
          id: 'moto-honda-cbr1000-rr', nombre: 'CBR1000 RR', marca: 'HONDA', precio: 140000000,
          imagenes: ['img/productos/MOTOS/Honda1.png', 'img/productos/MOTOS/Honda2.png', 'img/productos/MOTOS/Honda3.png', 'img/productos/MOTOS/Honda4.png'],
          especificaciones: [
            { icono: '🔧', valor: '999cc', etiqueta: 'Cilindraje' },
            { icono: '⚡', valor: '217 HP', etiqueta: 'Potencia' },
            { icono: '⚖️', valor: '201 kg', etiqueta: 'Peso' },
            { icono: '⛽', valor: '5.005 km', etiqueta: 'Kilometraje' },
          ],
        },
      ],
    },
    {
      id: 'repuestos',
      titulo: 'Repuestos',
      productos: [
        { id: 'repuesto-honda-farola-cbr', nombre: 'FAROLA CBR', marca: 'HONDA', precio: 2300000,
          imagenes: ['img/productos/REPUESTOS/CBR33.jpg', 'img/productos/REPUESTOS/CBR333.jpg'] },
        { id: 'repuesto-yamaha-carenaje-r6', nombre: 'CARENAJE R6', marca: 'YAMAHA', precio: 1700000,
          imagenes: ['img/productos/REPUESTOS/R633.png', 'img/productos/REPUESTOS/R6333.png'] },
        { id: 'repuesto-kawasaki-farola-z900', nombre: 'FAROLA Z900', marca: 'KAWASAKI', precio: 2900000,
          imagenes: ['img/productos/REPUESTOS/Z90022.png', 'img/productos/REPUESTOS/Z900222.png'] },
        { id: 'repuesto-yamaha-farola-mt09-v2', nombre: 'FAROLA MT09 V2', marca: 'YAMAHA', precio: 2000000,
          imagenes: ['img/productos/REPUESTOS/MT0911.png', 'img/productos/REPUESTOS/MT09111.png'] },
      ],
    },
    {
      id: 'accesorios',
      titulo: 'Accesorios',
      productos: [
        { id: 'accesorio-akrapovic-titan-carbon-racing', nombre: 'TITAN CARBON RACING', marca: 'AKRAPOVIC', precio: 4000000,
          imagenes: ['img/productos/ACCESORIOS/AKRA11.png', 'img/productos/ACCESORIOS/AKRA111.png'] },
        { id: 'accesorio-akrapovic-titan-carbon-gp', nombre: 'TITAN CARBON GP', marca: 'AKRAPOVIC', precio: 7000000,
          imagenes: ['img/productos/ACCESORIOS/AKRA22.png', 'img/productos/ACCESORIOS/AKRA222.png'] },
        { id: 'accesorio-rizoma-stealth', nombre: 'STEALTH', marca: 'RIZOMA', precio: 800000,
          imagenes: ['img/productos/ACCESORIOS/RIZOMA11.png', 'img/productos/ACCESORIOS/RIZOMA111.png'] },
        { id: 'accesorio-rizoma-fender-eliminator', nombre: 'FENDER ELIMINATOR', marca: 'RIZOMA', precio: 1000000,
          imagenes: ['img/productos/ACCESORIOS/RIZOMA22.png', 'img/productos/ACCESORIOS/RIZOMA222.png'] },
      ],
    },
  ];

  private readonly POR_PAGINA = 4;

  visibles: Record<string, number> = { motos: 4, repuestos: 4, accesorios: 4 };

  filtros: Record<string, { min: number | null; max: number | null }> = {
    motos: { min: null, max: null },
    repuestos: { min: null, max: null },
    accesorios: { min: null, max: null },
  };

  expandidas = new Set<string>();

  marcaFiltro: string | null = null;
  categoriaFiltro: string | null = null;

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    this.marcaFiltro = params.get('marca');
    const cat = params.get('categoria');
    this.categoriaFiltro = cat && cat !== 'todos' ? cat : null;
  }


  categoriasVisibles(): Categoria[] {
    return this.categoriaFiltro
      ? this.categorias.filter(c => c.id === this.categoriaFiltro)
      : this.categorias;
  }

  productosFiltrados(cat: Categoria): Producto[] {
    const { min, max } = this.filtros[cat.id];
    return cat.productos.filter(p =>
      (!this.marcaFiltro || p.marca === this.marcaFiltro) &&
      (min === null || p.precio >= min) &&
      (max === null || p.precio <= max)
    );
  }

  /** Solo los primeros N (para "Mostrar más") */
  productosPaginados(cat: Categoria): Producto[] {
    return this.productosFiltrados(cat).slice(0, this.visibles[cat.id]);
  }

  aplicarFiltro(catId: string, min: string, max: string) {
    this.filtros[catId] = {
      min: min ? Number(min) : null,
      max: max ? Number(max) : null,
    };
    this.visibles[catId] = this.POR_PAGINA;
  }

  limpiarFiltro(catId: string, minInput: HTMLInputElement, maxInput: HTMLInputElement) {
    minInput.value = '';
    maxInput.value = '';
    this.filtros[catId] = { min: null, max: null };
    this.visibles[catId] = this.POR_PAGINA;
  }

  quitarFiltroMarca() {
    this.marcaFiltro = null;
    this.categoriaFiltro = null;
  }

  mostrarMas(catId: string) {
    this.visibles[catId] += this.POR_PAGINA;
  }

  toggleEspecificaciones(id: string) {
    if (this.expandidas.has(id)) {
      this.expandidas.delete(id);
    } else {
      this.expandidas.add(id);
    }
  }

  deslizarGaleria(galeria: HTMLElement, direccion: number) {
    galeria.scrollBy({ left: direccion * galeria.clientWidth, behavior: 'smooth' });
  }

  irACategoria(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  agregarAlCarrito(producto: Producto) {
    console.log('Agregar al carrito:', producto);
  }
}