import { NotFoundException } from '@nestjs/common';
import { AuthErrorCode } from '../enum/auth-error-codes.enum';

export class UserNotFoundException extends NotFoundException {
    constructor(identifier: string) {
        super({ errorCode: AuthErrorCode.USER_NOT_FOUND, message: `User not found: ${identifier}` });
    }
}
