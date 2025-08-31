import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { authHelpers, dbHelpers } from './auth.js'
import { apiClient, handleApiError } from './api.js'

// Auth Store
export const useAuthStore = create(
  subscribeWithSelector((set, get) => ({
    // State
    user: null,
    session: null,
    userRole: null,
    loading: true,
    error: null,

    // Actions
    setUser: (user) => set({ user }),
    setSession: (session) => set({ session }),
    setUserRole: (userRole) => set({ userRole }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    // Initialize auth state
    initialize: async () => {
      try {
        set({ loading: true, error: null })
        
        const { session } = await authHelpers.getCurrentSession()
        
        if (session?.user) {
          set({ user: session.user, session })
          
          // Get user role (auto-created by trigger)
          const { data: userRole, error } = await dbHelpers.getUserRole(session.user.id)
          
          if (error && error.code === 'PGRST116') {
            // Role doesn't exist, should be auto-created but let's handle edge case
            console.warn('User role not found, this should not happen with trigger')
          } else if (error) {
            console.error('Error fetching user role:', error)
          }
          
          set({ userRole })
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        set({ error: error.message })
      } finally {
        set({ loading: false })
      }
    },

    // Sign in
    signIn: async (email, password) => {
      try {
        set({ loading: true, error: null })
        
        const { data, error } = await authHelpers.signIn(email, password)
        
        if (error) throw error
        
        if (data.user && data.session) {
          set({ user: data.user, session: data.session })
          
          // Get user role
          const { data: userRole } = await dbHelpers.getUserRole(data.user.id)
          set({ userRole })
          
          return { success: true }
        }
      } catch (error) {
        set({ error: error.message })
        return { success: false, error: error.message }
      } finally {
        set({ loading: false })
      }
    },

    // Sign up
    signUp: async (email, password, name) => {
      try {
        set({ loading: true, error: null })
        
        const { data, error } = await authHelpers.signUp(email, password, { name })
        
        if (error) throw error
        
        return { success: true, data }
      } catch (error) {
        set({ error: error.message })
        return { success: false, error: error.message }
      } finally {
        set({ loading: false })
      }
    },

    // Sign out
    signOut: async () => {
      try {
        await authHelpers.signOut()
        set({ user: null, session: null, tenant: null, error: null })
        return { success: true }
      } catch (error) {
        set({ error: error.message })
        return { success: false, error: error.message }
      }
    }
  }))
)

// Sessions Store
export const useSessionsStore = create((set, get) => ({
  // State
  sessions: [],
  currentSession: null,
  loading: false,
  error: null,

  // Actions
  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (session) => set({ currentSession: session }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Fetch all sessions
  fetchSessions: async () => {
    try {
      set({ loading: true, error: null })
      const response = await apiClient.sessions.getAll()
      const sessions = response.sessions || []
      set({ sessions })
      return { success: true, data: sessions }
    } catch (error) {
      const apiError = handleApiError(error)
      set({ error: apiError.message, sessions: [] })
      return { success: false, error: apiError.message }
    } finally {
      set({ loading: false })
    }
  },

  // Create new session
  createSession: async () => {
    try {
      set({ loading: true, error: null })
      const response = await apiClient.sessions.create()
      const newSession = response.session
      
      const { sessions } = get()
      set({ sessions: [newSession, ...sessions] })
      
      return { success: true, data: newSession }
    } catch (error) {
      const apiError = handleApiError(error)
      set({ error: apiError.message })
      return { success: false, error: apiError.message }
    } finally {
      set({ loading: false })
    }
  },

  // Delete session
  deleteSession: async (sessionId) => {
    try {
      set({ loading: true, error: null })
      await apiClient.sessions.delete(sessionId)
      
      const { sessions } = get()
      set({ sessions: sessions.filter(s => s.id !== sessionId) })
      
      return { success: true }
    } catch (error) {
      const apiError = handleApiError(error)
      set({ error: apiError.message })
      return { success: false, error: apiError.message }
    } finally {
      set({ loading: false })
    }
  },

  // Start warmup
  startWarmup: async (sessionId) => {
    try {
      const result = await apiClient.sessions.startWarmup(sessionId)
      
      // Update session status in store
      const { sessions } = get()
      const updatedSessions = sessions.map(s => 
        s.id === sessionId ? { ...s, warmup_active: true } : s
      )
      set({ sessions: updatedSessions })
      
      return { success: true, data: result }
    } catch (error) {
      const apiError = handleApiError(error)
      return { success: false, error: apiError.message }
    }
  },

  // Stop warmup
  stopWarmup: async (sessionId) => {
    try {
      const result = await apiClient.sessions.stopWarmup(sessionId)
      
      // Update session status in store
      const { sessions } = get()
      const updatedSessions = sessions.map(s => 
        s.id === sessionId ? { ...s, warmup_active: false } : s
      )
      set({ sessions: updatedSessions })
      
      return { success: true, data: result }
    } catch (error) {
      const apiError = handleApiError(error)
      return { success: false, error: apiError.message }
    }
  }
}))

// UI Store
export const useUIStore = create((set) => ({
  // State
  sidebarOpen: false,
  theme: 'light',
  notifications: [],

  // Actions
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
  
  addNotification: (notification) => set((state) => ({
    notifications: [...state.notifications, { ...notification, id: Date.now() }]
  })),
  
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),
  
  clearNotifications: () => set({ notifications: [] })
}))