import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProfileState } from '../../services/profile-state';
import { ProfileEditor } from '../profile-editor/profile-editor';
import { CarritoService } from '../../services/carrito-service';

@Component({
  imports: [RouterLink, RouterLinkActive, ProfileEditor],
  selector: 'app-navegador',
  styleUrl: './navegador.css',
  templateUrl: './navegador.html',
})
export class Navegador implements OnInit {
  private readonly profileState = inject(ProfileState);
  private readonly destroyRef = inject(DestroyRef);
  readonly perfil = this.profileState.profile;
  readonly carrito = inject(CarritoService);
  editandoPerfil = false;

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
}