import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Credential } from '../interfaces/credential';

export type LoginResponse =
  | { resultado: 'bien'; datos: string }
  | { resultado: 'mal'; mensaje: string };

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private readonly http = inject(HttpClient);
  private readonly loginUrl = 'http://localhost:8080/login';

  login(credential: Credential): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.loginUrl, credential);
  }
}
