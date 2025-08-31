const express = require('express')
const { asyncHandler } = require('../middleware/errorHandler')
const { supabase } = require('../middleware/auth')

const router = express.Router()

/**
 * @route   GET /api/health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100
    }
  }

  res.status(200).json(healthCheck)
}))

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check with dependencies
 * @access  Public
 */
router.get('/detailed', asyncHandler(async (req, res) => {
  const startTime = Date.now()
  
  // Check Supabase connection
  let supabaseStatus = 'OK'
  let supabaseLatency = 0
  
  try {
    const supabaseStart = Date.now()
    await supabase.from('profiles').select('count').limit(1)
    supabaseLatency = Date.now() - supabaseStart
  } catch (error) {
    supabaseStatus = 'ERROR'
    console.error('Supabase health check failed:', error.message)
  }

  const totalLatency = Date.now() - startTime
  
  const healthCheck = {
    status: supabaseStatus === 'OK' ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    latency: {
      total: totalLatency,
      supabase: supabaseLatency
    },
    dependencies: {
      supabase: {
        status: supabaseStatus,
        latency: supabaseLatency
      }
    },
    system: {
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
        external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100,
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024 * 100) / 100
      },
      cpu: {
        usage: process.cpuUsage()
      },
      platform: process.platform,
      nodeVersion: process.version
    }
  }

  const statusCode = healthCheck.status === 'OK' ? 200 : 503
  res.status(statusCode).json(healthCheck)
}))

/**
 * @route   GET /api/health/ready
 * @desc    Readiness probe for Kubernetes
 * @access  Public
 */
router.get('/ready', asyncHandler(async (req, res) => {
  try {
    // Check if all critical services are ready
    await supabase.from('profiles').select('count').limit(1)
    
    res.status(200).json({
      status: 'READY',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(503).json({
      status: 'NOT_READY',
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    })
  }
}))

/**
 * @route   GET /api/health/live
 * @desc    Liveness probe for Kubernetes
 * @access  Public
 */
router.get('/live', asyncHandler(async (req, res) => {
  res.status(200).json({
    status: 'ALIVE',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
}))

module.exports = router