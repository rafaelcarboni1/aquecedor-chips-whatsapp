# Criação de Usuário Administrador

## Passo 1: Configure o Supabase

1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para **SQL Editor**
3. Execute o script `setup.sql` para criar as tabelas e funções necessárias

## Passo 2: Crie o Usuário Admin

### Opção A: Via Dashboard do Supabase (Recomendado)

1. No Supabase Dashboard, vá para **Authentication > Users**
2. Clique em **Add user**
3. Preencha:
   - **Email**: `admin@aquecedordechips.com` (ou seu email preferido)
   - **Password**: `Admin123!@#` (ou uma senha segura)
   - **Email Confirm**: ✅ (marque como confirmado)
4. Clique em **Create user**
5. Copie o **User ID** que aparecerá na lista

### Opção B: Via SQL (Alternativa)

```sql
-- Inserir usuário diretamente na tabela auth.users
-- ATENÇÃO: Use apenas se a Opção A não funcionar
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  'admin@aquecedordechips.com',
  crypt('Admin123!@#', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Administrador"}',
  false,
  'authenticated'
);
```

## Passo 3: Promover a Administrador

Após criar o usuário, execute no SQL Editor:

```sql
-- Substitua 'USER_ID_AQUI' pelo ID do usuário criado
SELECT promote_to_admin('USER_ID_AQUI');

-- Verificar se foi promovido corretamente
SELECT u.email, ur.role, ur.permissions 
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@aquecedordechips.com';
```

## Passo 4: Configurar Variáveis de Ambiente

No arquivo `backend/.env`, configure suas credenciais reais do Supabase:

```env
# Supabase Configuration
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anonima_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui
```

## Passo 5: Testar o Login

1. Acesse o frontend em `http://localhost:5173`
2. Faça login com:
   - **Email**: `admin@aquecedordechips.com`
   - **Senha**: `Admin123!@#` (ou a senha que você definiu)

## Credenciais Padrão do Admin

- **Email**: `admin@aquecedordechips.com`
- **Senha**: `Admin123!@#`
- **Role**: `admin`
- **Permissões**:
  - `manage_users`: true
  - `manage_sessions`: true
  - `view_all_logs`: true

## Segurança

⚠️ **IMPORTANTE**: 
- Altere a senha padrão após o primeiro login
- Use um email real para receber notificações
- Em produção, use senhas mais complexas
- Considere habilitar 2FA no Supabase

## Troubleshooting

### Erro: "Invalid login credentials"
- Verifique se o email foi confirmado no Supabase
- Confirme se as variáveis de ambiente estão corretas
- Verifique se o usuário existe na tabela `auth.users`

### Erro: "User not found"
- Execute novamente o script `setup.sql`
- Verifique se o trigger `on_auth_user_created` está ativo
- Crie manualmente o registro na tabela `user_roles`

### Verificar Status do Admin

```sql
-- Verificar se o usuário existe e tem role de admin
SELECT 
  u.id,
  u.email,
  u.created_at,
  ur.role,
  ur.permissions
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@aquecedordechips.com';
```