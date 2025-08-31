const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const QRCode = require('qrcode')
const fs = require('fs')
const path = require('path')

async function testBaileysConnection() {
  try {
    console.log('🔍 Testando conexão Baileys...')
    
    // Setup auth directory
    const authDir = path.join(__dirname, 'test-auth')
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true })
    }

    // Get auth state
    const { state, saveCreds } = await useMultiFileAuthState(authDir)
    
    // Get latest version
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`📱 Usando WA v${version.join('.')}, isLatest: ${isLatest}`)

    // Create logger
    const logger = {
      level: 'info',
      child: () => logger,
      trace: (...args) => console.log('[TRACE]', ...args),
      debug: (...args) => console.log('[DEBUG]', ...args),
      info: (...args) => console.log('[INFO]', ...args),
      warn: (...args) => console.warn('[WARN]', ...args),
      error: (...args) => console.error('[ERROR]', ...args),
      fatal: (...args) => console.error('[FATAL]', ...args)
    }

    // Create socket
    const socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true, // Enable for debugging
      logger: logger,
      browser: ['Aquecedor de Chips Test', 'Chrome', '1.0.0'],
      generateHighQualityLinkPreview: true,
      connectTimeoutMs: 60000, // 60 seconds timeout
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
      markOnlineOnConnect: true
    })

    // Connection events
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr, receivedPendingNotifications } = update
      
      console.log('📡 Connection update:', {
        connection,
        qr: qr ? 'QR_RECEIVED' : 'NO_QR',
        receivedPendingNotifications,
        lastDisconnect: lastDisconnect ? {
          error: lastDisconnect.error?.message,
          statusCode: lastDisconnect.error?.output?.statusCode
        } : null
      })
      
      if (qr) {
        console.log('🔲 QR Code gerado!')
        try {
          const qrDataUrl = await QRCode.toDataURL(qr)
          console.log('✅ QR Code convertido para DataURL com sucesso')
          console.log('📏 QR DataURL length:', qrDataUrl.length)
        } catch (qrError) {
          console.error('❌ Erro ao converter QR Code:', qrError)
        }
      }
      
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
        console.log('🔴 Conexão fechada. Reconectar:', shouldReconnect)
        
        if (lastDisconnect?.error) {
          console.error('💥 Erro de desconexão:', {
            message: lastDisconnect.error.message,
            statusCode: lastDisconnect.error.output?.statusCode,
            payload: lastDisconnect.error.output?.payload
          })
        }
        
        if (!shouldReconnect) {
          console.log('🚪 Sessão foi deslogada, limpando...')
          // Clean up test auth
          if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true, force: true })
          }
          process.exit(0)
        }
      } else if (connection === 'open') {
        console.log('🟢 Cliente WhatsApp conectado!')
        console.log('👤 User info:', socket.user)
        
        // Test sending a message to yourself
        setTimeout(async () => {
          try {
            const jid = socket.user.id
            console.log('📤 Enviando mensagem de teste para:', jid)
            
            await socket.sendMessage(jid, { text: '🧪 Teste de conexão - ' + new Date().toISOString() })
            console.log('✅ Mensagem de teste enviada com sucesso!')
          } catch (msgError) {
            console.error('❌ Erro ao enviar mensagem de teste:', msgError)
          }
        }, 5000)
      } else if (connection === 'connecting') {
        console.log('🔄 Conectando...')
      }
    })

    // Credentials update
    socket.ev.on('creds.update', saveCreds)

    // Messages
    socket.ev.on('messages.upsert', (m) => {
      console.log('📨 Mensagens recebidas:', m.messages.length)
      m.messages.forEach(msg => {
        if (msg.message) {
          console.log('💬 Mensagem:', {
            from: msg.key.remoteJid,
            fromMe: msg.key.fromMe,
            text: msg.message.conversation || msg.message.extendedTextMessage?.text || 'Não texto'
          })
        }
      })
    })

    // Keep process alive
    console.log('⏳ Aguardando conexão... (Ctrl+C para sair)')
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Encerrando teste...')
      socket.end()
      if (fs.existsSync(authDir)) {
        fs.rmSync(authDir, { recursive: true, force: true })
      }
      process.exit(0)
    })
    
  } catch (error) {
    console.error('💥 Erro no teste:', error)
    process.exit(1)
  }
}

// Run test
testBaileysConnection()