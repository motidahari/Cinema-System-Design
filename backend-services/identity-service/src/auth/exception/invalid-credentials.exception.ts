import { UnauthorizedException } from '@nestjs/common';
import { AuthErrorCode } from '../enum/auth-error-codes.enum';

export class InvalidCredentialsException extends UnauthorizedException {
    constructor() {
        super({ errorCode: AuthErrorCode.INVALID_CREDENTIALS, message: 'Invalid email or password' });
    }
}
