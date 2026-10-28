export interface LoginRequestDto {
  username: string;
  password: string;
}

export interface LoginResponseDto {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
}

export interface UserDto {
  sub: string;
  username: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  department?: string;
  employee_id?: string;
  email?: string;
  source: string;
  is_active: boolean;
  synced_at: string;
  roles?: string[];
}

export interface CreateUserRequestDto {
  username: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  department?: string;
  position?: string;
  email?: string;
}

export interface UpdateUserRoleRequestDto {
  role: string;
}
