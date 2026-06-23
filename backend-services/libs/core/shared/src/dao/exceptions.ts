export class RecordNotFoundException extends Error {
    constructor(public readonly entityId: string) {
        super(`Record with id "${entityId}" not found`);
        this.name = 'RecordNotFoundException';
    }
}
