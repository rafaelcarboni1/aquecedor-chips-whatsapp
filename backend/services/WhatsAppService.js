const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const QRCode = require('qrcode')
const fs = require('fs')
const path = require('path')
const { supabase } = require('../middleware/auth')
const EventEmitter = require('events')

class WhatsAppService extends EventEmitter {
  constructor() {
    super()
    this.clients = new Map() // sessionId -> socket instance
    this.qrCodes = new Map() // sessionId -> qr code
    this.connectionStates = new Map() // sessionId -> connection state
    this.authStates = new Map() // sessionId -> auth state
    
    // Ensure auth directory exists
    this.authDir = path.join(__dirname, '../auth')
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true })
    }
    
    // Clean up orphaned sessions on startup
    this.cleanupOrphanedSessions()
  }

  /**
   * Create a new WhatsApp session
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   */
  async createSession(sessionId, userId) {
    try {
      // Check if session already exists
      if (this.clients.has(sessionId)) {
        throw new Error('Sessão já existe')
      }

      // Set up auth state
      const sessionAuthDir = path.join(this.authDir, sessionId)
      if (!fs.existsSync(sessionAuthDir)) {
        fs.mkdirSync(sessionAuthDir, { recursive: true })
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionAuthDir)
      this.authStates.set(sessionId, { state, saveCreds })

      // Get latest Baileys version
      const { version, isLatest } = await fetchLatestBaileysVersion()
      console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`)

      // Create a Pino-compatible logger
      const logger = {
        level: 'silent',
        child: () => logger,
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {}
      }

      // Create WhatsApp socket
      const socket = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: logger,
        browser: ['Aquecedor de Chips', 'Chrome', '1.0.0'],
        generateHighQualityLinkPreview: true,
        connectTimeoutMs: 60000, // 60 seconds timeout
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        markOnlineOnConnect: true,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        getMessage: async (key) => {
          // Return undefined to not sync old messages
          return undefined
        }
      })

      // Store socket
      this.clients.set(sessionId, socket)
      this.connectionStates.set(sessionId, 'initializing')

      // Set up event listeners
      this.setupSocketEvents(socket, sessionId, userId, saveCreds)

      return socket
    } catch (error) {
      console.error(`Failed to create session ${sessionId}:`, error)
      
      // Clean up on error
      this.clients.delete(sessionId)
      this.qrCodes.delete(sessionId)
      this.connectionStates.delete(sessionId)
      this.authStates.delete(sessionId)
      
      throw error
    }
  }

  /**
   * Set up event listeners for WhatsApp socket
   * @param {WASocket} socket - WhatsApp socket
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @param {Function} saveCreds - Save credentials function
   */
  setupSocketEvents(socket, sessionId, userId, saveCreds) {
    // Connection update
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr, receivedPendingNotifications } = update
      
      console.log(`Atualização de conexão para sessão ${sessionId}:`, {
        connection,
        qr: qr ? 'QR_RECEIVED' : 'NO_QR',
        receivedPendingNotifications,
        lastDisconnect: lastDisconnect ? {
          error: lastDisconnect.error?.message,
          statusCode: lastDisconnect.error?.output?.statusCode
        } : null
      })
      
      try {
        if (qr) {
          console.log(`QR Code gerado para a sessão ${sessionId}`)
          
          // Generate QR code as data URL
          const qrDataUrl = await QRCode.toDataURL(qr)
          this.qrCodes.set(sessionId, qrDataUrl)
          
          // Update session status
          await this.updateSessionStatus(sessionId, 'qr_code')
          
          // Log QR generation
          await this.logSessionEvent(sessionId, userId, 'info', 'QR Code gerado')
          
          // Emit event
          this.emit('qr', { sessionId, qr: qrDataUrl })
        }
        
        if (connection === 'connecting') {
          await this.updateSessionStatus(sessionId, 'connecting')
          await this.logSessionEvent(sessionId, userId, 'info', 'Conectando ao WhatsApp...')
          console.log(`Conectando sessão ${sessionId}...`)
        }
        
        if (connection === 'close') {
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
          
          console.log(`Conexão fechada para sessão ${sessionId}. Reconectar:`, shouldReconnect)
          
          // Log the disconnect reason
          if (lastDisconnect?.error) {
            const statusCode = lastDisconnect.error.output?.statusCode
            const reason = Object.keys(DisconnectReason).find(key => DisconnectReason[key] === statusCode) || 'UNKNOWN'
            await this.logSessionEvent(sessionId, userId, 'warn', `Desconectado: ${reason} (${statusCode})`)
          }
          
          if (shouldReconnect) {
            // Update status and try to reconnect
            this.connectionStates.set(sessionId, 'disconnected')
            await this.updateSessionStatus(sessionId, 'disconnected')
            await this.logSessionEvent(sessionId, userId, 'warn', 'Conexão perdida, tentando reconectar')
            
            // Emit disconnection event
            this.emit('disconnected', { sessionId, reason: 'connection_lost' })
            
            // Clean up and try to reconnect after a delay
            setTimeout(() => {
              console.log(`Tentando reconectar sessão ${sessionId}...`)
              this.restartSession(sessionId, userId).catch(console.error)
            }, 5000)
          } else {
            // Logged out, clean up completely
            console.log(`Sessão ${sessionId} foi deslogada`)
            await this.updateSessionStatus(sessionId, 'disconnected')
            await this.logSessionEvent(sessionId, userId, 'info', 'Sessão deslogada')
            
            this.cleanupSession(sessionId)
            this.emit('auth_failure', { sessionId, message: 'Logged out' })
          }
        } else if (connection === 'open') {
          console.log(`Cliente WhatsApp conectado para a sessão ${sessionId}`)
          
          // Get user info
          const userInfo = socket.user
          
          // Update session status and phone number
          await supabase
            .from('whatsapp_sessions')
            .update({
              status: 'connected',
              phone_number: userInfo?.id?.split(':')[0] || null,
              last_activity: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId)
          
          // Clear QR code
          this.qrCodes.delete(sessionId)
          this.connectionStates.set(sessionId, 'connected')
          
          // Log connection
          await this.logSessionEvent(sessionId, userId, 'info', `Conectado como ${userInfo?.id || 'unknown'}`)
          
          // Emit event
          this.emit('ready', { sessionId, info: userInfo })
          
          // Emit connection success event
          this.emit('session-connected', { sessionId, userId })
        }
      } catch (error) {
        console.error(`Connection update error for session ${sessionId}:`, error)
        await this.logSessionEvent(sessionId, userId, 'error', `Erro na atualização de conexão: ${error.message}`)
      }
    })

    // Credentials update
    socket.ev.on('creds.update', saveCreds)

    // Messages (for warmup tracking)
    socket.ev.on('messages.upsert', async (m) => {
      try {
        const messages = m.messages
        for (const message of messages) {
          // Only track outgoing messages for warmup
          if (message.key.fromMe) {
            await this.incrementMessageCount(sessionId)
          }
        }
      } catch (error) {
        console.error(`Message event error for session ${sessionId}:`, error)
      }
    })
  }

  /**
   * Clean up session data
   * @param {string} sessionId - Session ID
   */
  cleanupSession(sessionId) {
    this.clients.delete(sessionId)
    this.qrCodes.delete(sessionId)
    this.connectionStates.delete(sessionId)
    this.authStates.delete(sessionId)
  }

  /**
   * Get QR code for session
   * @param {string} sessionId - Session ID
   * @returns {string|null} QR code data URL
   */
  async getQRCode(sessionId) {
    // Check if session exists in memory
    const qrCode = this.qrCodes.get(sessionId)
    
    // If no QR code and no active client, the session might be stale
    if (!qrCode && !this.clients.has(sessionId)) {
      console.log(`Session ${sessionId} not found in memory, cleaning up database status`)
      
      // Update database status to reflect reality
      try {
        await this.updateSessionStatus(sessionId, 'disconnected')
      } catch (error) {
        console.error(`Failed to update session ${sessionId} status:`, error)
      }
    }
    
    return qrCode || null
  }

  /**
   * Get client for session
   * @param {string} sessionId - Session ID
   * @returns {WASocket|null} WhatsApp socket
   */
  getClient(sessionId) {
    return this.clients.get(sessionId) || null
  }

  /**
   * Check if session is connected
   * @param {string} sessionId - Session ID
   * @returns {boolean} Connection status
   */
  isConnected(sessionId) {
    const socket = this.clients.get(sessionId)
    return socket && this.connectionStates.get(sessionId) === 'connected'
  }

  /**
   * Send message through session
   * @param {string} sessionId - Session ID
   * @param {string} to - Recipient number
   * @param {string} message - Message content
   * @returns {Object} Message result
   */
  async sendMessage(sessionId, to, message) {
    const socket = this.getClient(sessionId)
    
    if (!socket) {
      throw new Error('Sessão não encontrada')
    }

    if (!this.isConnected(sessionId)) {
      throw new Error('Sessão não conectada')
    }

    try {
      // Format phone number for Baileys
      let jid = to
      if (!to.includes('@')) {
        // Remove any non-numeric characters and add country code if needed
        const cleanNumber = to.replace(/\D/g, '')
        jid = `${cleanNumber}@s.whatsapp.net`
      }
      
      // Send message
      const result = await socket.sendMessage(jid, { text: message })
      
      // Update message count
      await this.incrementMessageCount(sessionId)
      
      return result
    } catch (error) {
      console.error(`Falha ao enviar mensagem para a sessão ${sessionId}:`, error)
      throw error
    }
  }

  /**
   * Destroy session
   * @param {string} sessionId - Session ID
   */
  async destroySession(sessionId) {
    try {
      const socket = this.clients.get(sessionId)
      
      if (socket) {
        // Close socket
        socket.end()
      }
      
      // Clean up
      this.cleanupSession(sessionId)
      
      // Remove auth files
      const sessionAuthDir = path.join(this.authDir, sessionId)
      if (fs.existsSync(sessionAuthDir)) {
        fs.rmSync(sessionAuthDir, { recursive: true, force: true })
      }
      
      console.log(`Sessão ${sessionId} destruída com sucesso`)
    } catch (error) {
      console.error(`Falha ao destruir a sessão ${sessionId}:`, error)
      throw error
    }
  }

  /**
   * Update session status in database
   * @param {string} sessionId - Session ID
   * @param {string} status - New status
   */
  async updateSessionStatus(sessionId, status) {
    try {
      await supabase
        .from('whatsapp_sessions')
        .update({
          status,
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
    } catch (error) {
      console.error(`Falha ao atualizar status da sessão ${sessionId}:`, error)
    }
  }

  /**
   * Log session event
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @param {string} level - Log level
   * @param {string} message - Log message
   */
  async logSessionEvent(sessionId, userId, level, message) {
    try {
      await supabase
        .from('session_logs')
        .insert({
          session_id: sessionId,
          user_id: userId,
          level,
          message,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error(`Falha ao registrar evento da sessão ${sessionId}:`, error)
    }
  }

  /**
   * Increment message count for session
   * @param {string} sessionId - Session ID
   */
  async incrementMessageCount(sessionId) {
    try {
      await supabase
        .rpc('increment_message_count', { session_id: sessionId })
    } catch (error) {
      console.error(`Falha ao incrementar contador de mensagens para ${sessionId}:`, error)
    }
  }

  /**
   * Get all active sessions
   * @returns {Array} Active session IDs
   */
  getActiveSessions() {
    return Array.from(this.clients.keys())
  }

  /**
   * Restart session
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   */
  async restartSession(sessionId, userId) {
    try {
      // Destroy existing session
      await this.destroySession(sessionId)
      
      // Wait a bit before recreating
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Create new session
      await this.createSession(sessionId, userId)
      
      console.log(`Sessão ${sessionId} reiniciada com sucesso`)
    } catch (error) {
      console.error(`Falha ao reiniciar a sessão ${sessionId}:`, error)
      throw error
    }
  }

  /**
   * Clean up orphaned sessions on startup
   * Sessions that are marked as connected/connecting in DB but don't exist in memory
   */
  async cleanupOrphanedSessions() {
    try {
      console.log('Limpando sessões órfãs...')
      
      // Get all sessions that are marked as connected or connecting
      const { data: sessions, error } = await supabase
        .from('whatsapp_sessions')
        .select('id, user_id, status')
        .in('status', ['connected', 'connecting', 'qr_code'])
      
      if (error) {
        console.error('Erro ao buscar sessões para limpeza:', error)
        return
      }
      
      if (!sessions || sessions.length === 0) {
        console.log('Nenhuma sessão órfã encontrada')
        return
      }
      
      console.log(`Encontradas ${sessions.length} sessões para verificar`)
      
      // Check each session and update status if not in memory
      for (const session of sessions) {
        if (!this.clients.has(session.id)) {
          console.log(`Limpando sessão órfã: ${session.id}`)
          
          await this.updateSessionStatus(session.id, 'disconnected')
          await this.logSessionEvent(
            session.id, 
            session.user_id, 
            'info', 
            'Sessão órfã limpa durante inicialização do servidor'
          )
        }
      }
      
      console.log('Limpeza de sessões órfãs concluída')
    } catch (error) {
      console.error('Erro durante limpeza de sessões órfãs:', error)
    }
  }
}

// Create singleton instance
const whatsappService = new WhatsAppService()

module.exports = whatsappService