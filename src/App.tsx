import React from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import AuthForm from './components/AuthForm';
import Dashboard from './components/Dashboard';
import SuperAdminPage from './components/SuperAdminPage';

const AppContent: React.FC = () => {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  if (userRole === 'superadmin') {
    return <SuperAdminPage />;
  }

  return <Dashboard />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
