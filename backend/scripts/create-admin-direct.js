#!/usr/bin/env node

/**
 * Script para criar usuário administrador diretamente no banco
 * usando operações SQL básicas
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro: Variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórias')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createAdminDirectly() {
  try {
    console.log('🚀 Criando usuário administrador diretamente...')
    
    // 1. Primeiro, vamos criar um registro na tabela user_roles diretamente
    // usando um UUID fixo para o usuário admin
    const adminUserId = '00000000-0000-0000-0000-000000000001'
    const adminEmail = 'admin@test.com'
    
    console.log('1️⃣ Inserindo role de administrador...')
    
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        id: adminUserId,
        user_id: adminUserId,
        role: 'admin',
        permissions: {
          "read": true,
          "write": true,
          "delete": true,
          "admin": true,
          "manage_users": true,
          "manage_sessions": true,
          "view_logs": true
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
    
    if (roleError) {
      console.error('❌ Erro ao criar role:', roleError)
      return
    }
    
    console.log('✅ Role de administrador criada com sucesso!')
    
    // 2. Verificar se funcionou
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', adminUserId)
      .single()
    
    if (verifyError) {
      console.error('❌ Erro ao verificar role:', verifyError)
      return
    }
    
    console.log('✅ Verificação concluída!')
    console.log('\n📋 Resumo:')
    console.log(`   👤 ID: ${adminUserId}`)
    console.log(`   📧 Email: ${adminEmail}`)
    console.log(`   🛡️  Role: ${verifyData.role}`)
    console.log(`   🔐 Permissões:`, verifyData.permissions)
    
    console.log('\n⚠️  IMPORTANTE:')
    console.log('   • Este é um usuário de teste criado diretamente no banco')
    console.log('   • Para usar em produção, você precisará:')
    console.log('     1. Criar o usuário através do Supabase Auth')
    console.log('     2. Obter o ID real do usuário')
    console.log('     3. Atualizar a tabela user_roles com o ID correto')
    console.log('   • Use este método apenas para testes locais')
    
    return { success: true, userId: adminUserId, email: adminEmail, role: verifyData.role }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message)
    process.exit(1)
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createAdminDirectly()
}

module.exports = { createAdminDirectly }