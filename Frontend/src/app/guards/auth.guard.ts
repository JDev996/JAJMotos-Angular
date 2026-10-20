import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

interface LoginTokenPayload {
  role?: unknown;
  rol?: unknown;
  exp?: unknown;
}

export const authGuard: CanActivateFn = (route) => {
  if (typeof window === 'undefined') {
    return true;
  }

  const router = inject(Router);
  const token = window.localStorage.getItem('token');

  if (!token) {
    return router.createUrlTree(['/login']);
  }

  try {
    const payload = jwtDecode<LoginTokenPayload>(token);
    const role = payload.role ?? payload.rol;

    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
      window.localStorage.removeItem('token');
      return router.createUrlTree(['/login']);
    }

    if (route.data['role'] === 'admin' && role !== 'admin') {
      return router.createUrlTree(['/user-panel']);
    }

    if (
      route.data['role'] === 'user' &&
      role !== 'user' &&
      role !== 'usuario'
    ) {
      return role === 'admin'
        ? router.createUrlTree(['/admin'])
        : router.createUrlTree(['/login']);
    }

    return true;
  } catch {
    window.localStorage.removeItem('token');
    return router.createUrlTree(['/login']);
  }
};
