import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface MessageJob {
  instanceId: string;
  messageData: any;
  type: 'send' | 'receive';
  priority?: number;
}

export interface WebhookJob {
  url: string;
  payload: any;
  headers?: Record<string, string>;
  retries?: number;
}

export interface InstanceJob {
  instanceId: string;
  action: 'start' | 'stop' | 'restart' | 'status' | 'monitor_status';
  config?: any;
  tenantId?: string;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('message-queue') private messageQueue: Queue,
    @InjectQueue('webhook-queue') private webhookQueue: Queue,
    @InjectQueue('instance-queue') private instanceQueue: Queue,
  ) {}

  // Message Queue Operations
  async addMessageJob(job: MessageJob, options?: any) {
    try {
      const result = await this.messageQueue.add(
        `message-${job.type}`,
        job,
        {
          priority: job.priority || 0,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          ...options,
        }
      );

      this.logger.log(`Message job added: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to add message job:', error);
      throw error;
    }
  }

  async addBulkMessageJobs(jobs: MessageJob[]) {
    try {
      const bulkJobs = jobs.map((job) => ({
        name: `message-${job.type}`,
        data: job,
        opts: {
          priority: job.priority || 0,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }));

      const results = await this.messageQueue.addBulk(bulkJobs);
      this.logger.log(`Added ${results.length} message jobs in bulk`);
      return results;
    } catch (error) {
      this.logger.error('Failed to add bulk message jobs:', error);
      throw error;
    }
  }

  // Webhook Queue Operations
  async addWebhookJob(job: WebhookJob, options?: any) {
    try {
      const result = await this.webhookQueue.add(
        'webhook-delivery',
        job,
        {
          attempts: job.retries || 5,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          ...options,
        }
      );

      this.logger.log(`Webhook job added: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to add webhook job:', error);
      throw error;
    }
  }

  // Instance Queue Operations
  async addInstanceJob(job: InstanceJob, options?: any) {
    try {
      const result = await this.instanceQueue.add(
        `instance-${job.action}`,
        job,
        {
          attempts: 3,
          backoff: {
            type: 'fixed',
            delay: 5000,
          },
          ...options,
        }
      );

      this.logger.log(`Instance job added: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to add instance job:', error);
      throw error;
    }
  }

  // Queue Status and Management
  async getQueueStats() {
    const [messageStats, webhookStats, instanceStats] = await Promise.all([
      this.getQueueCounts(this.messageQueue),
      this.getQueueCounts(this.webhookQueue),
      this.getQueueCounts(this.instanceQueue),
    ]);

    return {
      message: messageStats,
      webhook: webhookStats,
      instance: instanceStats,
    };
  }

  private async getQueueCounts(queue: Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  async pauseQueue(queueName: 'message' | 'webhook' | 'instance') {
    const queue = this.getQueueByName(queueName);
    await queue.pause();
    this.logger.log(`Queue ${queueName} paused`);
  }

  async resumeQueue(queueName: 'message' | 'webhook' | 'instance') {
    const queue = this.getQueueByName(queueName);
    await queue.resume();
    this.logger.log(`Queue ${queueName} resumed`);
  }

  private getQueueByName(queueName: string): Queue {
    switch (queueName) {
      case 'message':
        return this.messageQueue;
      case 'webhook':
        return this.webhookQueue;
      case 'instance':
        return this.instanceQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }
}