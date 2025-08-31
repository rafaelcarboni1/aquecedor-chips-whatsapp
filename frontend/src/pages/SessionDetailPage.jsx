import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Smartphone, 
  QrCode, 
  Play, 
  Square, 
  RefreshCw,
  Activity,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from 'lucide-react'
import { useSessionsStore, useUIStore } from '../../lib/store.js'
import { apiClient, handleApiError } from '../../lib/api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'

const SessionDetailPage = () => {
  const { sessionId } = useParams()
  const { sessions, startWarmup, stopWarmup } = useSessionsStore()
  const { addNotification } = useUIStore()
  
  const [session, setSession] = useState(null)
  const [qrCode, setQrCode] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})

  useEffect(() => {
    // Find session in store first
    const foundSession = sessions.find(s => s.id === sessionId)
    if (foundSession) {
      setSession(foundSession)
    }
    
    // Fetch detailed session data
    fetchSessionDetails()
    fetchSessionLogs()
    
    // Setup polling for QR code when session is not connected
    const pollInterval = setInterval(() => {
      if (session && session.status !== 'connected' && !qrCode) {
        fetchQRCode()
      }
    }, 3000) // Poll every 3 seconds
    
    return () => clearInterval(pollInterval)
  }, [sessionId, sessions, session?.status, qrCode])

  const fetchSessionDetails = async () => {
    try {
      setLoading(true)
      const sessionData = await apiClient.sessions.getById(sessionId)
      setSession(sessionData)
      
      // If session is not connected, try to get QR code
      if (sessionData.status !== 'connected') {
        fetchQRCode()
      }
    } catch (error) {
      const apiError = handleApiError(error)
      addNotification({
        type: 'error',
        title: 'Erro ao carregar sessão',
        message: apiError.message
      })
    } finally {
      setLoading(false)
    }
  }

  const connectWhatsApp = async () => {
    try {
      // First, start the session connection
      await apiClient.sessions.connectSession(sessionId)
      
      // Then fetch the QR code
      setTimeout(() => {
        fetchQRCode()
      }, 1000) // Wait 1 second for the session to initialize
      
      addNotification({
        type: 'success',
        title: 'Conexão iniciada',
        message: 'Aguarde o QR code ser gerado...'
      })
    } catch (error) {
      const apiError = handleApiError(error)
      addNotification({
        type: 'error',
        title: 'Erro ao conectar',
        message: apiError.message
      })
    }
  }

  const fetchQRCode = async () => {
    try {
      const qrData = await apiClient.sessions.getQRCode(sessionId)
      setQrCode(qrData.qr)
    } catch (error) {
      // QR code might not be available yet
      console.log('QR code not available:', error)
    }
  }

  const fetchSessionLogs = async () => {
    try {
      const logsData = await apiClient.sessions.getLogs(sessionId, 20)
      setLogs(logsData)
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
  }

  const handleToggleWarmup = async () => {
    if (!session) return
    
    setActionLoading(prev => ({ ...prev, warmup: true }))
    
    const result = session.warmup_active 
      ? await stopWarmup(sessionId)
      : await startWarmup(sessionId)
    
    if (result.success) {
      setSession(prev => ({ ...prev, warmup_active: !prev.warmup_active }))
      addNotification({
        type: 'success',
        title: session.warmup_active ? 'Aquecimento parado' : 'Aquecimento iniciado',
        message: session.warmup_active 
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
    
    setActionLoading(prev => ({ ...prev, warmup: false }))
  }

  const handleRefresh = () => {
    fetchSessionDetails()
    fetchSessionLogs()
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
        return <CheckCircle className="w-5 h-5" />
      case 'disconnected':
        return <AlertCircle className="w-5 h-5" />
      case 'connecting':
        return <Clock className="w-5 h-5" />
      default:
        return <AlertCircle className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Carregando sessão..." />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Sessão não encontrada
        </h3>
        <p className="text-gray-600 mb-6">
          A sessão solicitada não existe ou foi removida.
        </p>
        <Link to="/sessions" className="btn btn-primary">
          Voltar para sessões
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            to="/sessions" 
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {session.phone_number || `Sessão ${session.id.slice(0, 8)}`}
            </h1>
            <p className="text-gray-600 mt-1">
              Criada em {new Date(session.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleToggleWarmup}
            disabled={actionLoading.warmup || session.status !== 'connected'}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg font-medium
              transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
              ${session.warmup_active
                ? 'text-red-600 bg-red-100 hover:bg-red-200 focus:ring-red-500'
                : 'text-green-600 bg-green-100 hover:bg-green-200 focus:ring-green-500'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            title={session.status !== 'connected' ? 'Sessão deve estar conectada' : ''}
          >
            {actionLoading.warmup ? (
              <LoadingSpinner size="sm" />
            ) : session.warmup_active ? (
              <Square className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>{session.warmup_active ? 'Parar Aquecimento' : 'Iniciar Aquecimento'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Status da Sessão</h2>
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(session.status)}`}>
                {getStatusIcon(session.status)}
                <span className="capitalize">{session.status}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{session.messages_sent || 0}</p>
                <p className="text-sm text-gray-600">Mensagens</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{session.uptime_hours || 0}h</p>
                <p className="text-sm text-gray-600">Uptime</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Activity className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{session.warmup_count || 0}</p>
                <p className="text-sm text-gray-600">Aquecimentos</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {session.warmup_active ? 'Ativo' : 'Inativo'}
                </p>
                <p className="text-sm text-gray-600">Aquecimento</p>
              </div>
            </div>
          </div>

          {/* Logs */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Logs Recentes</h2>
              <button
                onClick={fetchSessionLogs}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Atualizar
              </button>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-600 text-center py-4">Nenhum log encontrado</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        log.level === 'error' ? 'bg-red-500' :
                        log.level === 'warn' ? 'bg-yellow-500' :
                        log.level === 'info' ? 'bg-blue-500' :
                        'bg-gray-500'
                      }`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{log.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* QR Code / Connection */}
        <div className="space-y-6">
          {session.status !== 'connected' && (
            <div className="card text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Conectar WhatsApp
              </h3>
              
              {qrCode ? (
                <>
                  <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 mb-4">
                    <img 
                      src={qrCode} 
                      alt="QR Code" 
                      className="w-full max-w-xs mx-auto"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Escaneie o QR Code com seu WhatsApp para conectar
                  </p>
                  <button
                    onClick={fetchQRCode}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Atualizar QR Code</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <QrCode className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Clique no botão abaixo para gerar o QR Code e conectar seu WhatsApp
                  </p>
                  <button
                    onClick={connectWhatsApp}
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <Smartphone className="w-5 h-5" />
                    <span>Conectar WhatsApp</span>
                  </button>
                </>
              )}
            </div>
          )}
          
          {session.status === 'connected' && (
            <div className="card text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                WhatsApp Conectado
              </h3>
              <p className="text-sm text-gray-600">
                Sua sessão está conectada e funcionando normalmente
              </p>
            </div>
          )}
          
          {/* Session Details */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhes</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ID da Sessão:</span>
                <span className="font-mono text-gray-900">{session.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Criada em:</span>
                <span className="text-gray-900">
                  {new Date(session.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Última atividade:</span>
                <span className="text-gray-900">
                  {session.last_activity 
                    ? new Date(session.last_activity).toLocaleString('pt-BR')
                    : 'Nunca'
                  }
                </span>
              </div>
              {session.phone_number && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Número:</span>
                  <span className="text-gray-900">{session.phone_number}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SessionDetailPage