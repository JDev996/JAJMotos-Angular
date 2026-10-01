import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-navegador',
  styleUrl: './navegador.css',
  templateUrl: './navegador.html',
})
export class Navegador {}