import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MessageJob } from '../queue.service';

@Processor('message-queue')
export class MessageProcessor extends WorkerHost {
  private readonly logger = new Logger(MessageProcessor.name);

  async process(job: Job<MessageJob>): Promise<any> {
    const { instanceId, messageData, type } = job.data;

    this.logger.log(`Processing ${type} message for instance ${instanceId}`);

    try {
      switch (type) {
        case 'send':
          return await this.processSendMessage(job.data);
        case 'receive':
          return await this.processReceiveMessage(job.data);
        default:
          throw new Error(`Unknown message type: ${type}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process message job ${job.id}:`, error);
      throw error;
    }
  }

  private async processSendMessage(data: MessageJob) {
    const { instanceId, messageData } = data;

    // Aqui seria a integração com a Evolution API
    // Por enquanto, simulamos o envio
    this.logger.log(`Sending message via instance ${instanceId}:`, {
      to: messageData.to,
      message: messageData.message?.substring(0, 50) + '...',
    });

    // Simular delay de envio
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
  }

  private async processReceiveMessage(data: MessageJob) {
    const { instanceId, messageData } = data;

    // Processar mensagem recebida
    this.logger.log(`Processing received message for instance ${instanceId}:`, {
      from: messageData.from,
      message: messageData.message?.substring(0, 50) + '...',
    });

    // Aqui seria feito o processamento da mensagem recebida
    // - Salvar no banco de dados
    // - Executar automações
    // - Notificar webhooks

    return {
      success: true,
      processed: true,
      timestamp: new Date().toISOString(),
    };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<MessageJob>) {
    this.logger.log(`Message job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<MessageJob>, error: Error) {
    this.logger.error(`Message job ${job.id} failed:`, error.message);
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job<MessageJob>, progress: number) {
    this.logger.debug(`Message job ${job.id} progress: ${progress}%`);
  }
}