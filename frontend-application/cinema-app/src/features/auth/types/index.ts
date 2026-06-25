// Auth domain types — mirror the identity-service contract (API-CONTRACT.md §5).
// Tokens are delivered as httpOnly cookies, never in the body, so responses only
// carry the user.

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
