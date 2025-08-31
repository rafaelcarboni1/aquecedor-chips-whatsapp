const jwt = require('jsonwebtoken')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// Admin client with service role key for bypassing RLS
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Middleware to authenticate JWT tokens from Supabase
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Token de acesso requerido',
        code: 'MISSING_TOKEN'
      })
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({
        error: 'Token inválido ou expirado',
        code: 'INVALID_TOKEN'
      })
    }

    // Get user role from database
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role, permissions')
      .eq('user_id', user.id)
      .single()

    // Add user info to request object
    req.user = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email,
      created_at: user.created_at,
      updated_at: user.updated_at,
      role: userRole?.role || 'user',
      permissions: userRole?.permissions || {}
    }

    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    })
  }
}

/**
 * Middleware to optionally authenticate token (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      req.user = null
      return next()
    }

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      req.user = null
      return next()
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email,
      created_at: user.created_at,
      updated_at: user.updated_at
    }

    next()
  } catch (error) {
    console.error('Optional auth middleware error:', error)
    req.user = null
    next()
  }
}

/**
 * Middleware to check if user has admin role
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      })
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Acesso negado. Permissões de administrador necessárias.',
        code: 'INSUFFICIENT_PERMISSIONS'
      })
    }

    next()
  } catch (error) {
    console.error('Admin middleware error:', error)
    return res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    })
  }
}

/**
 * Middleware to check specific permission
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Usuário não autenticado',
          code: 'NOT_AUTHENTICATED'
        })
      }

      const hasPermission = req.user.role === 'admin' || 
                           (req.user.permissions && req.user.permissions[permission] === true)

      if (!hasPermission) {
        return res.status(403).json({
          error: `Acesso negado. Permissão '${permission}' necessária.`,
          code: 'INSUFFICIENT_PERMISSIONS'
        })
      }

      next()
    } catch (error) {
      console.error('Permission middleware error:', error)
      return res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      })
    }
  }
}

/**
 * Utility function to get user from token without middleware
 */
const getUserFromToken = async (token) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email,
      created_at: user.created_at,
      updated_at: user.updated_at
    }
  } catch (error) {
    console.error('Get user from token error:', error)
    return null
  }
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requirePermission,
  getUserFromToken,
  supabase,
  supabaseAdmin
}