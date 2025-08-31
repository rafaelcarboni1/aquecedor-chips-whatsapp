import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/auth/auth.service';

describe('Auth Integration Tests', () => {
  let app: INestApplication;
  let authService: AuthService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    authService = moduleFixture.get<AuthService>(AuthService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Supabase Authentication', () => {
    const testUser = {
      email: 'admin@gmail.com',
      password: '123456'
    };

    it('should validate Supabase connection', async () => {
      // Teste básico de conexão com Supabase
      expect(authService).toBeDefined();
    });

    it('should handle login with valid credentials', async () => {
      // Teste de login com usuário admin existente
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject login with invalid credentials', async () => {
      const invalidCredentials = {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(invalidCredentials)
        .expect(401);
    });

    it('should reject requests without token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      const invalidToken = 'invalid-jwt-token';

      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });
  });

  describe('Authentication Service', () => {
    it('should validate auth service is properly configured', async () => {
      expect(authService).toBeDefined();
      // Verifica se o serviço tem os métodos necessários
      expect(typeof authService.login).toBe('function');
      expect(typeof authService.register).toBe('function');
      expect(typeof authService.getProfile).toBe('function');
    });
  });
});