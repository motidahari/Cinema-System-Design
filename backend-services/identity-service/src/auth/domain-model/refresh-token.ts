export interface RefreshTokenAttrs {
    id: string;
    userId: string;
    familyId: string;
    tokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
    replacedBy: string | null;
    userAgent: string | null;
    ip: string | null;
    createdAt: Date;
}

export class RefreshTokenModel {
    readonly id: string;
    readonly userId: string;
    readonly familyId: string;
    readonly tokenHash: string;
    readonly expiresAt: Date;
    readonly revokedAt: Date | null;
    readonly replacedBy: string | null;
    readonly userAgent: string | null;
    readonly ip: string | null;
    readonly createdAt: Date;

    constructor(attrs: RefreshTokenAttrs) {
        this.id = attrs.id;
        this.userId = attrs.userId;
        this.familyId = attrs.familyId;
        this.tokenHash = attrs.tokenHash;
        this.expiresAt = attrs.expiresAt;
        this.revokedAt = attrs.revokedAt;
        this.replacedBy = attrs.replacedBy;
        this.userAgent = attrs.userAgent;
        this.ip = attrs.ip;
        this.createdAt = attrs.createdAt;
    }

    isExpired(): boolean {
        return this.expiresAt < new Date();
    }

    isRevoked(): boolean {
        return this.revokedAt !== null;
    }
}
