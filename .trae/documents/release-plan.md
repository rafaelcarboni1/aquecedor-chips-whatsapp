# Plano de Release - Mirage WhatsApp Orchestrator

## Visão Geral do Release

### Marcos do Projeto
- **MVP (v0.1)**: Funcionalidades básicas para conectar instâncias e executar conversas simples
- **Beta (v0.2)**: Outreach controlado, métricas avançadas e otimizações
- **Produção (v1.0)**: Sistema completo com monitoramento, segurança e escalabilidade

### Timeline Estimado
- **MVP**: 4-6 semanas
- **Beta**: 2-3 semanas adicionais
- **Produção**: 2-4 semanas de refinamento

---

## Fase MVP (v0.1) - Funcionalidades Essenciais

### Épico 1: Infraestrutura Base
**Duração Estimada**: 1-2 semanas

#### Tasks:
- [ ] **Setup do Monorepo**
  - Configurar pnpm workspaces
  - Estrutura de pastas (apps/, packages/, infra/)
  - Scripts de desenvolvimento e build
  - **Critério**: `pnpm dev` executa dashboard e orchestrator

- [ ] **Configuração do Supabase**
  - Criar projeto Supabase
  - Migrations iniciais (tenants, users, numbers, sessions)
  - Configurar RLS policies
  - **Critério**: Migrations aplicam sem erro e RLS funciona

- [ ] **Setup do NestJS Orchestrator**
  - Estrutura de módulos (Db, Queue, Evolution, AI)
  - Configuração do BullMQ + Redis
  - Health check endpoints
  - **Critério**: API responde em /health com status 200

- [ ] **Setup do Next.js Dashboard**
  - Configuração do App Router
  - Tailwind + shadcn/ui
  - Autenticação com Supabase
  - **Critério**: Login funcional com redirecionamento

### Épico 2: Conexão de Instâncias WhatsApp
**Duração Estimada**: 1-2 semanas

#### Tasks:
- [ ] **Cliente Evolution API**
  - Implementar endpoints básicos (create, qr, status, messages)
  - Autenticação por token
  - Tratamento de erros
  - **Critério**: Consegue criar instância e obter QR

- [ ] **Gestão de Sessões**
  - CRUD de instâncias no dashboard
  - Modal de QR code com polling
  - Status realtime via Supabase Realtime
  - **Critério**: Conectar 2+ instâncias via QR e ver status

- [ ] **Webhook Handler**
  - Endpoint para receber eventos da Evolution
  - Validação de assinatura HMAC
  - Persistência de eventos e mensagens
  - **Critério**: Mensagens aparecem no banco após envio manual

### Épico 3: Sistema de Conversas Básico
**Duração Estimada**: 2 semanas

#### Tasks:
- [ ] **Configuração de Conversas**
  - CRUD de conversas no dashboard
  - Definição de participantes (pares)
  - Configuração básica de tópicos
  - **Critério**: Criar conversa com 2 números

- [ ] **Workers de Mensagem**
  - Worker `generate_reply` com OpenAI
  - Worker `send_message` para Evolution
  - Sistema de delays naturais
  - **Critério**: Bot responde automaticamente com delay

- [ ] **Scheduler Básico**
  - Cron job para verificar conversas ativas
  - Execução de rounds simples (2-4 trocas)
  - Respeito a configurações de delay
  - **Critério**: Round automático executado com sucesso

### Épico 4: Configurações e Personas
**Duração Estimada**: 1 semana

#### Tasks:
- [ ] **Gestão de Personas**
  - CRUD de personas no dashboard
  - Saudações por período (manhã/tarde/noite)
  - Estilos de conversa
  - **Critério**: Persona aplicada em conversa gera resposta no estilo

- [ ] **Configurações Globais**
  - Página de settings com delays min/max
  - Configuração de quiet hours
  - Limites de burst por hora
  - **Critério**: Configurações aplicadas em tempo real

### Critérios de Aceite MVP
✅ **Conectividade**: Conectar 2+ instâncias via QR, status realtime funcionando  
✅ **Conversas**: Executar round de conversa (2-4 trocas) com delays naturais  
✅ **Configuração**: Aplicar personas e configurações globais  
✅ **Persistência**: Mensagens salvas no banco com metadata correta  
✅ **RLS**: Usuário de outro tenant não acessa dados  

---

## Fase Beta (v0.2) - Funcionalidades Avançadas

### Épico 5: Sistema de Agendamento
**Duração Estimada**: 1 semana

#### Tasks:
- [ ] **Calendário de Conversas**
  - Interface de agendamento semanal
  - Janelas manhã/tarde/noite por dia
  - Configuração de rounds e pausas
  - **Critério**: Agenda respeitada automaticamente

- [ ] **Scheduler Avançado**
  - Verificação de janelas ativas
  - Distribuição de rounds por janela
  - Pausas entre rounds
  - **Critério**: Múltiplas conversas agendadas sem conflito

### Épico 6: Sistema de Outreach
**Duração Estimada**: 1-2 semanas

#### Tasks:
- [ ] **Gestão de Contatos**
  - CRUD de contatos externos
  - Upload de CSV
  - Sistema de tags
  - **Critério**: Importar 100+ contatos via CSV

- [ ] **Políticas de Outreach**
  - Configuração de limites diários/horários
  - Definição de dayparts permitidos
  - Keywords de opt-out
  - **Critério**: Política aplicada com limites respeitados

- [ ] **Execução de Outreach**
  - Worker para outreach controlado
  - Quotas Redis por número
  - Opt-out automático
  - **Critério**: Outreach para 2 contatos com opt-out funcionando

### Épico 7: Métricas e Analytics
**Duração Estimada**: 1 semana

#### Tasks:
- [ ] **Dashboard de Métricas**
  - Gráficos com Recharts
  - Mensagens por dia (7d)
  - Heatmap por hora
  - **Critério**: Métricas atualizadas em tempo real

- [ ] **Views Materializadas**
  - Agregações de performance
  - Refresh automático via cron
  - Estatísticas por número
  - **Critério**: Consultas de métricas < 500ms

### Critérios de Aceite Beta
✅ **Agendamento**: Conversas executadas em janelas específicas  
✅ **Outreach**: Contato com humanos respeitando quotas e opt-out  
✅ **Métricas**: Dashboard com gráficos de 7 dias funcionando  
✅ **Performance**: Sistema suporta 10+ instâncias simultâneas  
✅ **Conformidade**: Quiet hours e limites rigorosamente respeitados  

---

## Fase Produção (v1.0) - Refinamentos

### Épico 8: Segurança e Monitoramento
**Duração Estimada**: 1-2 semanas

#### Tasks:
- [ ] **MFA Obrigatório**
  - Implementar TOTP via Supabase
  - Bloquear operações sensíveis sem MFA
  - **Critério**: Admin não consegue criar instância sem MFA

- [ ] **Logs Estruturados**
  - Logger JSON com correlação IDs
  - Métricas de performance
  - Alertas automáticos
  - **Critério**: Logs permitem debug de problemas

- [ ] **Backup e Recovery**
  - Configurar PITR no Supabase
  - Documentar procedimentos
  - Testes de restore
  - **Critério**: Recovery de dados < 1 hora

### Épico 9: Otimizações e Escalabilidade
**Duração Estimada**: 1-2 semanas

#### Tasks:
- [ ] **Cache Redis**
  - Cache de configurações frequentes
  - Cache de status de instâncias
  - TTL apropriado
  - **Critério**: Redução de 50% nas consultas ao banco

- [ ] **Rate Limiting**
  - Limites por tenant
  - Proteção contra abuse
  - Headers informativos
  - **Critério**: API protegida contra spam

- [ ] **Docker Production**
  - Multi-stage builds
  - Health checks
  - Configuração para produção
  - **Critério**: Deploy via Docker funcional

### Critérios de Aceite Produção
✅ **Segurança**: MFA obrigatório, tokens rotacionáveis, HTTPS  
✅ **Monitoramento**: Logs estruturados, métricas, alertas  
✅ **Performance**: < 200ms response time, cache efetivo  
✅ **Escalabilidade**: Suporta 50+ instâncias por tenant  
✅ **Conformidade**: Documentação de riscos e mitigações  

---

## Riscos e Mitigações

### Riscos Técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|----------|
| Evolution API instável | Alta | Alto | Implementar circuit breaker, retry exponencial |
| Rate limits OpenAI | Média | Médio | Cache de respostas, fallbacks |
| Performance do Supabase | Baixa | Alto | Otimizar queries, usar views materializadas |
| Complexidade do scheduler | Média | Médio | Testes extensivos, logs detalhados |

### Riscos de Negócio

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|----------|
| Violação ToS WhatsApp | Alta | Crítico | Cadência humana, quiet hours, opt-out |
| Ban de números | Média | Alto | Rotação de números, limites conservadores |
| Classificação como spam | Média | Alto | Opt-out imediato, gaps entre mensagens |
| Problemas legais | Baixa | Crítico | Documentação clara, termos de uso |

### Plano de Contingência

1. **Ban de Números**: Sistema de rotação automática, backup de instâncias
2. **API Instável**: Fallback para modo manual, notificações de status
3. **Overload**: Auto-scaling de workers, circuit breakers
4. **Problemas Legais**: Kill switch global, logs de auditoria

---

## Definição de Pronto

Uma funcionalidade está completa quando:

✅ **Implementada** conforme especificação  
✅ **Testada** (unitários + integração)  
✅ **Documentada** (código + usuário)  
✅ **Revisada** por pelo menos 1 pessoa  
✅ **Deployada** em ambiente de teste  
✅ **Validada** pelos critérios de aceite  

## Métricas de Sucesso

### MVP
- 2+ instâncias conectadas simultaneamente
- 100+ mensagens processadas sem erro
- Tempo de resposta < 2 segundos
- Zero vazamentos de dados entre tenants

### Beta
- 10+ instâncias por tenant
- 1000+ mensagens/dia processadas
- Outreach com 0% de reclamações
- Métricas atualizadas em < 5 minutos

### Produção
- 50+ instâncias por tenant
- 99.9% uptime
- < 200ms response time
- Zero inc