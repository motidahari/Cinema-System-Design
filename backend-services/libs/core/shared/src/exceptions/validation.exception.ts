export class ValidationException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationException';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
