export type UserRole = 'USER' | 'AGENT' | 'ADMIN';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

export interface JwtAuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
  email: string;
  username: string;
  role: string;
}

export interface VerifyCodeRequest {
  email: string;
  code: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface NewPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UsernameUpdateRequest {
  username: string;
}

export interface DeleteAccountRequest {
  password: string;
}

export interface ChangeRoleRequest {
  newRole: string;
}
