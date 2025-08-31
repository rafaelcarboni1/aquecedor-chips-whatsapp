import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ConversationsService } from './conversations.service';

interface SendMessageDto {
  content: string;
}

@Controller('conversations')
@UseGuards(AuthGuard)
export class ConversationsController {
  private readonly logger = new Logger(ConversationsController.name);

  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async getConversations(@Request() req: any) {
    const tenantId = req.user.tenant_id;
    return this.conversationsService.getConversations(tenantId);
  }

  @Get(':id/messages')
  async getConversationMessages(
    @Param('id') conversationId: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenant_id;
    return this.conversationsService.getConversationMessages(tenantId, conversationId);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() sendMessageDto: SendMessageDto,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenant_id;
    return this.conversationsService.sendMessage(
      tenantId,
      conversationId,
      sendMessageDto.content,
    );
  }

  @Get('stats/dashboard')
  async getDashboardStats(@Request() req: any) {
    const tenantId = req.user.tenant_id;
    return this.conversationsService.getDashboardStats(tenantId);
  }
}