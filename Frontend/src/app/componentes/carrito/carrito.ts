import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CarritoService, ItemCarrito } from '../../services/carrito-service';

type Paso = 'carrito' | 'pago' | 'procesando' | 'aprobado' | 'rechazado';
type Franquicia = 'Visa' | 'Mastercard' | 'American Express' | null;

/** Tarjeta de prueba que la pasarela simulada siempre rechaza. */
const TARJETA_RECHAZADA = '4000000000000002';

/** Resumen que se muestra después de pagar (el carrito ya quedó vacío). */
interface Recibo {
  referencia: string;
  fecha: Date;
  items: ItemCarrito[];
  total: number;
  franquicia: Franquicia;
  ultimos4: string;
  cuotas: number;
}

@Component({
  selector: 'app-carrito',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './carrito.html',
  styleUrl: './carrito.css',
})
export class Carrito {
  readonly carrito = inject(CarritoService);
  private readonly fb = inject(FormBuilder);

  readonly paso = signal<Paso>('carrito');
  readonly recibo = signal<Recibo | null>(null);
  readonly cuotasDisponibles = [1, 3, 6, 12, 24, 36];

  readonly formPago = this.fb.nonNullable.group({
    titular: ['', [Validators.required, Validators.minLength(5), Validators.pattern(/^[A-Za-zÁÉÍÓÚÑáéíóúñ ]+$/)]],
    numero: ['', [Validators.required, validarNumeroTarjeta]],
    vencimiento: ['', [Validators.required, validarVencimiento]],
    cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
    documento: ['', [Validators.required, Validators.pattern(/^\d{6,10}$/)]],
    cuotas: [1, Validators.required],
  });

  private readonly numeroTarjeta = signal('');
  readonly franquicia = computed(() => detectarFranquicia(this.numeroTarjeta()));

  constructor() {
    this.carrito.sincronizarUsuario();
  }

  // ---------- acciones del carrito ----------

  subtotalItem(item: ItemCarrito): number {
    return item.precio * item.cantidad;
  }

  escribirCantidad(item: ItemCarrito, valor: string): void {
    const cantidad = Number(valor);
    if (valor !== '' && Number.isFinite(cantidad)) {
      this.carrito.cambiarCantidad(item.id, cantidad);
    }
  }

  vaciar(): void {
    if (typeof window !== 'undefined' && !window.confirm('¿Seguro que quieres vaciar el carrito?')) return;
    this.carrito.vaciar();
  }

  irAPagar(): void {
    if (this.carrito.cantidadTotal() > 0) this.paso.set('pago');
  }

  volverAlCarrito(): void {
    this.paso.set('carrito');
  }

  // ---------- formulario de pago ----------

  /** Agrupa el número en bloques de 4 mientras el usuario escribe. */
  formatearNumero(input: HTMLInputElement): void {
    const digitos = input.value.replace(/\D/g, '').slice(0, 16);
    const formateado = digitos.replace(/(\d{4})(?=\d)/g, '$1 ');
    input.value = formateado;
    this.formPago.controls.numero.setValue(formateado);
    this.numeroTarjeta.set(digitos);
  }

  /** Inserta la barra de MM/AA automáticamente. */
  formatearVencimiento(input: HTMLInputElement): void {
    const digitos = input.value.replace(/\D/g, '').slice(0, 4);
    const formateado = digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos;
    input.value = formateado;
    this.formPago.controls.vencimiento.setValue(formateado);
  }

  soloDigitos(input: HTMLInputElement, maximo: number, control: 'cvv' | 'documento'): void {
    const digitos = input.value.replace(/\D/g, '').slice(0, maximo);
    input.value = digitos;
    this.formPago.controls[control].setValue(digitos);
  }

  invalido(campo: keyof typeof this.formPago.controls): boolean {
    const c = this.formPago.controls[campo];
    return c.invalid && (c.touched || c.dirty);
  }

  /**
   * Pasarela de pagos SIMULADA (modo prueba): no se cobra nada real.
   * Espera unos segundos como si consultara al banco y aprueba o rechaza
   * según la tarjeta de prueba usada.
   */
  pagar(): void {
    if (this.formPago.invalid) {
      this.formPago.markAllAsTouched();
      return;
    }

    const { numero, cuotas } = this.formPago.getRawValue();
    const digitos = numero.replace(/\D/g, '');
    this.paso.set('procesando');

    setTimeout(() => {
      if (digitos === TARJETA_RECHAZADA) {
        this.paso.set('rechazado');
        return;
      }

      this.recibo.set({
        referencia: 'JAJ-' + Date.now().toString(36).toUpperCase(),
        fecha: new Date(),
        items: this.carrito.items(),
        total: this.carrito.total(),
        franquicia: detectarFranquicia(digitos),
        ultimos4: digitos.slice(-4),
        cuotas: Number(cuotas),
      });
      this.carrito.vaciar();
      this.formPago.reset();
      this.numeroTarjeta.set('');
      this.paso.set('aprobado');
    }, 2000);
  }

  reintentar(): void {
    this.paso.set('pago');
  }
}

// ---------- validaciones de tarjeta ----------

function detectarFranquicia(digitos: string): Franquicia {
  if (/^4/.test(digitos)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digitos)) return 'Mastercard';
  if (/^3[47]/.test(digitos)) return 'American Express';
  return null;
}

/** Algoritmo de Luhn: el mismo chequeo que usan las pasarelas reales para detectar números mal digitados. */
function pasaLuhn(digitos: string): boolean {
  let suma = 0;
  let doblar = false;
  for (let i = digitos.length - 1; i >= 0; i--) {
    let d = Number(digitos[i]);
    if (doblar) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    suma += d;
    doblar = !doblar;
  }
  return suma % 10 === 0;
}

function validarNumeroTarjeta(control: AbstractControl): ValidationErrors | null {
  const digitos = String(control.value ?? '').replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.length < 15 || digitos.length > 16) return { longitud: true };
  if (!detectarFranquicia(digitos)) return { franquicia: true };
  return pasaLuhn(digitos) ? null : { luhn: true };
}

function validarVencimiento(control: AbstractControl): ValidationErrors | null {
  const valor = String(control.value ?? '');
  if (!valor) return null;
  const match = /^(\d{2})\/(\d{2})$/.exec(valor);
  if (!match) return { formato: true };
  const mes = Number(match[1]);
  const anio = 2000 + Number(match[2]);
  if (mes < 1 || mes > 12) return { formato: true };
  // La tarjeta vence al final del mes indicado
  const finDeMes = new Date(anio, mes, 0, 23, 59, 59);
  return finDeMes < new Date() ? { vencida: true } : null;
}
