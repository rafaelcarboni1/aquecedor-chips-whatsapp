import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { MessageProcessor } from './processors/message.processor';
import { WebhookProcessor } from './processors/webhook.processor';
import { InstanceProcessor } from './processors/instance.processor';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'message-queue' },
      { name: 'webhook-queue' },
      { name: 'instance-queue' },
    ),
  ],
  controllers: [QueueController],
  providers: [
    QueueService,
    MessageProcessor,
    WebhookProcessor,
    InstanceProcessor,
  ],
  exports: [QueueService],
})
export class QueueModule {}