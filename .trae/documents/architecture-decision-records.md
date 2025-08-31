# Architecture Decision Records (ADRs)

## ADR-001: Multi-Tenancy com Supabase RLS

**Status**: Aceito  
**Data**: 2024-01-15  
**Decisores**: Equipe de Arquitetura

### Contexto
Precisamos implementar isolamento de dados entre diferentes clientes (tenants) no sistema SaaS, garantindo segurança e performance.

### Decisão
Utilizar Row Level Security (RLS) do PostgreSQL via Supabase para implementar multi-tenancy, com claim JWT `app.tenant_id` para identificação do tenant.

### Consequências
**Positivas:**
- Isolamento automático de dados no nível do banco
- Menor complexidade na aplicação
- Performance superior ao schema-per-tenant
- Suporte nativo do Supabase

**Negativas:**
- Dependência do PostgreSQL/Supabase
- Debugging mais complexo
- Necessidade de configurar claims JWT corretamente

### Implementação
```sql
-- Exemplo de política RLS
CREATE POLICY "tenant_isolation" ON table_name
    FOR ALL USING (tenant_id::text = auth.jwt() ->> 'app.tenant_id');
```

---

## ADR-002: BullMQ para Processamento de Filas

**Status**: Aceito  
**Data**: 2024-01-15  
**Decisores**: Equipe de Backend

### Contexto
Necessidade de processamento assíncrono para:
- Geração de respostas via OpenAI
- Envio de mensagens com delays naturais
- Agendamento de conversas
- Processamento de webhooks

### Decisão
Utilizar BullMQ com Redis para gerenciamento de filas, oferecendo recursos avançados como delays, retries e priorização.

### Consequências
**Positivas:**
- Delays precisos para naturalidade das conversas
- Retry automático em falhas
- Dashboard de monitoramento
- Escalabilidade horizontal
- Persistência de jobs

**Negativas:**
- Dependência do Redis
- Complexidade adicional na infraestrutura
- Necessidade de monitoramento de filas

### Workers Implementados
- `generate_reply`: Geração de respostas via IA
- `send_message`: Envio para Evolution API
- `conversation_scheduler`: Agendamento de rounds
- `outreach_scheduler`: Gestão de outreach

---

## ADR-003: Integração com Evolution API

**Status**: Aceito  
**Data**: 2024-01-15  
**Decisores**: Equipe de Integração

### Contexto
Necessidade de conectar múltiplas instâncias WhatsApp de forma programática, com suporte a QR codes e webhooks.

### Decisão
Utilizar Evolution API como middleware para WhatsApp, implementando cliente HTTP simples com autenticação por token.

### Consequências
**Positivas:**
- API REST padronizada
- Suporte a múltiplas instâncias
- Webhooks para eventos em tempo real
- QR codes para conexão
- Comunidade ativa

**Negativas:**
- Dependência externa crítica
- Possível violação de ToS do WhatsApp
- Necessidade de infraestrutura adicional
- Tokens precisam ser rotacionados

### Endpoints Utilizados
```typescript
// Principais endpoints
POST /instances          // Criar instância
GET /instances/:id/qr    // Obter QR code
GET /instances/:id/status // Status da conexão
POST /instances/:id/messages // Enviar mensagem
```

---

## ADR-004: Scheduler de Conversas com Cron Jobs

**Status**: Aceito  
**Data**: 2024-01-15  
**Decisores**: Equipe de Backend

### Contexto
Necessidade de executar conversas automatizadas em horários específicos (manhã/tarde/noite) com cadência natural.

### Decisão
Implementar scheduler baseado em cron jobs que verifica janelas ativas a cada 60 segundos e enfileira rounds de conversa.

### Consequências
**Positivas:**
- Controle preciso de horários
- Respeito a quiet hours
- Flexibilidade por conversa
- Cadência natural com delays

**Negativas:**
- Complexidade na lógica de agendamento
- Necessidade de sincronização entre workers
- Possível sobreposição de rounds

### Estrutura de Agendamento
```typescript
interface ConversationSchedule {
  day: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
  morning_enabled: boolean;
  morning_window: { start: string; end: string };
  afternoon_enabled: boolean;
  afternoon_window: { start: string; end: string };
  evening_enabled: boolean;
  evening_window: { start: string; end: string };
  max_rounds_per_window: number;
  pause_between_rounds_min: number;
  pause_between_rounds_max: number;
}
```

---

## ADR-005: Sistema de Outreach Controlado

**Status**: Aceito  
**Data**: 2024-01-15  
**Decisores**: Equipe de Produto

### Contexto
Necessidade de contatar humanos externos respeitando limites, opt-outs e janelas de tempo para evitar spam.

### Decisão
Implementar sistema de outreach com políticas granulares, quotas Redis e opt-out automático por keywords.

### Consequências
**Positivas:**
- Conformidade com boas práticas
- Controle de volume por hora/dia
- Opt-out imediato
- Rastreamento de rounds por contato

**Negativas:**
- Complexidade na gestão de quotas
- Necessidade de monitoramento constante
- Risco de classificação como spam

### Políticas de Outreach
```typescript
interface OutreachPolicy {
  daily_limit: number;
  hourly_limit: number;
  max_rounds_per_contact: number;
  min_gap_minutes: number;
  dayparts: ('morning' | 'afternoon' | 'evening')[];
  allow_days: ('sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat')[];
  optout_keywords: string[];
}
```

---

## ADR-006: Métricas com Views Materializadas

**Status**: Aceito  
**Data**: 2024-01-15  
**Decisores**: Equipe de Analytics

### Contexto
Necessidade de exibir métricas em tempo real sem impactar performance das operações principais.

### Decisão
Utilizar materialized views do PostgreSQL com refresh automático via cron para agregações de métricas.

### Consequências
**Positivas:**
- Performance superior em consultas complexas
- Dados pré-agregados
- Refresh controlado
- Isolamento da carga analítica

**Negativas:**
- Dados podem estar defasados
- Necessidade de gerenciar refresh
- Espaço adicional no banco

### Views Implementadas
```sql
-- Estatísticas de mensagens por dia
CREATE MATERIALIZED VIEW mv_stats_messages AS
SELECT 
    tenant_id,
    DATE(created_at) as date,
    direction,
    COUNT(*) as message_count
FROM t_messages 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY tenant_id, DATE(created_at), direction;

-- Estatísticas por número
CREATE MATERIALIZED VIEW mv_number_stats AS
SELECT 
    tenant_id,
    from_number_id,
    COUNT(*) as total_sent,
    AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at)))) as avg_interval
FROM t_messages 
WHERE direction = 'out'
GROUP BY tenant_id, from_number_id;
```

---

## ADR-007: Anti-Loop e Prevenção de Eco

**Status**: Aceito  
**Data**: 2024-01-15  
**Decisores**: Equipe de Backend

### Contexto
Necessidade de prevenir loops infinitos entre bots e ecos de mensagens próprias.

### Decisão
Implementar sistema de detecção baseado em metadata `app_origin` e `script_id` para identificar mensagens de bot.

### Consequências
**Positivas:**
- Prevenção efetiva de loops
- Controle granular por script/round
- Baixo overhead

**Negativas:**
- Dependência de metadata correta
- Possível perda de mensagens legítimas
- Complexidade na lógica de detecção

### Implementação
```typescript
// Verificação anti-loop
function shouldProcessMessage(message: Message): boolean {
  // Ignorar mensagens de bot, exceto em rounds ativos
  if (message.meta.app_origin === 'bot') {
    return message.meta.script_id && isScriptActive(message.meta.script_id);
  }
  return true;
}

// Metadata de mensagem de bot
const botMessageMeta = {
  app_origin: 'bot',
  script_id: roundId,
  generated_at: new Date().toISOString