import { Module } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './auth.controller';
import { AuthService } from './service/auth.service';
import { UserDao } from './dao/user.dao';
import { RefreshTokenDao } from './dao/refresh-token.dao';
import { UserEntity } from '../domain/entities/user.entity';
import { RefreshTokenEntity } from '../domain/entities/refresh-token.entity';
import { LoginAttemptEntity } from '../domain/entities/login-attempt.entity';
import { LoginAttemptDao } from './dao/login-attempt.dao';
import { JwtStrategy } from '../infrastructure/guards/jwt.strategy';
import { JwtAuthGuard } from '../infrastructure/guards/jwt-auth.guard';
import { CookieService } from '../infrastructure/cookies/cookie.service';
import { AppConfigModule } from '../infrastructure/config/app-config.module';
import { AppConfig } from '../infrastructure/config/app.config';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity, LoginAttemptEntity]),
        PassportModule,
        JwtModule.registerAsync({
            imports: [AppConfigModule],
            useFactory: (cfg: AppConfig) => ({
                secret: cfg.jwtSecret,
                signOptions: { expiresIn: cfg.accessTokenTtl } as JwtSignOptions,
            }),
            inject: [AppConfig],
        }),
        AppConfigModule,
    ],
    controllers: [AuthController],
    providers: [AuthService, UserDao, RefreshTokenDao, LoginAttemptDao, JwtStrategy, JwtAuthGuard, CookieService],
})
export class AuthModule {}
