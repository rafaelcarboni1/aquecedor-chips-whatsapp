import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Headers,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { WebhooksService } from './webhooks.service';
import { WebhookEvent } from '@mirage/types';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @Post('evolution')
  @HttpCode(HttpStatus.OK)
  async handleEvolutionWebhook(
    @Body() payload: WebhookEvent,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log(`Received Evolution webhook: ${payload.event} for instance: ${payload.instance}`);
    
    try {
      // Log headers para debug (remover em produção)
      this.logger.debug('Webhook headers:', JSON.stringify(headers, null, 2));
      
      // Log payload para debug (remover em produção)
      this.logger.debug('Webhook payload:', JSON.stringify(payload, null, 2));
      
      const result = await this.webhooksService.processEvolutionWebhook(payload);
      
      return result;
    } catch (error) {
      this.logger.error('Error processing Evolution webhook:', error);
      
      // Retornar sucesso mesmo com erro para evitar reenvios desnecessários
      // Em produção, considere implementar dead letter queue
      return { success: false, error: error.message };
    }
  }

  @Public()
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testWebhook(@Body() payload: any) {
    this.logger.log('Test webhook received');
    this.logger.debug('Test payload:', JSON.stringify(payload, null, 2));
    
    return {
      success: true,
      message: 'Test webhook received successfully',
      timestamp: new Date().toISOString(),
      payload,
    };
  }
}