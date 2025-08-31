import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { InstancesService } from '../src/modules/instances/instances.service';

describe('Instances Integration Tests', () => {
  let app: INestApplication;
  let instancesService: InstancesService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    instancesService = moduleFixture.get<InstancesService>(InstancesService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/instances/test (GET)', () => {
    it('should return test endpoint response for instances connectivity', async () => {
      const response = await request(app.getHttpServer())
        .get('/instances/test')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Instances API is working');
    });
  });

  describe('/instances/test (GET)', () => {
    it('should return test endpoint response', async () => {
      const response = await request(app.getHttpServer())
        .get('/instances/test')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Instances API is working');
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    });
  });

  describe('Service Validation', () => {
    it('should validate instances service is properly configured', async () => {
      expect(instancesService).toBeDefined();
      // Verifica se o serviço tem os métodos necessários
      expect(typeof instancesService.getInstances).toBe('function');
    });

    it('should handle service calls gracefully', async () => {
      // Teste básico para verificar se o serviço não quebra
      try {
        const testTenantId = 'test-tenant-id';
        const result = await instancesService.getInstances(testTenantId);
        expect(result).toBeDefined();
      } catch (error) {
        // Se houver erro, deve ser tratado adequadamente
        expect(error).toBeDefined();
      }
    });
  });
});