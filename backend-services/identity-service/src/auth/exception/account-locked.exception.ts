import { HttpException, HttpStatus } from '@nestjs/common';
import { AuthErrorCode } from '../enum/auth-error-codes.enum';

export class AccountLockedException extends HttpException {
    constructor() {
        super(
            {
                errorCode: AuthErrorCode.ACCOUNT_LOCKED,
                message: 'Account temporarily locked due to too many failed attempts',
            },
            HttpStatus.TOO_MANY_REQUESTS
        );
    }
}
