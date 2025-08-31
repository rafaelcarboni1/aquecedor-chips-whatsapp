# Aquecedor de Chips - Backend

Backend API para o sistema de aquecimento de sessões WhatsApp.

## 🚀 Tecnologias

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **Supabase** - Backend as a Service (autenticação e banco de dados)
- **whatsapp-web.js** - Biblioteca para integração com WhatsApp Web
- **node-cron** - Agendamento de tarefas
- **Winston** - Sistema de logs
- **Jest** - Framework de testes

## 📋 Pré-requisitos

- Node.js >= 18.0.0
- npm >= 8.0.0
- Conta no Supabase
- Google Chrome (para whatsapp-web.js)

## 🔧 Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd backend
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Configurações obrigatórias
PORT=3001
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret_key_here
CORS_ORIGIN=http://localhost:3000
```

4. **Configure o banco de dados no Supabase**

Execute as seguintes queries SQL no Supabase:

```sql
-- Tabela de sessões WhatsApp
CREATE TABLE whatsapp_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  status VARCHAR(20) DEFAULT 'disconnected',
  warmup_active BOOLEAN DEFAULT false,
  messages_sent INTEGER DEFAULT 0,
  warmup_count INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de logs de sessão
CREATE TABLE session_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  level VARCHAR(10) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Função para incrementar contador de mensagens
CREATE OR REPLACE FUNCTION increment_message_count(session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE whatsapp_sessions 
  SET messages_sent = messages_sent + 1,
      last_activity = NOW(),
      updated_at = NOW()
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql;

-- Função para incrementar contador de aquecimento
CREATE OR REPLACE FUNCTION increment_warmup_count(session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE whatsapp_sessions 
  SET warmup_count = warmup_count + 1,
      last_activity = NOW(),
      updated_at = NOW()
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql;

-- Índices para performance
CREATE INDEX idx_whatsapp_sessions_user_id ON whatsapp_sessions(user_id);
CREATE INDEX idx_whatsapp_sessions_status ON whatsapp_sessions(status);
CREATE INDEX idx_session_logs_session_id ON session_logs(session_id);
CREATE INDEX idx_session_logs_created_at ON session_logs(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Users can view own sessions" ON whatsapp_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON whatsapp_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON whatsapp_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON whatsapp_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own session logs" ON session_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can insert session logs" ON session_logs
  FOR INSERT WITH CHECK (true);
```

## 🚀 Executando

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

### Testes
```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Executar testes com coverage
npm run test:coverage
```

### Linting e Formatação
```bash
# Verificar código
npm run lint

# Corrigir problemas automaticamente
npm run lint:fix

# Formatar código
npm run format
```

## 📚 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Renovar token
- `POST /api/auth/forgot-password` - Recuperar senha
- `POST /api/auth/reset-password` - Redefinir senha

### Usuários
- `GET /api/users/profile` - Obter perfil
- `PUT /api/users/profile` - Atualizar perfil
- `GET /api/users/stats` - Estatísticas do usuário
- `PUT /api/users/change-password` - Alterar senha
- `DELETE /api/users/account` - Excluir conta

### Sessões WhatsApp
- `GET /api/sessions` - Listar sessões
- `POST /api/sessions` - Criar sessão
- `GET /api/sessions/:id` - Obter sessão específica
- `DELETE /api/sessions/:id` - Excluir sessão
- `GET /api/sessions/:id/qr` - Obter QR Code
- `GET /api/sessions/:id/logs` - Obter logs da sessão

### Aquecimento
- `POST /api/sessions/:id/warmup/start` - Iniciar aquecimento
- `POST /api/sessions/:id/warmup/stop` - Parar aquecimento

### Saúde da API
- `GET /api/health` - Status básico
- `GET /api/health/detailed` - Status detalhado
- `GET /api/health/ready` - Probe de prontidão
- `GET /api/health/live` - Probe de vivacidade

## 🏗️ Estrutura do Projeto

```
backend/
├── middleware/          # Middlewares personalizados
│   ├── auth.js         # Autenticação JWT
│   └── errorHandler.js # Tratamento de erros
├── routes/             # Definição das rotas
│   ├── auth.js        # Rotas de autenticação
│   ├── users.js       # Rotas de usuários
│   ├── sessions.js    # Rotas de sessões
│   └── health.js      # Rotas de saúde
├── services/          # Lógica de negócio
│   ├── WhatsAppService.js # Gerenciamento WhatsApp
│   └── WarmupService.js   # Serviço de aquecimento
├── logs/              # Arquivos de log
├── sessions/          # Sessões WhatsApp (gerado)
├── server.js          # Ponto de entrada
├── package.json       # Dependências e scripts
└── .env.example       # Exemplo de variáveis de ambiente
```

## 🔒 Segurança

- **Helmet** - Headers de segurança
- **Rate Limiting** - Limitação de requisições
- **CORS** - Controle de origem cruzada
- **JWT** - Autenticação baseada em tokens
- **Supabase RLS** - Segurança em nível de linha
- **Input Validation** - Validação de entrada com express-validator

## 📊 Monitoramento

- **Winston** - Sistema de logs estruturados
- **Morgan** - Log de requisições HTTP
- **Health Checks** - Endpoints de monitoramento
- **Error Tracking** - Captura e log de erros

## 🔧 Configuração de Produção

### Variáveis de Ambiente Importantes

```env
NODE_ENV=production
PORT=3001
LOG_LEVEL=warn
RATE_LIMIT_MAX_REQUESTS=50
ENABLE_RATE_LIMITING=true
```

### Docker (Opcional)

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Instalar dependências do sistema para Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Configurar Puppeteer para usar Chromium instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

USER node

CMD ["npm", "start"]
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro de conexão com Supabase**
   - Verifique as variáveis `SUPABASE_URL` e `SUPABASE_ANON_KEY`
   - Confirme que o projeto Supabase está ativo

2. **WhatsApp não conecta**
   - Verifique se o Chrome está instalado
   - Limpe a pasta `sessions/`
   - Verifique os logs da sessão

3. **Erro de permissão**
   - Verifique as políticas RLS no Supabase
   - Confirme que o token JWT é válido

4. **Performance lenta**
   - Verifique os índices do banco de dados
   - Monitore os logs de performance
   - Considere implementar cache Redis

### Logs

Os logs são salvos em `./logs/` e rotacionados diariamente:
- `application.log` - Logs gerais
- `error.log` - Apenas erros
- `combined.log` - Todos os logs

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte, envie um email para suporte@aquecedorchips.com ou abra uma issue no GitHub.