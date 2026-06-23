import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginAttemptEntity } from '../../domain/entities/login-attempt.entity';

@Injectable()
export class LoginAttemptDao {
    constructor(
        @InjectRepository(LoginAttemptEntity)
        private readonly repository: Repository<LoginAttemptEntity>
    ) {}

    async isLocked(email: string, ip: string): Promise<boolean> {
        const row = await this.repository.findOne({ where: { email, ip } });
        if (!row?.lockedUntil) return false;
        return row.lockedUntil > new Date();
    }

    async recordFailure(email: string, ip: string, threshold: number, windowMin: number): Promise<void> {
        let row = await this.repository.findOne({ where: { email, ip } });
        if (!row) {
            row = this.repository.create({ email, ip, failedCount: 0 });
        }
        row.failedCount += 1;
        row.lastFailedAt = new Date();
        if (row.failedCount >= threshold) {
            row.lockedUntil = new Date(Date.now() + windowMin * 60 * 1000);
        }
        await this.repository.save(row);
    }

    async clear(email: string, ip: string): Promise<void> {
        await this.repository.delete({ email, ip });
    }
}
