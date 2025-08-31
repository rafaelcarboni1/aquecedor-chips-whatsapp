import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, 
  Smartphone, 
  Play, 
  Square, 
  Trash2, 
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp
} from 'lucide-react'
import { useSessionsStore, useUIStore } from '../../lib/store.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'

const SessionsPage = () => {
  const { 
    sessions, 
    fetchSessions, 
    createSession, 
    deleteSession, 
    startWarmup, 
    stopWarmup, 
    loading 
  } = useSessionsStore()
  const { addNotification } = useUIStore()
  const [actionLoading, setActionLoading] = useState({})

  useEffect(() => {
    fetchSessions()
  }, [])

  const handleCreateSession = async () => {
    const result = await createSession()
    
    if (result.success) {
      addNotification({
        type: 'success',
        title: 'Sessão criada!',
        message: 'Nova sessão de WhatsApp foi criada com sucesso.'
      })
    } else {
      addNotification({
        type: 'error',
        title: 'Erro ao criar sessão',
        message: result.error
      })
    }
  }

  const handleDeleteSession = async (sessionId) => {
    if (!confirm('Tem certeza que deseja excluir esta sessão?')) return
    
    setActionLoading(prev => ({ ...prev, [sessionId]: 'deleting' }))
    
    const result = await deleteSession(sessionId)
    
    if (result.success) {
      addNotification({
        type: 'success',
        title: 'Sessão excluída',
        message: 'Sessão foi excluída com sucesso.'
      })
    } else {
      addNotification({
        type: 'error',
        title: 'Erro ao excluir sessão',
        message: result.error
      })
    }
    
    setActionLoading(prev => ({ ...prev, [sessionId]: null }))
  }

  const handleToggleWarmup = async (sessionId, isActive) => {
    setActionLoading(prev => ({ ...prev, [sessionId]: 'warmup' }))
    
    const result = isActive 
      ? await stopWarmup(sessionId)
      : await startWarmup(sessionId)
    
    if (result.success) {
      addNotification({
        type: 'success',
        title: isActive ? 'Aquecimento parado' : 'Aquecimento iniciado',
        message: isActive 
          ? 'O aquecimento foi parado com sucesso.'
          : 'O aquecimento foi iniciado com sucesso.'
      })
    } else {
      addNotification({
        type: 'error',
        title: 'Erro no aquecimento',
        message: result.error
      })
    }
    
    setActionLoading(prev => ({ ...prev, [sessionId]: null }))
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-100'
      case 'disconnected':
        return 'text-red-600 bg-red-100'
      case 'connecting':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4" />
      case 'disconnected':
        return <AlertCircle className="w-4 h-4" />
      case 'connecting':
        return <Clock className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Carregando sessões..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sessões WhatsApp</h1>
          <p className="text-gray-600 mt-1">
            Gerencie suas sessões de WhatsApp e configure rotinas de aquecimento
          </p>
        </div>
        <button
          onClick={handleCreateSession}
          disabled={loading}
          className="btn btn-primary flex items-center space-x-2"
        >
          {loading ? (
            <LoadingSpinner size="sm" color="text-white" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span>Nova Sessão</span>
        </button>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="card text-center py-12">
          <Smartphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma sessão encontrada
          </h3>
          <p className="text-gray-600 mb-6">
            Crie sua primeira sessão de WhatsApp para começar o aquecimento
          </p>
          <button
            onClick={handleCreateSession}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <LoadingSpinner size="sm" color="text-white" />
            ) : (
              'Criar primeira sessão'
            )}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.isArray(sessions) && sessions.map((session) => (
            <div key={session.id} className="card">
              {/* Session Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {session.phone_number || `Sessão ${session.id ? session.id.slice(0, 8) : 'N/A'}`}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {session.created_at ? new Date(session.created_at).toLocaleDateString('pt-BR') : 'Data não disponível'}
                    </p>
                  </div>
                </div>
                
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                  {getStatusIcon(session.status)}
                  <span className="capitalize">{session.status}</span>
                </div>
              </div>

              {/* Session Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {session.messages_sent || 0}
                  </p>
                  <p className="text-xs text-gray-600">Mensagens</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {session.uptime_hours || 0}h
                  </p>
                  <p className="text-xs text-gray-600">Uptime</p>
                </div>
              </div>

              {/* Warmup Status */}
              {session.warmup_active && (
                <div className="flex items-center space-x-2 mb-4 p-2 bg-green-50 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    Aquecimento ativo
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between space-x-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleWarmup(session.id, session.warmup_active)}
                    disabled={actionLoading[session.id] === 'warmup' || session.status !== 'connected'}
                    className={`
                      flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium
                      transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
                      ${session.warmup_active
                        ? 'text-red-600 bg-red-100 hover:bg-red-200 focus:ring-red-500'
                        : 'text-green-600 bg-green-100 hover:bg-green-200 focus:ring-green-500'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                    title={session.status !== 'connected' ? 'Sessão deve estar conectada' : ''}
                  >
                    {actionLoading[session.id] === 'warmup' ? (
                      <LoadingSpinner size="sm" />
                    ) : session.warmup_active ? (
                      <Square className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    <span>{session.warmup_active ? 'Parar' : 'Iniciar'}</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <Link
                    to={`/sessions/${session.id}`}
                    className="flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Ver</span>
                  </Link>
                  
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    disabled={actionLoading[session.id] === 'deleting'}
                    className="flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium text-red-600 bg-red-100 hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading[session.id] === 'deleting' ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    <span>Excluir</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SessionsPage