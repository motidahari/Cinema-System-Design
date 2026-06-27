import { Transform } from 'class-transformer';
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { sanitizeEmail } from '@cinema/shared';

export class LoginDto {
    // Passwords are intentionally never sanitized — altering them would change the credential.
    @Transform(({ value }) => sanitizeEmail(value))
    @IsEmail()
    email!: string;

    @IsString()
    @IsNotEmpty()
    password!: string;
}
