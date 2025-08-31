# Mirage WhatsApp Orchestrator

Um sistema avançado de automação e orquestração para WhatsApp Business, permitindo conversas inteligentes em escala com IA integrada.

## 🏗️ Arquitetura

Este é um monorepo que contém:

- **Dashboard** (`apps/dashboard`): Interface web Next.js para gerenciamento
- **Orchestrator** (`apps/orchestrator`): API NestJS para orquestração de mensagens
- **Types** (`packages/types`): Tipos TypeScript compartilhados
- **Shared** (`packages/shared`): Utilitários e validações compartilhadas

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+
- pnpm 8+
- Redis
- PostgreSQL (via Supabase)

### Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd mirage-whatsapp-orchestrator
```

2. Instale as dependências:
```bash
pnpm install
```

3. Configure as variáveis de ambiente:
```bash
# Dashboard
cp apps/dashboard/.env.example apps/dashboard/.env.local

# Orchestrator
cp apps/orchestrator/.env.example apps/orchestrator/.env
```

4. Configure o banco de dados:
```bash
# Execute as migrações do Supabase
pnpm run db:migrate
```

5. Inicie os serviços de desenvolvimento:
```bash
pnpm run dev
```

Isso iniciará:
- Dashboard em http://localhost:3000
- Orchestrator API em http://localhost:3001

## 📦 Scripts Disponíveis

- `pnpm run dev` - Inicia todos os serviços em modo desenvolvimento
- `pnpm run build` - Constrói todos os projetos
- `pnpm run lint` - Executa linting em todos os projetos
- `pnpm run type-check` - Verifica tipos TypeScript
- `pnpm run clean` - Limpa arquivos de build

## 🏢 Estrutura do Projeto

```
.
├── apps/
│   ├── dashboard/          # Next.js Dashboard
│   └── orchestrator/       # NestJS API
├── packages/
│   ├── types/             # Tipos compartilhados
│   └── shared/            # Utilitários compartilhados
├── .trae/
│   └── documents/         # Documentação técnica
└── package.json           # Configuração do monorepo
```

## 🔧 Configuração

### Dashboard (Next.js)

- **Framework**: Next.js 14 com App Router
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Database**: Supabase Client

### Orchestrator (NestJS)

- **Framework**: NestJS
- **Database**: PostgreSQL via Supabase
- **Queue**: BullMQ + Redis
- **AI**: OpenAI GPT-4
- **WhatsApp**: Evolution API
- **Validation**: class-validator + class-transformer

## 📚 Documentação

A documentação técnica completa está disponível em `.trae/documents/`:

- [Documento de Requisitos do Produto](/.trae/documents/product-requirements-document.md)
- [Documento de Arquitetura Técnica](/.trae/documents/technical-architecture-document.md)
- [Registros de Decisão de Arquitetura](/.trae/documents/architecture-decision-records.md)
- [Plano de Release](/.trae/documents/release-plan.md)
- [Diagramas de Fluxo do Sistema](/.trae/documents/system-flow-diagrams.md)
- [Análise de Riscos e Mitigação](/.trae/documents/risk-analysis-and-mitigation.md)

## 🔐 Segurança

- Criptografia de dados sensíveis
- Rate limiting
- Validação rigorosa de entrada
- Autenticação JWT
- Row Level Security (RLS) no Supabase

## 🚀 Deploy

### Dashboard
- Vercel (recomendado)
- Netlify
- Docker

### Orchestrator
- Railway
- Heroku
- Docker + Kubernetes
- VPS com PM2

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

Para suporte, abra uma issue no GitHub ou entre em contato através do email de suporte.