import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { QueueService } from '../queue/queue.service';
import { CreateInstanceRequest, CreateInstanceResponse } from '@mirage/types';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InstancesService {
  private readonly logger = new Logger(InstancesService.name);
  private readonly evolutionApiUrl: string;
  private readonly evolutionApiKey: string;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {
    this.evolutionApiUrl = this.configService.get('EVOLUTION_API_URL');
    this.evolutionApiKey = this.configService.get('EVOLUTION_API_KEY');
  }

  async createInstance(
    tenantId: string,
    createInstanceDto: CreateInstanceRequest,
  ): Promise<CreateInstanceResponse> {
    this.logger.log(`Creating instance for tenant ${tenantId}`);

    try {
      // Gerar session_id único
      const sessionId = `mirage_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

      // Criar instância na Evolution API
      const evolutionResponse = await axios.post(
        `${this.evolutionApiUrl}/instance/create`,
        {
          instanceName: sessionId,
          token: this.evolutionApiKey,
          qrcode: true,
          number: false,
          webhook: `${this.configService.get('APP_URL')}/api/webhooks/evolution`,
          webhook_by_events: true,
          events: [
            'APPLICATION_STARTUP',
            'QRCODE_UPDATED',
            'CONNECTION_UPDATE',
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE',
            'SEND_MESSAGE'
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.evolutionApiKey,
          },
        },
      );

      if (!evolutionResponse.data) {
        throw new BadRequestException('Failed to create instance in Evolution API');
      }

      // Salvar no banco de dados
      const { data: numberRecord, error } = await this.databaseService.getClient()
        .from('t_numbers')
        .insert({
          tenant_id: tenantId,
          session_id: sessionId,
          label: createInstanceDto.label,
          persona_id: createInstanceDto.persona_id || null,
          status: 'connecting',
          wa_number: null, // Será preenchido quando conectar
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to save instance to database:', error);
        throw new BadRequestException('Failed to save instance');
      }

      // Adicionar job para monitorar status da instância
      await this.queueService.addInstanceJob({
        action: 'monitor_status',
        instanceId: sessionId,
        tenantId,
      });

      // Obter QR code
      const qrResponse = await this.getQRCode(sessionId);

      return {
        session_id: sessionId,
        qr_code: qrResponse.qr_code,
      };
    } catch (error) {
      this.logger.error('Error creating instance:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create instance');
    }
  }

  async getInstances(tenantId: string) {
    this.logger.log(`Getting instances for tenant ${tenantId}`);

    try {
      const { data: instances, error } = await this.databaseService.getClient()
        .from('t_numbers')
        .select(`
          id,
          session_id,
          wa_number,
          status,
          label,
          persona_id,
          created_at,
          updated_at
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Failed to get instances:', error);
        throw new BadRequestException('Failed to get instances');
      }

      // Enriquecer com dados da Evolution API
      const enrichedInstances = await Promise.all(
        instances.map(async (instance) => {
          try {
            const evolutionStatus = await this.getEvolutionInstanceStatus(instance.session_id);
            return {
              ...instance,
              evolution_status: evolutionStatus,
            };
          } catch (error) {
            this.logger.warn(`Failed to get Evolution status for ${instance.session_id}:`, error.message);
            return {
              ...instance,
              evolution_status: { state: 'unknown' },
            };
          }
        })
      );

      return { instances: enrichedInstances };
    } catch (error) {
      this.logger.error('Error getting instances:', error);
      throw new BadRequestException('Failed to get instances');
    }
  }

  async deleteInstance(tenantId: string, instanceId: string) {
    this.logger.log(`Deleting instance ${instanceId} for tenant ${tenantId}`);

    try {
      // Verificar se a instância pertence ao tenant
      const { data: instance, error: fetchError } = await this.databaseService.getClient()
        .from('t_numbers')
        .select('session_id')
        .eq('id', instanceId)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError || !instance) {
        throw new NotFoundException('Instance not found');
      }

      // Deletar da Evolution API
      try {
        await axios.delete(
          `${this.evolutionApiUrl}/instance/delete/${instance.session_id}`,
          {
            headers: {
              'apikey': this.evolutionApiKey,
            },
          },
        );
      } catch (evolutionError) {
        this.logger.warn(`Failed to delete from Evolution API: ${evolutionError.message}`);
        // Continuar mesmo se falhar na Evolution API
      }

      // Deletar do banco de dados
      const { error: deleteError } = await this.databaseService.getClient()
        .from('t_numbers')
        .delete()
        .eq('id', instanceId)
        .eq('tenant_id', tenantId);

      if (deleteError) {
        this.logger.error('Failed to delete instance from database:', deleteError);
        throw new BadRequestException('Failed to delete instance');
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting instance:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete instance');
    }
  }

  private async getQRCode(sessionId: string) {
    try {
      const response = await axios.get(
        `${this.evolutionApiUrl}/instance/connect/${sessionId}`,
        {
          headers: {
            'apikey': this.evolutionApiKey,
          },
        },
      );

      return {
        qr_code: response.data.base64 || response.data.qrcode?.base64 || '',
      };
    } catch (error) {
      this.logger.error('Failed to get QR code:', error);
      return { qr_code: '' };
    }
  }

  private async getEvolutionInstanceStatus(sessionId: string) {
    try {
      const response = await axios.get(
        `${this.evolutionApiUrl}/instance/connectionState/${sessionId}`,
        {
          headers: {
            'apikey': this.evolutionApiKey,
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.warn(`Failed to get Evolution status for ${sessionId}:`, error.message);
      throw error;
    }
  }

  async getInstanceQRCode(tenantId: string, instanceId: string) {
    this.logger.log(`Getting QR code for instance ${instanceId}`);

    try {
      // Verificar se a instância pertence ao tenant
      const { data: instance, error: fetchError } = await this.databaseService.getClient()
        .from('t_numbers')
        .select('session_id, status')
        .eq('id', instanceId)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError || !instance) {
        throw new NotFoundException('Instance not found');
      }

      // Obter QR code da Evolution API
      const qrResponse = await this.getQRCode(instance.session_id);

      return {
        session_id: instance.session_id,
        qr_code: qrResponse.qr_code,
        status: instance.status,
      };
    } catch (error) {
      this.logger.error('Error getting instance QR code:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get QR code');
    }
  }

  async restartInstance(tenantId: string, instanceId: string) {
    this.logger.log(`Restarting instance ${instanceId}`);

    try {
      // Verificar se a instância pertence ao tenant
      const { data: instance, error: fetchError } = await this.databaseService.getClient()
        .from('t_numbers')
        .select('session_id')
        .eq('id', instanceId)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError || !instance) {
        throw new NotFoundException('Instance not found');
      }

      // Reiniciar na Evolution API
      try {
        await axios.post(
          `${this.evolutionApiUrl}/instance/restart/${instance.session_id}`,
          {},
          {
            headers: {
              'apikey': this.evolutionApiKey,
            },
          },
        );
      } catch (evolutionError) {
        this.logger.error(`Failed to restart instance in Evolution API: ${evolutionError.message}`);
        throw new BadRequestException('Failed to restart instance in Evolution API');
      }

      // Atualizar status no banco de dados
      await this.updateInstanceStatus(instance.session_id, 'restarting');

      // Adicionar job para monitorar status após restart
      await this.queueService.addInstanceJob({
        action: 'monitor_status',
        instanceId: instance.session_id,
        tenantId,
      });

      return {
        success: true,
        message: 'Instance restart initiated',
        session_id: instance.session_id,
      };
    } catch (error) {
      this.logger.error('Error restarting instance:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to restart instance');
    }
  }

  async updateInstanceStatus(sessionId: string, status: string, waNumber?: string) {
    this.logger.log(`Updating instance ${sessionId} status to ${status}`);

    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (waNumber) {
        updateData.wa_number = waNumber;
      }

      const { error } = await this.databaseService.getClient()
        .from('t_numbers')
        .update(updateData)
        .eq('session_id', sessionId);

      if (error) {
        this.logger.error('Failed to update instance status:', error);
        throw new BadRequestException('Failed to update instance status');
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error updating instance status:', error);
      throw new BadRequestException('Failed to update instance status');
    }
  }
}