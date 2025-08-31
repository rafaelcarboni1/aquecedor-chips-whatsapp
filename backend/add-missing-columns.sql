-- Adicionar colunas faltantes na tabela whatsapp_sessions
ALTER TABLE whatsapp_sessions 
ADD COLUMN IF NOT EXISTS messages_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS uptime_hours INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS warmup_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS warmup_count INTEGER DEFAULT 0;

-- Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_sessions' 
ORDER BY ordinal_position;