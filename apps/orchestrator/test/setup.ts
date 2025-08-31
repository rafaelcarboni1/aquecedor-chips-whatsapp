import { config } from 'dotenv';

// Carrega variáveis de ambiente para testes
config({ path: '.env.test' });

// Configurações globais para testes
jest.setTimeout(30000);

// Mock do console para testes mais limpos
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};