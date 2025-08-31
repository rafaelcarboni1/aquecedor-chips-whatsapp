import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import axios from 'axios';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);
  private readonly evolutionApiUrl: string;
  private readonly evolutionApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    this.evolutionApiUrl = this.configService.get('EVOLUTION_API_URL');
    this.evolutionApiKey = this.configService.get('EVOLUTION_API_KEY');
  }

  async getConversations(tenantId: string) {
    try {
      this.logger.log(`Fetching conversations for tenant: ${tenantId}`);

      // Buscar conversas do banco de dados
      const { data: conversations, error } = await this.databaseService
        .getClient()
        .from('t_conversations')
        .select(`
          *,
          instance:t_instances(id, name, instance_name),
          messages:t_messages(id, content, created_at)
        `)
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false });

      if (error) {
        this.logger.error('Error fetching conversations:', error);
        throw new Error('Failed to fetch conversations');
      }

      // Processar conversas para incluir informações adicionais
      const processedConversations = conversations?.map(conversation => {
        const messages = conversation.messages || [];
        const lastMessage = messages.length > 0 
          ? messages[messages.length - 1]
          : null;

        return {
          id: conversation.id,
          contact: conversation.contact_name || conversation.contact_number,
          contactNumber: conversation.contact_number,
          contactName: conversation.contact_name,
          lastMessage: lastMessage?.content || 'Nenhuma mensagem',
          lastMessageTime: lastMessage?.created_at || conversation.created_at,
          unreadCount: conversation.unread_count || 0,
          instanceId: conversation.instance_id,
          instanceName: conversation.instance?.name || 'Instância desconhecida',
          status: conversation.status || 'active',
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at,
        };
      }) || [];

      this.logger.log(`Found ${processedConversations.length} conversations`);
      return processedConversations;
    } catch (error) {
      this.logger.error('Error in getConversations:', error);
      throw error;
    }
  }

  async getConversationMessages(tenantId: string, conversationId: string) {
    try {
      this.logger.log(`Fetching messages for conversation: ${conversationId}`);

      // Verificar se a conversa pertence ao tenant
      const { data: conversation } = await this.databaseService
        .getClient()
        .from('t_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .single();

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      // Buscar mensagens da conversa
      const { data: messages, error } = await this.databaseService
        .getClient()
        .from('t_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        this.logger.error('Error fetching messages:', error);
        throw new Error('Failed to fetch messages');
      }

      // Processar mensagens
      const processedMessages = messages?.map(message => ({
        id: message.id,
        content: message.content,
        type: message.message_type || 'text',
        direction: message.direction || 'in',
        timestamp: message.timestamp || message.created_at,
        status: message.status || 'received',
        fromMe: message.direction === 'out',
        createdAt: message.created_at,
      })) || [];

      this.logger.log(`Found ${processedMessages.length} messages`);
      return processedMessages;
    } catch (error) {
      this.logger.error('Error in getConversationMessages:', error);
      throw error;
    }
  }

  async sendMessage(tenantId: string, conversationId: string, content: string) {
    try {
      this.logger.log(`Sending message to conversation: ${conversationId}`);

      // Buscar informações da conversa e instância
      const { data: conversation } = await this.databaseService
        .getClient()
        .from('t_conversations')
        .select(`
          *,
          instance:t_instances(id, instance_name)
        `)
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .single();

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      const instanceName = conversation.instance?.instance_name;
      if (!instanceName) {
        throw new Error('Instance not found for this conversation');
      }

      // Enviar mensagem via Evolution API
      const response = await axios.post(
        `${this.evolutionApiUrl}/message/sendText/${instanceName}`,
        {
          number: conversation.contact_number,
          text: content,
        },
        {
          headers: {
            'apikey': this.evolutionApiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        // Salvar mensagem no banco de dados
        const { data: savedMessage, error } = await this.databaseService
          .getClient()
          .from('t_messages')
          .insert({
            conversation_id: conversationId,
            content,
            direction: 'out',
            message_type: 'text',
            status: 'sent',
            wa_msg_id: response.data?.key?.id,
            raw_data: response.data,
            tenant_id: tenantId,
          })
          .select()
          .single();

        if (error) {
          this.logger.error('Error saving sent message:', error);
        }

        // Atualizar última atividade da conversa
        await this.databaseService
          .getClient()
          .from('t_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);

        return {
          success: true,
          message: 'Message sent successfully',
          data: savedMessage,
        };
      } else {
        throw new Error('Failed to send message via Evolution API');
      }
    } catch (error) {
      this.logger.error('Error in sendMessage:', error);
      throw error;
    }
  }

  async getDashboardStats(tenantId: string) {
    try {
      this.logger.log(`Fetching dashboard stats for tenant: ${tenantId}`);

      // Buscar estatísticas do banco de dados
      const [instancesResult, conversationsResult, messagesResult] = await Promise.all([
        // Total de instâncias
        this.databaseService
          .getClient()
          .from('t_instances')
          .select('id, status')
          .eq('tenant_id', tenantId),
        
        // Total de conversas
        this.databaseService
          .getClient()
          .from('t_conversations')
          .select('id')
          .eq('tenant_id', tenantId),
        
        // Total de mensagens
        this.databaseService
          .getClient()
          .from('t_messages')
          .select('id')
          .eq('tenant_id', tenantId),
      ]);

      const instances = instancesResult.data || [];
      const conversations = conversationsResult.data || [];
      const messages = messagesResult.data || [];

      const connectedInstances = instances.filter(instance => 
        instance.status === 'connected' || instance.status === 'open'
      ).length;

      const stats = {
        totalInstances: instances.length,
        connectedInstances,
        totalConversations: conversations.length,
        totalMessages: messages.length,
      };

      this.logger.log('Dashboard stats:', stats);
      return stats;
    } catch (error) {
      this.logger.error('Error in getDashboardStats:', error);
      throw error;
    }
  }
}