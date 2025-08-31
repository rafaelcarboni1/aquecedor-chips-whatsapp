-- Criar tabela _health_check para monitoramento do sistema
CREATE TABLE IF NOT EXISTS _health_check (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'unhealthy', 'degraded')),
    last_check_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_time_ms INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_health_check_service_name ON _health_check(service_name);
CREATE INDEX IF NOT EXISTS idx_health_check_status ON _health_check(status);
CREATE INDEX IF NOT EXISTS idx_health_check_last_check_at ON _health_check(last_check_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE _health_check ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir leitura para usuários autenticados
CREATE POLICY "Allow authenticated users to read health checks" ON _health_check
    FOR SELECT USING (auth.role() = 'authenticated');

-- Criar política para permitir inserção/atualização apenas para service_role
CREATE POLICY "Allow service role to manage health checks" ON _health_check
    FOR ALL USING (auth.role() = 'service_role');

-- Conceder permissões para as roles
GRANT SELECT ON _health_check TO authenticated;
GRANT ALL PRIVILEGES ON _health_check TO service_role;

-- Inserir alguns registros iniciais para monitoramento
INSERT INTO _health_check (service_name, status, response_time_ms, metadata) VALUES
('orchestrator-api', 'healthy', 45, '{"version": "1.0.0", "environment": "development"}'),
('evolution-api', 'healthy', 120, '{"instances_count": 0}'),
('redis-queue', 'healthy', 15, '{"queue_size": 0}'),
('supabase-db', 'healthy', 25, '{"connections": 1}');