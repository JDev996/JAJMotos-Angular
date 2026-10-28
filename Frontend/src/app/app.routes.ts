import { Routes } from '@angular/router';
import { Home } from './componentes/home/home';
import { Productos } from './componentes/productos/productos';
import { Distribuidores } from './componentes/distribuidores/distribuidores';
import { Nosotros } from './componentes/nosotros/nosotros';
import { Contacto } from './componentes/contacto/contacto';
import { Asesor } from './componentes/asesor/asesor';
import { Login } from './componentes/login/login';
import { Recover } from './componentes/recover/recover';
import { Registro } from './componentes/Registro/registro';
import { NotFound } from './componentes/not-found/not-found';
import { AdminPanelComponent } from './componentes/admin-panel/admin-panel';
import { UserPanelComponent } from './componentes/user-panel/user-panel';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'home',           title: 'Inicio',         component: Home,           data: { animation: 'Home' } },
  { path: 'productos',      title: 'Productos',      component: Productos,      canActivate: [authGuard], data: { animation: 'Productos' } },
  { path: 'admin',          title: 'Administración', component: AdminPanelComponent, canActivate: [authGuard], data: { animation: 'Admin', role: 'admin' } },
  { path: 'user-panel',     title: 'Mi garaje',      component: UserPanelComponent, canActivate: [authGuard], data: { animation: 'UserPanel', role: 'user' } },
  { path: 'distribuidores', title: 'Distribuidores', component: Distribuidores, data: { animation: 'Distribuidores' } },
  { path: 'nosotros',       title: 'Nosotros',       component: Nosotros,       data: { animation: 'Nosotros' } },
  { path: 'contacto',       title: 'Contacto',       component: Contacto,       data: { animation: 'Contacto' } },
  { path: 'asesor',         title: 'Asesor',         component: Asesor,         data: { animation: 'Asesor' } },
  { path: 'login',          title: 'Login',          component: Login,          data: { animation: 'Login' } },
  { path: 'recover',        title: 'Recuperar contraseña', component: Recover, data: { animation: 'Recover' } },
  { path: 'registro',       title: 'Crear cuenta',   component: Registro,       data: { animation: 'Registro' } },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**',             title: 'No encontrado',  component: NotFound,       data: { animation: 'NotFound' } },
];