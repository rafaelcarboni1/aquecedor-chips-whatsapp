/**
 * Entry point for serverless deployment
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export async function createApp() {
  const app = await NestFactory.create(AppModule);
  return app;
}

// For serverless environments
export default async function handler(req: any, res: any) {
  const app = await createApp();
  await app.init();
  return app.getHttpAdapter().getInstance()(req, res);
}