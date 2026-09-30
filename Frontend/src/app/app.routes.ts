import { Routes } from '@angular/router';
import { Home } from './componentes/home/home';
import { Productos } from './componentes/productos/productos';
import { Distribuidores } from './componentes/distribuidores/distribuidores';
import { Nosotros } from './componentes/nosotros/nosotros';
import { Contacto } from './componentes/contacto/contacto';
import { Asesor } from './componentes/asesor/asesor';
import { Login } from './componentes/login/login';
import { NotFound } from './componentes/not-found/not-found';

export const routes: Routes = [
  { path: 'home', title: 'Inicio', component: Home },
  { path: 'productos', title: 'Productos', component: Productos },
  { path: 'distribuidores', title: 'Distribuidores', component: Distribuidores },
  { path: 'nosotros', title: 'Nosotros', component: Nosotros },
  { path: 'contacto', title: 'Contacto', component: Contacto },
  { path: 'asesor', title: 'Asesor', component: Asesor },
  { path: 'login', title: 'Login', component: Login },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', title: 'No encontrado', component: NotFound },
];