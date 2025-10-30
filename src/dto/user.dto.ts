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
  password: string;
  firstName: string;
  lastName: string;
  emailVerified?: boolean;
  role?: string;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  role?: string;
}

export interface UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponseDto {
  user: UserResponseDto;
  token: string;
}

