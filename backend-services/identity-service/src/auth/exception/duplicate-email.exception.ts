import { ConflictException } from '@nestjs/common';
import { AuthErrorCode } from '../enum/auth-error-codes.enum';

export class DuplicateEmailException extends ConflictException {
    constructor(email: string) {
        super({ errorCode: AuthErrorCode.DUPLICATE_EMAIL, message: `Email already in use: ${email}` });
    }
}
