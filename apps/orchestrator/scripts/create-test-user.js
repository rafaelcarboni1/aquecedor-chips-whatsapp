const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://amgwphiyafnzbgatdgsz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtZ3dwaGl5YWZuemJnYXRkZ3N6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYxNTk5NCwiZXhwIjoyMDcyMTkxOTk0fQ.c3JPBsBIY9J24J9n0b757CwHHNsM8tS09T5Lq_YjWsA';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  try {
    console.log('Tentando criar usuário de teste...');
    
    // Criar usuário admin@gmail.com com senha 123456
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'admin@gmail.com',
      password: '123456',
      email_confirm: true
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        console.log('✅ Usuário admin@gmail.com já existe');
        return true;
      }
      console.error('❌ Erro ao criar usuário:', error.message);
      return false;
    }

    console.log('✅ Usuário criado com sucesso:', data.user.email);
    return true;
  } catch (err) {
    console.error('❌ Erro inesperado:', err.message);
    return false;
  }
}

async function testLogin() {
  try {
    console.log('Testando login...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@gmail.com',
      password: '123456'
    });

    if (error) {
      console.error('❌ Erro no login:', error.message);
      return false;
    }

    console.log('✅ Login realizado com sucesso');
    console.log('User ID:', data.user.id);
    console.log('Email:', data.user.email);
    return true;
  } catch (err) {
    console.error('❌ Erro inesperado no login:', err.message);
    return false;
  }
}

async function main() {
  console.log('=== Verificação de Usuário de Teste ===');
  
  const userCreated = await createTestUser();
  if (!userCreated) {
    process.exit(1);
  }

  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    process.exit(1);
  }

  console.log('\n✅ Usuário de teste configurado e funcionando!');
}

main().catch(console.error);