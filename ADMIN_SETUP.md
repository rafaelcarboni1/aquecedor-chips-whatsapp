# 🔐 Configuração do Usuário Administrador

Guia completo para configurar o sistema de administração do Aquecedor de Chips.

## 📋 Pré-requisitos

- Projeto Supabase criado e configurado
- Variáveis de ambiente configuradas no backend
- Backend rodando (opcional, mas recomendado para testes)

## 🚀 Configuração Rápida (Recomendado)

### Passo 1: Configure as Variáveis de Ambiente

No arquivo `backend/.env`, configure suas credenciais reais do Supabase:

```env
# Supabase Configuration
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anonima_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui
```

> ⚠️ **Importante**: A `SUPABASE_SERVICE_ROLE_KEY` é necessária para criar usuários via script.

### Passo 2: Execute o Script de Configuração

```bash
# Navegar para o diretório do backend
cd backend

# Executar setup do banco de dados
node -e "console.log('Execute o conteúdo do arquivo db/setup.sql no Supabase SQL Editor')"

# Criar usuário administrador
node scripts/create-admin.js
```

Ou com credenciais personalizadas:

```bash
node scripts/create-admin.js seu-email@exemplo.com SuaSenhaSegura123
```

### Passo 3: Configurar Banco de Dados

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para **SQL Editor**
3. Execute o conteúdo do arquivo `backend/db/setup.sql`
4. Aguarde a confirmação de sucesso

## 🛠️ Configuração Manual (Alternativa)

### 1. Configurar Banco de Dados

Execute o script SQL no Supabase:

```sql
-- Copie e cole o conteúdo completo do arquivo backend/db/setup.sql
```

### 2. Criar Usuário via Dashboard

1. No Supabase Dashboard: **Authentication > Users**
2. Clique em **Add user**
3. Preencha:
   - **Email**: `admin@aquecedordechips.com`
   - **Password**: `Admin123!@#`
   - **Email Confirm**: ✅
4. Copie o **User ID** gerado

### 3. Promover a Administrador

No SQL Editor do Supabase:

```sql
-- Substitua USER_ID_AQUI pelo ID copiado
SELECT promote_to_admin('USER_ID_AQUI');

-- Verificar se funcionou
SELECT u.email, ur.role, ur.permissions 
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@aquecedordechips.com';
```

## 🧪 Testando o Sistema

### 1. Testar Login

```bash
# Iniciar o backend (se não estiver rodando)
cd backend
npm run dev

# Em outro terminal, iniciar o frontend
cd frontend
npm run dev
```

### 2. Fazer Login como Admin

1. Acesse `http://localhost:5173`
2. Faça login com:
   - **Email**: `admin@aquecedordechips.com`
   - **Senha**: `Admin123!@#`

### 3. Verificar Permissões

Teste as rotas administrativas:

```bash
# Obter token de autenticação (faça login primeiro)
# Depois teste as rotas admin:

curl -H "Authorization: Bearer SEU_TOKEN" \
     http://localhost:3001/api/admin/users

curl -H "Authorization: Bearer SEU_TOKEN" \
     http://localhost:3001/api/admin/stats
```

## 🔧 Troubleshooting

### Erro: "SUPABASE_SERVICE_ROLE_KEY is required"

**Solução**: Configure a chave service role no arquivo `.env`:

1. Acesse Supabase Dashboard > Settings > API
2. Copie a "service_role" key (não a "anon" key)
3. Cole no arquivo `.env`

### Erro: "User already exists"

**Solução**: O script automaticamente promove usuários existentes. Se persistir:

```sql
-- Verificar usuário existente
SELECT id, email FROM auth.users WHERE email = 'admin@aquecedordechips.com';

-- Promover manualmente (substitua o ID)
SELECT promote_to_admin('USER_ID_AQUI');
```

### Erro: "Invalid login credentials"

**Possíveis causas**:
1. Email não confirmado
2. Senha incorreta
3. Usuário não existe

**Solução**:
```sql
-- Verificar status do usuário
SELECT email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'admin@aquecedordechips.com';

-- Se email_confirmed_at for NULL, confirme manualmente:
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'admin@aquecedordechips.com';
```

### Erro: "Insufficient permissions"

**Solução**: Verificar se o role foi criado corretamente:

```sql
-- Verificar role do usuário
SELECT u.email, ur.role, ur.permissions
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@aquecedordechips.com';

-- Se não tiver role, criar:
INSERT INTO user_roles (user_id, role, permissions)
SELECT id, 'admin', '{"manage_users": true, "manage_sessions": true, "view_all_logs": true}'
FROM auth.users 
WHERE email = 'admin@aquecedordechips.com';
```

## 📊 Funcionalidades do Admin

O usuário administrador tem acesso a:

### Rotas da API
- `GET /api/admin/users` - Listar todos os usuários
- `GET /api/admin/users/:id` - Detalhes de um usuário
- `PUT /api/admin/users/:id/role` - Alterar role de usuário
- `DELETE /api/admin/users/:id` - Deletar usuário
- `GET /api/admin/stats` - Estatísticas do sistema

### Permissões
- `manage_users`: Gerenciar usuários e roles
- `manage_sessions`: Gerenciar sessões WhatsApp de todos os usuários
- `view_all_logs`: Ver logs de todos os usuários
- `system_admin`: Acesso total ao sistema

## 🔒 Segurança

### Boas Práticas

1. **Altere a senha padrão** após o primeiro login
2. **Use email real** para receber notificações
3. **Habilite 2FA** no Supabase (se disponível)
4. **Monitore logs** de acesso administrativo
5. **Limite usuários admin** ao mínimo necessário

### Em Produção

```env
# Use senhas complexas
ADMIN_PASSWORD=SenhaComplexaComNumeros123!@#

# Configure domínio real
CORS_ORIGIN=https://seudominio.com

# Habilite HTTPS
NODE_ENV=production
```

## 📝 Logs e Monitoramento

Para monitorar atividades administrativas:

```sql
-- Ver últimas ações de admin
SELECT 
  sl.message,
  sl.created_at,
  u.email as admin_email
FROM session_logs sl
JOIN auth.users u ON sl.user_id = u.id
JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY sl.created_at DESC
LIMIT 50;
```

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs do backend: `tail -f logs/application.log`
2. Verifique o console do navegador para erros frontend
3. Teste as rotas da API diretamente com curl/Postman
4. Consulte a documentação do Supabase

---

**Credenciais Padrão do Administrador:**
- 📧 **Email**: `admin@aquecedordechips.com`
- 🔑 **Senha**: `Admin123!@#`
- 👤 **Role**: `admin`

> ⚠️ **Lembre-se**: Altere essas credenciais após o primeiro acesso!