import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Building2, Users, LogOut, Menu, X } from 'lucide-react';
import CompanyManagement from './CompanyManagement';
import UserManagement from './UserManagement';

type AdminView = 'companies' | 'users';

const SuperAdminPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<AdminView>('companies');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigationItems = [
    { id: 'companies', label: 'Empresas', icon: Building2 },
    { id: 'users', label: 'Usuários', icon: Users },
  ];

  const renderCurrentView = () => {
    switch (currentView) {
      case 'users':
        return <UserManagement />;
      case 'companies':
      default:
        return <CompanyManagement />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">SuperAdmin</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id as AdminView);
                  if (window.innerWidth < 1024) {
                    setSidebarOpen(false);
                  }
                }}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentView === item.id
                    ? 'bg-red-100 text-red-700'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200">
          <button
            onClick={signOut}
            className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair
          </button>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            <p className="text-xs font-semibold text-red-600 mt-1">SUPERADMIN</p>
          </div>
        </div>
      </div>

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <main className="p-8">
          {renderCurrentView()}
        </main>
      </div>
    </div>
  );
};

export default SuperAdminPage;
