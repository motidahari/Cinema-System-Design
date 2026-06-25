import {
    Controller,
    Post,
    Get,
    Body,
    Req,
    Res,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './service/auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { UserModel } from './domain-model/user';
import { JwtAuthGuard } from '../infrastructure/guards/jwt-auth.guard';
import { CookieService } from '../infrastructure/cookies/cookie.service';
import { JwtPayload } from '../infrastructure/guards/jwt.strategy';

type AuthenticatedRequest = Request & { user: JwtPayload };

function toProfileDto(user: UserModel): UserProfileDto {
    return { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() };
}

@Controller('api/v1/auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly cookieService: CookieService
    ) {}

    @Get('csrf')
    csrf(@Res({ passthrough: true }) res: Response) {
        this.cookieService.setCsrfCookie(res);
        return { ok: true };
    }

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const { user, accessToken, refreshToken } = await this.authService.register(dto, req);
        this.cookieService.setAuthCookies(res, accessToken, refreshToken);
        return { user: toProfileDto(user) };
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const { user, accessToken, refreshToken } = await this.authService.login(dto, req);
        this.cookieService.setAuthCookies(res, accessToken, refreshToken);
        return { user: toProfileDto(user) };
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const rawToken: string | undefined = req.cookies?.['refresh_token'];
        if (!rawToken) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
        const { user, accessToken, refreshToken } = await this.authService.refresh(rawToken, req);
        this.cookieService.setAuthCookies(res, accessToken, refreshToken);
        return { user: toProfileDto(user) };
    }

    @Post('logout')
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseGuards(JwtAuthGuard)
    async logout(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) {
        const rawToken: string | undefined = req.cookies?.['refresh_token'];
        await this.authService.logout(rawToken);
        this.cookieService.clearAuthCookies(res);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async me(@Req() req: AuthenticatedRequest) {
        const user = await this.authService.getMe(req.user.userId);
        return { user: toProfileDto(user) };
    }

    @Get('validate')
    @UseGuards(JwtAuthGuard)
    validate(@Req() req: AuthenticatedRequest) {
        return req.user;
    }
}
