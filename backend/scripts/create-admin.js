#!/usr/bin/env node

/**
 * Script para criar usuário administrador
 * 
 * Uso:
 * node scripts/create-admin.js [email] [password]
 * 
 * Exemplo:
 * node scripts/create-admin.js admin@aquecedordechips.com Admin123!@#
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
  console.error('Configure-as no arquivo .env')
  process.exit(1)
}

// Cliente Supabase com service role (admin)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Configurações padrão
const DEFAULT_EMAIL = 'admin@aquecedordechips.com'
const DEFAULT_PASSWORD = 'Admin123!@#'

async function createAdminUser(email = DEFAULT_EMAIL, password = DEFAULT_PASSWORD) {
  try {
    console.log('🚀 Iniciando criação do usuário administrador...')
    console.log(`📧 Email: ${email}`)
    
    // 1. Verificar se o usuário já existe
    console.log('\n1️⃣ Verificando se usuário já existe...')
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers()
    
    if (searchError) {
      throw new Error(`Erro ao buscar usuários: ${searchError.message}`)
    }
    
    const existingUser = existingUsers.users.find(user => user.email === email)
    
    if (existingUser) {
      console.log('⚠️  Usuário já existe. Promovendo a administrador...')
      await promoteToAdmin(existingUser.id, email)
      return
    }
    
    // 2. Criar o usuário
    console.log('\n2️⃣ Criando usuário...')
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: 'Administrador',
        role: 'admin'
      }
    })
    
    if (createError) {
      throw new Error(`Erro ao criar usuário: ${createError.message}`)
    }
    
    console.log('✅ Usuário criado com sucesso!')
    console.log(`🆔 ID: ${newUser.user.id}`)
    
    // 3. Aguardar um pouco para garantir que o trigger foi executado
    console.log('\n3️⃣ Aguardando processamento...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 4. Promover a administrador
    await promoteToAdmin(newUser.user.id, email)
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  }
}

async function promoteToAdmin(userId, email) {
  try {
    console.log('\n4️⃣ Promovendo usuário a administrador...')
    
    // Verificar se já tem role
    const { data: existingRole, error: roleCheckError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    const adminPermissions = {
      manage_users: true,
      manage_sessions: true,
      view_all_logs: true,
      system_admin: true
    }
    
    if (existingRole) {
      // Atualizar role existente
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({
          role: 'admin',
          permissions: adminPermissions,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      
      if (updateError) {
        throw new Error(`Erro ao atualizar role: ${updateError.message}`)
      }
      
      console.log('✅ Role atualizado para administrador!')
    } else {
      // Criar novo role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin',
          permissions: adminPermissions
        })
      
      if (insertError) {
        throw new Error(`Erro ao criar role: ${insertError.message}`)
      }
      
      console.log('✅ Role de administrador criado!')
    }
    
    // 5. Verificar se foi criado corretamente
    console.log('\n5️⃣ Verificando configuração...')
    const { data: verification, error: verifyError } = await supabase
      .from('user_roles')
      .select('role, permissions')
      .eq('user_id', userId)
      .single()
    
    if (verifyError) {
      throw new Error(`Erro na verificação: ${verifyError.message}`)
    }
    
    console.log('\n🎉 Usuário administrador criado com sucesso!')
    console.log('\n📋 Detalhes:')
    console.log(`   📧 Email: ${email}`)
    console.log(`   🔑 Senha: ${password === DEFAULT_PASSWORD ? 'Admin123!@#' : '[senha personalizada]'}`)
    console.log(`   👤 Role: ${verification.role}`)
    console.log(`   🛡️  Permissões:`, verification.permissions)
    
    console.log('\n⚠️  IMPORTANTE:')
    console.log('   • Altere a senha após o primeiro login')
    console.log('   • Configure as variáveis de ambiente no frontend')
    console.log('   • Teste o login no sistema')
    
  } catch (error) {
    throw new Error(`Erro ao promover usuário: ${error.message}`)
  }
}

// Executar script
if (require.main === module) {
  const args = process.argv.slice(2)
  const email = args[0] || DEFAULT_EMAIL
  const password = args[1] || DEFAULT_PASSWORD
  
  // Validações básicas
  if (!email.includes('@')) {
    console.error('❌ Email inválido')
    process.exit(1)
  }
  
  if (password.length < 6) {
    console.error('❌ Senha deve ter pelo menos 6 caracteres')
    process.exit(1)
  }
  
  createAdminUser(email, password)
}

module.exports = { createAdminUser }