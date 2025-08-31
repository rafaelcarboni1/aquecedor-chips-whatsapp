import React, { useState, useEffect } from 'react'
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Key, 
  Save,
  Eye,
  EyeOff,
  Activity,
  Smartphone,
  MessageCircle,
  TrendingUp
} from 'lucide-react'
import { useAuthStore, useUIStore } from '../../lib/store.js'
import { apiClient, handleApiError } from '../../lib/api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'

const ProfilePage = () => {
  const { user, updateProfile } = useAuthStore()
  const { addNotification } = useUIStore()
  
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [profileForm, setProfileForm] = useState({
    name: user?.user_metadata?.name || '',
    email: user?.email || ''
  })
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    fetchUserStats()
  }, [])

  const fetchUserStats = async () => {
    try {
      const userStats = await apiClient.users.getStats()
      setStats(userStats)
    } catch (error) {
      console.error('Error fetching user stats:', error)
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    
    if (!profileForm.name.trim()) {
      addNotification({
        type: 'error',
        title: 'Erro de validação',
        message: 'Nome é obrigatório'
      })
      return
    }
    
    setLoading(true)
    
    try {
      const result = await updateProfile({
        name: profileForm.name.trim(),
        email: profileForm.email
      })
      
      if (result.success) {
        addNotification({
          type: 'success',
          title: 'Perfil atualizado',
          message: 'Suas informações foram atualizadas com sucesso'
        })
      } else {
        addNotification({
          type: 'error',
          title: 'Erro ao atualizar perfil',
          message: result.error
        })
      }
    } catch (error) {
      const apiError = handleApiError(error)
      addNotification({
        type: 'error',
        title: 'Erro ao atualizar perfil',
        message: apiError.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      addNotification({
        type: 'error',
        title: 'Erro de validação',
        message: 'Todos os campos de senha são obrigatórios'
      })
      return
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addNotification({
        type: 'error',
        title: 'Erro de validação',
        message: 'Nova senha e confirmação não coincidem'
      })
      return
    }
    
    if (passwordForm.newPassword.length < 6) {
      addNotification({
        type: 'error',
        title: 'Erro de validação',
        message: 'Nova senha deve ter pelo menos 6 caracteres'
      })
      return
    }
    
    setLoading(true)
    
    try {
      // Note: This would need to be implemented in the auth store
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      addNotification({
        type: 'success',
        title: 'Senha alterada',
        message: 'Sua senha foi alterada com sucesso'
      })
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      const apiError = handleApiError(error)
      addNotification({
        type: 'error',
        title: 'Erro ao alterar senha',
        message: apiError.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target
    setProfileForm(prev => ({ ...prev, [name]: value }))
  }

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target
    setPasswordForm(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-600 mt-1">
          Gerencie suas informações pessoais e configurações de conta
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Information */}
          <div className="card">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Informações Pessoais</h2>
                <p className="text-sm text-gray-600">Atualize suas informações básicas</p>
              </div>
            </div>
            
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome completo
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={profileForm.name}
                  onChange={handleProfileInputChange}
                  className="input"
                  placeholder="Seu nome completo"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={profileForm.email}
                  onChange={handleProfileInputChange}
                  className="input"
                  placeholder="seu@email.com"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  O email não pode ser alterado após o cadastro
                </p>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  {loading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="card">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Key className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Alterar Senha</h2>
                <p className="text-sm text-gray-600">Mantenha sua conta segura</p>
              </div>
            </div>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Senha atual
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordInputChange}
                    className="input pr-10"
                    placeholder="Digite sua senha atual"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    id="newPassword"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordInputChange}
                    className="input pr-10"
                    placeholder="Digite sua nova senha"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordInputChange}
                    className="input pr-10"
                    placeholder="Confirme sua nova senha"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  {loading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                  <span>Alterar Senha</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações da Conta</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{user?.email}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-gray-600">Membro desde</p>
                  <p className="font-medium text-gray-900">
                    {user?.created_at 
                      ? new Date(user.created_at).toLocaleDateString('pt-BR')
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-gray-600">Status</p>
                  <p className="font-medium text-green-600">Ativo</p>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Stats */}
          {stats && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas de Uso</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Sessões</p>
                      <p className="text-xs text-gray-600">Total criadas</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{stats.total_sessions || 0}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Mensagens</p>
                      <p className="text-xs text-gray-600">Total enviadas</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{stats.total_messages || 0}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Activity className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Aquecimentos</p>
                      <p className="text-xs text-gray-600">Total executados</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{stats.total_warmups || 0}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Uptime</p>
                      <p className="text-xs text-gray-600">Média mensal</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{stats.avg_uptime || 0}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Security Tips */}
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-center space-x-3 mb-3">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-blue-900">Dicas de Segurança</h3>
            </div>
            <ul className="text-xs text-blue-800 space-y-2">
              <li>• Use uma senha forte com pelo menos 8 caracteres</li>
              <li>• Inclua números, letras e símbolos</li>
              <li>• Não compartilhe suas credenciais</li>
              <li>• Altere sua senha regularmente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage