import { Component, inject, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

interface CatalogItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  type: 'Moto' | 'Repuesto';
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
}

interface UsuarioActual {
  nombre: string;
  correo: string;
  rol: string;
  apellido?: string;
}

interface PerfilResponse {
  resultado: string;
  mensaje: string;
  datos: UsuarioActual | null;
}

const motos: CatalogItem[] = [
  {
    id: 'moto-suzuki-gsxr-1000r',
    name: 'GSXR 1000R',
    brand: 'SUZUKI',
    price: 85_000_000,
    image: 'img/productos/MOTOS/Suzuki1.png',
    type: 'Moto',
  },
  {
    id: 'moto-ducati-streetfighter-v4s',
    name: 'STREETFIGHTER V4S',
    brand: 'DUCATI',
    price: 125_000_000,
    image: 'img/productos/MOTOS/Ducati1.png',
    type: 'Moto',
  },
  {
    id: 'moto-yamaha-mt09-sp',
    name: 'MT09 SP',
    brand: 'YAMAHA',
    price: 75_000_000,
    image: 'img/productos/MOTOS/yamaha1.png',
    type: 'Moto',
  },
];

const repuestos: CatalogItem[] = [
  {
    id: 'repuesto-honda-farola-cbr',
    name: 'FAROLA CBR',
    brand: 'HONDA',
    price: 2_300_000,
    image: 'img/productos/REPUESTOS/CBR33.jpg',
    type: 'Repuesto',
  },
  {
    id: 'repuesto-yamaha-carenaje-r6',
    name: 'CARENAJE R6',
    brand: 'YAMAHA',
    price: 1_700_000,
    image: 'img/productos/REPUESTOS/R633.png',
    type: 'Repuesto',
  },
  {
    id: 'repuesto-kawasaki-farola-z900',
    name: 'FAROLA Z900',
    brand: 'KAWASAKI',
    price: 2_900_000,
    image: 'img/productos/REPUESTOS/Z90022.png',
    type: 'Repuesto',
  },
];

const catalog = [...motos, ...repuestos];

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

  readonly motos = motos;
  readonly repuestos = repuestos;
  usuarioActual: UsuarioActual | null = null;
  favorites: string[] = [];
  favoritesError = '';
  private favoritesStorageKey = 'jajmotos:favorites';

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
          console.log('Respuesta de GET /usuarios/perfil:', response);
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

    this.http
      .get<CatalogResponse>('http://localhost:8080/motos', { headers })
      .subscribe({
        next: (response) => {
          console.log('Respuesta de GET /motos:', response);
          console.log('Motos - resultado:', response.resultado);
          console.log('Motos - mensaje:', response.mensaje);
          console.log('Motos - datos:', response.datos);
        },
        error: (error: unknown) => {
          console.error('Error al consultar GET /motos:', error);
          this.handleRequestError(error);
        },
      });

    this.http
      .get<CatalogResponse>('http://localhost:8080/repuestos', { headers })
      .subscribe({
        next: (response) => {
          console.log('Respuesta de GET /repuestos:', response);
          console.log('Repuestos - resultado:', response.resultado);
          console.log('Repuestos - mensaje:', response.mensaje);
          console.log('Repuestos - datos:', response.datos);
        },
        error: (error: unknown) => {
          console.error('Error al consultar GET /repuestos:', error);
          this.handleRequestError(error);
        },
      });
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

  get favoriteItems(): CatalogItem[] {
    return catalog.filter((item) => this.favorites.includes(item.id));
  }

  isFavorite(itemId: string): boolean {
    return this.favorites.includes(itemId);
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

      this.favorites = parsed.filter((id) =>
        catalog.some((item) => item.id === id),
      );
    } catch {
      this.favoritesError = 'No se pudo cargar tu lista de favoritos guardada.';
    }
  }
}
