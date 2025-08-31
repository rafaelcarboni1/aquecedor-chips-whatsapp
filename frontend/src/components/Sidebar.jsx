import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Smartphone, 
  User, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useUIStore } from '../../lib/store.js'

const Sidebar = () => {
  const { sidebarOpen, toggleSidebar } = useUIStore()

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard
    },
    {
      name: 'Sessões',
      href: '/sessions',
      icon: Smartphone
    },
    {
      name: 'Perfil',
      href: '/profile',
      icon: User
    }
  ]

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-white shadow-lg border-r border-gray-200
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-64' : 'w-16'}
        hidden lg:block
      `}>
        {/* Logo/Brand */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          {sidebarOpen && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">
                WhatsApp
              </span>
            </div>
          )}
          
          {!sidebarOpen && (
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center mx-auto">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    className={({ isActive }) => `
                      flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                      ${!sidebarOpen ? 'justify-center' : ''}
                    `}
                    title={!sidebarOpen ? item.name : ''}
                  >
                    <Icon className={`w-5 h-5 ${sidebarOpen ? 'mr-3' : ''}`} />
                    {sidebarOpen && (
                      <span>{item.name}</span>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Toggle button */}
        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={toggleSidebar}
            className={`
              w-full flex items-center justify-center px-3 py-2 rounded-lg
              text-gray-600 hover:text-gray-900 hover:bg-gray-100
              transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500
            `}
          >
            {sidebarOpen ? (
              <>
                <ChevronLeft className="w-5 h-5 mr-2" />
                <span className="text-sm">Recolher</span>
              </>
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r border-gray-200
        transform transition-transform duration-300 ease-in-out lg:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo/Brand */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900">
              WhatsApp Warmer
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    className={({ isActive }) => `
                      flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                    onClick={() => useUIStore.getState().setSidebarOpen(false)}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    <span>{item.name}</span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </>
  )
}

export default Sidebar