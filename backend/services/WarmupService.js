const EvolutionApiService = require('./EvolutionApiService');
const evolutionApiService = EvolutionApiService.instance;
const { supabase } = require('../middleware/auth')
const cron = require('node-cron')

class WarmupService {
  constructor() {
    this.activeWarmups = new Map() // sessionId -> warmup config
    this.scheduledTasks = new Map() // sessionId -> cron task
    this.warmupMessages = [
      'Olá! Como você está?',
      'Oi! Tudo bem por aí?',
      'E aí, como estão as coisas?',
      'Oi! Espero que esteja tendo um ótimo dia!',
      'Olá! Como tem passado?',
      'Oi! Tudo certo por aí?',
      'E aí, tudo tranquilo?',
      'Olá! Como você está se sentindo hoje?',
      'Oi! Espero que esteja bem!',
      'E aí, como foi seu dia?'
    ]
    
    // Initialize warmup recovery on startup
    this.initializeWarmupRecovery()
  }

  /**
   * Initialize warmup recovery for existing active warmups
   */
  async initializeWarmupRecovery() {
    try {
      console.log('Inicializando recuperação de aquecimento...')
      
      // Skip warmup recovery for now since warmup_active column doesn't exist
      console.log('Recuperação de aquecimento desabilitada temporariamente')
    } catch (error) {
      console.error('Warmup recovery initialization failed:', error)
    }
  }

  /**
   * Start warmup for a session
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @param {boolean} updateDB - Whether to update database status
   */
  async startWarmup(sessionId, userId, updateDB = true) {
    try {
      // Check if warmup is already active
      if (this.activeWarmups.has(sessionId)) {
        throw new Error('Warmup is already active for this session')
      }

      // Get warmup configuration (default values)
      const warmupConfig = {
        interval: 30, // minutes between messages
        messagesPerDay: 20, // max messages per day
        startHour: 8, // start sending at 8 AM
        endHour: 22, // stop sending at 10 PM
        enabled: true
      }

      // Store warmup config
      this.activeWarmups.set(sessionId, {
        ...warmupConfig,
        userId,
        messagesSentToday: 0,
        lastMessageTime: null,
        startedAt: new Date()
      })

      // Schedule warmup messages
      await this.scheduleWarmupMessages(sessionId)

      if (updateDB) {
        // Update database
        await supabase
          .from('whatsapp_sessions')
          .update({
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId)
      }

      console.log(`Warmup started for session ${sessionId}`)
    } catch (error) {
      console.error(`Failed to start warmup for session ${sessionId}:`, error)
      throw error
    }
  }

  /**
   * Stop warmup for a session
   * @param {string} sessionId - Session ID
   */
  async stopWarmup(sessionId) {
    try {
      // Stop scheduled task
      const task = this.scheduledTasks.get(sessionId)
      if (task) {
        task.stop()
        this.scheduledTasks.delete(sessionId)
      }

      // Remove from active warmups
      this.activeWarmups.delete(sessionId)

      // Update database
      await supabase
        .from('whatsapp_sessions')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      console.log(`Warmup stopped for session ${sessionId}`)
    } catch (error) {
      console.error(`Failed to stop warmup for session ${sessionId}:`, error)
      throw error
    }
  }

  /**
   * Schedule warmup messages for a session
   * @param {string} sessionId - Session ID
   */
  async scheduleWarmupMessages(sessionId) {
    const warmupConfig = this.activeWarmups.get(sessionId)
    if (!warmupConfig) {
      throw new Error('Warmup config not found')
    }

    // Create cron expression for every X minutes
    const cronExpression = `*/${warmupConfig.interval} * * * *`

    // Schedule task
    const task = cron.schedule(cronExpression, async () => {
      await this.executeWarmupMessage(sessionId)
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo'
    })

    this.scheduledTasks.set(sessionId, task)
    console.log(`Scheduled warmup messages for session ${sessionId} every ${warmupConfig.interval} minutes`)
  }

  /**
   * Execute warmup message sending
   * @param {string} sessionId - Session ID
   */
  async executeWarmupMessage(sessionId) {
    try {
      const warmupConfig = this.activeWarmups.get(sessionId)
      if (!warmupConfig) {
        console.log(`Warmup config not found for session ${sessionId}, stopping task`)
        const task = this.scheduledTasks.get(sessionId)
        if (task) {
          task.stop()
          this.scheduledTasks.delete(sessionId)
        }
        return
      }

      // Check if session is connected
      if (!evolutionApiService.isConnected(sessionId)) {
        console.log(`Session ${sessionId} not connected, skipping warmup message`)
        return
      }

      // Check time constraints
      const now = new Date()
      const currentHour = now.getHours()
      
      if (currentHour < warmupConfig.startHour || currentHour >= warmupConfig.endHour) {
        console.log(`Outside warmup hours for session ${sessionId} (${currentHour}h)`)
        return
      }

      // Check daily message limit
      const today = new Date().toDateString()
      const lastMessageDate = warmupConfig.lastMessageTime ? new Date(warmupConfig.lastMessageTime).toDateString() : null
      
      // Reset daily counter if it's a new day
      if (lastMessageDate !== today) {
        warmupConfig.messagesSentToday = 0
      }

      if (warmupConfig.messagesSentToday >= warmupConfig.messagesPerDay) {
        console.log(`Daily message limit reached for session ${sessionId}`)
        return
      }

      // Get target numbers for warmup
      const targetNumbers = await this.getWarmupTargets(sessionId)
      if (targetNumbers.length === 0) {
        console.log(`No warmup targets found for session ${sessionId}`)
        return
      }

      // Select random target and message
      const targetNumber = targetNumbers[Math.floor(Math.random() * targetNumbers.length)]
      const message = this.warmupMessages[Math.floor(Math.random() * this.warmupMessages.length)]

      // Send message
      await evolutionApiService.sendMessage(sessionId, targetNumber, message)
      
      // Update warmup stats
      warmupConfig.messagesSentToday++
      warmupConfig.lastMessageTime = new Date()
      
      // Update database stats (warmup_count column removed)
      // await supabase
      //   .rpc('increment_warmup_count', { session_id: sessionId })
      
      // Log warmup message
      await supabase
        .from('session_logs')
        .insert({
          session_id: sessionId,
          user_id: warmupConfig.userId,
          level: 'info',
          message: `Warmup message sent to ${targetNumber}`,
          created_at: new Date().toISOString()
        })

      console.log(`Warmup message sent for session ${sessionId} to ${targetNumber}`)
    } catch (error) {
      console.error(`Failed to execute warmup message for session ${sessionId}:`, error)
      
      // Log error
      const warmupConfig = this.activeWarmups.get(sessionId)
      if (warmupConfig) {
        await supabase
          .from('session_logs')
          .insert({
            session_id: sessionId,
            user_id: warmupConfig.userId,
            level: 'error',
            message: `Warmup message failed: ${error.message}`,
            created_at: new Date().toISOString()
          })
      }
    }
  }

  /**
   * Get warmup target numbers for a session
   * @param {string} sessionId - Session ID
   * @returns {Array} Array of phone numbers
   */
  async getWarmupTargets(sessionId) {
    try {
      // For now, return a default set of numbers
      // In a real implementation, this could come from a database table
      // or be configured by the user
      return [
        '5511999999999', // Example numbers
        '5511888888888',
        '5511777777777'
      ]
    } catch (error) {
      console.error(`Failed to get warmup targets for session ${sessionId}:`, error)
      return []
    }
  }

  /**
   * Get warmup status for a session
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Warmup status
   */
  getWarmupStatus(sessionId) {
    const warmupConfig = this.activeWarmups.get(sessionId)
    if (!warmupConfig) {
      return null
    }

    return {
      active: true,
      interval: warmupConfig.interval,
      messagesPerDay: warmupConfig.messagesPerDay,
      messagesSentToday: warmupConfig.messagesSentToday,
      lastMessageTime: warmupConfig.lastMessageTime,
      startedAt: warmupConfig.startedAt,
      startHour: warmupConfig.startHour,
      endHour: warmupConfig.endHour
    }
  }

  /**
   * Update warmup configuration for a session
   * @param {string} sessionId - Session ID
   * @param {Object} config - New configuration
   */
  async updateWarmupConfig(sessionId, config) {
    const warmupConfig = this.activeWarmups.get(sessionId)
    if (!warmupConfig) {
      throw new Error('Warmup not active for this session')
    }

    // Update configuration
    Object.assign(warmupConfig, config)

    // Reschedule if interval changed
    if (config.interval) {
      const task = this.scheduledTasks.get(sessionId)
      if (task) {
        task.stop()
      }
      await this.scheduleWarmupMessages(sessionId)
    }

    console.log(`Warmup config updated for session ${sessionId}`)
  }

  /**
   * Get all active warmups
   * @returns {Array} Active warmup session IDs
   */
  getActiveWarmups() {
    return Array.from(this.activeWarmups.keys())
  }

  /**
   * Stop all warmups (for graceful shutdown)
   */
  async stopAllWarmups() {
    console.log('Stopping all warmups...')
    
    const sessionIds = Array.from(this.activeWarmups.keys())
    
    for (const sessionId of sessionIds) {
      try {
        await this.stopWarmup(sessionId)
      } catch (error) {
        console.error(`Failed to stop warmup for session ${sessionId}:`, error)
      }
    }
    
    console.log('All warmups stopped')
  }

  /**
   * Get warmup statistics
   * @returns {Object} Warmup statistics
   */
  getWarmupStats() {
    const activeCount = this.activeWarmups.size
    const totalMessagesSentToday = Array.from(this.activeWarmups.values())
      .reduce((total, config) => total + config.messagesSentToday, 0)
    
    return {
      activeWarmups: activeCount,
      totalMessagesSentToday,
      averageMessagesPerSession: activeCount > 0 ? Math.round(totalMessagesSentToday / activeCount) : 0
    }
  }
}

// Create singleton instance
const warmupService = new WarmupService()

module.exports = warmupService