const express = require('express')
const { asyncHandler, validationError, notFoundError } = require('../middleware/errorHandler')
const { authenticateToken, requireAdmin, supabase } = require('../middleware/auth')
const { body, query, validationResult } = require('express-validator')

const router = express.Router()

// Apply authentication and admin check to all routes
router.use(authenticateToken)
router.use(requireAdmin)

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with their roles
 * @access  Admin only
 */
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve ser entre 1 e 100')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    throw validationError(errors.array())
  }

  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 20
  const offset = (page - 1) * limit

  // Get users with their roles
  const { data: users, error } = await supabase
    .from('auth.users')
    .select(`
      id,
      email,
      created_at,
      updated_at,
      email_confirmed_at,
      last_sign_in_at,
      raw_user_meta_data,
      user_roles (
        role,
        permissions,
        created_at as role_created_at
      )
    `)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    throw new Error('Erro ao buscar usuários')
  }

  // Get total count
  const { count, error: countError } = await supabase
    .from('auth.users')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('Error counting users:', countError)
    throw new Error('Erro ao contar usuários')
  }

  res.json({
    success: true,
    users: users || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit)
    }
  })
}))

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get specific user details
 * @access  Admin only
 */
router.get('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params

  // Get user with role and sessions
  const { data: user, error } = await supabase
    .from('auth.users')
    .select(`
      id,
      email,
      created_at,
      updated_at,
      email_confirmed_at,
      last_sign_in_at,
      raw_user_meta_data,
      user_roles (
        role,
        permissions,
        created_at as role_created_at,
        updated_at as role_updated_at
      ),
      whatsapp_sessions (
        id,
        session_name,
        phone_number,
        status,
        warmup_enabled,
        created_at
      )
    `)
    .eq('id', id)
    .single()

  if (error || !user) {
    throw notFoundError('Usuário')
  }

  res.json({
    success: true,
    user
  })
}))

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Update user role
 * @access  Admin only
 */
router.put('/users/:id/role', [
  body('role')
    .isIn(['user', 'admin', 'moderator'])
    .withMessage('Role deve ser: user, admin ou moderator'),
  body('permissions')
    .optional()
    .isObject()
    .withMessage('Permissões devem ser um objeto')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    throw validationError(errors.array())
  }

  const { id } = req.params
  const { role, permissions = {} } = req.body

  // Check if user exists
  const { data: existingUser, error: userError } = await supabase
    .from('auth.users')
    .select('id, email')
    .eq('id', id)
    .single()

  if (userError || !existingUser) {
    throw notFoundError('Usuário')
  }

  // Prevent admin from demoting themselves
  if (id === req.user.id && role !== 'admin') {
    return res.status(400).json({
      success: false,
      error: 'Você não pode alterar seu próprio role de administrador'
    })
  }

  // Update or insert user role
  const { data: updatedRole, error: roleError } = await supabase
    .from('user_roles')
    .upsert({
      user_id: id,
      role,
      permissions,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single()

  if (roleError) {
    console.error('Error updating user role:', roleError)
    throw new Error('Erro ao atualizar role do usuário')
  }

  res.json({
    success: true,
    message: `Role do usuário ${existingUser.email} atualizado para ${role}`,
    role: updatedRole
  })
}))

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user (soft delete)
 * @access  Admin only
 */
router.delete('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params

  // Prevent admin from deleting themselves
  if (id === req.user.id) {
    return res.status(400).json({
      success: false,
      error: 'Você não pode deletar sua própria conta'
    })
  }

  // Check if user exists
  const { data: existingUser, error: userError } = await supabase
    .from('auth.users')
    .select('id, email')
    .eq('id', id)
    .single()

  if (userError || !existingUser) {
    throw notFoundError('Usuário')
  }

  // Delete user from Supabase Auth (this will cascade delete related data)
  const { error: deleteError } = await supabase.auth.admin.deleteUser(id)

  if (deleteError) {
    console.error('Error deleting user:', deleteError)
    throw new Error('Erro ao deletar usuário')
  }

  res.json({
    success: true,
    message: `Usuário ${existingUser.email} deletado com sucesso`
  })
}))

/**
 * @route   GET /api/admin/stats
 * @desc    Get system statistics
 * @access  Admin only
 */
router.get('/stats', asyncHandler(async (req, res) => {
  // Get user count by role
  const { data: userStats, error: userStatsError } = await supabase
    .from('user_roles')
    .select('role')

  if (userStatsError) {
    console.error('Error fetching user stats:', userStatsError)
    throw new Error('Erro ao buscar estatísticas de usuários')
  }

  // Get session stats
  const { data: sessionStats, error: sessionStatsError } = await supabase
    .from('whatsapp_sessions')
    .select('status, warmup_active')

  if (sessionStatsError) {
    console.error('Error fetching session stats:', sessionStatsError)
    throw new Error('Erro ao buscar estatísticas de sessões')
  }

  // Process stats
  const roleStats = userStats.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1
    return acc
  }, {})

  const statusStats = sessionStats.reduce((acc, session) => {
    acc[session.status] = (acc[session.status] || 0) + 1
    return acc
  }, {})

  const warmupStats = sessionStats.reduce((acc, session) => {
    const key = session.warmup_active ? 'active' : 'inactive'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  res.json({
    success: true,
    stats: {
      users: {
        total: userStats.length,
        byRole: roleStats
      },
      sessions: {
        total: sessionStats.length,
        byStatus: statusStats,
        warmup: warmupStats
      }
    }
  })
}))

module.exports = router