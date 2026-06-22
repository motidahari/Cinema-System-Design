import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AppConfig } from '../config/app.config';

export interface JwtPayload {
    userId: string;
    email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(appConfig: AppConfig) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => req?.cookies?.['access_token'] ?? null,
                ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            ignoreExpiration: false,
            secretOrKey: appConfig.jwtSecret,
        });
    }

    validate(payload: JwtPayload): JwtPayload {
        return { userId: payload.userId, email: payload.email };
    }
}
