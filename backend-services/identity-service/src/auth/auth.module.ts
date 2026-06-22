import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './service/auth.service';
import { UserDao } from './dao/user.dao';
import { UserEntity } from '../domain/entities/user.entity';
import { JwtStrategy } from '../infrastructure/guards/jwt.strategy';
import { JwtAuthGuard } from '../infrastructure/guards/jwt-auth.guard';
import { CookieService } from '../infrastructure/cookies/cookie.service';
import { AppConfigModule } from '../infrastructure/config/app-config.module';
import { AppConfig } from '../infrastructure/config/app.config';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity]),
        PassportModule,
        JwtModule.registerAsync({
            imports: [AppConfigModule],
            useFactory: (cfg: AppConfig) => ({
                secret: cfg.jwtSecret,
                signOptions: { expiresIn: cfg.accessTokenTtl },
            }),
            inject: [AppConfig],
        }),
        AppConfigModule,
    ],
    controllers: [AuthController],
    providers: [AuthService, UserDao, JwtStrategy, JwtAuthGuard, CookieService],
})
export class AuthModule {}
