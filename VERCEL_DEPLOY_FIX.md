# Guia para Resolver Problemas de Deploy na Vercel

## Problema Identificado
O GitHub foi atualizado mas a Vercel não está fazendo deploy automático dos commits.

## Causas Mais Comuns

### 1. **Email do Autor dos Commits não corresponde à conta Vercel** ⚠️
**Status Atual:**
- Email dos commits: `rafaeldacunhacarboni@gmail.com`
- Autor: `Rafael da Cunha Carboni`

**Verificação Necessária:**
- Confirmar se este email está associado à conta Vercel
- Se não estiver, você precisa usar o email correto da conta Vercel

### 2. **Conexão GitHub-Vercel Desatualizada**
- A integração GitHub pode ter perdido permissões
- Webhooks podem não estar configurados corretamente

### 3. **Configurações de Branch/Projeto**
- Branch de produção pode estar configurada incorretamente
- Permissões de repositório podem estar limitadas

## Soluções Passo a Passo

### Solução 1: Verificar e Corrigir Email (MAIS PROVÁVEL)

1. **Acesse sua conta Vercel:**
   - Vá em Settings → Account
   - Verifique qual email está associado à conta

2. **Se o email for diferente, configure o Git localmente:**
   ```bash
   # Substitua pelo email correto da sua conta Vercel
   git config user.email "seu-email-da-vercel@exemplo.com"
   
   # Faça um commit pequeno para testar
   echo " " >> README.md
   git add README.md
   git commit -m "test: Teste deploy com email correto"
   git push origin main
   ```

### Solução 2: Reconfigurar Integração GitHub-Vercel

1. **Na Vercel:**
   - Vá no projeto → Settings → Git
   - Disconnect o repositório
   - Reconnect o repositório

2. **No GitHub:**
   - Settings → Applications → Installed GitHub Apps
   - Configure Vercel com "All repositories" ou adicione este repo específico

### Solução 3: Deploy Hook (Alternativa Garantida)

1. **Na Vercel:**
   - Projeto → Settings → Git → Deploy Hooks
   - Create Hook:
     - Name: "Auto Deploy"
     - Branch: "main"
     - Copie a URL gerada

2. **No GitHub:**
   - Repositório → Settings → Webhooks → Add webhook
   - Payload URL: Cole a URL do Deploy Hook
   - Content type: `application/json`
   - Events: "Just the push event"
   - Active: ✅

### Solução 4: Verificar Configurações do Projeto

1. **Na Vercel - Build Settings:**
   - Framework Preset: `Other`
   - Root Directory: `./`
   - Build Command: `cd frontend && npm run build`
   - Output Directory: `frontend/dist`
   - Install Command: `npm install`

2. **Verificar Branch de Produção:**
   - Settings → Git → Production Branch deve ser `main`

## Verificação de Sucesso

Após aplicar as soluções:

1. **Faça um commit de teste:**
   ```bash
   echo "# Deploy Test $(date)" >> DEPLOY_TEST.md
   git add DEPLOY_TEST.md
   git commit -m "test: Verificação de deploy automático"
   git push origin main
   ```

2. **Monitore na Vercel:**
   - Vá na aba "Deployments"
   - Deve aparecer um novo deployment em alguns segundos
   - Se aparecer "Building" ou "Ready", o problema foi resolvido

3. **Verifique comentários do Vercel Bot:**
   - No GitHub, o Vercel Bot deve comentar no commit
   - Comentários indicam sucesso ou falha

## Logs de Debug

**Informações do Repositório:**
- URL: `https://github.com/rafaelcarboni1/aquecedor-chips-whatsapp.git`
- Branch: `main`
- Último commit: `9b8f44c - docs: Adiciona guia de deploy e configurações de produção`

**Configuração Git Local:**
- Nome: `Rafael da Cunha Carboni`
- Email: `rafaeldacunhacarboni@gmail.com`

## Próximos Passos

1. ✅ Verificar email da conta Vercel
2. ✅ Aplicar Solução 1 se necessário
3. ✅ Testar deploy com commit
4. ✅ Se não funcionar, aplicar Solução 3 (Deploy Hook)
5. ✅ Documentar solução que funcionou

---

**Nota:** A Solução 3 (Deploy Hook) é a mais garantida e funciona independentemente de problemas de autenticação ou webhooks.