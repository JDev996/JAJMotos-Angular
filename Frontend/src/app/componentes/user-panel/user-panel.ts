import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { CarritoService } from '../../services/carrito-service';
import { MotosService } from '../../services/motos-service';
import { RespuestosService } from '../../services/respuestos-service';
import { AccesoriosService } from '../../services/accesorios-service';
import { ProductosService } from '../../services/productos-service';
import { Productos as ProductoCatalogo } from '../../interfaces/productos';

interface CatalogItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  stock: number;
  type: 'Moto' | 'Repuesto' | 'Accesorio' | 'Producto';
}

interface CatalogProduct {
  _id?: string;
  modelo?: string;
  nombre?: string;
  referencia?: string;
  marca?: string;
  color?: string;
  categoria?: string;
  descripcion?: string;
  imagen?: string;
  precio?: number | string;
  stock?: number | string;
  Foto?: string;
}

interface FavoriteTokenPayload {
  id?: unknown;
  sub?: unknown;
  correo?: unknown;
}

interface CatalogResponse {
  resultado?: unknown;
  mensaje?: unknown;
  datos?: unknown;
  result?: unknown;
  message?: unknown;
  data?: unknown;
}

interface UsuarioActual {
  nombre: string;
  correo: string;
  rol: string;
  apellido?: string;
  Foto?: string;
}

interface PerfilResponse {
  resultado: string;
  mensaje: string;
  datos: UsuarioActual | null;
}

const IMAGEN_BASE_URL = 'http://localhost:8080/imagenes/';
const IMAGEN_PLACEHOLDER = '/img/carrusel/moto1.jpg';

@Component({
  selector: 'app-user-panel',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './user-panel.html',
  styleUrl: './user-panel.css',
})
export class UserPanelComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly carrito = inject(CarritoService);
  private readonly motosService = inject(MotosService);
  private readonly repuestosService = inject(RespuestosService);
  private readonly accesoriosService = inject(AccesoriosService);
  private readonly productosService = inject(ProductosService);

  readonly catalogo = signal<CatalogItem[]>([]);
  readonly cargandoCatalogo = signal(true);
  readonly erroresCatalogo = signal<string[]>([]);
  readonly imagenPlaceholder = IMAGEN_PLACEHOLDER;
  usuarioActual: UsuarioActual | null = null;
  favorites: string[] = [];
  favoritesError = '';
  private favoritesStorageKey = 'jajmotos:favorites';
  private sessionErrorHandled = false;

  get motos(): CatalogItem[] {
    return this.catalogo().filter((item) => item.type === 'Moto');
  }

  get repuestos(): CatalogItem[] {
    return this.catalogo().filter((item) => item.type === 'Repuesto' || item.type === 'Producto');
  }

  get accesorios(): CatalogItem[] {
    return this.catalogo().filter((item) => item.type === 'Accesorio');
  }

  get favoriteItems(): CatalogItem[] {
    return this.catalogo().filter((item) => this.favorites.includes(item.id));
  }

  constructor() {
    this.loadFavorites();
  }

  ngOnInit(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const token = window.localStorage.getItem('token');
    if (!token) {
      console.error('No se pueden cargar los catálogos: no hay token de sesión.');
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    this.http
      .get<PerfilResponse>('http://localhost:8080/usuarios/perfil', { headers })
      .subscribe({
        next: (response) => {
          if (response.resultado === 'bien' && response.datos) {
            this.usuarioActual = response.datos;
          } else {
            console.error('No se pudo obtener el perfil:', response.mensaje);
          }
        },
        error: (error: unknown) => {
          console.error('Error al consultar GET /usuarios/perfil:', error);
          this.handleRequestError(error);
        },
      });

    this.cargarCatalogo();
  }

  cargarCatalogo(): void {
    this.cargandoCatalogo.set(true);
    this.erroresCatalogo.set([]);

    forkJoin({
      motos: this.pedirCatalogo(this.motosService.getAll(), 'Motos', 'Moto'),
      repuestos: this.pedirCatalogo(this.repuestosService.getAll(), 'Repuestos', 'Repuesto'),
      accesorios: this.pedirCatalogo(this.accesoriosService.getAll(), 'Accesorios', 'Accesorio'),
      productos: this.pedirProductos(),
    }).subscribe(({ motos, repuestos, accesorios, productos }) => {
      this.catalogo.set([
        ...(motos ?? []),
        ...(repuestos ?? []),
        ...(accesorios ?? []),
        ...(productos ?? []),
      ]);
      this.cargandoCatalogo.set(false);
    });
  }

  private pedirProductos(): Observable<CatalogItem[] | null> {
    return this.productosService.getAll().pipe(
      map((products) => products.map((product) => this.convertirProducto(product))),
      catchError((error: unknown) => {
        console.error('Error al cargar productos:', error);
        this.erroresCatalogo.update((errores) =>
          errores.includes('Productos') ? errores : [...errores, 'Productos'],
        );
        return of(null);
      }),
    );
  }

  private convertirProducto(product: ProductoCatalogo): CatalogItem {
    return {
      id: product._id ?? `producto-${product.modelo}`,
      name: product.modelo,
      brand: product.color || '',
      price: Number(product.precio),
      stock: 1,
      image: this.construirUrlImagen(product.imagen),
      type: 'Producto',
    };
  }

  private pedirCatalogo(
    request: Observable<unknown>,
    categoria: string,
    type: CatalogItem['type'],
  ): Observable<CatalogItem[] | null> {
    return request.pipe(
      map((response) => this.convertirRespuestaCatalogo(response, type)),
      catchError((error: unknown) => {
        console.error(`Error al cargar ${categoria.toLowerCase()}:`, error);
        this.erroresCatalogo.update((errores) =>
          errores.includes(categoria) ? errores : [...errores, categoria],
        );

        if (
          error instanceof HttpErrorResponse &&
          (error.status === 401 || error.status === 403) &&
          !this.sessionErrorHandled
        ) {
          this.sessionErrorHandled = true;
          this.handleRequestError(error);
        }

        return of(null);
      }),
    );
  }

  private convertirRespuestaCatalogo(
    response: unknown,
    type: CatalogItem['type'],
  ): CatalogItem[] {
    if (typeof response !== 'object' || response === null) {
      throw new Error('La respuesta del catálogo no tiene un formato válido.');
    }

    if (Array.isArray(response)) {
      return response.map((product: CatalogProduct) => this.convertirCatalogItem(product, type));
    }

    const body = response as CatalogResponse;
    const success = body.resultado === 'bien' || body.result === 'fine';
    const products = body.datos ?? body.data;
    if (!success || !Array.isArray(products)) {
      throw new Error('La respuesta del catálogo no contiene productos válidos.');
    }

    return products.map((product: CatalogProduct) => this.convertirCatalogItem(product, type));
  }

  private convertirCatalogItem(
    product: CatalogProduct,
    type: CatalogItem['type'],
  ): CatalogItem {
    const name =
      type === 'Moto'
        ? product.modelo || product.referencia
        : product.nombre || product.referencia || product.modelo;
    const brand = product.marca || '';
    const reference = product.referencia || name || 'producto';
    return {
      id: product._id ?? `${type.toLowerCase()}-${brand}-${reference}`,
      name: name || reference,
      brand,
      price: Number(product.precio ?? 0),
      stock: Number(product.stock ?? 0),
      image: this.construirUrlImagen(product.Foto),
      type,
    };
  }

  private construirUrlImagen(image: string | null | undefined): string {
    const nombreImagen = image?.trim();
    if (!nombreImagen) return this.imagenPlaceholder;
    if (/^(https?:\/\/|\/)/i.test(nombreImagen)) return nombreImagen;
    return `${IMAGEN_BASE_URL}${nombreImagen.replace(/^\/+/, '')}`;
  }

  usarImagenPlaceholder(event: Event): void {
    if (
      event.target instanceof HTMLImageElement &&
      !event.target.src.endsWith(this.imagenPlaceholder)
    ) {
      event.target.src = this.imagenPlaceholder;
    }
  }

  private handleRequestError(error: unknown): void {
    const status = error instanceof HttpErrorResponse ? error.status : 0;

    if (typeof window === 'undefined') {
      return;
    }

    if (status === 401 || status === 403) {
      window.alert('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      window.localStorage.removeItem('token');
      void this.router.navigate(['/login']);
      return;
    }

    window.alert('Error al cargar los datos. Intenta de nuevo más tarde.');
  }

  isFavorite(itemId: string): boolean {
    return this.favorites.includes(itemId);
  }

  guardarEnGaraje(item: CatalogItem): void {
    if (typeof window === 'undefined') return;

    if (!window.localStorage.getItem('token')) {
      window.alert('Inicia sesión para guardar productos en tu garaje y agregarlos al carrito.');
      void this.router.navigate(['/login']);
      return;
    }

    if (!this.isFavorite(item.id)) {
      this.toggleFavorite(item);
      if (!this.isFavorite(item.id)) return;
    }

    this.carrito.sincronizarUsuario();
    this.carrito.agregar({
      id: item.id,
      nombre: item.name,
      descripcion: `${item.type} · ${item.brand}`,
      precio: item.price,
      imagen: item.image,
      categoria: item.type.toLowerCase(),
    });
  }

  toggleFavorite(item: CatalogItem): void {
    const updatedFavorites = this.isFavorite(item.id)
      ? this.favorites.filter((favoriteId) => favoriteId !== item.id)
      : [...this.favorites, item.id];

    if (typeof window === 'undefined') {
      this.favoritesError = 'No se pueden guardar favoritos en este entorno.';
      return;
    }

    try {
      window.localStorage.setItem(
        this.favoritesStorageKey,
        JSON.stringify(updatedFavorites),
      );
      this.favorites = updatedFavorites;
      this.favoritesError = '';
    } catch {
      this.favoritesError = 'No se pudo actualizar tu lista de favoritos.';
    }
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('token');
    }

    void this.router.navigate(['/login']);
  }

  private loadFavorites(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const token = window.localStorage.getItem('token');
    if (token) {
      try {
        const payload = jwtDecode<FavoriteTokenPayload>(token);
        const identity =
          typeof payload.correo === 'string'
            ? payload.correo
            : typeof payload.sub === 'string'
              ? payload.sub
              : typeof payload.id === 'string'
                ? payload.id
                : null;

        if (identity) {
          this.favoritesStorageKey = `jajmotos:favorites:${identity}`;
        }
      } catch {
        this.favoritesError = 'No se pudo leer el token de sesión.';
        return;
      }
    }

    const storedFavorites = window.localStorage.getItem(this.favoritesStorageKey);
    if (!storedFavorites) {
      return;
    }

    try {
      const parsed: unknown = JSON.parse(storedFavorites);
      if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string')) {
        throw new Error('La lista de favoritos tiene un formato no válido.');
      }

      this.favorites = parsed;
    } catch {
      this.favoritesError = 'No se pudo cargar tu lista de favoritos guardada.';
    }
  }
}
