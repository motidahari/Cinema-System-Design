import { Controller, Post, Get, Body, Req, Res, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './service/auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../infrastructure/guards/jwt-auth.guard';
import { CookieService } from '../infrastructure/cookies/cookie.service';
import { JwtPayload } from '../infrastructure/guards/jwt.strategy';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('api/v1/auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly cookieService: CookieService
    ) {}

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
        const { user, accessToken } = await this.authService.register(dto.email, dto.password);
        this.cookieService.setAuthCookies(res, accessToken);
        return { user };
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const { user, accessToken } = await this.authService.login(dto.email, dto.password);
        this.cookieService.setAuthCookies(res, accessToken);
        return { user };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async me(@Req() req: AuthenticatedRequest) {
        const user = await this.authService.getMe(req.user.userId);
        return { user };
    }

    @Get('validate')
    @UseGuards(JwtAuthGuard)
    validate(@Req() req: AuthenticatedRequest) {
        return req.user;
    }
}
