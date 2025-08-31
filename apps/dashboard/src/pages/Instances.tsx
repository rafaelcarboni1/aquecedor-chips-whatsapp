import { useState, useEffect } from 'react';
import { Plus, Smartphone, Wifi, WifiOff, RotateCcw, Trash2, QrCode } from 'lucide-react';

interface Instance {
  id: string;
  session_id: string;
  label: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'restarting';
  wa_number?: string;
  created_at: string;
  evolution_status?: any;
}

export default function Instances() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [loadingQR, setLoadingQR] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');

  useEffect(() => {
    fetchInstances();
  }, []);

  const fetchInstances = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const response = await fetch('/api/instances', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setInstances(data.instances || []);
      } else {
        setError('Erro ao carregar instâncias');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) return;
    
    try {
      setCreating(true);
      setError('');
      const token = localStorage.getItem('token');
      const response = await fetch('/api/instances', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: newInstanceName.trim(),
          label: newInstanceName.trim()
        })
      });
      
      if (response.ok) {
        setNewInstanceName('');
        setShowCreateModal(false);
        fetchInstances();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Erro ao criar instância');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setCreating(false);
    }
  };

  const handleShowQRCode = async (instance: Instance) => {
    try {
      setLoadingQR(true);
      setSelectedInstance(instance);
      setShowQRModal(true);
      setQrCode('');
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/instances/${instance.session_id}/qr`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qrCode || '');
      } else {
        setError('Erro ao obter QR Code');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setLoadingQR(false);
    }
  };

  const handleDeleteInstance = async (instance: Instance) => {
    if (!confirm(`Tem certeza que deseja deletar a instância "${instance.label}"?`)) {
      return;
    }
    
    try {
      setError('');
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/instances/${instance.session_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        fetchInstances();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Erro ao deletar instância');
      }
    } catch (error) {
      setError('Erro de conexão');
    }
  };

  const handleRestartInstance = async (instance: Instance) => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/instances/${instance.session_id}/restart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        fetchInstances();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Erro ao reiniciar instância');
      }
    } catch (error) {
      setError('Erro de conexão');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi className="w-5 h-5 text-green-500" />;
      case 'connecting':
        return <Wifi className="w-5 h-5 text-yellow-500 animate-pulse" />;
      default:
        return <WifiOff className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'connecting':
        return 'Conectando';
      default:
        return 'Desconectado';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" data-testid="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Instâncias WhatsApp</h1>
            <p className="text-gray-600 mt-2">Gerencie suas conexões do WhatsApp</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Instância
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded" role="alert">
            {error}
          </div>
        )}

        {/* Instances Grid */}
        {instances.length === 0 ? (
          <div className="text-center py-12">
            <Smartphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma instância encontrada</h3>
            <p className="text-gray-600 mb-6">Crie sua primeira instância para começar</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Criar Instância
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {instances.map((instance) => (
              <div key={instance.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-8 h-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{instance.label}</h3>
                      {instance.wa_number && (
                        <p className="text-sm text-gray-600">{instance.wa_number}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(instance.status)}
                    <span className="text-sm font-medium text-gray-700">
                      {getStatusText(instance.status)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Criado em {new Date(instance.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleShowQRCode(instance)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRestartInstance(instance)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Reiniciar"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteInstance(instance)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Deletar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Instance Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Nova Instância</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Instância
              </label>
              <input
                type="text"
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: WhatsApp Principal"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewInstanceName('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateInstance}
                disabled={!newInstanceName.trim() || creating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
              >
                {creating ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedInstance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              QR Code - {selectedInstance.label}
            </h2>
            <div className="flex justify-center mb-4">
              {loadingQR ? (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              ) : qrCode ? (
                <img src={qrCode} alt="QR Code" className="w-64 h-64" />
              ) : (
                <div className="w-64 h-64 bg-gray-100 flex items-center justify-center">
                  <p className="text-gray-500">QR Code não disponível</p>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowQRModal(false);
                  setSelectedInstance(null);
                  setQrCode('');
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}