# Contexto (curtinho)

Você precisa de um **SaaS orquestrador de múltiplos WhatsApps** para: (1) **conectar várias instâncias** via **Evolution API** por **QR**; (2) fazer **números conversarem entre si** com cadência **natural** (saudações de tio, papo curto, pausas, retomadas); (3) permitir **outreach** (bot→humano) para **contatos externos** com limites e janelas; (4) oferecer um **painel robusto** para **configurar horários, quem fala com quem, personas, tópicos, delays, limites**, e (5) ver **métricas** por número/conversa. Tudo **multi-tenant** em **Supabase** com **RLS**, **NestJS** no backend orquestrando **filas (BullMQ/Redis)**, **Next.js** no painel, e **OpenAI** para a conversa natural.

# Objetivo do Projeto

* Entregar um **MVP funcional e seguro** que:

  * Conecta **10–15+ instâncias** WhatsApp por QR pela Evolution API.
  * Configura **janelas (manhã/tarde/noite) por dia**, **rounds** e **pausas**, **min/max delay**, **limites por hora/dia**.
  * Define **quem conversa com quem** (pares/grupos, bot↔bot e bot↔humano) e **personas** (saudações e estilo “tiozão”).
  * Executa **roteiros curtos** (saudação → comentário → pergunta → resposta → tchau) e **anti-loop** real.
  * Faz **outreach** para contatos humanos externos com **opt-out**, **quotas** e **janelas**.
  * Mostra **métricas**: mensagens enviadas/recebidas, latência, heatmap horário, ranking de tópicos.
  * Respeita **RLS, MFA, HTTPS, backups e firewall**.

> Nota: automação de WhatsApp pode violar ToS. Implementar **cadência humana**, **quiet hours**, **opt-out** e **limites**.

---

# PROMPT PARA CURSOR (copiar e colar)

Você é meu copiloto. Gere um **monorepo production-ready** do SaaS abaixo. Siga **à risca** a arquitetura, schema e features. Onde houver dúvida, implemente o **básico funcional** e documente TODOs.

## 1) Nome e estrutura

* Nome: `mirage-whats-orchestrator`.
* Monorepo (pnpm workspaces ou turborepo):

```
repo/
  apps/
    dashboard/            # Next.js (App Router, Tailwind)
    orchestrator/         # NestJS (API + webhooks) + BullMQ workers
  packages/
    shared/               # tipos TS, zod, prompts, utils
  infra/
    docker-compose.yml
  supabase/
    migrations/           # SQL (schema + RLS)
    seed.sql
  README.md
```

## 2) Stack e padrões

* **Banco**: Supabase (Postgres) **multi-tenant** com **RLS**.
* **Frontend**: Next.js + Tailwind. Preferir componentes simples (Headless) e gráficos com Recharts.
* **Backend**: NestJS (Controllers, Services, Modules), **BullMQ** + **Redis** (fila). Fetch nativo.
* **IA**: OpenAI Chat (modelos: `gpt-4o-mini` por padrão; parametrizável).
* **Qualidade**: TypeScript estrito, ESLint + Prettier, i18n (pt-BR/en), logs JSON estruturados.

## 3) Segurança (obrigatório)

* **RLS** em todas as tabelas por `tenant_id` (claim JWT `app.tenant_id`).
* **MFA** via Supabase Auth (TOTP/Email OTP). Bloquear operações sensíveis quando `mfa_enabled=false`.
* **HTTPS** em produção; flags `SECURE_COOKIES`.
* **Backups/PITR** (documentar passo no README).
* **Firewall**: orquestrador exposto; Evolution restrito; tokens rotacionáveis e cifrados.

## 4) Supabase – Schema (migrations)

Crie migrations com as tabelas (colunas, PK/FK, enums) e RLS. **Resumo**:

* **Tenancy**: `t_tenants(id, name, plan, created_at)`, `t_users(id, tenant_id, email, role, mfa_enabled)`.
* **Instâncias**: `t_numbers(id, tenant_id, wa_number, session_id, status, label, persona_id)`; `t_sessions(id, tenant_id, base_url, token_hash, last_qr, last_seen, webhook_secret, number_id)`.
* **Conversas**: enum `convo_mode('pair','round_robin','random')`; `t_conversations(id, tenant_id, name, mode, active, openai_model, temperature, topic_strategy, topic_refresh_minutes)`; `t_pairings(id, tenant_id, conversation_id, number_a_id, number_b_id)`.
* **Config**: `t_settings_tenant(tenant_id unique, min_delay_ms, max_delay_ms, hourly_burst_limit, quiet_hours jsonb, humanize, allow_bot_to_bot)`; `t_settings_conversation(tenant_id, conversation_id, min_delay_ms, max_delay_ms, hourly_burst_limit, humanize, allow_bot_to_bot, guard_no_echo)`.
* **Tópicos/Mensagens**: `t_topics(id, tenant_id, conversation_id, seed, system_prompt, active_from, active_to)`; enum `msg_direction('in','out')`; `t_messages(id, tenant_id, conversation_id, from_number_id, to_number_id, wa_msg_id, direction, body, meta jsonb, status, created_at)`; `t_webhook_events(id, tenant_id, session_id, event_type, payload jsonb, wa_ts, received_at, signature)`.
* **Calendário**: enum `dow('sun','mon','tue','wed','thu','fri','sat')`; `t_conversation_schedule(id, tenant_id, conversation_id, day dow, morning_enabled, morning_window jsonb, afternoon_enabled, afternoon_window jsonb, evening_enabled, evening_window jsonb, max_rounds_per_window, pause_between_rounds_min, pause_between_rounds_max)`.
* **Participantes**: enum `participant_kind('bot','human')`; `t_contacts(id, tenant_id, wa_number, display_name, tags text[], notes)`; `t_conversation_participants(id, tenant_id, conversation_id, participant_kind, number_id, contact_id, role)`; `t_personas(id, tenant_id, name, style, greeting_morning, greeting_afternoon, greeting_evening)`.
* **Outreach**: `t_outreach_policies(id, tenant_id, number_id, persona_id, daily_limit, hourly_limit, max_rounds_per_contact, min_gap_minutes, dayparts text[], allow_days text[], optout_keywords text[], active)`; `t_outreach_targets(id, tenant_id, policy_id, contact_id, priority, status('pending','in_progress','paused','done','optout'), last_contact_at, rounds_done)`.
* **Views/Métricas**: `mv_stats_messages`, `mv_number_stats` (mensagens por dia/número). Criar `refresh` via cron.
* **RLS**: `enable row level security` em todas e políticas `USING/CHECK tenant_id = auth.jwt()->>'app.tenant_id'`.

## 5) Orquestrador (NestJS)

**Módulos**: `DbModule (supabase-js service role p/ ingest)`, `QueueModule (BullMQ)`, `AiModule (OpenAI)`, `EvolutionModule (webhooks + client)`, `SchedulerModule`.

**Endpoints REST**:

* `POST /api/instances` → cria sessão na Evolution (gera `sessionId`, salva `t_numbers` + `t_sessions`), retorna `session_id`.
* `GET /api/instances` → lista instâncias com status + contadores (hoje/7d) usando views.
* `GET /api/instances/:id/qr` → retorna QR base64 enquanto status!=connected.
* `POST /api/instances/:id/stop` → encerra sessão.
* `POST /api/webhooks/evolution` → recebe eventos; verifica `x-signature` (HMAC SHA256) com `t_sessions.webhook_secret`; grava `t_webhook_events` e normaliza `t_messages`.
* `POST /api/outreach/*` → CRUD de policies/targets (básico).

**Workers**:

* `generate_reply` → pega tópico/temperatura, histórico curto, chama OpenAI, enfileira `send_message` respeitando min/max delay.
* `send_message` → jitter + POST Evolution `/instances/:sessionId/messages` (token cifrado), cria `t_messages(direction='out', meta.app_origin='bot')`.
* `conversation-scheduler` (intervalo 60s) → verifica `t_conversation_schedule` e janelas abertas; planeja **round** (2–4 trocas) via job `run_round`.
* `run_round` → executa micro-roteiro (saudação, pergunta, resposta, encerramento) com `turn-taking` e limites de round.
* `outreach-scheduler` → quotas Redis (`daily/hourly por number_id`), escolhe `t_outreach_targets.pending`, verifica dayparts/days, enfileira `run_outreach_round`.
* `run_outreach_round` → abertura + aguardo de resposta; se humano responde, até N-1 trocas com `min_gap_minutes` + jitter; marca `done`/`optout`.

**Anti-loop**: ignore mensagens com `meta.app_origin='bot'` exceto quando **script/round ativo** (flag `meta.script_id`). Bloqueio de eco e retries exponenciais.

## 6) Evolution API (integração)

* Cliente simples: `POST /instances`, `GET /instances/:id/qr`, `GET /instances/:id/status`, `POST /instances/:id/messages`.
* Mapeie payload do webhook (id/mensagem/from/to). Persistência idempotente por `wa_msg_id`.

## 7) Frontend (Next.js)

**Páginas**:

* **/instances**: cards com status realtime (Supabase Realtime), contadores (hoje/7d), ações (parar, renomear). Botão **Conectar** → modal QR com polling.
* **/numbers**: tabela com totais (enviadas/recebidas), latência, últimas 100 mensagens (debug).
* **/settings**: globais (min/max delay, hourly\_burst, humanize, allow\_bot\_to\_bot, quiet\_hours).
* **/conversations/\[id]/settings**: overrides por conversa + `guard_no_echo`.
* **/conversations/\[id]/schedule**: calendário semanal: manhã/tarde/noite, janelas, rounds, pausas.
* **/conversations/\[id]/participants**: adicionar pares/grupos (bots/humanos), ordem de início.
* **/conversations/\[id]/topics**: seeds + system\_prompt por tópico.
* **/personas**: CRUD de personas e saudações por período.
* **/contacts**: CRUD de contatos (upload CSV, tags).
* **/outreach/policies** e **/outreach/targets**: limites, janelas, status `pending/in_progress/done/optout`.
* **/metrics**: gráficos (Recharts): msgs/dia, enviadas×recebidas, heatmap por hora, ranking de tópicos.

**UX**: inputs com validação zod; toasts; loading states; tabelas ordenáveis; filtros por número/conversa/período.

## 8) Prompts de IA (arquivar em `packages/shared/prompts.ts`)

* **System – conversa natural**: mensagens curtas (1–2 frases), persona “tio”, evitar links, não repetir, respeitar tema e período do dia, se última foi BOT e não é round ativo → não responder.
* **System – outreach**: abertura cordial + pergunta leve; se humano responder, 1 troca extra e encerrar gentilmente; obedecer opt-out.

## 9) Docker & Execução

* `infra/docker-compose.yml`: `redis`, `orchestrator` (porta 8080). Evolution roda na VPS.
* Scripts `dev`/`start` prontos. README com passo-a-passo (env vars de exemplo para ambas apps).

## 10) Observabilidade & Métricas

* Logger JSON (pino/winston). IDs de correlação por job. Contadores Redis de quotas. `mv_*` refresh via cron Supabase.

## 11) Testes & Critérios de Aceite

* Conectar 2+ instâncias via QR e ver status realtime.
* Criar conversa com agenda (manhã/tarde/noite), executar um round curto com delays naturais.
* Ver métricas por número (hoje e 7d).
* Outreach para 2 contatos: abertura + até 2 trocas; respeitar quota/hora e opt-out.
* RLS: usuário de outro tenant não acessa dados.

## 12) Conformidade e limites

* Obedecer **quiet hours**, **hourly\_burst\_limit**, **daily\_limit**.
* Opt-out imediato se detectar keywords.
* Documentar risco de ToS e deixar desativado por padrão o **bot↔humano** até configurar políticas.

---

**Entregável**: monorepo compilando, migrations aplicáveis, rotas ativas, workers funcionando, UI navegável. Documentar TODOs restantes.

---

## ⚠️ ADENDO AO **PROMPT PARA CURSOR** (incluir integralmente)

### 0) Planejamento obrigatório (antes de escrever código)

* Gere **ADRs** (Architecture Decision Records) curtos para: tenancy/RLS, filas BullMQ, integração Evolution, scheduler de rounds, outreach, métricas.
* Entregue **diagramas** (mermaid) de fluxo: Webhook→Ingest→Fila→Workers; QR onboarding; Conversation Scheduler; Outreach.
* Produza um **Plano de Release** (MVP→Beta) com épicos/tasks e critérios de aceite.
* Liste **riscos** (ToS, quotas, opt-out, ban) e mitigação.
* Só depois **codar**.

### 2a) Design & UI – **MCP Shadcn** (futurista, leve, responsivo)

* Use **Tailwind + shadcn/ui** com o **tema MCP Shadcn** (estética futurista/clean):

  * **Cores**: base neutra (zinc/slate), **accent neon** (ciano/roxo) sutil; **dark mode** por padrão.
  * **Componentes**: Button, Input, Toggle, Tabs, Card, Table, Sheet/Drawer, Dialog, Tooltip, Badge, Progress.
  * **Layout**: grid responsivo, cards com **rounded-2xl** e **shadow-md**, spacing generoso, ícones **lucide-react**.
  * **Motion**: micro-animações com **framer-motion** (fade/slide de 100–200ms) – sem exageros.
  * **Acessibilidade**: foco visível, contraste AA, `aria-*` em componentes interativos.
* Crie um **tema MCP** (tokens de cor, radii, sombras) e documente em `packages/shared/ui.md`.

### 9a) Documentação de credenciais (passo a passo)

Crie `/docs/credentials/` com **tutoriais ilustrados** (markdown, prints ou gifs) para obter/instalar e preencher `.env`:

* `supabase.md`: criar projeto, pegar `URL` e `anon/service_role`, ativar MFA, configurar RLS claim `app.tenant_id`.
* `evolution.md`: provisionar Evolution na VPS (Hostinger), criar **instance**, gerar **token**, configurar **webhookUrl** e **base\_url**, checar `/qr` e `/status`.
* `openai.md`: criar API key, limites de uso, modelos e boas práticas de custo.
* `redis.md`: subir Redis (docker), senha, conexão segura.
* `nginx-hostinger.md`: reverse proxy + TLS, mapeamento de rotas para orquestrador e Evolution.
* `env-examples.md`: exemplos completos de `.env` para dashboard e orquestrador, com comentários.

### 11a) Critérios “100% funcional” (antes de concluir o MVP)

* Conectar **2+ instâncias** via QR, status realtime, mensagens testadas de ponta a ponta.
* **Agenda** com manhã/tarde/noite gerando **round** curto (2–4 trocas) com delays naturais.
* **Outreach** para 2 contatos externos com quota/hora e **opt-out** funcionando.
* **Métricas** exibindo msgs/dia (7d), enviadas×recebidas por número, e últimas 100 mensagens.
* **RLS** testado: usuário de outro tenant não acessa dados.
* **Docs de credenciais** navegáveis e seguidas para preencher `.env` corretamente.

> Estas instruções **complementam e fazem parte do prompt**. Priorize MCP Shadcn no design, **planeje** antes de codar e entregue os guias de credenciais passo a passo.
