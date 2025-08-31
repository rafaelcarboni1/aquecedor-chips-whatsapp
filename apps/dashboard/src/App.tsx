import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Smartphone, MessageCircle, Home as HomeIcon, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import Home from './pages/Home';
import Instances from './pages/Instances';
import Conversations from './pages/Conversations';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App min-h-screen bg-gray-50">
        {isAuthenticated ? (
          <>
            {/* Navigation */}
            <nav className="bg-white shadow-sm border-b border-gray-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <h1 className="text-xl font-bold text-gray-900">WhatsApp Manager</h1>
                    </div>
                    <div className="ml-10 flex items-baseline space-x-4">
                      <Link
                        to="/"
                        className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                      >
                        <HomeIcon className="w-4 h-4" />
                        Dashboard
                      </Link>
                      <Link
                        to="/instances"
                        className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                      >
                        <Smartphone className="w-4 h-4" />
                        Instâncias
                      </Link>
                      <Link
                        to="/conversations"
                        className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Conversas
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={handleLogout}
                      className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </button>
                  </div>
                </div>
              </div>
            </nav>

            {/* Main Content */}
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/instances" element={<Instances />} />
              <Route path="/conversations" element={<Conversations />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />
            </Routes>
          </>
        ) : (
          <Routes>
            <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;
