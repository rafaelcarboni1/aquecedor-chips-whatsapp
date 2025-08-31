import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { QueueService } from '../queue/queue.service';
import { InstancesService } from '../instances/instances.service';
import { WebhookEvent } from '@mirage/types';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
    private readonly instancesService: InstancesService,
  ) {}

  async processEvolutionWebhook(payload: WebhookEvent) {
    this.logger.log(`Processing webhook event: ${payload.event} for instance: ${payload.instance}`);

    try {
      switch (payload.event) {
        case 'APPLICATION_STARTUP':
          await this.handleApplicationStartup(payload);
          break;

        case 'QRCODE_UPDATED':
          await this.handleQRCodeUpdated(payload);
          break;

        case 'CONNECTION_UPDATE':
          await this.handleConnectionUpdate(payload);
          break;

        case 'MESSAGES_UPSERT':
          await this.handleMessagesUpsert(payload);
          break;

        case 'MESSAGES_UPDATE':
          await this.handleMessagesUpdate(payload);
          break;

        case 'SEND_MESSAGE':
          await this.handleSendMessage(payload);
          break;

        default:
          this.logger.warn(`Unhandled webhook event: ${payload.event}`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      throw error;
    }
  }

  private async handleApplicationStartup(payload: WebhookEvent) {
    this.logger.log(`Application startup for instance: ${payload.instance}`);
    
    // Atualizar status da instância para 'connecting'
    await this.instancesService.updateInstanceStatus(
      payload.instance,
      'connecting'
    );
  }

  private async handleQRCodeUpdated(payload: WebhookEvent) {
    this.logger.log(`QR Code updated for instance: ${payload.instance}`);
    
    // Salvar QR code no banco se necessário
    if (payload.data?.qrcode) {
      // TODO: Implementar salvamento de QR code
      this.logger.log('QR Code received and should be stored');
    }
  }

  private async handleConnectionUpdate(payload: WebhookEvent) {
    this.logger.log(`Connection update for instance: ${payload.instance}`);
    
    const connectionData = payload.data;
    let status = 'disconnected';
    let waNumber = null;

    if (connectionData?.state === 'open') {
      status = 'connected';
      waNumber = connectionData?.user?.id?.split('@')[0] || null;
    } else if (connectionData?.state === 'connecting') {
      status = 'connecting';
    } else if (connectionData?.state === 'close') {
      status = 'disconnected';
    }

    await this.instancesService.updateInstanceStatus(
      payload.instance,
      status,
      waNumber
    );
  }

  private async handleMessagesUpsert(payload: WebhookEvent) {
    this.logger.log(`Messages upsert for instance: ${payload.instance}`);
    
    const messages = Array.isArray(payload.data) ? payload.data : [payload.data];
    
    for (const message of messages) {
      await this.processIncomingMessage(payload.instance, message);
    }
  }

  private async handleMessagesUpdate(payload: WebhookEvent) {
    this.logger.log(`Messages update for instance: ${payload.instance}`);
    
    // Atualizar status de mensagens enviadas
    const messageUpdate = payload.data;
    
    if (messageUpdate?.key?.id) {
      await this.updateMessageStatus(
        messageUpdate.key.id,
        messageUpdate.status || 'delivered'
      );
    }
  }

  private async handleSendMessage(payload: WebhookEvent) {
    this.logger.log(`Send message event for instance: ${payload.instance}`);
    
    // Processar confirmação de envio de mensagem
    const messageData = payload.data;
    
    if (messageData?.key?.id) {
      await this.updateMessageStatus(
        messageData.key.id,
        'sent'
      );
    }
  }

  private async processIncomingMessage(instanceId: string, messageData: any) {
    try {
      // Verificar se a mensagem já existe
      const { data: existingMessage } = await this.databaseService.getClient()
        .from('t_messages')
        .select('id')
        .eq('wa_msg_id', messageData.key?.id)
        .single();

      if (existingMessage) {
        this.logger.log(`Message ${messageData.key?.id} already exists`);
        return;
      }

      // Obter informações da instância
      const { data: instance } = await this.databaseService.getClient()
        .from('t_numbers')
        .select('id, tenant_id')
        .eq('session_id', instanceId)
        .single();

      if (!instance) {
        this.logger.warn(`Instance ${instanceId} not found`);
        return;
      }

      // Determinar direção da mensagem
      const isFromMe = messageData.key?.fromMe || false;
      const direction = isFromMe ? 'out' : 'in';

      // Extrair número do remetente/destinatário
      const remoteJid = messageData.key?.remoteJid || '';
      const phoneNumber = remoteJid.split('@')[0];

      // Salvar mensagem no banco
      const { error } = await this.databaseService.getClient()
        .from('t_messages')
        .insert({
          tenant_id: instance.tenant_id,
          wa_msg_id: messageData.key?.id,
          direction,
          body: this.extractMessageBody(messageData),
          meta: {
            phone_number: phoneNumber,
            message_type: messageData.messageType || 'text',
            timestamp: messageData.messageTimestamp,
            raw_data: messageData,
          },
          from_number_id: direction === 'out' ? instance.id : null,
          to_number_id: direction === 'in' ? instance.id : null,
          status: 'received',
        });

      if (error) {
        this.logger.error('Failed to save message:', error);
        return;
      }

      // Se for mensagem recebida, adicionar à fila para processamento
      if (direction === 'in') {
        await this.queueService.addMessageJob({
          instanceId,
          messageData,
          type: 'receive',
        });
      }

      this.logger.log(`Message ${messageData.key?.id} processed successfully`);
    } catch (error) {
      this.logger.error('Error processing incoming message:', error);
    }
  }

  private async updateMessageStatus(waMessageId: string, status: string) {
    try {
      const { error } = await this.databaseService.getClient()
        .from('t_messages')
        .update({ status })
        .eq('wa_msg_id', waMessageId);

      if (error) {
        this.logger.error('Failed to update message status:', error);
      } else {
        this.logger.log(`Message ${waMessageId} status updated to ${status}`);
      }
    } catch (error) {
      this.logger.error('Error updating message status:', error);
    }
  }

  private extractMessageBody(messageData: any): string {
    if (messageData.message?.conversation) {
      return messageData.message.conversation;
    }
    
    if (messageData.message?.extendedTextMessage?.text) {
      return messageData.message.extendedTextMessage.text;
    }
    
    if (messageData.message?.imageMessage?.caption) {
      return messageData.message.imageMessage.caption;
    }
    
    if (messageData.message?.videoMessage?.caption) {
      return messageData.message.videoMessage.caption;
    }
    
    // Para outros tipos de mensagem, retornar tipo
    const messageType = Object.keys(messageData.message || {})[0];
    return `[${messageType || 'unknown'}]`;
  }
}