// Load environment variables
require('dotenv').config()

const WhatsAppService = require('./services/WhatsAppService')
const { supabaseAdmin } = require('./middleware/auth')

async function testWhatsAppService() {
  try {
    console.log('🧪 Testando WhatsAppService diretamente...')
    
    // Get or create a test session
    console.log('\n1️⃣ Buscando sessões existentes...')
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('whatsapp_sessions')
      .select('*')
      .limit(1)
    
    if (sessionsError) {
      console.error('❌ Erro ao buscar sessões:', sessionsError)
      return
    }
    
    let sessionId, userId
    
    if (sessions && sessions.length > 0) {
      sessionId = sessions[0].id
      userId = sessions[0].user_id
      console.log('✅ Usando sessão existente:', { sessionId, userId, status: sessions[0].status })
    } else {
      console.log('\n🆕 Criando sessão de teste...')
      
      // Create a test user first
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id')
        .limit(1)
      
      if (usersError || !users || users.length === 0) {
        console.error('❌ Nenhum usuário encontrado. Criando usuário de teste...')
        
        const { data: newUser, error: createUserError } = await supabaseAdmin
          .from('users')
          .insert({
            email: 'test@example.com',
            name: 'Usuário Teste',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (createUserError) {
          console.error('❌ Erro ao criar usuário:', createUserError)
          return
        }
        
        userId = newUser.id
      } else {
        userId = users[0].id
      }
      
      // Create test session
      const { data: newSession, error: createSessionError } = await supabaseAdmin
        .from('whatsapp_sessions')
        .insert({
          user_id: userId,
          name: 'Teste WhatsApp Service',
          phone_number: '+5511999999999',
          status: 'disconnected',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (createSessionError) {
        console.error('❌ Erro ao criar sessão:', createSessionError)
        return
      }
      
      sessionId = newSession.id
      console.log('✅ Sessão criada:', { sessionId, userId })
    }
    
    // Test 2: Create WhatsApp session
    console.log(`\n2️⃣ Criando sessão WhatsApp ${sessionId}...`)
    try {
      await WhatsAppService.createSession(sessionId, userId)
      console.log('✅ Sessão WhatsApp criada com sucesso')
      
      // Wait for QR generation
      console.log('\n⏳ Aguardando geração do QR Code...')
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      // Test 3: Get QR Code
      console.log('\n3️⃣ Buscando QR Code...')
      const qrCode = await WhatsAppService.getQRCode(sessionId)
      
      if (qrCode) {
        console.log('✅ QR Code obtido com sucesso')
        console.log('📏 QR Code length:', qrCode.length)
        console.log('🔲 QR Code preview:', qrCode.substring(0, 100) + '...')
      } else {
        console.log('⚠️ QR Code não disponível ainda')
      }
      
      // Test 4: Check connection status
      console.log('\n4️⃣ Verificando status de conexão...')
      const isConnected = WhatsAppService.isConnected(sessionId)
      console.log('📊 Status conectado:', isConnected)
      
      // Test 5: Get active sessions
      console.log('\n5️⃣ Sessões ativas no serviço...')
      const activeSessions = WhatsAppService.getActiveSessions()
      console.log('📋 Sessões ativas:', activeSessions)
      
      // Test 6: Check database status
      console.log('\n6️⃣ Verificando status no banco...')
      const { data: sessionData, error: sessionError } = await supabaseAdmin
        .from('whatsapp_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
      
      if (sessionError) {
        console.error('❌ Erro ao buscar sessão no banco:', sessionError)
      } else {
        console.log('📊 Status no banco:', {
          id: sessionData.id,
          status: sessionData.status,
          last_activity: sessionData.last_activity,
          updated_at: sessionData.updated_at
        })
      }
      
      // Test 7: Get session logs
      console.log('\n7️⃣ Verificando logs da sessão...')
      const { data: logs, error: logsError } = await supabaseAdmin
        .from('session_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (logsError) {
        console.error('❌ Erro ao buscar logs:', logsError)
      } else {
        console.log('📝 Últimos logs:')
        logs.forEach((log, index) => {
          console.log(`   ${index + 1}. [${log.level.toUpperCase()}] ${log.message} (${new Date(log.created_at).toLocaleTimeString()})`)
        })
      }
      
      console.log('\n⏳ Mantendo sessão ativa por 30 segundos para teste...')
      console.log('📱 Escaneie o QR Code agora se disponível!')
      
      // Monitor connection for 30 seconds
      let monitorCount = 0
      const monitorInterval = setInterval(async () => {
        monitorCount++
        
        const currentlyConnected = WhatsAppService.isConnected(sessionId)
        const currentQR = await WhatsAppService.getQRCode(sessionId)
        
        console.log(`\n📊 Monitor ${monitorCount}/6:`, {
          connected: currentlyConnected,
          hasQR: !!currentQR,
          activeSessions: WhatsAppService.getActiveSessions().length
        })
        
        if (currentlyConnected) {
          console.log('🎉 Conexão estabelecida com sucesso!')
          clearInterval(monitorInterval)
          
          // Test sending a message
          console.log('\n📤 Testando envio de mensagem...')
          try {
            const client = WhatsAppService.getClient(sessionId)
            if (client && client.user) {
              await WhatsAppService.sendMessage(sessionId, client.user.id, 'Teste de conexão - ' + new Date().toISOString())
              console.log('✅ Mensagem de teste enviada!')
            }
          } catch (msgError) {
            console.error('❌ Erro ao enviar mensagem:', msgError.message)
          }
          
          // Cleanup
          setTimeout(() => {
            console.log('\n🧹 Limpando sessão de teste...')
            WhatsAppService.destroySession(sessionId)
            process.exit(0)
          }, 5000)
        }
        
        if (monitorCount >= 6) {
          console.log('\n⏰ Tempo limite atingido')
          clearInterval(monitorInterval)
          
          // Cleanup
          console.log('🧹 Limpando sessão de teste...')
          await WhatsAppService.destroySession(sessionId)
          process.exit(0)
        }
      }, 5000)
      
    } catch (serviceError) {
      console.error('❌ Erro no WhatsAppService:', serviceError)
      console.error('Stack trace:', serviceError.stack)
    }
    
  } catch (error) {
    console.error('💥 Erro geral no teste:', error)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Encerrando teste...')
  process.exit(0)
})

// Run test
testWhatsAppService()