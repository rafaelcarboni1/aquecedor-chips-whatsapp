# 🔐 Instruções para Criar Usuário Administrador

Devido às configurações de segurança do Supabase, a criação do usuário administrador deve ser feita manualmente através do Dashboard.

## 📋 Passo a Passo

### 1. Acesse o Dashboard do Supabase
- Vá para: https://supabase.com/dashboard
- Faça login na sua conta
- Selecione seu projeto

### 2. Crie o Usuário
- No menu lateral, clique em **Authentication** > **Users**
- Clique no botão **Add user**
- Preencha os dados:
  - **Email**: `admin@seudominio.com` (use um email real)
  - **Password**: `Admin123456!` (ou uma senha segura de sua escolha)
  - **Email Confirm**: ✅ Marque como confirmado
- Clique em **Create user**

### 3. Copie o User ID
- Após criar o usuário, copie o **User ID** (UUID) que aparece na lista
- Exemplo: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

### 4. Execute o Script de Promoção
```bash
node promote-to-admin.js SEU_USER_ID_AQUI
```

## 🚀 Script Automático de Promoção

O arquivo `promote-to-admin.js` foi criado para facilitar a promoção do usuário para administrador.

### Uso:
```bash
# Substitua pelo ID real do usuário criado no Dashboard
node promote-to-admin.js a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

## ✅ Verificação

Após executar o script, você deve ver:
- ✅ Role de admin criada/atualizada
- 📋 Dados do usuário administrador
- 🎉 Confirmação de sucesso

## 🔒 Segurança

⚠️ **IMPORTANTE:**
- Altere a senha padrão após o primeiro login
- Use um email real que você tenha acesso
- Mantenha as credenciais seguras
- Considere usar 2FA no Supabase Dashboard

## 🐛 Troubleshooting

Se encontrar problemas:
1. Verifique se o User ID está correto
2. Confirme que o usuário foi criado no Dashboard
3. Verifique as variáveis de ambiente (SUPABASE_URL, SUPABASE_ANON_KEY)
4. Execute `npm install` se houver erros de dependências