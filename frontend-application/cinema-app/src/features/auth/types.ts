// Tokens are delivered as httpOnly cookies, never in the response body, so login
// and register responses only carry the user object.

export interface UserDto {
    id: string;
    email: string;
    createdAt: string; // ISO 8601
}

export interface LoginResponse {
    user: UserDto;
}

export interface RegisterResponse {
    user: UserDto;
}

export interface RefreshResponse {
    user: UserDto;
}

export interface LoginDto {
    email: string;
    password: string;
}

export interface RegisterDto {
    email: string;
    password: string;
}
