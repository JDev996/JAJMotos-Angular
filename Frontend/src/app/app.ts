import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navegador } from './componentes/navegador/navegador';
import { Footer } from './componentes/footer/footer';

@Component({
  imports: [RouterOutlet, Navegador, Footer],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('Frontend');
}
