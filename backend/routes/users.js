const express = require('express')
const { asyncHandler, validationError, notFoundError } = require('../middleware/errorHandler')
const { supabase } = require('../middleware/auth')
const { body, validationResult } = require('express-validator')

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
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', asyncHandler(async (req, res) => {
  const userId = req.user.id

  // Get user profile from database
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error('Failed to fetch user profile')
  }

  // If no profile exists, create one
  if (!profile) {
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: req.user.email,
        name: req.user.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      throw new Error('Failed to create user profile')
    }

    return res.json({
      success: true,
      profile: newProfile
    })
  }

  res.json({
    success: true,
    profile
  })
}))

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  body('phone')
    .optional()
    .isMobilePhone('pt-BR')
    .withMessage('Invalid phone number format'),
  body('timezone')
    .optional()
    .isIn([
      'America/Sao_Paulo',
      'America/Manaus',
      'America/Fortaleza',
      'America/Recife',
      'America/Bahia'
    ])
    .withMessage('Invalid timezone')
], validateRequest, asyncHandler(async (req, res) => {
  const userId = req.user.id
  const { name, phone, timezone } = req.body

  const updateData = {
    updated_at: new Date().toISOString()
  }

  if (name) updateData.name = name.trim()
  if (phone) updateData.phone = phone
  if (timezone) updateData.timezone = timezone

  // Update profile in database
  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error('Failed to update user profile')
  }

  // Update user metadata in Supabase Auth if name changed
  if (name) {
    try {
      await supabase.auth.updateUser({
        data: { name: name.trim() }
      })
    } catch (authError) {
      console.error('Failed to update auth metadata:', authError)
      // Don't fail the request if auth update fails
    }
  }

  res.json({
    success: true,
    message: 'Profile updated successfully',
    profile
  })
}))

/**
 * @route   GET /api/users/stats
 * @desc    Get current user statistics
 * @access  Private
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const userId = req.user.id

  try {
    // Get session statistics
    const { data: sessionStats, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('id, status, created_at')
      .eq('user_id', userId)

    if (sessionError) {
      throw new Error('Failed to fetch session statistics')
    }

    // Calculate statistics
    const totalSessions = sessionStats.length
    const activeSessions = sessionStats.filter(s => s.status === 'connected').length
    const totalMessages = 0 // TODO: Adicionar quando coluna messages_sent existir
    const totalWarmups = 0 // TODO: Adicionar quando coluna warmup_count existir

    // Calculate average uptime (simplified - based on session age)
    const now = new Date()
    const avgUptime = sessionStats.length > 0 
      ? sessionStats.reduce((sum, s) => {
          const sessionAge = (now - new Date(s.created_at)) / (1000 * 60 * 60 * 24) // days
          return sum + Math.min(sessionAge * 24, 720) // max 30 days * 24 hours
        }, 0) / sessionStats.length
      : 0

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentLogs, error: logsError } = await supabase
      .from('session_logs')
      .select('created_at, level')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    if (logsError) {
      console.error('Failed to fetch recent logs:', logsError)
    }

    const recentActivity = recentLogs || []
    const errorCount = recentActivity.filter(log => log.level === 'error').length
    const successRate = recentActivity.length > 0 
      ? ((recentActivity.length - errorCount) / recentActivity.length * 100).toFixed(1)
      : 100

    const stats = {
      sessions: {
        total: totalSessions,
        active: activeSessions,
        inactive: totalSessions - activeSessions
      },
      messages: {
        total: totalMessages,
        daily_average: totalMessages > 0 && totalSessions > 0 
          ? Math.round(totalMessages / Math.max(totalSessions, 1))
          : 0
      },
      warmups: {
        total: totalWarmups,
        average_per_session: totalSessions > 0 
          ? Math.round(totalWarmups / totalSessions)
          : 0
      },
      performance: {
        avg_uptime: Math.round(avgUptime),
        success_rate: parseFloat(successRate),
        error_count: errorCount
      },
      activity: {
        recent_logs: recentActivity.length,
        last_activity: recentActivity.length > 0 
          ? recentActivity[0].created_at
          : null
      }
    }

    res.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Stats calculation error:', error)
    
    // Return basic stats if detailed calculation fails
    res.json({
      success: true,
      stats: {
        sessions: { total: 0, active: 0, inactive: 0 },
        messages: { total: 0, daily_average: 0 },
        warmups: { total: 0, average_per_session: 0 },
        performance: { avg_uptime: 0, success_rate: 100, error_count: 0 },
        activity: { recent_logs: 0, last_activity: null }
      }
    })
  }
}))

/**
 * @route   POST /api/users/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
], validateRequest, asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body

  // Verify current password by attempting to sign in
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: req.user.email,
    password: current_password
  })

  if (verifyError) {
    return res.status(400).json({
      success: false,
      error: 'Current password is incorrect',
      code: 'INVALID_CURRENT_PASSWORD'
    })
  }

  // Update password
  const { error } = await supabase.auth.updateUser({
    password: new_password
  })

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: 'PASSWORD_UPDATE_FAILED'
    })
  }

  res.json({
    success: true,
    message: 'Password changed successfully'
  })
}))

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account', [
  body('password')
    .notEmpty()
    .withMessage('Password confirmation is required')
], validateRequest, asyncHandler(async (req, res) => {
  const { password } = req.body
  const userId = req.user.id

  // Verify password
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: req.user.email,
    password
  })

  if (verifyError) {
    return res.status(400).json({
      success: false,
      error: 'Password is incorrect',
      code: 'INVALID_PASSWORD'
    })
  }

  try {
    // Delete user sessions first (cascade should handle this, but being explicit)
    await supabase
      .from('whatsapp_sessions')
      .delete()
      .eq('user_id', userId)

    // Delete user profile
    await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    // Delete user from auth (this should cascade delete everything)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)

    if (deleteError) {
      throw new Error('Failed to delete user account')
    }

    res.json({
      success: true,
      message: 'Account deleted successfully'
    })
  } catch (error) {
    console.error('Account deletion error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete account. Please contact support.',
      code: 'ACCOUNT_DELETION_FAILED'
    })
  }
}))

module.exports = router