# Diagramas de Fluxo - Mirage WhatsApp Orchestrator

## 1. Fluxo Principal: Webhook → Ingest → Fila → Workers

### 1.1 Processamento de Mensagens Recebidas

```mermaid
sequenceDiagram
    participant WA as WhatsApp
    participant EA as Evolution API
    participant WH as Webhook Handler
    participant DB as Supabase DB
    participant Q as BullMQ Queue
    participant GW as Generate Worker
    participant SW as Send Worker
    participant AI as OpenAI API

    WA->>EA: Mensagem recebida
    EA->>WH: POST /webhook/evolution
    WH->>WH: Validar HMAC signature
    WH->>DB: Salvar evento raw
    WH->>DB: Upsert mensagem
    
    alt Mensagem de humano
        WH->>Q: Enfileirar generate_reply
        Q->>GW: Processar job
        GW->>DB: Buscar contexto da conversa
        GW->>DB: Buscar persona ativa
        GW->>AI: Gerar resposta
        AI-->>GW: Resposta gerada
        GW->>DB: Salvar resposta
        GW->>Q: Enfileirar send_message
        Q->>SW: Processar envio
        SW->>EA: POST /message/sendText
        EA->>WA: Enviar mensagem
        SW->>DB: Atualizar status
    else Mensagem de bot
        WH->>WH: Ignorar (anti-loop)
    end
```

### 1.2 Fluxo de Erro e Retry

```mermaid
flowchart TD
    A[Job Iniciado] --> B{Executar Worker}
    B -->|Sucesso| C[Marcar como Completo]
    B -->|Erro| D{Tentativas < 3?}
    D -->|Sim| E[Delay Exponencial]
    E --> F[Retry Job]
    F --> B
    D -->|Não| G[Marcar como Failed]
    G --> H[Notificar Admin]
    C --> I[Remover da Fila]
    H --> I
```

---

## 2. Fluxo de Onboarding: QR Code

### 2.1 Conexão de Nova Instância

```mermaid
sequenceDiagram
    participant U as Usuário
    participant D as Dashboard
    participant API as Orchestrator API
    participant EA as Evolution API
    participant DB as Supabase
    participant RT as Realtime

    U->>D: Clicar "Nova Instância"
    D->>API: POST /instances
    API->>EA: POST /instance/create
    EA-->>API: {instanceName, status: "open"}
    API->>DB: Salvar instância
    API-->>D: {instanceId, status}
    
    D->>D: Abrir modal QR
    D->>API: GET /instances/:id/qr
    API->>EA: GET /instance/qr/:name
    EA-->>API: {qrcode: "data:image/png..."}
    API-->>D: QR Code
    D->>D: Exibir QR + polling
    
    loop Polling Status
        D->>API: GET /instances/:id/status
        API->>EA: GET /instance/status/:name
        EA-->>API: {status: "open|connecting|connected"}
        API->>DB: Atualizar status
        DB->>RT: Broadcast mudança
        RT->>D: Status atualizado
        
        alt Status = "connected"
            D->>D: Fechar modal
            D->>D: Mostrar sucesso
        else Status = "open"
            D->>D: Continuar polling
        end
    end
```

### 2.2 Estados da Instância

```mermaid
stateDiagram-v2
    [*] --> Creating: POST /instances
    Creating --> Open: Evolution API responde
    Open --> Connecting: Usuário escaneia QR
    Connecting --> Connected: WhatsApp autentica
    Connected --> Disconnected: Perda de conexão
    Disconnected --> Connecting: Reconexão automática
    Connected --> Closed: Usuário desconecta
    Closed --> [*]: Instância removida
    
    Open --> Expired: QR expira (2min)
    Expired --> Open: Gerar novo QR
```

---

## 3. Conversation Scheduler

### 3.1 Execução de Rounds Agendados

```mermaid
flowchart TD
    A[Cron Job: */5 * * * *] --> B[Buscar Conversas Ativas]
    B --> C{Conversa na Janela?}
    C -->|Não| D[Pular Conversa]
    C -->|Sim| E{Último Round > Delay?}
    E -->|Não| D
    E -->|Sim| F[Verificar Participantes]
    F --> G{Ambos Online?}
    G -->|Não| H[Aguardar Próximo Ciclo]
    G -->|Sim| I[Iniciar Round]
    
    I --> J[Selecionar Iniciador]
    J --> K[Gerar Mensagem Inicial]
    K --> L[Enfileirar send_message]
    L --> M[Marcar Round Iniciado]
    
    D --> N[Próxima Conversa]
    H --> N
    M --> N
    N --> O{Mais Conversas?}
    O -->|Sim| C
    O -->|Não| P[Aguardar Próximo Cron]
```

### 3.2 Lógica de Janelas de Tempo

```mermaid
gantt
    title Janelas de Conversa - Exemplo Semanal
    dateFormat HH:mm
    axisFormat %H:%M
    
    section Segunda
    Manhã    :active, 08:00, 11:00
    Tarde    :active, 14:00, 17:00
    Noite    :active, 19:00, 21:00
    
    section Terça
    Manhã    :active, 08:00, 11:00
    Tarde    :done, 14:00, 17:00
    Noite    :active, 19:00, 21:00
    
    section Quarta
    Manhã    :active, 08:00, 11:00
    Tarde    :active, 14:00, 17:00
    Noite    :crit, 19:00, 21:00
```

---

## 4. Sistema de Outreach

### 4.1 Fluxo de Outreach Controlado

```mermaid
sequenceDiagram
    participant A as Admin
    participant D as Dashboard
    participant API as Orchestrator
    participant R as Redis
    participant Q as Queue
    participant OW as Outreach Worker
    participant EA as Evolution API

    A->>D: Configurar Campanha
    D->>API: POST /outreach/campaigns
    API->>API: Validar políticas
    API->>R: Verificar quotas diárias
    
    alt Quota disponível
        API->>Q: Enfileirar outreach_jobs
        Q->>OW: Processar contato
        OW->>R: Verificar quota do número
        
        alt Quota OK
            OW->>R: Incrementar contador
            OW->>EA: Enviar mensagem
            EA-->>OW: Status enviado
            OW->>API: Log resultado
        else Quota excedida
            OW->>Q: Reagendar para amanhã
        end
    else Quota diária excedida
        API-->>D: Erro: Limite diário atingido
    end
```

### 4.2 Sistema de Opt-out

```mermaid
flowchart TD
    A[Mensagem Recebida] --> B{Contém Keywords?}
    B -->|Sim| C[Extrair Keywords]
    C --> D{"PARE, STOP, SAIR"?}
    D -->|Sim| E[Marcar Opt-out]
    E --> F[Adicionar à Blacklist]
    F --> G[Enviar Confirmação]
    G --> H[Parar Outreach]
    
    B -->|Não| I[Processar Normalmente]
    D -->|Não| I
    
    H --> J[Notificar Admin]
    I --> K[Continuar Fluxo]
```

### 4.3 Controle de Quotas Redis

```mermaid
sequenceDiagram
    participant OW as Outreach Worker
    participant R as Redis
    
    Note over R: Estrutura de Chaves
    Note over R: quota:daily:{tenant}:{date}
    Note over R: quota:hourly:{tenant}:{hour}
    Note over R: quota:number:{number}:{date}
    
    OW->>R: INCR quota:daily:tenant1:2024-01-15
    R-->>OW: 45 (atual)
    OW->>R: TTL quota:daily:tenant1:2024-01-15
    R-->>OW: 86400 (24h)
    
    alt Quota < Limite
        OW->>R: INCR quota:number:5511999999999:2024-01-15
        R-->>OW: 3 (atual)
        OW->>OW: Prosseguir com envio
    else Quota >= Limite
        OW->>OW: Reagendar para próximo período
    end
```

---

## 5. Fluxo de Métricas e Analytics

### 5.1 Agregação de Dados

```mermaid
flowchart TD
    A[Evento de Mensagem] --> B[Trigger no Banco]
    B --> C[Atualizar Contadores]
    C --> D[Materialized View]
    
    E[Cron Job: */15 * * * *] --> F[REFRESH MATERIALIZED VIEW]
    F --> G[Recalcular Agregações]
    G --> H[Atualizar Cache Redis]
    
    I[Dashboard Request] --> J{Cache Hit?}
    J -->|Sim| K[Retornar do Redis]
    J -->|Não| L[Query Materialized View]
    L --> M[Cachear Resultado]
    M --> N[Retornar Dados]
    
    K --> O[Renderizar Gráficos]
    N --> O
```

### 5.2 Estrutura de Métricas

```mermaid
erDiagram
    MESSAGES ||--o{ MESSAGE_STATS : aggregates
    NUMBERS ||--o{ NUMBER_STATS : aggregates
    CONVERSATIONS ||--o{ CONVERSATION_STATS : aggregates
    
    MESSAGE_STATS {
        date date PK
        tenant_id uuid PK
        hour int PK
        total_sent int
        total_received int
        total_failed int
        avg_response_time interval
    }
    
    NUMBER_STATS {
        date date PK
        number_id uuid PK
        messages_sent int
        messages_received int
        conversations_active int
        outreach_sent int
    }
    
    CONVERSATION_STATS {
        date date PK
        conversation_id uuid PK
        rounds_completed int
        avg_round_duration interval
        total_messages int
    }
```

---

## 6. Fluxo de Segurança e Anti-Loop

### 6.1 Detecção de Loops

```mermaid
flowchart TD
    A[Mensagem Recebida] --> B[Extrair Metadata]
    B --> C{app_origin = 'bot'?}
    C -->|Sim| D[Ignorar Mensagem]
    C -->|Não| E{script_id presente?}
    E -->|Sim| F{Mesmo script_id?}
    F -->|Sim| G[Possível Loop]
    G --> H[Incrementar Contador]
    H --> I{Contador > 3?}
    I -->|Sim| J[Bloquear Conversa]
    I -->|Não| K[Processar com Delay]
    
    E -->|Não| L[Processar Normalmente]
    F -->|Não| L
    
    J --> M[Notificar Admin]
    K --> N[Adicionar à Fila]
    L --> N
```

### 6.2 Rate Limiting por Tenant

```mermaid
sequenceDiagram
    participant C as Cliente
    participant API as API Gateway
    participant RL as Rate Limiter
    participant R as Redis
    participant H as Handler
    
    C->>API: Request
    API->>RL: Verificar Rate Limit
    RL->>R: GET rate_limit:{tenant}:{endpoint}
    R-->>RL: Contador atual
    
    alt Dentro do limite
        RL->>R: INCR contador
        RL->>API: Permitir
        API->>H: Processar request
        H-->>API: Response
        API-->>C: 200 OK
    else Limite excedido
        RL->>API: Bloquear
        API-->>C: 429 Too Many Requests
        Note over C: Headers: X-RateLimit-Remaining: 0
        Note over C: Headers: X-RateLimit-Reset: 1642694400
    end
```

---

## 7. Fluxo de Deploy e Health Checks

### 7.1 Pipeline de Deploy

```mermaid
flowchart TD
    A[Git Push] --> B[GitHub Actions]
    B --> C[Run Tests]
    C --> D{Tests Pass?}
    D -->|Não| E[Fail Build]
    D -->|Sim| F[Build Docker Images]
    F --> G[Push to Registry]
    G --> H[Deploy to Staging]
    H --> I[Run E2E Tests]
    I --> J{E2E Pass?}
    J -->|Não| K[Rollback]
    J -->|Sim| L[Deploy to Production]
    L --> M[Health Check]
    M --> N{Healthy?}
    N -->|Não| O[Auto Rollback]
    N -->|Sim| P[Deploy Complete]
```

### 7.2 Health Check Endpoints

```mermaid
sequenceDiagram
    participant LB as Load Balancer
    participant API as Orchestrator API
    participant DB as Supabase
    participant R as Redis
    participant EA as Evolution API
    
    loop Cada 30s
        LB->>API: GET /health
        API->>DB: SELECT 1
        DB-->>API: OK
        API->>R: PING
        R-->>API: PONG
        API->>EA: GET /health
        EA-->>API: OK
        
        alt Todos OK
            API-->>LB: 200 {status: "healthy"}
        else Algum falhou
            API-->>LB: 503 {status: "unhealthy"}
            Note over LB: Remove do pool
        end
    end
```

---

## 8. Fluxo de Backup e Recovery

### 8.1 Estratégia de Backup

```mermaid
gantt
    title Estratégia de Backup
    dateFormat YYYY-MM-DD
    axisFormat %d/%m
    
    section Backup Contínuo
    WAL Streaming    :active, 2024-01-01, 30d
    PITR Available   :active, 2024-01-01, 30d
    
    section Snapshots
    Daily Full       :milestone, daily, 2024-01-01, 30d
    Weekly Archive   :milestone, weekly, 2024-01-01, 30d
    Monthly Archive  :milestone, monthly, 2024-01-01, 12M
```

### 8.2 Procedimento de Recovery

```mermaid
flowchart TD
    A[Incidente Detectado] --> B[Avaliar Severidade]
    B --> C{Data Loss?}
    C -->|Não| D[Restart Serviços]
    C -->|Sim| E[Determinar Point-in-Time]
    E --> F[Iniciar PITR]
    F --> G[Validar Integridade]
    G --> H{Dados Íntegros?}
    H -->|Não| I[Tentar Backup Anterior]
    H -->|Sim| J[Restart Aplicações]
    J --> K[Validar Funcionalidade]
    K --> L[Notificar Stakeholders]
    
    D --> M[Monitor Recovery]
    I --> F
    L --> M
```

Esses diagramas cobrem os principais fluxos do sistema Mirage WhatsApp Orchestrator, desde o processamento básico de mensagens até procedimentos de backup e recovery. Cada diagrama pode ser usado como referência durante o desenvolvimento e para documentação técnica.