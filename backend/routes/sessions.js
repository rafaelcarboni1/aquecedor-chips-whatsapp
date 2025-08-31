const express = require('express')
const { asyncHandler, validationError, notFoundError } = require('../middleware/errorHandler')
const { supabase, supabaseAdmin } = require('../middleware/auth')
const { body, query, validationResult } = require('express-validator')
const EvolutionApiService = require('../services/EvolutionApiService')
const evolutionApiService = EvolutionApiService.instance
const WarmupService = require('../services/WarmupService')

const router = express.Router()

/**
 * Validation middleware
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg).join(', ')
    throw validationError(errorMessages)
  }
  next()
}

/**
 * @route   GET /api/sessions
 * @desc    Get all user sessions
 * @access  Private
 */
router.get('/', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro positivo'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve estar entre 1 e 100'),
  query('status')
    .optional()
    .isIn(['connected', 'disconnected', 'connecting', 'error'])
    .withMessage('Filtro de status inválido')
], validateRequest, asyncHandler(async (req, res) => {
  const userId = req.user.id
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 20
  const status = req.query.status
  const offset = (page - 1) * limit

  let query = supabase
    .from('whatsapp_sessions')
    .select(`
        id,
        session_name,
        phone_number,
        status,
        last_activity,
        created_at,
        updated_at
      `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  const { data: sessions, error, count } = await query

  if (error) {
    console.error('Supabase error fetching sessions:', {
      error,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })
    throw new Error(`Failed to fetch sessions: ${error.message}`)
  }

  // Get total count for pagination
  const { count: totalCount, error: countError } = await supabase
    .from('whatsapp_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (countError) {
    console.error('Supabase error fetching sessions count:', countError)
    // Continue without count if this fails
  }

  res.json({
    success: true,
    sessions: sessions || [],
    pagination: {
      page,
      limit,
      total: totalCount || 0,
      pages: Math.ceil((totalCount || 0) / limit)
    }
  })
}))

/**
 * @route   GET /api/sessions/:id
 * @desc    Get specific session
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  const { data: session, error } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !session) {
    throw notFoundError('Session')
  }

  res.json({
    success: true,
    session
  })
}))

/**
 * @route   POST /api/sessions
 * @desc    Create new WhatsApp session
 * @access  Private
 */
router.post('/', [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nome da sessão deve ter entre 1 e 100 caracteres')
], validateRequest, asyncHandler(async (req, res) => {
  const userId = req.user.id
  const { name } = req.body

  // Check session limit (max 5 sessions per user)
  const { count } = await supabaseAdmin
    .from('whatsapp_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (count >= 5) {
    return res.status(400).json({
      success: false,
      error: 'Maximum number of sessions reached (5)',
      code: 'SESSION_LIMIT_EXCEEDED'
    })
  }

  // Create session in database
  const sessionName = name || `Sessão ${new Date().toLocaleString('pt-BR')}`
  console.log('Creating session with:', { userId, sessionName })
  
  const { data: session, error } = await supabaseAdmin
    .from('whatsapp_sessions')
    .insert({
      user_id: userId,
      session_name: sessionName
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase session creation error:', error)
    throw new Error(`Failed to create session: ${error.message}`)
  }
  
  console.log('Session created successfully:', session)

  // Initialize Evolution API instance
  try {
    await evolutionApiService.createInstance(session.id, userId)
    
    // Log session creation
    await supabaseAdmin
      .from('session_logs')
      .insert({
        session_id: session.id,
        user_id: userId,
        level: 'info',
        message: 'Session created successfully',
        created_at: new Date().toISOString()
      })
  } catch (whatsappError) {
    console.error('WhatsApp session creation error:', whatsappError)
    
    // Update session status to error
    await supabaseAdmin
      .from('whatsapp_sessions')
      .update({ 
        status: 'error',
        updated_at: new Date().toISOString()
      })
      .eq('id', session.id)
    
    // Log error
    await supabaseAdmin
      .from('session_logs')
      .insert({
        session_id: session.id,
        user_id: userId,
        level: 'error',
        message: `Failed to initialize WhatsApp client: ${whatsappError.message}`,
        created_at: new Date().toISOString()
      })
  }

  res.status(201).json({
    success: true,
    message: 'Session created successfully',
    session
  })
}))

/**
 * @route   DELETE /api/sessions/:id
 * @desc    Delete session
 * @access  Private
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  // Check if session exists and belongs to user
  const { data: session, error: fetchError } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (fetchError || !session) {
    throw notFoundError('Session')
  }

  try {
    // Stop warmup if active
    if (session.warmup_active) {
      await WarmupService.stopWarmup(id)
    }

    // Destroy Evolution API instance
    await evolutionApiService.deleteInstance(id)

    // Delete session from database (cascade will delete logs)
    const { error: deleteError } = await supabaseAdmin
      .from('whatsapp_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (deleteError) {
      throw new Error('Failed to delete session from database')
    }

    res.json({
      success: true,
      message: 'Session deleted successfully'
    })
  } catch (error) {
    console.error('Session deletion error:', error)
    throw new Error('Failed to delete session')
  }
}))

/**
 * @route   GET /api/sessions/:id/qr
 * @desc    Get QR code for session
 * @access  Private
 */
// Start/Connect session
router.post('/:id/connect', asyncHandler(async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  // Check if session exists and belongs to user
  const { data: session, error: sessionError } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (sessionError || !session) {
    console.log(`Session ${id} not found for user ${userId}:`, sessionError)
    throw notFoundError('Session')
  }

  if (session.status === 'connected') {
    return res.status(400).json({
      success: false,
      error: 'Session is already connected',
      code: 'ALREADY_CONNECTED'
    })
  }

  try {
    // Initialize Evolution API instance if not already initialized
    await evolutionApiService.createInstance(id, userId)
    
    // Log session start
    await supabaseAdmin
      .from('session_logs')
      .insert({
        session_id: id,
        user_id: userId,
        level: 'info',
        message: 'Session connection started with Evolution API',
        created_at: new Date().toISOString()
      })

    res.json({
      success: true,
      message: 'Session connection started successfully'
    })
  } catch (error) {
    console.error('Session connection error:', error)
    
    // Log error
    await supabaseAdmin
      .from('session_logs')
      .insert({
        session_id: id,
        user_id: userId,
        level: 'error',
        message: `Failed to start session connection: ${error.message}`,
        created_at: new Date().toISOString()
      })
    
    throw new Error('Failed to start session connection')
  }
}))

router.get('/:id/qr', asyncHandler(async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  // Check if session exists and belongs to user
  const { data: session, error } = await supabaseAdmin
    .from('whatsapp_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !session) {
    throw notFoundError('Session')
  }

  if (session.status === 'connected') {
    return res.status(400).json({
      success: false,
      error: 'Session is already connected',
      code: 'ALREADY_CONNECTED'
    })
  }

  try {
    const qrCode = await evolutionApiService.getQRCode(id)
    
    if (!qrCode) {
      return res.status(404).json({
        success: false,
        error: 'QR code not available. Please try again.',
        code: 'QR_NOT_AVAILABLE'
      })
    }

    res.json({
      success: true,
      qr: qrCode
    })
  } catch (error) {
    console.error('QR code generation error:', error)
    throw new Error('Failed to generate QR code')
  }
}))

/**
 * @route   POST /api/sessions/:id/warmup/start
 * @desc    Start warmup for session
 * @access  Private
 */
router.post('/:id/warmup/start', asyncHandler(async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  // Check if session exists and belongs to user
  const { data: session, error } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !session) {
    throw notFoundError('Session')
  }

  if (session.status !== 'connected') {
    return res.status(400).json({
      success: false,
      error: 'Session must be connected to start warmup',
      code: 'SESSION_NOT_CONNECTED'
    })
  }

  if (session.warmup_active) {
    return res.status(400).json({
      success: false,
      error: 'Warmup is already active for this session',
      code: 'WARMUP_ALREADY_ACTIVE'
    })
  }

  try {
    await WarmupService.startWarmup(id, userId)

    // Update session status
    await supabase
      .from('whatsapp_sessions')
      .update({ 
        warmup_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    // Log warmup start
    await supabase
      .from('session_logs')
      .insert({
        session_id: id,
        user_id: userId,
        level: 'info',
        message: 'Warmup started',
        created_at: new Date().toISOString()
      })

    res.json({
      success: true,
      message: 'Warmup started successfully'
    })
  } catch (error) {
    console.error('Warmup start error:', error)
    throw new Error('Failed to start warmup')
  }
}))

/**
 * @route   POST /api/sessions/:id/warmup/stop
 * @desc    Stop warmup for session
 * @access  Private
 */
router.post('/:id/warmup/stop', asyncHandler(async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  // Check if session exists and belongs to user
  const { data: session, error } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !session) {
    throw notFoundError('Session')
  }

  if (!session.warmup_active) {
    return res.status(400).json({
      success: false,
      error: 'Warmup is not active for this session',
      code: 'WARMUP_NOT_ACTIVE'
    })
  }

  try {
    await WarmupService.stopWarmup(id)

    // Update session status
    await supabase
      .from('whatsapp_sessions')
      .update({ 
        warmup_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    // Log warmup stop
    await supabase
      .from('session_logs')
      .insert({
        session_id: id,
        user_id: userId,
        level: 'info',
        message: 'Warmup stopped',
        created_at: new Date().toISOString()
      })

    res.json({
      success: true,
      message: 'Warmup stopped successfully'
    })
  } catch (error) {
    console.error('Warmup stop error:', error)
    throw new Error('Failed to stop warmup')
  }
}))

/**
 * @route   GET /api/sessions/:id/logs
 * @desc    Get session logs
 * @access  Private
 */
router.get('/:id/logs', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve estar entre 1 e 100'),
  query('level')
    .optional()
    .isIn(['info', 'warn', 'error', 'debug'])
    .withMessage('Nível de log inválido')
], validateRequest, asyncHandler(async (req, res) => {
  const { id } = req.params
  const userId = req.user.id
  const limit = parseInt(req.query.limit) || 50
  const level = req.query.level

  // Check if session exists and belongs to user
  const { data: session, error: sessionError } = await supabase
    .from('whatsapp_sessions')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (sessionError || !session) {
    throw notFoundError('Session')
  }

  let query = supabase
    .from('session_logs')
    .select('*')
    .eq('session_id', id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (level) {
    query = query.eq('level', level)
  }

  const { data: logs, error } = await query

  if (error) {
    throw new Error('Failed to fetch session logs')
  }

  res.json({
    success: true,
    logs: logs || []
  })
}))

module.exports = router