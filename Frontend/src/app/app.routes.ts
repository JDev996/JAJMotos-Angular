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
  { path: 'home',           title: 'Inicio',         component: Home,           data: { animation: 'Home' } },
  { path: 'productos',      title: 'Productos',      component: Productos,      data: { animation: 'Productos' } },
  { path: 'distribuidores', title: 'Distribuidores', component: Distribuidores, data: { animation: 'Distribuidores' } },
  { path: 'nosotros',       title: 'Nosotros',       component: Nosotros,       data: { animation: 'Nosotros' } },
  { path: 'contacto',       title: 'Contacto',       component: Contacto,       data: { animation: 'Contacto' } },
  { path: 'asesor',         title: 'Asesor',         component: Asesor,         data: { animation: 'Asesor' } },
  { path: 'login',          title: 'Login',          component: Login,          data: { animation: 'Login' } },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**',             title: 'No encontrado',  component: NotFound,       data: { animation: 'NotFound' } },
];