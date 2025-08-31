/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.name = 'ApiError'
  }
}

/**
 * Middleware to handle 404 errors
 */
const notFound = (req, res, next) => {
  const error = new ApiError(
    `Rota ${req.originalUrl} não encontrada`,
    404,
    'ROUTE_NOT_FOUND'
  )
  next(error)
}

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  })

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'ID de recurso inválido'
    error = new ApiError(message, 400, 'INVALID_ID')
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered'
    error = new ApiError(message, 400, 'DUPLICATE_FIELD')
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ')
    error = new ApiError(message, 400, 'VALIDATION_ERROR')
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token'
    error = new ApiError(message, 401, 'INVALID_TOKEN')
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired'
    error = new ApiError(message, 401, 'TOKEN_EXPIRED')
  }

  // Supabase errors
  if (err.message && err.message.includes('JWT')) {
    const message = 'Authentication failed'
    error = new ApiError(message, 401, 'AUTH_FAILED')
  }

  // WhatsApp Web errors
  if (err.message && err.message.includes('WhatsApp')) {
    const message = 'WhatsApp service error'
    error = new ApiError(message, 503, 'WHATSAPP_ERROR')
  }

  // Rate limiting errors
  if (err.status === 429) {
    const message = 'Too many requests'
    error = new ApiError(message, 429, 'RATE_LIMIT_EXCEEDED')
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500
  const code = error.code || 'INTERNAL_ERROR'
  const message = error.message || 'Internal server error'

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  const errorResponse = {
    success: false,
    error: message,
    code,
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString()
  }

  res.status(statusCode).json(errorResponse)
}

/**
 * Async wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

/**
 * Validation error helper
 */
const validationError = (message, field = null) => {
  const error = new ApiError(message, 400, 'VALIDATION_ERROR')
  if (field) {
    error.field = field
  }
  return error
}

/**
 * Not found error helper
 */
const notFoundError = (resource = 'Resource') => {
  return new ApiError(`${resource} not found`, 404, 'NOT_FOUND')
}

/**
 * Unauthorized error helper
 */
const unauthorizedError = (message = 'Unauthorized access') => {
  return new ApiError(message, 401, 'UNAUTHORIZED')
}

/**
 * Forbidden error helper
 */
const forbiddenError = (message = 'Access forbidden') => {
  return new ApiError(message, 403, 'FORBIDDEN')
}

/**
 * Conflict error helper
 */
const conflictError = (message = 'Resource conflict') => {
  return new ApiError(message, 409, 'CONFLICT')
}

/**
 * Service unavailable error helper
 */
const serviceUnavailableError = (message = 'Service temporarily unavailable') => {
  return new ApiError(message, 503, 'SERVICE_UNAVAILABLE')
}

module.exports = {
  ApiError,
  notFound,
  errorHandler,
  asyncHandler,
  validationError,
  notFoundError,
  unauthorizedError,
  forbiddenError,
  conflictError,
  serviceUnavailableError
}