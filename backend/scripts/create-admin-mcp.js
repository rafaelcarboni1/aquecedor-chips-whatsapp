#!/usr/bin/env node

/**
 * Script para criar usuário administrador usando MCP do Supabase
 * 
 * Uso:
 * node scripts/create-admin-mcp.js [email] [password]
 * 
 * Exemplo:
 * node scripts/create-admin-mcp.js admin@aquecedordechips.com Admin123!@#
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro: Variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórias')
  console.error('Configure-as no arquivo .env')
  process.exit(1)
}

// Cliente Supabase com chave anônima
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Configurações padrão
const DEFAULT_EMAIL = 'admin@aquecedordechips.com'
const DEFAULT_PASSWORD = 'Admin123!@#'

async function createAdminUser(email = DEFAULT_EMAIL, password = DEFAULT_PASSWORD) {
  try {
    console.log('🚀 Iniciando criação do usuário administrador...')
    console.log(`📧 Email: ${email}`)
    
    // 1. Criar usuário através do signup
    console.log('\n1️⃣ Criando usuário...')
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: undefined // Evita envio de email de confirmação
      }
    })
    
    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        console.log('✅ Usuário já existe, continuando...')
        
        // Tentar fazer login para obter o ID
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        })
        
        if (signInError) {
          throw new Error(`Erro ao fazer login: ${signInError.message}`)
        }
        
        if (!signInData.user) {
          throw new Error('Usuário não encontrado após login')
        }
        
        console.log(`✅ Login realizado com sucesso. ID: ${signInData.user.id}`)
        return await promoteToAdmin(signInData.user.id, email)
      } else {
        throw new Error(`Erro ao criar usuário: ${signUpError.message}`)
      }
    }
    
    if (!signUpData.user) {
      throw new Error('Usuário não foi criado')
    }
    
    console.log(`✅ Usuário criado com sucesso. ID: ${signUpData.user.id}`)
    
    // 2. Promover a administrador
    return await promoteToAdmin(signUpData.user.id, email)
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário administrador:', error.message)
    process.exit(1)
  }
}

async function promoteToAdmin(userId, email) {
  try {
    console.log('\n2️⃣ Promovendo usuário a administrador...')
    
    // Verificar se já é admin
    const { data: existingRole, error: checkError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
      throw new Error(`Erro ao verificar role existente: ${checkError.message}`)
    }
    
    if (existingRole && existingRole.role === 'admin') {
      console.log('✅ Usuário já é administrador!')
      return { success: true, userId, email, role: 'admin' }
    }
    
    // Inserir ou atualizar role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'admin'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
    
    if (roleError) {
      throw new Error(`Erro ao definir role de administrador: ${roleError.message}`)
    }
    
    console.log('✅ Usuário promovido a administrador com sucesso!')
    
    // 3. Verificar se a promoção funcionou
    console.log('\n3️⃣ Verificando promoção...')
    const { data: verifyRole, error: verifyError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (verifyError) {
      throw new Error(`Erro ao verificar promoção: ${verifyError.message}`)
    }
    
    if (verifyRole.role === 'admin') {
      console.log('✅ Promoção verificada com sucesso!')
      console.log('\n🎉 Usuário administrador criado com sucesso!')
      console.log('\n📋 Resumo:')
      console.log(`   📧 Email: ${email}`)
      console.log(`   🔑 Senha: ${DEFAULT_PASSWORD === password ? '[PADRÃO]' : '[PERSONALIZADA]'}`)
      console.log(`   👤 ID: ${userId}`)
      console.log(`   🛡️  Role: ${verifyRole.role}`)
      console.log(`   🔐 Permissões: ${verifyRole.permissions.join(', ')}`)
      
      console.log('\n⚠️  IMPORTANTE:')
      console.log('   • Altere a senha padrão após o primeiro login')
      console.log('   • Mantenha as credenciais seguras')
      console.log('   • Acesse o painel admin em /admin')
      
      return { success: true, userId, email, role: verifyRole.role }
    } else {
      throw new Error('Falha na verificação da promoção')
    }
    
  } catch (error) {
    console.error('❌ Erro ao promover usuário:', error.message)
    throw error
  }
}

// Executar se chamado diretamente
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