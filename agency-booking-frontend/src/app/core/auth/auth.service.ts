import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from '../services/storage.service';
import {
  LoginRequest, RegisterRequest, JwtAuthResponse,
  VerifyCodeRequest, PasswordResetRequest, NewPasswordRequest,
  RefreshTokenRequest, ApiResponse, UserRole
} from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private storage = inject(StorageService);
  private apiUrl = environment.apiUrl;

  private currentUserSubject = new BehaviorSubject<{ email: string; username: string; role: string } | null>(
    this.storage.getUserData()
  );
  currentUser$ = this.currentUserSubject.asObservable();

  get isLoggedIn(): boolean {
    return this.storage.isLoggedIn();
  }

  get currentUser() {
    return this.currentUserSubject.value;
  }

  get userRole(): UserRole | null {
    return this.currentUser?.role as UserRole | null;
  }

  login(request: LoginRequest): Observable<JwtAuthResponse> {
    return this.http.post<JwtAuthResponse>(`${this.apiUrl}/auth/login`, request).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  register(request: RegisterRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/register`, request);
  }

  verifyEmail(request: VerifyCodeRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/verify-email`, request);
  }

  requestPasswordReset(request: PasswordResetRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/password-reset/request`, request);
  }

  verifyResetCode(request: VerifyCodeRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/password-reset/verify-code`, request);
  }

  resetPassword(request: NewPasswordRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/password-reset/new-password`, request);
  }

  refreshToken(): Observable<JwtAuthResponse> {
    const refreshToken = this.storage.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }
    const request: RefreshTokenRequest = { refreshToken };
    return this.http.post<JwtAuthResponse>(`${this.apiUrl}/auth/refresh`, request).pipe(
      tap(response => this.handleAuthResponse(response)),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  checkAuth(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/auth/check-auth`);
  }

  logout(): void {
    const token = this.storage.getAccessToken();
    if (token) {
      this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe({ error: () => {} });
    }
    this.storage.clear();
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  private handleAuthResponse(response: JwtAuthResponse): void {
    this.storage.setAccessToken(response.accessToken);
    this.storage.setRefreshToken(response.refreshToken);
    const userData = {
      email: response.email,
      username: response.username,
      role: response.role
    };
    this.storage.setUserData(userData);
    this.currentUserSubject.next(userData);
  }

  updateUsername(newUsername: string): void {
    const userData = this.storage.getUserData();
    if (userData) {
      userData.username = newUsername;
      this.storage.setUserData(userData);
      this.currentUserSubject.next(userData);
    }
  }
}
