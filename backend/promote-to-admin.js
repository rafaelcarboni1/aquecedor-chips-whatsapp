const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro: SUPABASE_URL e SUPABASE_ANON_KEY devem estar definidas no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Obter User ID dos argumentos da linha de comando
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Erro: Forneça o User ID como argumento');
  console.log('💡 Uso: node promote-to-admin.js SEU_USER_ID_AQUI');
  console.log('📖 Consulte ADMIN_SETUP_INSTRUCTIONS.md para mais detalhes');
  process.exit(1);
}

// Validar formato UUID
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(userId)) {
  console.error('❌ Erro: User ID deve ser um UUID válido');
  console.log('💡 Exemplo: a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  process.exit(1);
}

async function promoteToAdmin(userId) {
  try {
    console.log('🔄 Promovendo usuário para administrador...');
    console.log('🆔 User ID:', userId);
    
    // Verificar se já existe um registro na tabela user_roles
    const { data: existingRole, error: checkError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (checkError) {
      console.error('❌ Erro ao verificar role existente:', checkError.message);
      return;
    }
    
    const adminPermissions = [
      'manage_users',
      'manage_sessions', 
      'view_all_logs',
      'manage_system',
      'manage_own_sessions',
      'view_own_logs'
    ];
    
    if (existingRole) {
      // Atualizar role existente
      console.log('🔄 Atualizando role existente...');
      const { data: updateData, error: updateError } = await supabase
        .from('user_roles')
        .update({
          role: 'admin',
          permissions: adminPermissions,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select();
      
      if (updateError) {
        console.error('❌ Erro ao atualizar role:', updateError.message);
        return;
      }
      
      console.log('✅ Role atualizada para admin!');
      console.log('📋 Dados:', updateData[0]);
      
    } else {
      // Criar nova role
      console.log('🔄 Criando nova role de admin...');
      const { data: insertData, error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin',
          permissions: adminPermissions
        })
        .select();
      
      if (insertError) {
        console.error('❌ Erro ao criar role:', insertError.message);
        console.log('💡 Dica: Verifique se o usuário foi criado no Dashboard do Supabase');
        return;
      }
      
      console.log('✅ Role de admin criada!');
      console.log('📋 Dados:', insertData[0]);
    }
    
    // Verificação final
    console.log('\n🔍 Verificação final...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (verifyError) {
      console.error('❌ Erro na verificação:', verifyError.message);
    } else {
      console.log('✅ Verificação bem-sucedida!');
      console.log('👤 Role:', verifyData.role);
      console.log('🔑 Permissões:', verifyData.permissions);
    }
    
    console.log('\n🎉 Usuário administrador configurado com sucesso!');
    console.log('\n⚠️  PRÓXIMOS PASSOS:');
    console.log('1. Faça login no sistema com as credenciais do usuário');
    console.log('2. Altere a senha padrão');
    console.log('3. Configure 2FA se disponível');
    console.log('4. Teste as funcionalidades administrativas');
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
  }
}

// Executar o script
promoteToAdmin(userId);