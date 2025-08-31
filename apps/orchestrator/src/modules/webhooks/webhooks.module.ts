import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { InstancesModule } from '../instances/instances.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [InstancesModule, QueueModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}