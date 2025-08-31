# 🚀 Guia de Deploy - Aquecedor de Chips WhatsApp

## Deploy na Vercel

### Pré-requisitos
1. Conta na [Vercel](https://vercel.com)
2. Repositório GitHub conectado
3. Variáveis de ambiente configuradas

### Configuração do Deploy

#### 1. Conectar Repositório
- Acesse [Vercel Dashboard](https://vercel.com/dashboard)
- Clique em "New Project"
- Importe o repositório: `https://github.com/rafaelcarboni1/aquecedor-chips-whatsapp`

#### 2. Configurações do Projeto
```
Framework Preset: Other
Root Directory: ./
Build Command: cd frontend && npm install && npm run build
Output Directory: frontend/dist
Install Command: npm install
```

#### 3. Variáveis de Ambiente
Adicione as seguintes variáveis no painel da Vercel:

**Frontend (.env)**
```
VITE_API_URL=https://seu-dominio.vercel.app/api
VITE_SUPABASE_URL=sua_supabase_url
VITE_SUPABASE_ANON_KEY=sua_supabase_anon_key
```

**Backend (Environment Variables)**
```
SUPABASE_URL=sua_supabase_url
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
JWT_SECRET=seu_jwt_secret_super_seguro
EVOLUTION_API_BASE_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_evolution_api_key
EVOLUTION_WEBHOOK_URL=https://seu-dominio.vercel.app/api/webhooks/evolution
```

#### 4. Configuração de Rotas
O arquivo `vercel.json` já está configurado para:
- Servir o frontend como SPA
- Rotear `/api/*` para o backend
- Configurar funções serverless

### Estrutura do Deploy
```
├── vercel.json          # Configuração da Vercel
├── frontend/
│   ├── dist/           # Build do frontend (incluído no git)
│   └── package.json    # Dependências do frontend
└── backend/
    ├── server.js       # Servidor Express
    └── package.json    # Dependências do backend
```

### Troubleshooting

#### Erro 404 nas rotas
- Verifique se o `vercel.json` está na raiz do projeto
- Confirme se as rotas estão configuradas corretamente

#### Erro de build
- Verifique se todas as dependências estão no `package.json`
- Confirme se o comando de build está correto

#### Erro de API
- Verifique as variáveis de ambiente
- Confirme se o Supabase está configurado
- Teste as rotas localmente primeiro

### Comandos Úteis

```bash
# Build local do frontend
cd frontend && npm run build

# Testar build localmente
cd frontend && npm run preview

# Verificar se todos os arquivos estão no git
git status
git add .
git commit -m "Deploy fixes"
git push origin main
```

### Próximos Passos
1. Configure a Evolution API em seu VPS
2. Atualize as URLs nos arquivos de configuração
3. Teste a integração completa
4. Configure domínio personalizado (opcional)

---

**Importante**: Após o deploy, aguarde alguns minutos para que a Vercel processe todas as funções e rotas.