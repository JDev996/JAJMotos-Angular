import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

const adminSections = ['Usuarios', 'Productos', 'Motos', 'Repuestos'] as const;

type AdminSection = (typeof adminSections)[number];

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.css',
})
export class AdminPanelComponent {
  private readonly router = inject(Router);

  readonly sections = adminSections;
  activeSection: AdminSection = 'Usuarios';

  selectSection(section: AdminSection): void {
    this.activeSection = section;
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('token');
    }

    void this.router.navigate(['/login']);
  }
}
