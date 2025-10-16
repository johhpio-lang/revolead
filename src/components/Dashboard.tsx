import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase, Lead } from '../lib/supabase';
import QualifiedLeads from './QualifiedLeads';
import DashboardPage from './DashboardPage';
import FollowUpPage from './FollowUpPage';
import ConfigurationModal from './ConfigurationModal';
import SourceDisplay from './SourceDisplay';
import { getSourceDisplayNameSync, getSourceMappings, setCachedMappings } from '../utils/sourceMapping';
import { getCompanySourceNumbers } from '../utils/companyLeadsFilter';
import {
  Users,
  UserCheck,
  TrendingUp,
  Calendar,
  BarChart3,
  LogOut,
  Filter,
  ArrowRight,
  Globe,
  Phone,
  Settings,
  Menu,
  X,
  Home,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  ChevronLeft
} from 'lucide-react';

type CurrentView = 'leads' | 'qualified' | 'dashboard' | 'followup';

const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<CurrentView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const handleConfigurationSave = () => {
    // Refresh data when configuration is saved
    window.location.reload();
  };

  const handleNavigation = (view: CurrentView) => {
    setCurrentView(view);
    // Only auto-hide sidebar on mobile devices
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };
  
  const toggleSidebar = () => {
    // Toggle sidebar visibility for all screen sizes
    const isCurrentlyVisible = sidebarOpen || sidebarVisible;
    setSidebarOpen(!isCurrentlyVisible);
    setSidebarVisible(!isCurrentlyVisible);
  };
  
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'qualified', label: 'Qualificados', icon: UserCheck },
    { id: 'followup', label: 'Follow-up', icon: MessageCircle }
  ];

  const getCurrentPageTitle = () => {
    const item = navigationItems.find(item => item.id === currentView);
    return item ? item.label : 'Sistema de Gerenciamento de Leads';
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'qualified':
        return <QualifiedLeads onBack={() => handleNavigation('leads')} toggleSidebar={toggleSidebar} />;
      case 'dashboard':
        return <DashboardPage toggleSidebar={toggleSidebar} />;
      case 'followup':
        return <FollowUpPage toggleSidebar={toggleSidebar} />;
      default:
        return <LeadsPanel onConfigurationSave={handleConfigurationSave} toggleSidebar={toggleSidebar} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Overlay */}
      {(sidebarOpen || sidebarVisible) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => {
            setSidebarOpen(false);
            setSidebarVisible(false);
          }}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        (sidebarOpen || sidebarVisible) ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <img
              src="https://ghtlgpibojnkzgkjooua.supabase.co/storage/v1/object/sign/imagens/REVOLEAD%20(1).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yNWRkMWE0OC05ZTMxLTQ5YmItODZjYy1lYTEyM2IxMDAxMjAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW5zL1JFVk9MRUFEICgxKS5wbmciLCJpYXQiOjE3NjA1NjcyNzUsImV4cCI6MjA3NTkyNzI3NX0.iqsTR23ioVkxvvpH6BEzDTPuKND74K3NGlyfpSk3eg8"
              alt="Revolead Logo"
              className="h-8 w-auto"
            />
          </div>
          <button
            onClick={() => {
              setSidebarOpen(false);
              setSidebarVisible(false);
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
                  handleNavigation(item.id as CurrentView);
                }}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentView === item.id
                    ? 'bg-blue-100 text-blue-700'
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
          <div className="space-y-2">
            <div>
              <button
                onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <Settings className="w-5 h-5 mr-3" />
                  Configurações
                </div>
                {settingsMenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {settingsMenuOpen && (
                <div className="mt-1 ml-8 space-y-1">
                  <button
                    onClick={() => {
                      setShowConfigModal(true);
                      setSidebarOpen(false);
                      setSidebarVisible(false);
                    }}
                    className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Fontes
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                signOut();
                setSidebarOpen(false);
                setSidebarVisible(false);
              }}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sair
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-screen">
        {/* Page Content */}
        <main className="flex-1">
          {renderCurrentView()}
        </main>
      </div>

      <ConfigurationModal 
        isOpen={showConfigModal} 
        onClose={() => setShowConfigModal(false)} 
        onSave={handleConfigurationSave}
      />
    </div>
  );
};

// Extracted LeadsPanel component
interface LeadsPanelProps {
  onConfigurationSave: () => void;
  toggleSidebar: () => void;
}

type TimeFilter = 'day' | 'week' | 'month' | 'year';
type SourceFilter = 'all' | string;

interface DashboardMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  conversionRate: number;
}

const LeadsPanel: React.FC<LeadsPanelProps> = ({ onConfigurationSave, toggleSidebar }) => {
  const { user, fullName, companyName, companyId } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalLeads: 0,
    qualifiedLeads: 0,
    conversionRate: 0,
  });
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const getTimeFilterDate = (filter: TimeFilter): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case 'day':
        return today.toISOString();
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return weekAgo.toISOString();
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        return monthAgo.toISOString();
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(today.getFullYear() - 1);
        return yearAgo.toISOString();
      default:
        const defaultMonthAgo = new Date(today);
        defaultMonthAgo.setMonth(today.getMonth() - 1);
        return defaultMonthAgo.toISOString();
    }
  };

  const fetchLeads = async () => {
    // Load source mappings first
    try {
      const mappings = await getSourceMappings();
      setCachedMappings(mappings);
    } catch (error) {
      console.error('Error loading source mappings:', error);
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching leads from clientes table...');
      console.log('User authenticated:', !!user);
      console.log('User ID:', user?.id);
      console.log('Company ID:', companyId);

      if (!companyId) {
        console.error('No company ID found for user');
        setLeads([]);
        setMetrics({ totalLeads: 0, qualifiedLeads: 0, conversionRate: 0 });
        setLoading(false);
        return;
      }

      const companySourceNumbers = await getCompanySourceNumbers(companyId);
      console.log('Company source numbers:', companySourceNumbers);

      if (companySourceNumbers.length === 0) {
        console.log('No sources configured for company');
        setLeads([]);
        setMetrics({ totalLeads: 0, qualifiedLeads: 0, conversionRate: 0 });
        setLoading(false);
        return;
      }

      const filterDate = getTimeFilterDate(timeFilter);
      console.log('Filter date:', filterDate, 'Source filter:', sourceFilter);

      let query = supabase
        .from('clientes')
        .select('*')
        .in('fonte', companySourceNumbers)
        .gte('created_at', filterDate)
        .order('created_at', { ascending: false });

      // Apply additional source filter
      if (sourceFilter !== 'all') {
        query = query.eq('fonte', sourceFilter);
      }

      const { data, error } = await query;
      console.log('clientes response:', { data, error, count: data?.length });

      if (error) throw error;

      setLeads(data || []);
      
      const totalLeads = data?.length || 0;
      const qualifiedLeads = data?.filter(lead => lead.qualificado === true).length || 0;
      const conversionRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;

      console.log('Calculated metrics:', { 
        totalLeads, 
        qualifiedLeads, 
        conversionRate,
        timeFilter,
        sourceFilter 
      });

      setMetrics({
        totalLeads,
        qualifiedLeads,
        conversionRate: Math.round(conversionRate * 100) / 100,
      });
    } catch (error) {
      console.error('Error fetching leads:', error);
      setError(`Failed to load leads from clientes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSources = async () => {
    try {
      console.log('Fetching available sources from company fontes...');

      if (!companyId) {
        console.error('No company ID found for user');
        setAvailableSources([]);
        return;
      }

      const companySourceNumbers = await getCompanySourceNumbers(companyId);
      console.log('Company source numbers for filters:', companySourceNumbers);
      setAvailableSources(companySourceNumbers.sort());
    } catch (error) {
      console.error('Error fetching sources:', error);
    }
  };

  const handleNavigation = (view: CurrentView) => {
    // Navigation logic here
  };

  useEffect(() => {
    fetchLeads();
  }, [user, timeFilter, sourceFilter, refreshKey]);

  useEffect(() => {
    fetchAvailableSources();
  }, [user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [timeFilter, sourceFilter]);

  const totalPages = Math.ceil(leads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLeads = leads.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const filterButtons = [
    { key: 'day' as TimeFilter, label: 'Hoje', icon: Calendar },
    { key: 'week' as TimeFilter, label: 'Semana', icon: Calendar },
    { key: 'month' as TimeFilter, label: 'Mês', icon: Calendar },
    { key: 'year' as TimeFilter, label: 'Ano', icon: Calendar },
  ];

  const getTimeFilterLabel = () => {
    switch (timeFilter) {
      case 'day': return 'hoje';
      case 'week': return 'esta semana';
      case 'month': return 'este mês';
      case 'year': return 'este ano';
    }
  };

  const getSourceFilterLabel = () => {
    if (sourceFilter === 'all') return 'todas as fontes';
    return `fonte: ${getSourceDisplayNameSync(sourceFilter) || sourceFilter}`;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Por favor, verifique:</p>
            <ul className="text-sm text-gray-500 text-left max-w-md mx-auto">
              <li>• Conexão com Supabase está ativa</li>
              <li>• Tabela clientes existe</li>
              <li>• Políticas de segurança permitem acesso</li>
            </ul>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header with Menu Button */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleSidebar}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Painel de Leads</h1>
          </div>

          {companyName && (
            <div className="flex flex-col items-end">
              {fullName && <div className="text-sm font-medium text-gray-900">{fullName}</div>}
              <div className="text-sm text-gray-600">{companyName}</div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Source Filter */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <Globe className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-medium text-gray-900">Fonte do Lead</h2>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSourceFilter('all')}
                  className={`flex items-center px-3 py-1.5 rounded-lg font-medium transition-all ${
                    sourceFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Todas as Fontes
                </button>
                {availableSources.map((source) => (
                  <button
                    key={source}
                    onClick={() => setSourceFilter(source)}
                    className={`flex items-center px-3 py-1.5 rounded-lg font-medium transition-all ${
                      sourceFilter === source
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    {getSourceDisplayNameSync(source) || source}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Filter */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <Filter className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-medium text-gray-900">Período</h2>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {filterButtons.map((button) => (
                  <button
                    key={button.key}
                    onClick={() => setTimeFilter(button.key)}
                    className={`flex items-center px-3 py-1.5 rounded-lg font-medium transition-all ${
                      timeFilter === button.key
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <button.icon className="w-4 h-4 mr-2" />
                    {button.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Leads */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {loading ? '-' : metrics.totalLeads}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Leads gerados {getTimeFilterLabel()}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Qualified Leads */}
          <div 
            className="bg-white rounded-xl shadow-sm border p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleNavigation('qualified')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Leads Qualificados</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {loading ? '-' : metrics.qualifiedLeads}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  De {getSourceFilterLabel().replace('todas as fontes', 'Todas as Fontes')}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-600" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Conversão</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {loading ? '-' : `${metrics.conversionRate}%`}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {getSourceFilterLabel().replace('todas as fontes', 'Todas as Fontes')}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Leads Table */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Leads Recentes</h3>
            <p className="text-gray-600 text-sm mt-1">
              Seus leads mais recentes de {getTimeFilterLabel()} ({getSourceFilterLabel().replace('todas as fontes', 'Todas as Fontes')})
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fonte
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qualificado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Adição
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Carregando leads...
                    </td>
                  </tr>
                ) : currentLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Nenhum lead encontrado para o período selecionado
                    </td>
                  </tr>
                ) : (
                  currentLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {lead.nome ? lead.nome.split('Tel:')[0].trim() || 'N/A' : 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {lead.telefone || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <SourceDisplay
                          fonte={lead.fonte}
                          onConfigureClick={() => setShowConfigModal(true)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`w-3 h-3 rounded-full inline-block ${
                          lead.qualificado === true ? 'bg-green-400' : 'bg-gray-300'
                        }`} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {leads.length > 0 && totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-sm text-gray-600">
                  Mostrando {startIndex + 1} a {Math.min(endIndex, leads.length)} de {leads.length} lead{leads.length !== 1 ? 's' : ''}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Página anterior"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 7) {
                        pageNum = i + 1;
                      } else if (currentPage <= 4) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 3) {
                        pageNum = totalPages - 6 + i;
                      } else {
                        pageNum = currentPage - 3 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Próxima página"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                <span className="text-sm text-gray-600">
                  Última atualização: {new Date().toLocaleTimeString('pt-BR')}
                </span>
              </div>
            </div>
          )}
        </div>
      </main>

      <ConfigurationModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={() => {
          setShowConfigModal(false);
          setRefreshKey(prev => prev + 1);
          onConfigurationSave();
        }}
      />
    </div>
  );
};

export default Dashboard;