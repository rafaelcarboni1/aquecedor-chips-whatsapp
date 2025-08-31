/**
 * Webhooks Routes
 * 
 * Rotas para receber webhooks da Evolution API
 */

const express = require('express')
const router = express.Router()
const evolutionApiService = require('../services/EvolutionApiService')

/**
 * Webhook da Evolution API
 * Recebe eventos de uma instância específica
 */
router.post('/evolution/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params
    const webhookData = req.body
    
    console.log(`[Webhook] Recebido para ${instanceName}:`, {
      event: webhookData.event,
      timestamp: new Date().toISOString()
    })
    
    // Processar webhook
    await evolutionApiService.processWebhook(instanceName, webhookData)
    
    // Responder com sucesso
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processado com sucesso',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[Webhook] Erro ao processar:', error.message)
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * Webhook genérico da Evolution API
 * Para casos onde o instanceName não está na URL
 */
router.post('/evolution', async (req, res) => {
  try {
    const webhookData = req.body
    const instanceName = webhookData.instance || webhookData.instanceName
    
    if (!instanceName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nome da instância não fornecido',
        timestamp: new Date().toISOString()
      })
    }
    
    console.log(`[Webhook] Recebido genérico para ${instanceName}:`, {
      event: webhookData.event,
      timestamp: new Date().toISOString()
    })
    
    // Processar webhook
    await evolutionApiService.processWebhook(instanceName, webhookData)
    
    // Responder com sucesso
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processado com sucesso',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[Webhook] Erro ao processar webhook genérico:', error.message)
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * Endpoint de teste para verificar se os webhooks estão funcionando
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Webhooks endpoint funcionando',
    timestamp: new Date().toISOString(),
    routes: [
      'POST /api/webhooks/evolution/:instanceName',
      'POST /api/webhooks/evolution',
      'GET /api/webhooks/test'
    ]
  })
})

module.exports = router