-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS public.t_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    tenant_id UUID NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de tenants
CREATE TABLE IF NOT EXISTS public.t_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de instâncias
CREATE TABLE IF NOT EXISTS public.t_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.t_tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    instance_name VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'disconnected',
    qr_code TEXT,
    webhook_url TEXT,
    api_key VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de conversas
CREATE TABLE IF NOT EXISTS public.t_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.t_tenants(id) ON DELETE CASCADE,
    instance_id UUID NOT NULL REFERENCES public.t_instances(id) ON DELETE CASCADE,
    remote_jid VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    contact_number VARCHAR(50),
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de mensagens
CREATE TABLE IF NOT EXISTS public.t_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.t_tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.t_conversations(id) ON DELETE CASCADE,
    instance_id UUID NOT NULL REFERENCES public.t_instances(id) ON DELETE CASCADE,
    remote_jid VARCHAR(255) NOT NULL,
    message_id VARCHAR(255) UNIQUE NOT NULL,
    content TEXT,
    message_type VARCHAR(50) DEFAULT 'text',
    from_me BOOLEAN DEFAULT false,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'sent',
    media_url TEXT,
    media_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.t_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para t_users
CREATE POLICY "Users can view own data" ON public.t_users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON public.t_users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Políticas RLS para t_tenants
CREATE POLICY "Users can view own tenant" ON public.t_tenants
    FOR SELECT USING (
        id IN (
            SELECT tenant_id FROM public.t_users WHERE id::text = auth.uid()::text
        )
    );

-- Políticas RLS para t_instances
CREATE POLICY "Users can view tenant instances" ON public.t_instances
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM public.t_users WHERE id::text = auth.uid()::text
        )
    );

-- Políticas RLS para t_conversations
CREATE POLICY "Users can view tenant conversations" ON public.t_conversations
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM public.t_users WHERE id::text = auth.uid()::text
        )
    );

-- Políticas RLS para t_messages
CREATE POLICY "Users can view tenant messages" ON public.t_messages
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM public.t_users WHERE id::text = auth.uid()::text
        )
    );

-- Conceder permissões para roles anon e authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.t_users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.t_tenants TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.t_instances TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.t_conversations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.t_messages TO anon, authenticated;

-- Inserir dados iniciais
INSERT INTO public.t_tenants (id, name, slug) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Tenant Padrão', 'default')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.t_users (id, email, tenant_id, role) VALUES 
('537c518e-69e7-4d55-9309-786008622847', 'admin@gmail.com', '550e8400-e29b-41d4-a716-446655440000', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Inserir instância de exemplo
INSERT INTO public.t_instances (id, tenant_id, name, instance_name, status) VALUES 
('123e4567-e89b-12d3-a456-426614174000', '550e8400-e29b-41d4-a716-446655440000', 'WhatsApp Principal', 'main-instance', 'connected')
ON CONFLICT (instance_name) DO NOTHING;

-- Inserir conversas de exemplo
INSERT INTO public.t_conversations (id, tenant_id, instance_id, remote_jid, contact_name, contact_number, last_message_at, unread_count) VALUES 
('11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', '123e4567-e89b-12d3-a456-426614174000', '5511999999999@s.whatsapp.net', 'João Silva', '5511999999999', NOW() - INTERVAL '1 hour', 2),
('22222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', '123e4567-e89b-12d3-a456-426614174000', '5511888888888@s.whatsapp.net', 'Maria Santos', '5511888888888', NOW() - INTERVAL '2 hours', 0),
('33333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', '123e4567-e89b-12d3-a456-426614174000', '5511777777777@s.whatsapp.net', 'Pedro Costa', '5511777777777', NOW() - INTERVAL '3 hours', 1)
ON CONFLICT (id) DO NOTHING;

-- Inserir mensagens de exemplo
INSERT INTO public.t_messages (id, tenant_id, conversation_id, instance_id, remote_jid, message_id, content, message_type, from_me, timestamp, status) VALUES 
('44444444-4444-4444-4444-444444444444', '550e8400-e29b-41d4-a716-446655440000', '11111111-1111-1111-1111-111111111111', '123e4567-e89b-12d3-a456-426614174000', '5511999999999@s.whatsapp.net', 'msg_001', 'Olá! Como posso ajudar?', 'text', false, NOW() - INTERVAL '1 hour', 'delivered'),
('55555555-5555-5555-5555-555555555555', '550e8400-e29b-41d4-a716-446655440000', '11111111-1111-1111-1111-111111111111', '123e4567-e89b-12d3-a456-426614174000', '5511999999999@s.whatsapp.net', 'msg_002', 'Preciso de informações sobre o produto X', 'text', true, NOW() - INTERVAL '50 minutes', 'read'),
('66666666-6666-6666-6666-666666666666', '550e8400-e29b-41d4-a716-446655440000', '22222222-2222-2222-2222-222222222222', '123e4567-e89b-12d3-a456-426614174000', '5511888888888@s.whatsapp.net', 'msg_003', 'Boa tarde!', 'text', false, NOW() - INTERVAL '2 hours', 'delivered'),
('77777777-7777-7777-7777-777777777777', '550e8400-e29b-41d4-a716-446655440000', '33333333-3333-3333-3333-333333333333', '123e4567-e89b-12d3-a456-426614174000', '5511777777777@s.whatsapp.net', 'msg_004', 'Obrigado pelo atendimento', 'text', true, NOW() - INTERVAL '3 hours', 'sent')
ON CONFLICT (message_id) DO NOTHING;