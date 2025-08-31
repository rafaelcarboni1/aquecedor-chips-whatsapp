import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { QueueService, MessageJob, WebhookJob, InstanceJob } from './queue.service';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.guard';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('stats')
  @Public()
  async getQueueStats() {
    return this.queueService.getQueueStats();
  }

  @Post('message')
  @Public()
  async addMessageJob(@Body() job: MessageJob) {
    return this.queueService.addMessageJob(job);
  }

  @Post('webhook')
  @Roles(Role.ADMIN, Role.OPERATOR)
  async addWebhookJob(@Body() job: WebhookJob) {
    return this.queueService.addWebhookJob(job);
  }

  @Post('instance')
  @Roles(Role.ADMIN, Role.OPERATOR)
  async addInstanceJob(@Body() job: InstanceJob) {
    return this.queueService.addInstanceJob(job);
  }

  @Post(':queueName/pause')
  @Roles(Role.ADMIN)
  async pauseQueue(@Param('queueName') queueName: 'message' | 'webhook' | 'instance') {
    await this.queueService.pauseQueue(queueName);
    return { message: `Queue ${queueName} paused successfully` };
  }

  @Post(':queueName/resume')
  @Roles(Role.ADMIN)
  async resumeQueue(@Param('queueName') queueName: 'message' | 'webhook' | 'instance') {
    await this.queueService.resumeQueue(queueName);
    return { message: `Queue ${queueName} resumed successfully` };
  }
}