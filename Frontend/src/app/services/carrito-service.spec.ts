import { TestBed } from '@angular/core/testing';
import { CarritoService } from './carrito-service';

describe('CarritoService', () => {
  let carrito: CarritoService;
  const casco = { id: 'a1', nombre: 'Casco', precio: 300_000, imagen: 'casco.jpg' };
  const llanta = { id: 'r1', nombre: 'Llanta', precio: 150_000, imagen: 'llanta.jpg' };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    carrito = TestBed.inject(CarritoService);
  });

  it('agrega productos y suma el total', () => {
    carrito.agregar(casco);
    carrito.agregar(llanta);
    carrito.agregar(llanta);
    expect(carrito.cantidadTotal()).toBe(3);
    expect(carrito.total()).toBe(600_000);
    expect(carrito.items().length).toBe(2);
  });

  it('incrementa, decrementa y elimina al llegar a cero', () => {
    carrito.agregar(casco);
    carrito.incrementar('a1');
    expect(carrito.items()[0].cantidad).toBe(2);
    carrito.decrementar('a1');
    carrito.decrementar('a1');
    expect(carrito.items().length).toBe(0);
  });

  it('no pasa de la cantidad máxima', () => {
    carrito.agregar(casco);
    carrito.cambiarCantidad('a1', 50);
    expect(carrito.items()[0].cantidad).toBe(carrito.cantidadMaxima);
  });

  it('guarda el carrito en localStorage', () => {
    carrito.agregar(casco);
    const guardado = JSON.parse(localStorage.getItem('jajmotos:carrito') ?? '[]');
    expect(guardado[0].id).toBe('a1');
  });
});
