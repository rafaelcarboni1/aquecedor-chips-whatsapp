import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../auth/public.decorator';

@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth() {
    return this.healthService.getHealthStatus();
  }

  @Get('detailed')
  async getDetailedHealth() {
    return this.healthService.getDetailedHealthStatus();
  }
}