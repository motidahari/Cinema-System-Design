import { BaseHttpService } from '@/core/services/BaseHttpService';
import { appConfig } from '@/core/config/app.config';
import type { LoginDto, LoginResponse, RegisterDto, RegisterResponse, UserDto } from '../types';

export class AuthService extends BaseHttpService {
    constructor() {
        super(appConfig.identityApiUrl);
    }

    // login/register set httpOnly cookies server-side; only the user is returned.
    async login(dto: LoginDto): Promise<LoginResponse> {
        const res = await this.http.post<LoginResponse>('/auth/login', dto);
        return res.data;
    }

    async register(dto: RegisterDto): Promise<RegisterResponse> {
        const res = await this.http.post<RegisterResponse>('/auth/register', dto);
        return res.data;
    }

    async logout(): Promise<void> {
        await this.http.post('/auth/logout'); // revokes refresh family + clears cookies
    }

    async getCurrentUser(): Promise<{ user: UserDto }> {
        const res = await this.http.get<{ user: UserDto }>('/auth/me');
        return res.data;
    }
}

export const authService = new AuthService();
