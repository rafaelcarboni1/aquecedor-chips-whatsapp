import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InstanceJob } from '../queue.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Processor('instance-queue')
export class InstanceProcessor extends WorkerHost {
  private readonly logger = new Logger(InstanceProcessor.name);
  private readonly evolutionApiUrl: string;
  private readonly evolutionApiKey: string;

  constructor(private configService: ConfigService) {
    super();
    this.evolutionApiUrl = this.configService.get('EVOLUTION_API_URL');
    this.evolutionApiKey = this.configService.get('EVOLUTION_API_KEY');
  }

  async process(job: Job<InstanceJob>): Promise<any> {
    const { instanceId, action, config } = job.data;

    this.logger.log(`Processing ${action} action for instance ${instanceId}`);

    try {
      switch (action) {
        case 'start':
          return await this.startInstance(instanceId, config);
        case 'stop':
          return await this.stopInstance(instanceId);
        case 'restart':
          return await this.restartInstance(instanceId, config);
        case 'status':
          return await this.getInstanceStatus(instanceId);
        default:
          throw new Error(`Unknown instance action: ${action}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process instance job ${job.id}:`, error);
      throw error;
    }
  }

  private async startInstance(instanceId: string, config?: any) {
    this.logger.log(`Starting instance ${instanceId}`);

    try {
      // Criar instância na Evolution API
      const response = await axios.post(
        `${this.evolutionApiUrl}/instance/create`,
        {
          instanceName: instanceId,
          token: this.evolutionApiKey,
          qrcode: true,
          ...config,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.evolutionApiKey,
          },
        }
      );

      this.logger.log(`Instance ${instanceId} started successfully`);

      return {
        success: true,
        instanceId,
        status: 'started',
        qrCode: response.data.qrcode,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to start instance ${instanceId}:`, error.message);
      throw error;
    }
  }

  private async stopInstance(instanceId: string) {
    this.logger.log(`Stopping instance ${instanceId}`);

    try {
      await axios.delete(
        `${this.evolutionApiUrl}/instance/logout/${instanceId}`,
        {
          headers: {
            'apikey': this.evolutionApiKey,
          },
        }
      );

      this.logger.log(`Instance ${instanceId} stopped successfully`);

      return {
        success: true,
        instanceId,
        status: 'stopped',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to stop instance ${instanceId}:`, error.message);
      throw error;
    }
  }

  private async restartInstance(instanceId: string, config?: any) {
    this.logger.log(`Restarting instance ${instanceId}`);

    try {
      // Primeiro parar a instância
      await this.stopInstance(instanceId);
      
      // Aguardar um pouco antes de reiniciar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Iniciar novamente
      return await this.startInstance(instanceId, config);
    } catch (error) {
      this.logger.error(`Failed to restart instance ${instanceId}:`, error.message);
      throw error;
    }
  }

  private async getInstanceStatus(instanceId: string) {
    this.logger.log(`Getting status for instance ${instanceId}`);

    try {
      const response = await axios.get(
        `${this.evolutionApiUrl}/instance/connectionState/${instanceId}`,
        {
          headers: {
            'apikey': this.evolutionApiKey,
          },
        }
      );

      return {
        success: true,
        instanceId,
        status: response.data.state,
        data: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get status for instance ${instanceId}:`, error.message);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<InstanceJob>) {
    this.logger.log(`Instance job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<InstanceJob>, error: Error) {
    this.logger.error(`Instance job ${job.id} failed:`, error.message);
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job<InstanceJob>, progress: number) {
    this.logger.debug(`Instance job ${job.id} progress: ${progress}%`);
  }
}