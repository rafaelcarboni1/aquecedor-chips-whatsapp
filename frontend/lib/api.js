import axios from 'axios'
import { supabase } from './auth.js'

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      await supabase.auth.signOut()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API methods
export const apiClient = {
  // Session management
  sessions: {
    // Get all sessions for current user
    async getAll() {
      const response = await api.get('/sessions')
      return response.data
    },

    // Create new WhatsApp session
    async create() {
      const response = await api.post('/sessions')
      return response.data
    },

    // Get session by ID
    async getById(sessionId) {
      const response = await api.get(`/sessions/${sessionId}`)
      return response.data
    },

    // Delete session
    async delete(sessionId) {
      const response = await api.delete(`/sessions/${sessionId}`)
      return response.data
    },

    // Start warmup routine
    async startWarmup(sessionId) {
      const response = await api.post(`/sessions/${sessionId}/warmup`)
      return response.data
    },

    // Stop warmup routine
    async stopWarmup(sessionId) {
      const response = await api.post(`/sessions/${sessionId}/stop-warmup`)
      return response.data
    },

    // Get session logs
    async getLogs(sessionId, limit = 50) {
      const response = await api.get(`/sessions/${sessionId}/logs?limit=${limit}`)
      return response.data
    },

    // Connect/Start session
    async connectSession(sessionId) {
      const response = await api.post(`/sessions/${sessionId}/connect`)
      return response.data
    },

    // Get QR Code for session
    async getQRCode(sessionId) {
      const response = await api.get(`/sessions/${sessionId}/qr`)
      return response.data
    }
  },

  // User management
  user: {
    // Get current user profile
    async getProfile() {
      const response = await api.get('/user/profile')
      return response.data
    },

    // Update user profile
    async updateProfile(data) {
      const response = await api.put('/user/profile', data)
      return response.data
    },

    // Get user statistics
    async getStats() {
      const response = await api.get('/user/stats')
      return response.data
    }
  },

  // Health check
  async health() {
    const response = await api.get('/health')
    return response.data
  }
}

// Error handling helper
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.message || error.response.data?.error || 'Erro no servidor'
    return {
      message,
      status: error.response.status,
      data: error.response.data
    }
  } else if (error.request) {
    // Request was made but no response received
    return {
      message: 'Erro de conexão. Verifique sua internet.',
      status: 0,
      data: null
    }
  } else {
    // Something else happened
    return {
      message: error.message || 'Erro desconhecido',
      status: 0,
      data: null
    }
  }
}

export default api