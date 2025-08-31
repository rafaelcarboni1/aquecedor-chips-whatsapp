import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { InstancesService } from './instances.service';
import { CreateInstanceRequest } from '@mirage/types';

@Controller('instances')
@UseGuards(AuthGuard)
export class InstancesController {
  private readonly logger = new Logger(InstancesController.name);

  constructor(private readonly instancesService: InstancesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createInstance(
    @Body() createInstanceDto: CreateInstanceRequest,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenant_id;
    return this.instancesService.createInstance(tenantId, createInstanceDto);
  }

  @Public()
  @Get('test')
  async testInstances() {
    this.logger.log('Test instances endpoint called');
    return {
      success: true,
      message: 'Instances API is working',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  async getInstances(@Request() req: any) {
    const tenantId = req.user.tenant_id;
    return this.instancesService.getInstances(tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteInstance(
    @Param('id') instanceId: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenant_id;
    return this.instancesService.deleteInstance(tenantId, instanceId);
  }

  @Get(':id/qr')
  async getInstanceQR(
    @Param('id') instanceId: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenant_id;
    return this.instancesService.getInstanceQRCode(tenantId, instanceId);
  }

  @Post(':id/restart')
  @HttpCode(HttpStatus.OK)
  async restartInstance(
    @Param('id') instanceId: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenant_id;
    return this.instancesService.restartInstance(tenantId, instanceId);
  }
}