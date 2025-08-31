# 🚀 Guia de Configuração da Evolution API

## 📋 Status da Migração

✅ **MIGRAÇÃO CONCLUÍDA** - O sistema foi migrado com sucesso do Baileys para Evolution API

### Funcionalidades Implementadas:
- ✅ Serviço Evolution API (`EvolutionApiService.js`)
- ✅ Gerenciamento de instâncias
- ✅ Envio de mensagens
- ✅ Webhooks configurados
- ✅ Rotas atualizadas
- ✅ Compatibilidade mantida
- ✅ Scripts de teste para VPS

---

## 🚀 Configuração da Evolution API

### 🌐 VPS/Servidor Remoto (Sua Configuração Atual)

Como você já tem a Evolution API rodando na sua VPS, vamos configurar a integração:

#### 1. **Teste Interativo da VPS:**
```bash
# Execute o script de teste interativo
node test-vps-evolution.js
```

Este script irá:
- ✅ Solicitar URL da sua VPS
- ✅ Testar conectividade
- ✅ Validar API Key
- ✅ Configurar webhooks
- ✅ Atualizar `.env.evolution` automaticamente

#### 2. **Informações Necessárias:**
- 🌐 **URL da VPS:** `https://sua-vps.com:8080` ou `http://IP:8080`
- 🔑 **API Key:** Sua chave de autenticação da Evolution API
- 🔗 **Webhook URL:** URL pública onde sua aplicação recebe webhooks

#### 3. **Configuração Manual (Alternativa):**
Se preferir configurar manualmente, edite `.env.evolution`:
```env
EVOLUTION_API_BASE_URL=https://sua-vps.com:8080
EVOLUTION_API_KEY=sua-api-key-aqui
EVOLUTION_WEBHOOK_URL=https://seu-dominio.com/api/webhooks/evolution
```

### 🐳 Docker Local (Para Desenvolvimento)

Se quiser testar localmente também:

```bash
# Iniciar Evolution API local
./start-evolution.sh start

# Ou manualmente
docker-compose -f docker-compose.evolution.yml up -d
```

## 📋 Funcionalidades Implementadas

### EvolutionApiService
- ✅ Gerenciamento de instâncias (criar, conectar, desconectar, deletar)
- ✅ Envio de mensagens (texto, mídia, documentos)
- ✅ Verificação de status de conexão
- ✅ Tratamento de webhooks
- ✅ Configuração flexível via .env
- ✅ Logs detalhados para debug
- ✅ Retry automático em falhas

### Rotas Atualizadas
- ✅ `/api/sessions` - Gerenciamento de sessões
- ✅ `/api/webhooks/evolution` - Recebimento de eventos

### Compatibilidade
- ✅ Mantém a mesma interface do WhatsAppService anterior
- ✅ Não quebra funcionalidades existentes
- ✅ Suporte a múltiplas instâncias

## 🔍 Troubleshooting

### Erro 404 nos endpoints
- Verifique se a Evolution API está rodando
- Confirme a URL no `.env.evolution`
- Teste conectividade: `curl http://sua-evolution-api.com/instance/fetchInstances`

### Erro de conexão
- Verifique firewall/proxy
- Confirme se a porta está aberta
- Teste DNS/conectividade de rede

### Webhooks não funcionam
- Verifique se a URL do webhook está acessível externamente
- Use ngrok para testes locais: `ngrok http 3001`
- Confirme se a rota `/api/webhooks/evolution` está ativa

## 📚 Documentação

- [Evolution API Docs](https://doc.evolution-api.com/)
- [GitHub Evolution API](https://github.com/EvolutionAPI/evolution-api)

## 🆘 Suporte

Se encontrar problemas:

1. Execute `node check-evolution-ports.js` para diagnóstico
2. Verifique logs do backend: `npm run dev`
3. Teste endpoints manualmente com curl/Postman
4. Consulte a documentação oficial da Evolution API

---

**🎉 Parabéns! Sua migração está completa e pronta para uso assim que a Evolution API estiver configurada.**