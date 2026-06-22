import { Controller, Get, Module, Res } from '@nestjs/common';
import type { Response } from 'express';
import * as client from 'prom-client';

client.collectDefaultMetrics();

@Controller('metrics')
class MetricsController {
    @Get()
    async metrics(@Res() res: Response): Promise<void> {
        res.set('Content-Type', client.register.contentType);
        res.end(await client.register.metrics());
    }
}

@Module({ controllers: [MetricsController] })
export class MetricsModule {}
