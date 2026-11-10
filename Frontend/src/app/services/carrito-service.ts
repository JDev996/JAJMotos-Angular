import { Injectable, computed, signal } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

/** Un producto dentro del carrito, con la cantidad elegida. */
export interface ItemCarrito {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagen: string;
  categoria?: string;
  cantidad: number;
}

/** Lo mínimo que necesita el carrito para agregar un producto. */
export type ProductoParaCarrito = Omit<ItemCarrito, 'cantidad'>;

interface TokenCarrito {
  correo?: unknown;
  sub?: unknown;
  id?: unknown;
}

const CANTIDAD_MAXIMA = 10;
const CLAVE_BASE = 'jajmotos:carrito';

@Injectable({ providedIn: 'root' })
export class CarritoService {
  /** Productos del carrito. Es una signal para que el navbar y la página se actualicen solos. */
  readonly items = signal<ItemCarrito[]>([]);

  /** Contador del ícono del navbar: suma de todas las cantidades. */
  readonly cantidadTotal = computed(() =>
    this.items().reduce((acc, item) => acc + item.cantidad, 0),
  );

  /** Suma de precio × cantidad de todos los productos. */
  readonly total = computed(() =>
    this.items().reduce((acc, item) => acc + item.precio * item.cantidad, 0),
  );

  readonly cantidadMaxima = CANTIDAD_MAXIMA;

  private claveActual: string | null = null;

  constructor() {
    this.cargar();
  }

  /**
   * Vuelve a leer el carrito si cambió el usuario (login / logout).
   * Cada usuario tiene su propio carrito en localStorage.
   */
  sincronizarUsuario(): void {
    if (this.claveStorage() !== this.claveActual) {
      this.cargar();
    }
  }

  agregar(producto: ProductoParaCarrito, cantidad = 1): void {
    const existente = this.items().find(i => i.id === producto.id);
    if (existente) {
      this.cambiarCantidad(producto.id, existente.cantidad + cantidad);
      return;
    }
    this.guardar([
      ...this.items(),
      { ...producto, cantidad: Math.min(Math.max(cantidad, 1), CANTIDAD_MAXIMA) },
    ]);
  }

  incrementar(id: string): void {
    const item = this.items().find(i => i.id === id);
    if (item) this.cambiarCantidad(id, item.cantidad + 1);
  }

  /** Resta uno. Si llega a cero, el producto sale del carrito. */
  decrementar(id: string): void {
    const item = this.items().find(i => i.id === id);
    if (item) this.cambiarCantidad(id, item.cantidad - 1);
  }

  cambiarCantidad(id: string, cantidad: number): void {
    if (!Number.isFinite(cantidad)) return;
    const nueva = Math.min(Math.floor(cantidad), CANTIDAD_MAXIMA);
    if (nueva <= 0) {
      this.eliminar(id);
      return;
    }
    this.guardar(this.items().map(i => (i.id === id ? { ...i, cantidad: nueva } : i)));
  }

  eliminar(id: string): void {
    this.guardar(this.items().filter(i => i.id !== id));
  }

  vaciar(): void {
    this.guardar([]);
  }

  estaEnCarrito(id: string): boolean {
    return this.items().some(i => i.id === id);
  }

  // ---------- persistencia ----------

  private claveStorage(): string {
    if (typeof window === 'undefined') return CLAVE_BASE;
    const token = window.localStorage.getItem('token');
    if (!token) return CLAVE_BASE;
    try {
      const payload = jwtDecode<TokenCarrito>(token);
      const identidad = [payload.correo, payload.sub, payload.id].find(
        (v): v is string => typeof v === 'string' && v.length > 0,
      );
      return identidad ? `${CLAVE_BASE}:${identidad}` : CLAVE_BASE;
    } catch {
      return CLAVE_BASE;
    }
  }

  private cargar(): void {
    this.claveActual = this.claveStorage();
    if (typeof window === 'undefined') return;
    try {
      const guardado = window.localStorage.getItem(this.claveActual);
      const lista: unknown = guardado ? JSON.parse(guardado) : [];
      this.items.set(Array.isArray(lista) ? lista.filter(esItemValido) : []);
    } catch {
      this.items.set([]);
    }
  }

  private guardar(items: ItemCarrito[]): void {
    this.items.set(items);
    if (typeof window === 'undefined' || !this.claveActual) return;
    try {
      window.localStorage.setItem(this.claveActual, JSON.stringify(items));
    } catch {
      // Si el navegador bloquea localStorage, el carrito sigue funcionando en memoria.
    }
  }
}

function esItemValido(valor: unknown): valor is ItemCarrito {
  if (typeof valor !== 'object' || valor === null) return false;
  const v = valor as Record<string, unknown>;
  return (
    typeof v['id'] === 'string' &&
    typeof v['nombre'] === 'string' &&
    typeof v['precio'] === 'number' &&
    typeof v['imagen'] === 'string' &&
    typeof v['cantidad'] === 'number' &&
    v['cantidad'] > 0
  );
}
