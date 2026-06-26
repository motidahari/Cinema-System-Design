// Client-side email format check that drives inline field feedback. The server stays
// the source of truth (identity-service class-validator @IsEmail) — this is UX only.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
    return EMAIL_PATTERN.test(email.trim());
}
