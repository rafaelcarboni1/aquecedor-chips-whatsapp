-- Configuração inicial do banco de dados Supabase
-- Execute este script no SQL Editor do Supabase

-- 1. Tabela de roles/permissões
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Tabela de sessões WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  status VARCHAR(20) DEFAULT 'disconnected',
  warmup_active BOOLEAN DEFAULT false,
  messages_sent INTEGER DEFAULT 0,
  warmup_count INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de logs de sessão
CREATE TABLE IF NOT EXISTS session_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  level VARCHAR(10) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Função para incrementar contador de mensagens
CREATE OR REPLACE FUNCTION increment_message_count(session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE whatsapp_sessions 
  SET messages_sent = messages_sent + 1,
      last_activity = NOW(),
      updated_at = NOW()
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Função para incrementar contador de aquecimento
CREATE OR REPLACE FUNCTION increment_warmup_count(session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE whatsapp_sessions 
  SET warmup_count = warmup_count + 1,
      last_activity = NOW(),
      updated_at = NOW()
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Função para criar role automaticamente quando usuário é criado
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger para criar role automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 8. Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_user_id ON whatsapp_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_status ON whatsapp_sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_logs_session_id ON session_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_created_at ON session_logs(created_at DESC);

-- 9. RLS (Row Level Security)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;

-- 10. Políticas de segurança para user_roles
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
CREATE POLICY "Users can view own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can manage roles" ON user_roles;
CREATE POLICY "Service can manage roles" ON user_roles
  FOR ALL USING (true);

-- 11. Políticas de segurança para whatsapp_sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON whatsapp_sessions;
CREATE POLICY "Users can view own sessions" ON whatsapp_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON whatsapp_sessions;
CREATE POLICY "Users can insert own sessions" ON whatsapp_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON whatsapp_sessions;
CREATE POLICY "Users can update own sessions" ON whatsapp_sessions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sessions" ON whatsapp_sessions;
CREATE POLICY "Users can delete own sessions" ON whatsapp_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- 12. Políticas de segurança para session_logs
DROP POLICY IF EXISTS "Users can view own session logs" ON session_logs;
CREATE POLICY "Users can view own session logs" ON session_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can insert session logs" ON session_logs;
CREATE POLICY "Service can insert session logs" ON session_logs
  FOR INSERT WITH CHECK (true);

-- 13. Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Função para promover usuário a admin (apenas para uso interno)
CREATE OR REPLACE FUNCTION promote_to_admin(target_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE user_roles 
  SET role = 'admin', 
      permissions = '{"manage_users": true, "manage_sessions": true, "view_all_logs": true}',
      updated_at = NOW()
  WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO user_roles (user_id, role, permissions)
    VALUES (target_user_id, 'admin', '{"manage_users": true, "manage_sessions": true, "view_all_logs": true}');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mensagem de sucesso
SELECT 'Banco de dados configurado com sucesso!' as message;