import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private httpService: HttpService,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024), // 150MB
      () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }),
      async () => {
        try {
          await firstValueFrom(
            this.httpService.get(`${process.env.INVENTORY_URL}/health`, { timeout: 5000 })
          );
          return { inventory: { status: 'up' } };
        } catch {
          return { inventory: { status: 'down' } };
        }
      },
      async () => {
        try {
          await firstValueFrom(
            this.httpService.get(`${process.env.CRM_URL}/health`, { timeout: 5000 })
          );
          return { crm: { status: 'up' } };
        } catch {
          return { crm: { status: 'down' } };
        }
      },
      async () => {
        try {
          await firstValueFrom(
            this.httpService.get(`${process.env.SALES_URL}/health`, { timeout: 5000 })
          );
          return { sales: { status: 'up' } };
        } catch {
          return { sales: { status: 'down' } };
        }
      },
    ]);
  }
}