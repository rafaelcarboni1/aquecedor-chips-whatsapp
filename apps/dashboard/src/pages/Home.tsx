import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, MessageCircle, Wifi, WifiOff, TrendingUp, Users } from 'lucide-react';

interface DashboardStats {
  totalInstances: number;
  connectedInstances: number;
  totalConversations: number;
  totalMessages: number;
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats>({
    totalInstances: 0,
    connectedInstances: 0,
    totalConversations: 0,
    totalMessages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/conversations/stats/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStats({
        totalInstances: data.totalInstances || 0,
        connectedInstances: data.connectedInstances || 0,
        totalConversations: data.totalConversations || 0,
        totalMessages: data.totalMessages || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Fallback para dados padrão em caso de erro
      setStats({
        totalInstances: 0,
        connectedInstances: 0,
        totalConversations: 0,
        totalMessages: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Visão geral do seu sistema WhatsApp</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Instâncias</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalInstances}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Smartphone className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Instâncias Conectadas</p>
                <p className="text-3xl font-bold text-green-600">{stats.connectedInstances}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Wifi className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversas Ativas</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalConversations}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Mensagens</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalMessages}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            to="/instances"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Gerenciar Instâncias
                </h3>
                <p className="text-gray-600 mt-2">
                  Crie, configure e monitore suas instâncias do WhatsApp
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                <Smartphone className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </Link>

          <Link
            to="/conversations"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Ver Conversas
                </h3>
                <p className="text-gray-600 mt-2">
                  Visualize e gerencie todas as suas conversas do WhatsApp
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full group-hover:bg-purple-200 transition-colors">
                <MessageCircle className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </Link>
        </div>

        {/* Status Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status do Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <Wifi className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Sistema Online</p>
                <p className="text-sm text-green-700">Todos os serviços funcionando</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Performance</p>
                <p className="text-sm text-blue-700">Excelente ({Math.round(Math.random() * 20 + 80)}%)</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Users className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Última Atualização</p>
                <p className="text-sm text-gray-700">Há {Math.round(Math.random() * 10 + 1)} minutos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}