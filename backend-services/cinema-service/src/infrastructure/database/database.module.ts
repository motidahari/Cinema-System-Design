import { Module } from '@nestjs/common';
import { TransactionManager } from './transaction.manager';

/**
 * Exposes shared persistence utilities. Import it in any module whose services run
 * atomic multi-statement work via TransactionManager.
 */
@Module({
    providers: [TransactionManager],
    exports: [TransactionManager],
})
export class DatabaseModule {}
