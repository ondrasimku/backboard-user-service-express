export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateUserDto {
  email: string;
  password: string | null;
  firstName: string;
  lastName: string;
  emailVerified?: boolean;
  emailVerificationToken?: string | null;
  googleId?: string | null;
  authProvider?: 'local' | 'google';
}

export interface UpdateUserDto {
  email?: string;
  password?: string | null;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  emailVerificationToken?: string | null;
  passwordResetToken?: string | null;
  passwordResetTokenExpiresAt?: Date | null;
  avatarUrl?: string | null;
  avatarFileId?: string | null;
  googleId?: string | null;
  authProvider?: 'local' | 'google';
}

import { RoleResponseDto } from './role.dto';

export interface UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  roles: RoleResponseDto[];
  avatarUrl?: string | null;
  avatarFileId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponseDto {
  user: UserResponseDto;
  token: string;
}

export interface RequestPasswordResetDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface UpdateUserProfileDto {
  firstName?: string;
  lastName?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface SetAvatarDto {
  fileId: string;
  avatarUrl: string;
}

export interface GoogleOAuthDto {
  idToken: string;
}

export interface GoogleOAuthResponseDto extends AuthResponseDto {
  isNewUser: boolean;
  accountLinked: boolean;
}

