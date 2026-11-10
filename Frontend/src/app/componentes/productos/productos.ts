import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';

import { MotosService } from '../../services/motos-service';
import { RespuestosService } from '../../services/respuestos-service';
import { AccesoriosService } from '../../services/accesorios-service';
import { ProductosService } from '../../services/productos-service';
import { Moto } from '../../interfaces/motos';
import { Repuesto } from '../../interfaces/respuestos';
import { Accesorio } from '../../interfaces/accesorios';
import { Productos as ProductoTienda } from '../../interfaces/productos';

interface Especificacion {
  icono: string;
  valor: string;
  etiqueta: string;
}

/** Estilo de la tarjeta*/
interface Producto {
  id: string;
  nombre: string;
  marca: string;
  precio: number;
  stock: number;
  imagenes: string[];
  especificaciones?: Especificacion[];
}

interface Categoria {
  id: string;
  titulo: string;
  productos: Producto[];
  error: boolean;
}

interface RangoPrecio {
  etiqueta: string;
  min: number | null;
  max: number | null;
}

const IMAGEN_BASE_URL = 'http://localhost:8080/imagenes/';

@Component({
  imports: [],
  selector: 'app-productos',
  styleUrls: ['./productos.css', './productos-tienda.css'],
  templateUrl: './productos.html',
})
export class Productos implements OnInit {
  private route = inject(ActivatedRoute);
  private motosService = inject(MotosService);
  private repuestosService = inject(RespuestosService);
  private accesoriosService = inject(AccesoriosService);
  private productosService = inject(ProductosService);

  productosMotos = signal<ProductoTienda[]>([]);
  productosRepuestos = signal<ProductoTienda[]>([]);
  productosAccesorios = signal<ProductoTienda[]>([]);

  imagenBaseURL = 'http://localhost:8080/imagenes/';

  // Pestañas de navegación
  readonly secciones = [
    { id: 'motos', titulo: 'Motos' },
    { id: 'repuestos', titulo: 'Repuestos' },
    { id: 'accesorios', titulo: 'Accesorios' },
  ];

  // Signals: la app no usa zone.js, así que los datos que llegan del backend
  // deben ir en signals para que la vista se actualice sola.
  categorias = signal<Categoria[]>([]);
  cargando = signal(true);

  private readonly POR_PAGINA = 4;

  visibles: Record<string, number> = { motos: 4, repuestos: 4, accesorios: 4 };

  readonly rangosPrecio: RangoPrecio[] = [
    { etiqueta: 'Hasta $ 3.000.000', min: null, max: 3000000 },
    { etiqueta: '$ 3.000.000 a $ 30.000.000', min: 3000000, max: 30000000 },
    { etiqueta: 'Más de $ 30.000.000', min: 30000000, max: null },
  ];

  precioMin: number | null = null;
  precioMax: number | null = null;

  expandidas = new Set<string>();

  marcaFiltro: string | null = null;
  categoriaFiltro: string | null = null;

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    this.marcaFiltro = params.get('marca');
    const cat = params.get('categoria');
    this.categoriaFiltro = cat && cat !== 'todos' ? cat : null;
  }

  ngOnInit(): void {
    this.cargarSecciones();
  }

  cargarSecciones(): void {
    this.productosService.getAll().subscribe({
      next: (todos) => {
        this.productosMotos.set(
          todos.filter(prod => prod.categoria === 'motos')
        );

        this.productosRepuestos.set(
          todos.filter(prod => prod.categoria === 'repuestos')
        );

        this.productosAccesorios.set(
          todos.filter(prod => prod.categoria === 'accesorios')
        );
      },
      error: (err) => console.error('Error al cargar productos', err)
    });
  }

  /** Pide las tres categorías al backend en paralelo. Si una falla, las otras se muestran igual. */
  cargarCatalogo(): void {
    this.cargando.set(true);

    forkJoin({
      motos: this.pedir<Moto>(this.motosService.getAll()),
      repuestos: this.pedir<Repuesto>(this.repuestosService.getAll()),
      accesorios: this.pedir<Accesorio>(this.accesoriosService.getAll()),
    }).subscribe(({ motos, repuestos, accesorios }) => {
      this.categorias.set([
        { id: 'motos', titulo: 'Motos', error: motos === null, productos: (motos ?? []).map(m => this.desdeMoto(m)) },
        { id: 'repuestos', titulo: 'Repuestos', error: repuestos === null, productos: (repuestos ?? []).map(r => this.desdeItem(r, 'repuesto')) },
        { id: 'accesorios', titulo: 'Accesorios', error: accesorios === null, productos: (accesorios ?? []).map(a => this.desdeItem(a, 'accesorio')) },
      ]);
      this.cargando.set(false);
    });
  }

  /** Extrae `datos` de la respuesta { resultado, mensaje, datos }. Devuelve null si hubo error. */
  private pedir<T>(peticion: Observable<any>): Observable<T[] | null> {
    return peticion.pipe(
      map(resp => (Array.isArray(resp?.datos) ? (resp.datos as T[]) : null)),
      catchError(err => {
        console.error('Error al cargar el catálogo', err);
        return of(null);
      }),
    );
  }

  private desdeMoto(m: Moto): Producto {
    return {
      id: m._id ?? `${m.marca}-${m.referencia}`,
      nombre: m.referencia,
      marca: m.marca,
      precio: Number(m.precio),
      stock: Number(m.stock),
      imagenes: [IMAGEN_BASE_URL + m.Foto],
      especificaciones: [
        { icono: '🔧', valor: `${m.cilindraje} cc`, etiqueta: 'Cilindraje' },
        { icono: '📅', valor: String(m.modelo), etiqueta: 'Modelo' },
        { icono: '🏍️', valor: m.categoria, etiqueta: 'Tipo' },
        { icono: '📦', valor: String(m.stock), etiqueta: 'Disponibles' },
      ],
    };
  }

  private desdeItem(item: Repuesto | Accesorio, tipo: string): Producto {
    return {
      id: item._id ?? `${tipo}-${item.marca}-${item.referencia}`,
      nombre: item.referencia,
      marca: item.marca,
      precio: Number(item.precio),
      stock: Number(item.stock),
      imagenes: [IMAGEN_BASE_URL + item.Foto],
    };
  }

  categoriasVisibles(): Categoria[] {
    return this.categoriaFiltro
      ? this.categorias().filter(c => c.id === this.categoriaFiltro)
      : this.categorias();
  }

  productosFiltrados(cat: Categoria): Producto[] {
    const min = this.precioMin;
    const max = this.precioMax;
    const marca = this.marcaFiltro?.toUpperCase();
    return cat.productos.filter(p =>
      // En la BD la marca puede venir como "Honda" o "HONDA": se compara sin mayúsculas
      (!marca || p.marca.toUpperCase() === marca) &&
      (min === null || p.precio >= min) &&
      (max === null || p.precio <= max)
    );
  }

  /** Solo los primeros N (para "Mostrar más") */
  productosPaginados(cat: Categoria): Producto[] {
    return this.productosFiltrados(cat).slice(0, this.visibles[cat.id]);
  }

  enPrecio(precio: number): boolean {
    return (this.precioMin === null || precio >= this.precioMin) &&
      (this.precioMax === null || precio <= this.precioMax);
  }

  filtrarPorPrecio(lista: ProductoTienda[]): ProductoTienda[] {
    return lista.filter(prod => this.enPrecio(Number(prod.precio)));
  }

  mostrarSeccion(id: string): boolean {
    return !this.categoriaFiltro || this.categoriaFiltro === id;
  }

  elegirCategoria(id: string | null) {
    this.categoriaFiltro = id;
    this.reiniciarPaginas();
  }

  elegirRango(rango: RangoPrecio, minInput: HTMLInputElement, maxInput: HTMLInputElement) {
    minInput.value = '';
    maxInput.value = '';
    this.precioMin = rango.min;
    this.precioMax = rango.max;
    this.reiniciarPaginas();
  }

  esRangoActivo(rango: RangoPrecio): boolean {
    return this.precioMin === rango.min && this.precioMax === rango.max;
  }

  aplicarPrecio(min: string, max: string) {
    this.precioMin = min ? Number(min) : null;
    this.precioMax = max ? Number(max) : null;
    this.reiniciarPaginas();
  }

  limpiarPrecio(minInput: HTMLInputElement, maxInput: HTMLInputElement) {
    minInput.value = '';
    maxInput.value = '';
    this.precioMin = null;
    this.precioMax = null;
    this.reiniciarPaginas();
  }

  private reiniciarPaginas() {
    for (const id of Object.keys(this.visibles)) {
      this.visibles[id] = this.POR_PAGINA;
    }
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

  agregarAlCarrito(producto: Producto) {
    console.log('Agregar al carrito:', producto);
  }
}
