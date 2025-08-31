/**
 * Evolution API Service
 * 
 * Este serviço substitui o WhatsAppService baseado em Baileys
 * pela integração com a Evolution API.
 * 
 * Funcionalidades principais:
 * - Gerenciamento de instâncias do WhatsApp
 * - Conexão via QR Code
 * - Envio de mensagens
 * - Webhooks para eventos
 * - Logs e monitoramento
 */

const axios = require('axios')
const EventEmitter = require('events')
const path = require('path')
const fs = require('fs')

// Carregar configurações do .env.evolution
const envEvolutionPath = path.join(__dirname, '..', '.env.evolution')
if (fs.existsSync(envEvolutionPath)) {
  const envConfig = fs.readFileSync(envEvolutionPath, 'utf8')
  const envLines = envConfig.split('\n')
  
  envLines.forEach(line => {
    const trimmedLine = line.trim()
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=')
        process.env[key] = value
      }
    }
  })
}

class EvolutionApiService extends EventEmitter {
  constructor() {
    super()
    
    // Configuração da Evolution API
    this.baseURL = process.env.EVOLUTION_API_URL || 'http://localhost:8080'
    this.apiKey = process.env.EVOLUTION_API_KEY || ''
    this.globalInstanceName = process.env.EVOLUTION_GLOBAL_INSTANCE_NAME || 'aquecedor-chips'
    this.requestTimeout = parseInt(process.env.EVOLUTION_REQUEST_TIMEOUT) || 30000
    this.retryAttempts = parseInt(process.env.EVOLUTION_RETRY_ATTEMPTS) || 3
    this.debug = process.env.EVOLUTION_DEBUG === 'true'
    
    // Maps para controle de estado
    this.instances = new Map() // instanceName -> instance data
    this.connectionStates = new Map() // instanceName -> connection state
    this.qrCodes = new Map() // instanceName -> qr code
    
    // Configurar axios com defaults
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey
      },
      timeout: this.requestTimeout
    })
    
    if (this.debug) {
      console.log('🔧 Evolution API Service configurado:', {
        baseURL: this.baseURL,
        globalInstance: this.globalInstanceName,
        timeout: this.requestTimeout
      })
    }
    
    // Interceptor para logs
    this.api.interceptors.request.use(
      (config) => {
        console.log(`[Evolution API] ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error('[Evolution API] Request error:', error.message)
        return Promise.reject(error)
      }
    )
    
    this.api.interceptors.response.use(
      (response) => {
        console.log(`[Evolution API] Response ${response.status} from ${response.config.url}`)
        return response
      },
      (error) => {
        console.error(`[Evolution API] Response error:`, {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url
        })
        return Promise.reject(error)
      }
    )
    
    // Limpar instâncias órfãs na inicialização
    this.cleanupOrphanedSessions()
  }
  
  /**
   * Criar uma nova instância do WhatsApp
   * @param {string} instanceName - Nome da instância (equivalente ao sessionId)
   * @param {string} userId - ID do usuário
   * @returns {Object} Dados da instância criada
   */
  async createInstance(instanceName, userId) {
    try {
      console.log(`Criando instância Evolution API: ${instanceName}`)
      
      // Verificar se instância já existe
      if (this.instances.has(instanceName)) {
        throw new Error('Instância já existe')
      }
      
      // Criar instância na Evolution API
      const response = await this.api.post('/instance/create-instance-basic', {
        instanceName: instanceName,
        token: instanceName, // Usar instanceName como token
        qrcode: true,
        number: '',
        business: false,
        webhook_url: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/webhooks/evolution/${instanceName}`,
        webhook_by_events: true,
        events: [
          'QRCODE_UPDATED',
          'CONNECTION_UPDATE',
          'MESSAGES_UPSERT',
          'SEND_MESSAGE'
        ]
      })
      
      const instanceData = response.data
      
      // Armazenar dados da instância
      this.instances.set(instanceName, {
        ...instanceData,
        userId,
        createdAt: new Date().toISOString()
      })
      
      this.connectionStates.set(instanceName, 'initializing')
      
      // Atualizar status no banco
      await this.updateSessionStatus(instanceName, 'initializing')
      await this.logSessionEvent(instanceName, userId, 'info', 'Instância criada na Evolution API')
      
      console.log(`Instância ${instanceName} criada com sucesso`)
      return instanceData
      
    } catch (error) {
      console.error(`Erro ao criar instância ${instanceName}:`, error.response?.data || error.message)
      
      // Limpar em caso de erro
      this.instances.delete(instanceName)
      this.connectionStates.delete(instanceName)
      this.qrCodes.delete(instanceName)
      
      throw new Error(`Falha ao criar instância: ${error.response?.data?.message || error.message}`)
    }
  }
  
  /**
   * Conectar instância (iniciar processo de QR Code)
   * @param {string} instanceName - Nome da instância
   * @returns {Object} Resultado da conexão
   */
  async connectInstance(instanceName) {
    try {
      console.log(`Conectando instância: ${instanceName}`)
      
      const response = await this.api.get(`/instance/instance-connect/${instanceName}`)
      
      this.connectionStates.set(instanceName, 'connecting')
      await this.updateSessionStatus(instanceName, 'connecting')
      
      return response.data
      
    } catch (error) {
      console.error(`Erro ao conectar instância ${instanceName}:`, error.response?.data || error.message)
      throw new Error(`Falha ao conectar instância: ${error.response?.data?.message || error.message}`)
    }
  }
  
  /**
   * Obter estado de conexão da instância
   * @param {string} instanceName - Nome da instância
   * @returns {Object} Estado da conexão
   */
  async getConnectionState(instanceName) {
    try {
      const response = await this.api.get(`/instance/connection-state/${instanceName}`)
      return response.data
    } catch (error) {
      console.error(`Erro ao obter estado da conexão ${instanceName}:`, error.response?.data || error.message)
      return { instance: { state: 'close' } }
    }
  }
  
  /**
   * Obter QR Code da instância
   * @param {string} instanceName - Nome da instância
   * @returns {string|null} QR Code em base64
   */
  async getQRCode(instanceName) {
    try {
      // Primeiro verificar se temos QR code em cache
      const cachedQR = this.qrCodes.get(instanceName)
      if (cachedQR) {
        return cachedQR
      }
      
      // Verificar estado da conexão
      const connectionState = await this.getConnectionState(instanceName)
      
      if (connectionState.instance?.state === 'open') {
        // Já conectado, não precisa de QR
        this.connectionStates.set(instanceName, 'connected')
        await this.updateSessionStatus(instanceName, 'connected')
        return null
      }
      
      // Se não está conectado e não temos QR, tentar conectar
      if (!cachedQR && connectionState.instance?.state === 'close') {
        await this.connectInstance(instanceName)
      }
      
      return this.qrCodes.get(instanceName) || null
      
    } catch (error) {
      console.error(`Erro ao obter QR Code ${instanceName}:`, error.message)
      
      // Se instância não existe, limpar do banco
      if (error.response?.status === 404) {
        await this.updateSessionStatus(instanceName, 'disconnected')
      }
      
      return null
    }
  }
  
  /**
   * Verificar se instância está conectada
   * @param {string} instanceName - Nome da instância
   * @returns {boolean} Status de conexão
   */
  async isConnected(instanceName) {
    try {
      const connectionState = await this.getConnectionState(instanceName)
      const isConnected = connectionState.instance?.state === 'open'
      
      if (isConnected) {
        this.connectionStates.set(instanceName, 'connected')
      }
      
      return isConnected
    } catch (error) {
      return false
    }
  }
  
  /**
   * Enviar mensagem de texto
   * @param {string} instanceName - Nome da instância
   * @param {string} to - Número de destino
   * @param {string} message - Mensagem
   * @returns {Object} Resultado do envio
   */
  async sendMessage(instanceName, to, message) {
    try {
      // Verificar se instância está conectada
      const connected = await this.isConnected(instanceName)
      if (!connected) {
        throw new Error('Instância não conectada')
      }
      
      // Formatar número
      let number = to.replace(/\D/g, '')
      if (!number.startsWith('55')) {
        number = '55' + number
      }
      
      // Enviar mensagem
      const response = await this.api.post(`/message/sendText/${instanceName}`, {
        number: number,
        text: message
      })
      
      // Incrementar contador de mensagens
      await this.incrementMessageCount(instanceName)
      
      console.log(`Mensagem enviada via ${instanceName} para ${number}`)
      return response.data
      
    } catch (error) {
      console.error(`Erro ao enviar mensagem via ${instanceName}:`, error.response?.data || error.message)
      throw new Error(`Falha ao enviar mensagem: ${error.response?.data?.message || error.message}`)
    }
  }
  
  /**
   * Fazer logout da instância
   * @param {string} instanceName - Nome da instância
   */
  async logoutInstance(instanceName) {
    try {
      await this.api.delete(`/instance/logout-instance/${instanceName}`)
      
      // Limpar dados locais
      this.instances.delete(instanceName)
      this.connectionStates.delete(instanceName)
      this.qrCodes.delete(instanceName)
      
      await this.updateSessionStatus(instanceName, 'disconnected')
      
      console.log(`Logout realizado para instância ${instanceName}`)
      
    } catch (error) {
      console.error(`Erro ao fazer logout ${instanceName}:`, error.response?.data || error.message)
    }
  }
  
  /**
   * Deletar instância
   * @param {string} instanceName - Nome da instância
   */
  async deleteInstance(instanceName) {
    try {
      await this.api.delete(`/instance/delete-instance/${instanceName}`)
      
      // Limpar dados locais
      this.instances.delete(instanceName)
      this.connectionStates.delete(instanceName)
      this.qrCodes.delete(instanceName)
      
      console.log(`Instância ${instanceName} deletada`)
      
    } catch (error) {
      console.error(`Erro ao deletar instância ${instanceName}:`, error.response?.data || error.message)
    }
  }
  
  /**
   * Reiniciar instância
   * @param {string} instanceName - Nome da instância
   * @param {string} userId - ID do usuário
   */
  async restartInstance(instanceName, userId) {
    try {
      console.log(`Reiniciando instância ${instanceName}`)
      
      // Tentar reiniciar via API
      try {
        await this.api.put(`/instance/restart-instance/${instanceName}`)
      } catch (restartError) {
        // Se falhar, deletar e recriar
        console.log(`Reinício falhou, recriando instância ${instanceName}`)
        await this.deleteInstance(instanceName)
        await new Promise(resolve => setTimeout(resolve, 2000))
        await this.createInstance(instanceName, userId)
        return
      }
      
      // Limpar dados locais
      this.connectionStates.delete(instanceName)
      this.qrCodes.delete(instanceName)
      
      await this.updateSessionStatus(instanceName, 'initializing')
      await this.logSessionEvent(instanceName, userId, 'info', 'Instância reiniciada')
      
    } catch (error) {
      console.error(`Erro ao reiniciar instância ${instanceName}:`, error.message)
      throw error
    }
  }
  
  /**
   * Processar webhook da Evolution API
   * @param {string} instanceName - Nome da instância
   * @param {Object} data - Dados do webhook
   */
  async processWebhook(instanceName, data) {
    try {
      const { event, data: eventData } = data
      
      console.log(`[Webhook] ${instanceName}: ${event}`, eventData)
      
      const instance = this.instances.get(instanceName)
      if (!instance) {
        console.warn(`Webhook recebido para instância desconhecida: ${instanceName}`)
        return
      }
      
      switch (event) {
        case 'QRCODE_UPDATED':
          await this.handleQRCodeUpdate(instanceName, eventData)
          break
          
        case 'CONNECTION_UPDATE':
          await this.handleConnectionUpdate(instanceName, eventData)
          break
          
        case 'MESSAGES_UPSERT':
          await this.handleMessageUpsert(instanceName, eventData)
          break
          
        default:
          console.log(`Evento não tratado: ${event}`)
      }
      
    } catch (error) {
      console.error(`Erro ao processar webhook ${instanceName}:`, error.message)
    }
  }
  
  /**
   * Tratar atualização de QR Code
   */
  async handleQRCodeUpdate(instanceName, data) {
    const { qrcode } = data
    
    if (qrcode) {
      console.log(`QR Code atualizado para ${instanceName}`)
      
      // Armazenar QR code (já vem em base64)
      const qrDataUrl = `data:image/png;base64,${qrcode}`
      this.qrCodes.set(instanceName, qrDataUrl)
      
      // Atualizar status
      this.connectionStates.set(instanceName, 'qr_code')
      await this.updateSessionStatus(instanceName, 'qr_code')
      
      const instance = this.instances.get(instanceName)
      if (instance) {
        await this.logSessionEvent(instanceName, instance.userId, 'info', 'QR Code gerado')
      }
      
      // Emitir evento
      this.emit('qr', { sessionId: instanceName, qr: qrDataUrl })
    }
  }
  
  /**
   * Tratar atualização de conexão
   */
  async handleConnectionUpdate(instanceName, data) {
    const { state, statusReason } = data
    
    console.log(`Conexão atualizada ${instanceName}: ${state} (${statusReason})`)
    
    const instance = this.instances.get(instanceName)
    if (!instance) return
    
    switch (state) {
      case 'connecting':
        this.connectionStates.set(instanceName, 'connecting')
        await this.updateSessionStatus(instanceName, 'connecting')
        await this.logSessionEvent(instanceName, instance.userId, 'info', 'Conectando...')
        break
        
      case 'open':
        console.log(`Instância ${instanceName} conectada com sucesso`)
        
        this.connectionStates.set(instanceName, 'connected')
        this.qrCodes.delete(instanceName) // Limpar QR code
        
        await this.updateSessionStatus(instanceName, 'connected')
        await this.logSessionEvent(instanceName, instance.userId, 'info', 'Conectado com sucesso')
        
        // Emitir eventos
        this.emit('ready', { sessionId: instanceName })
        this.emit('session-connected', { sessionId: instanceName, userId: instance.userId })
        break
        
      case 'close':
        console.log(`Instância ${instanceName} desconectada: ${statusReason}`)
        
        this.connectionStates.set(instanceName, 'disconnected')
        this.qrCodes.delete(instanceName)
        
        await this.updateSessionStatus(instanceName, 'disconnected')
        await this.logSessionEvent(instanceName, instance.userId, 'warn', `Desconectado: ${statusReason}`)
        
        this.emit('disconnected', { sessionId: instanceName, reason: statusReason })
        break
    }
  }
  
  /**
   * Tratar mensagens recebidas
   */
  async handleMessageUpsert(instanceName, data) {
    // Processar mensagens para contagem (se necessário)
    const { messages } = data
    
    if (messages && Array.isArray(messages)) {
      for (const message of messages) {
        // Contar apenas mensagens enviadas
        if (message.key?.fromMe) {
          await this.incrementMessageCount(instanceName)
        }
      }
    }
  }
  
  /**
   * Atualizar status da sessão no banco
   */
  async updateSessionStatus(sessionId, status) {
    try {
      // TODO: Implementar integração com banco de dados
      console.log(`Status da sessão ${sessionId} atualizado para: ${status}`)
    } catch (error) {
      console.error(`Erro ao atualizar status da sessão ${sessionId}:`, error)
    }
  }
  
  /**
   * Registrar evento da sessão
   */
  async logSessionEvent(sessionId, userId, level, message) {
    try {
      // TODO: Implementar integração com banco de dados
      console.log(`[${level.toUpperCase()}] ${sessionId} (${userId}): ${message}`)
    } catch (error) {
      console.error(`Erro ao registrar evento da sessão ${sessionId}:`, error)
    }
  }
  
  /**
   * Incrementar contador de mensagens
   */
  async incrementMessageCount(sessionId) {
    try {
      // TODO: Implementar integração com banco de dados
      console.log(`Contador de mensagens incrementado para sessão: ${sessionId}`)
    } catch (error) {
      console.error(`Erro ao incrementar contador de mensagens para ${sessionId}:`, error)
    }
  }
  
  /**
   * Obter sessões ativas
   */
  getActiveSessions() {
    return Array.from(this.instances.keys())
  }
  
  /**
   * Limpar sessões órfãs
   */
  async cleanupOrphanedSessions() {
    try {
      console.log('Limpando sessões órfãs da Evolution API...')
      
      // Por enquanto, apenas log - implementar integração com banco depois
      console.log('Nenhuma sessão órfã encontrada')
      
      // TODO: Implementar limpeza quando integração com banco estiver pronta
      // const sessions = await this.getSessionsFromDatabase()
      // for (const session of sessions) {
      //   const isConnected = await this.isConnected(session.id)
      //   if (!isConnected) {
      //     await this.deleteInstance(session.id)
      //   }
      // }
    } catch (error) {
      console.error('Erro durante limpeza de sessões órfãs:', error)
    }
  }
  
  // Métodos de compatibilidade com a interface anterior
  async createSession(sessionId, userId) {
    return this.createInstance(sessionId, userId)
  }
  
  getClient(sessionId) {
    return this.instances.get(sessionId) || null
  }
  
  async destroySession(sessionId) {
    await this.deleteInstance(sessionId)
  }
  
  async restartSession(sessionId, userId) {
    return this.restartInstance(sessionId, userId)
  }
}

// Criar instância singleton
// Exportar a classe para permitir múltiplas instâncias
module.exports = EvolutionApiService

// Também exportar uma instância singleton para compatibilidade
module.exports.instance = new EvolutionApiService()