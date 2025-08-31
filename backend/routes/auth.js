const express = require('express')
const { asyncHandler, validationError } = require('../middleware/errorHandler')
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
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email válido é obrigatório'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Nome deve ter pelo menos 2 caracteres')
], validateRequest, asyncHandler(async (req, res) => {
  const { email, password, name } = req.body

  // Register user with Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name.trim()
      }
    }
  })

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: 'REGISTRATION_FAILED'
    })
  }

  // Create user profile in database
  if (data.user) {
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email,
          name: name.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // Don't fail registration if profile creation fails
      }
    } catch (profileError) {
      console.error('Profile creation error:', profileError)
    }
  }

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please check your email for verification.',
    user: {
      id: data.user?.id,
      email: data.user?.email,
      name: data.user?.user_metadata?.name,
      email_confirmed: data.user?.email_confirmed_at ? true : false
    }
  })
}))

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email válido é obrigatório'),
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória')
], validateRequest, asyncHandler(async (req, res) => {
  const { email, password } = req.body

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    return res.status(401).json({
      success: false,
      error: error.message,
      code: 'LOGIN_FAILED'
    })
  }

  res.json({
    success: true,
    message: 'Login successful',
    user: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name,
      email_confirmed: data.user.email_confirmed_at ? true : false
    },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at
    }
  })
}))

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (token) {
    // Sign out from Supabase
    await supabase.auth.signOut()
  }

  res.json({
    success: true,
    message: 'Logout successful'
  })
}))

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', [
  body('refresh_token')
    .notEmpty()
    .withMessage('Token de atualização é obrigatório')
], validateRequest, asyncHandler(async (req, res) => {
  const { refresh_token } = req.body

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token
  })

  if (error) {
    return res.status(401).json({
      success: false,
      error: error.message,
      code: 'REFRESH_FAILED'
    })
  }

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at
    }
  })
}))

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email válido é obrigatório')
], validateRequest, asyncHandler(async (req, res) => {
  const { email } = req.body

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`
  })

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: 'RESET_FAILED'
    })
  }

  res.json({
    success: true,
    message: 'Password reset email sent successfully'
  })
}))

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', [
  body('access_token')
    .notEmpty()
    .withMessage('Token de acesso é obrigatório'),
  body('refresh_token')
    .notEmpty()
    .withMessage('Token de atualização é obrigatório'),
  body('new_password')
    .isLength({ min: 6 })
    .withMessage('Nova senha deve ter pelo menos 6 caracteres')
], validateRequest, asyncHandler(async (req, res) => {
  const { access_token, refresh_token, new_password } = req.body

  // Set session with tokens
  const { error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token
  })

  if (sessionError) {
    return res.status(400).json({
      success: false,
      error: sessionError.message,
      code: 'INVALID_TOKENS'
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
    message: 'Password reset successfully'
  })
}))

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with token
 * @access  Public
 */
router.post('/verify-email', [
  body('token')
    .notEmpty()
    .withMessage('Token de verificação é obrigatório'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email válido é obrigatório')
], validateRequest, asyncHandler(async (req, res) => {
  const { token, email } = req.body

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email'
  })

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: 'VERIFICATION_FAILED'
    })
  }

  res.json({
    success: true,
    message: 'Email verified successfully'
  })
}))

module.exports = router