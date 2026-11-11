import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProfileState } from '../../services/profile-state';
import { ProfileEditor } from '../profile-editor/profile-editor';
import { CarritoService } from '../../services/carrito-service';

@Component({
  imports: [RouterLink, RouterLinkActive, ProfileEditor, CurrencyPipe],
  selector: 'app-navegador',
  styleUrl: './navegador.css',
  templateUrl: './navegador.html',
})
export class Navegador implements OnInit {
  private readonly profileState = inject(ProfileState);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  readonly perfil = this.profileState.profile;
  readonly carrito = inject(CarritoService);
  @ViewChild('carritoTrigger') private carritoTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('carritoPanel') private carritoPanel?: ElementRef<HTMLElement>;
  editandoPerfil = false;
  carritoAbierto = false;

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    this.profileState.loadForCurrentToken();
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.profileState.loadForCurrentToken();
        // Si cambió la sesión (login/logout), carga el carrito del usuario correcto
        this.carrito.sincronizarUsuario();
      });
  }

  alternarCarrito(): void {
    this.carritoAbierto = !this.carritoAbierto;
    if (this.carritoAbierto) {
      afterNextRender(() => this.carritoPanel?.nativeElement.focus(), {
        injector: this.injector,
      });
    } else {
      this.carritoTrigger?.nativeElement.focus();
    }
  }

  cerrarCarrito(): void {
    if (!this.carritoAbierto) return;
    this.carritoAbierto = false;
    this.carritoTrigger?.nativeElement.focus();
  }

  manejarTecladoCarrito(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;

    const panel = this.carritoPanel?.nativeElement;
    if (!panel) return;
    const elementos = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const primero = elementos.item(0);
    const ultimo = elementos.item(elementos.length - 1);
    if (!primero || !ultimo) return;

    if (event.shiftKey && document.activeElement === primero) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault();
      primero.focus();
    }
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('token');
    }

    this.profileState.loadForCurrentToken();
    this.carrito.sincronizarUsuario();
    this.cerrarCarrito();
    void this.router.navigate(['/login']);
  }
}