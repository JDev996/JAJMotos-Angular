import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

interface Marca {
  id: string;        
  nombre: string;
  clase: string;     
  descripcion: string;
  etiquetas: string;
}

@Component({
  imports: [],
  selector: 'app-distribuidores',
  styleUrl: './distribuidores.css',
  templateUrl: './distribuidores.html',
})
export class Distribuidores {
  private router = inject(Router);

  marcas: Marca[] = [
    { id: 'YAMAHA', nombre: 'Yamaha', clase: 'brand-yamaha',
      descripcion: 'Líder global en motos deportivas, scooters y tecnología de vanguardia con un excelente rendimiento.',
      etiquetas: 'RACING • CITY • TOURING' },
    { id: 'ROYAL ENFIELD', nombre: 'Royal Enfield', clase: 'brand-royal',
      descripcion: 'Estilo clásico, potencia y resistencia para quienes buscan una experiencia de conducción auténtica.',
      etiquetas: 'RETRO • PERFORMANCE • TOURING' },
    { id: 'TVS', nombre: 'TVS', clase: 'brand-tvs',
      descripcion: 'Innovación india con motos urbanas, deportivas y confiables para el día a día en la ciudad.',
      etiquetas: 'URBANA • DEPORTIVA • EFICIENTE' },
    { id: 'SUZUKI', nombre: 'Suzuki', clase: 'brand-suzuki',
      descripcion: 'Ingeniería japonesa con tecnología, economía y confianza para todo tipo de rider.',
      etiquetas: 'URBANA • ALTA TECNOLOGÍA' },
    { id: 'AKT', nombre: 'AKT', clase: 'brand-akt',
      descripcion: 'Marca colombiana con tradición y servicio, pensada para movilidad práctica y accesible.',
      etiquetas: 'ECONÓMICA • DURABLE • FIABLE' },
    { id: 'BAJAJ', nombre: 'Bajaj', clase: 'brand-bajaj',
      descripcion: 'Líder del segmento económico en Colombia con bajo costo de mantenimiento y gran valor.',
      etiquetas: 'ECONÓMICA • ROBUSTA • VERSÁTIL' },
    { id: 'HONDA', nombre: 'Honda', clase: 'brand-honda',
      descripcion: 'La marca más reconocida por su durabilidad, servicio técnico y confort en cada recorrido.',
      etiquetas: 'CONFORT • CONFIANZA • CLASE' },
    { id: 'HERO', nombre: 'Hero', clase: 'brand-hero',
      descripcion: 'Fabricante global con motos eficientes para uso urbano, familiar y de alta demanda.',
      etiquetas: 'URBANA • EFICIENTE • ACCESIBLE' },
  ];

 
  modalAbierto = false;
  marcaSeleccionada = 'YAMAHA';

  abrirModal(marcaId: string) {
    this.marcaSeleccionada = marcaId;
    this.modalAbierto = true;
  }

  cerrarModal() {
    this.modalAbierto = false;
  }

  aplicarFiltro(marca: string, categoria: string) {
    this.modalAbierto = false;
    this.router.navigate(['/productos'], { queryParams: { marca, categoria } });
  }
}