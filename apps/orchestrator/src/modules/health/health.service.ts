import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private redis: Redis;

  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService,
  ) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      maxRetriesPerRequest: 3,
    });
  }

  async getHealthStatus() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'mirage-orchestrator',
      version: '0.1.0',
    };
  }

  async getDetailedHealthStatus() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkEnvironment(),
    ]);

    const [database, redis, environment] = checks;

    const overallStatus = checks.every(
      (check) => check.status === 'fulfilled' && check.value.status === 'healthy'
    ) ? 'healthy' : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'mirage-orchestrator',
      version: '0.1.0',
      checks: {
        database: database.status === 'fulfilled' ? database.value : { status: 'unhealthy', error: database.reason },
        redis: redis.status === 'fulfilled' ? redis.value : { status: 'unhealthy', error: redis.reason },
        environment: environment.status === 'fulfilled' ? environment.value : { status: 'unhealthy', error: environment.reason },
      },
    };
  }

  private async checkDatabase() {
    try {
      const supabase = this.databaseService.getClient();
      const { data, error } = await supabase
        .from('_health_check')
        .select('1')
        .limit(1);

      if (error && !error.message.includes('relation "_health_check" does not exist')) {
        throw error;
      }

      return {
        status: 'healthy',
        responseTime: Date.now(),
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  private async checkRedis() {
    try {
      const start = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  private async checkEnvironment() {
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'JWT_SECRET',
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !this.configService.get(varName)
    );

    if (missingVars.length > 0) {
      return {
        status: 'unhealthy',
        error: `Missing environment variables: ${missingVars.join(', ')}`,
      };
    }

    return {
      status: 'healthy',
      variables: requiredEnvVars.length,
    };
  }
}