# Configuração de Deploy Hook na Vercel

## O que é um Deploy Hook?
Um Deploy Hook é uma URL especial que, quando chamada, força um deploy na Vercel. É uma solução garantida para problemas de webhook automático.

## Passo a Passo para Configurar

### 1. Criar Deploy Hook na Vercel

1. **Acesse seu projeto na Vercel:**
   - Vá para [vercel.com/dashboard](https://vercel.com/dashboard)
   - Selecione o projeto `aquecedor-chips-whatsapp`

2. **Configure o Deploy Hook:**
   - Vá em **Settings** → **Git**
   - Role até a seção **Deploy Hooks**
   - Clique em **Create Hook**
   - Preencha:
     - **Hook Name:** `Auto Deploy Main`
     - **Git Branch:** `main`
   - Clique **Create Hook**
   - **COPIE A URL GERADA** (algo como: `https://api.vercel.com/v1/integrations/deploy/...`)

### 2. Configurar Webhook no GitHub

1. **Acesse o repositório no GitHub:**
   - Vá para [github.com/rafaelcarboni1/aquecedor-chips-whatsapp](https://github.com/rafaelcarboni1/aquecedor-chips-whatsapp)

2. **Configure o Webhook:**
   - Vá em **Settings** → **Webhooks**
   - Clique **Add webhook**
   - Preencha:
     - **Payload URL:** Cole a URL do Deploy Hook da Vercel
     - **Content type:** `application/json`
     - **Which events:** Selecione "Just the push event"
     - **Active:** ✅ Marcado
   - Clique **Add webhook**

### 3. Testar o Deploy Hook

Após configurar, faça um teste:

```bash
# Faça um pequeno commit
echo "Deploy hook test $(date)" >> DEPLOY_HOOK_TEST.md
git add DEPLOY_HOOK_TEST.md
git commit -m "test: Deploy hook configuration test"
git push origin main
```

### 4. Verificar Funcionamento

1. **No GitHub:**
   - Vá em Settings → Webhooks
   - Clique no webhook criado
   - Vá na aba "Recent Deliveries"
   - Deve mostrar entregas com status 200 (sucesso)

2. **Na Vercel:**
   - Vá na aba "Deployments"
   - Deve aparecer um novo deployment
   - Status deve ser "Building" → "Ready"

## Vantagens do Deploy Hook

✅ **Funciona independentemente de problemas de autenticação**
✅ **Não depende da integração GitHub-Vercel**
✅ **Deploy garantido a cada push**
✅ **Fácil de configurar e testar**

## Troubleshooting

### Se o webhook não funcionar:

1. **Verifique a URL do Deploy Hook:**
   - Deve começar com `https://api.vercel.com/v1/integrations/deploy/`
   - Não deve ter espaços ou caracteres especiais

2. **Teste manualmente:**
   ```bash
   # Substitua pela sua URL do Deploy Hook
   curl -X POST "https://api.vercel.com/v1/integrations/deploy/SEU_HOOK_AQUI"
   ```

3. **Verifique permissões:**
   - Certifique-se de que você é admin do repositório GitHub
   - Certifique-se de que você é owner/member do projeto Vercel

### Se ainda não funcionar:

**Opção 1: Deploy Manual via CLI**
```bash
# Instale a Vercel CLI
npm i -g vercel

# Faça login
vercel login

# Deploy manual
vercel --prod
```

**Opção 2: GitHub Actions (Automação)**
Crie `.github/workflows/deploy.yml` para deploy automático via GitHub Actions.

## Status Atual

- ✅ Commit de teste enviado (aa7166e)
- ⏳ Aguardando configuração do Deploy Hook
- ⏳ Teste de funcionamento pendente

---

**Próximo passo:** Configure o Deploy Hook seguindo os passos acima e teste com um novo commit.