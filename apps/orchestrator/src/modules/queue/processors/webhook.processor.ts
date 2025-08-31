import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WebhookJob } from '../queue.service';
import axios from 'axios';

@Processor('webhook-queue')
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  async process(job: Job<WebhookJob>): Promise<any> {
    const { url, payload, headers } = job.data;

    this.logger.log(`Delivering webhook to ${url}`);

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mirage-Orchestrator/1.0',
          ...headers,
        },
        timeout: 30000, // 30 seconds timeout
        validateStatus: (status) => status >= 200 && status < 300,
      });

      this.logger.log(`Webhook delivered successfully to ${url}`, {
        status: response.status,
        responseTime: response.headers['x-response-time'],
      });

      return {
        success: true,
        status: response.status,
        responseData: response.data,
        deliveredAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to deliver webhook to ${url}:`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      // Re-throw para que o BullMQ possa fazer retry
      throw new Error(`Webhook delivery failed: ${error.message}`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<WebhookJob>) {
    this.logger.log(`Webhook job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<WebhookJob>, error: Error) {
    this.logger.error(`Webhook job ${job.id} failed after all retries:`, error.message);
    
    // Aqui poderia ser implementada uma lógica para:
    // - Salvar falhas em uma tabela de dead letter
    // - Notificar administradores
    // - Desabilitar webhook se muitas falhas consecutivas
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job<WebhookJob>, progress: number) {
    this.logger.debug(`Webhook job ${job.id} progress: ${progress}%`);
  }

  @OnWorkerEvent('stalled')
  onStalled(job: Job<WebhookJob>) {
    this.logger.warn(`Webhook job ${job.id} stalled`);
  }
}