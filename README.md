# 🔥 Aquecedor de Chips - WhatsApp SaaS

Sistema SaaS para aquecimento automático de números WhatsApp com interface web moderna.

## 🚀 Funcionalidades

- ✅ **Autenticação** - Login/registro via Supabase Auth
- ✅ **Multi-tenant** - Cada usuário tem seu próprio espaço
- ✅ **Conexão WhatsApp** - QR Code para conectar números
- ✅ **Aquecimento Automático** - Rotinas programadas de aquecimento
- ✅ **Dashboard** - Interface para gerenciar sessões
- ✅ **Logs** - Histórico de atividades

## 🏗️ Arquitetura

```
aquecedor-chips/
├── frontend/          # React + Vite + TailwindCSS
├── backend/           # Express.js + whatsapp-web.js
├── shared/            # Tipos e utilitários compartilhados
└── docs/              # Documentação
```

## 🛠️ Tecnologias

### Frontend
- React 18 + Vite
- TailwindCSS
- Zustand (Estado global)
- React Router
- Socket.io Client
- Supabase Auth

### Backend
- Node.js + Express
- whatsapp-web.js
- Socket.io
- Supabase (Database + Auth)
- Node-cron (Agendamento)

## 🚀 Quick Start

### 1. Clone e instale dependências
```bash
git clone <repo-url>
cd aquecedor-chips
npm run install:all
```

### 2. Configure variáveis de ambiente
```bash
cp .env.example .env
# Edite o .env com suas credenciais do Supabase
```

### 3. Configure o Supabase

#### Tabelas necessárias:
```sql
-- Tabela de tenants
CREATE TABLE tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de sessões WhatsApp
CREATE TABLE phone_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT,
  status TEXT DEFAULT 'disconnected',
  qr_code TEXT,
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de logs
CREATE TABLE session_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES phone_sessions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### RLS (Row Level Security):
```sql
-- Habilitar RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Users can only see own tenants" ON tenants
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only see own sessions" ON phone_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only see own logs" ON session_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM phone_sessions 
      WHERE phone_sessions.id = session_logs.session_id 
      AND phone_sessions.user_id = auth.uid()
    )
  );
```

### 4. Execute o projeto
```bash
# Desenvolvimento (frontend + backend)
npm run dev

# Ou separadamente:
npm run dev:backend   # http://localhost:3001
npm run dev:frontend  # http://localhost:5173
```

## 📁 Estrutura de Arquivos

### Frontend (`/frontend`)
```
frontend/
├── pages/
│   ├── login.jsx
│   ├── register.jsx
│   └── dashboard.jsx
├── components/
│   ├── QRCodeCard.jsx
│   └── SessionStatusCard.jsx
├── lib/
│   ├── api.js
│   ├── auth.js
│   └── store.js
└── package.json
```

### Backend (`/backend`)
```
backend/
├── routes/
│   ├── auth.js
│   └── sessions.js
├── controllers/
│   └── sessionController.js
├── services/
│   └── waClientManager.js
├── db/
│   └── supabase.js
└── server.js
```

## 🔐 Segurança

- JWT tokens para autenticação
- RLS (Row Level Security) no Supabase
- Middleware de autenticação em todas as rotas protegidas
- Rate limiting nas APIs
- Validação de dados de entrada

## 🚀 Deploy

### Frontend (Vercel/Netlify)
```bash
npm run build:frontend
# Deploy da pasta frontend/dist
```

### Backend (Railway/Render/Heroku)
```bash
# Configure as variáveis de ambiente
# Deploy da pasta backend/
```

## 📝 Próximos Passos

- [ ] Implementar testes unitários
- [ ] Adicionar monitoramento (logs estruturados)
- [ ] Implementar cache com Redis
- [ ] Adicionar webhooks para eventos
- [ ] Dashboard de analytics
- [ ] Sistema de billing/assinatura

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.