import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Smartphone, 
  Plus, 
  Activity, 
  Users, 
  MessageCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useAuthStore, useSessionsStore, useUIStore } from '../../lib/store.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'

const DashboardPage = () => {
  const { user, tenant } = useAuthStore()
  const { sessions, fetchSessions, loading } = useSessionsStore()
  const { addNotification } = useUIStore()
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSessions: 0,
    warmupActive: 0,
    messagesCount: 0
  })

  useEffect(() => {
    fetchSessions()
  }, [])

  useEffect(() => {
    if (Array.isArray(sessions) && sessions.length > 0) {
      const totalSessions = sessions.length
      const activeSessions = sessions.filter(s => s.status === 'connected').length
      const warmupActive = sessions.filter(s => s.warmup_active).length
      const messagesCount = sessions.reduce((acc, s) => acc + (s.messages_sent || 0), 0)
      
      setStats({
        totalSessions,
        activeSessions,
        warmupActive,
        messagesCount
      })
    }
  }, [sessions])

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
        <LoadingSpinner size="lg" text="Carregando dashboard..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {user?.user_metadata?.name || 'Usuário'}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie suas sessões de WhatsApp e rotinas de aquecimento
          </p>
        </div>
        <Link
          to="/sessions"
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Sessão</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Sessões</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sessões Ativas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeSessions}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Aquecimento Ativo</p>
              <p className="text-2xl font-bold text-gray-900">{stats.warmupActive}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mensagens Enviadas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.messagesCount}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Sessões Recentes</h2>
          <Link 
            to="/sessions" 
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Ver todas
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma sessão encontrada
            </h3>
            <p className="text-gray-600 mb-6">
              Crie sua primeira sessão de WhatsApp para começar o aquecimento
            </p>
            <Link to="/sessions" className="btn btn-primary">
              Criar primeira sessão
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.isArray(sessions) && sessions.slice(0, 5).map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {session.phone_number || `Sessão ${session.id.slice(0, 8)}`}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Criada em {new Date(session.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                    {getStatusIcon(session.status)}
                    <span className="capitalize">{session.status}</span>
                  </div>
                  
                  {session.warmup_active && (
                    <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-100">
                      <TrendingUp className="w-3 h-3" />
                      <span>Aquecendo</span>
                    </div>
                  )}
                  
                  <Link
                    to={`/sessions/${session.id}`}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Ver detalhes
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
          <div className="space-y-3">
            <Link
              to="/sessions"
              className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-5 h-5 text-primary-600" />
              <span className="font-medium text-gray-900">Criar nova sessão</span>
            </Link>
            
            <button
              onClick={() => {
                addNotification({
                  type: 'info',
                  title: 'Funcionalidade em desenvolvimento',
                  message: 'O relatório de atividades será implementado em breve.'
                })
              }}
              className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors w-full text-left"
            >
              <Activity className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-900">Ver relatório de atividades</span>
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dicas</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>Mantenha suas sessões conectadas para melhor aquecimento</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>Configure rotinas de aquecimento automático para melhores resultados</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>Monitore os logs para identificar possíveis problemas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage