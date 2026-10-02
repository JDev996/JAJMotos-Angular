import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navegador } from './componentes/navegador/navegador';
import { Footer } from './componentes/footer/footer';
import {
  trigger, transition, style, animate, query, group
} from '@angular/animations';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navegador, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css',
  animations: [
    trigger('routeAnimations', [
      transition('* <=> *', [
        query(':enter, :leave', [
          style({
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%'
          })
        ], { optional: true }),

        query(':enter', [
          style({ transform: 'translateX(100%)' })
        ], { optional: true }),

        group([
          query(':leave', [
            animate('500ms cubic-bezier(0.4, 0, 1, 1)',
              style({ transform: 'translateX(-100%)' }))
          ], { optional: true }),

          query(':enter', [
            animate('700ms 100ms cubic-bezier(0, 0, 0.2, 1)',
              style({ transform: 'translateX(0)' }))
          ], { optional: true })
        ])
      ])
    ])
  ]
})
export class App {
  prepareRoute(outlet: RouterOutlet) {
    return outlet?.activatedRouteData?.['animation'];
  }
}