import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

// min 8 chars, at least one uppercase, one lowercase, one digit, one special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+[\]{};':"\\|,.<>/?]).{8,}$/;

export class RegisterDto {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(8)
    @Matches(PASSWORD_REGEX, {
        message:
            'Password must be at least 8 characters and include uppercase, lowercase, digit, and special character',
    })
    password!: string;
}
