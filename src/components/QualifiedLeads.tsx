import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase, Lead } from '../lib/supabase';
import { getSourceDisplayNameSync, getSourceMappings, setCachedMappings } from '../utils/sourceMapping';
import { getCompanySourceNumbers } from '../utils/companyLeadsFilter';
import ConfigurationModal from './ConfigurationModal';
import {
  UserCheck,
  Calendar,
  Filter,
  ArrowLeft,
  Phone,
  User,
  Globe,
  MessageCircle,
  Search,
  Menu
} from 'lucide-react';

type TimeFilter = 'day' | 'week' | 'month' | 'year' | 'custom';
type SourceFilter = 'all' | string;

interface QualifiedLeadsProps {
  onBack: () => void;
  toggleSidebar: () => void;
}

const QualifiedLeads: React.FC<QualifiedLeadsProps> = ({ onBack, toggleSidebar }) => {
  const { user, fullName, companyName, companyId } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const getTimeFilterDate = (filter: TimeFilter): { start: string; end?: string } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
      case 'day':
        return { start: today.toISOString() };
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return { start: weekAgo.toISOString() };
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        return { start: monthAgo.toISOString() };
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(today.getFullYear() - 1);
        return { start: yearAgo.toISOString() };
      case 'custom':
        if (customStartDate && customEndDate) {
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
          return { start: startDate.toISOString(), end: endDate.toISOString() };
        } else if (customStartDate) {
          return { start: new Date(customStartDate).toISOString() };
        }
        const fallbackMonthAgo = new Date(today);
        fallbackMonthAgo.setMonth(today.getMonth() - 1);
        return { start: fallbackMonthAgo.toISOString() };
      default:
        const defaultMonthAgo = new Date(today);
        defaultMonthAgo.setMonth(today.getMonth() - 1);
        return { start: defaultMonthAgo.toISOString() };
    }
  };

  const fetchQualifiedLeads = async () => {
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
      console.log('Fetching qualified leads from Supabase...');

      if (!companyId) {
        console.error('No company ID found for user');
        setLeads([]);
        setLoading(false);
        return;
      }

      const companySourceNumbers = await getCompanySourceNumbers(companyId);
      console.log('Company source numbers:', companySourceNumbers);

      if (companySourceNumbers.length === 0) {
        console.log('No sources configured for company');
        setLeads([]);
        setLoading(false);
        return;
      }

      const filterDate = getTimeFilterDate(timeFilter);
      console.log('Filter date:', filterDate);

      let query = supabase
        .from('clientes')
        .select('*')
        .eq('qualificado', true)
        .in('fonte', companySourceNumbers)
        .gte('created_at', filterDate.start);

      if (filterDate.end) {
        query = query.lte('created_at', filterDate.end);
      }

      query = query.order('created_at', { ascending: false });

      // Apply source filter
      if (sourceFilter !== 'all') {
        query = query.eq('fonte', sourceFilter);
      }

      // Note: clientes table doesn't have botativo column, so bot status filter is ignored

      const { data, error } = await query;

      console.log('Qualified leads response:', { data, error });

      if (error) throw error;

      const leadsData = data || [];
      setLeads(leadsData);
      setFilteredLeads(leadsData);
    } catch (error) {
      console.error('Error fetching qualified leads:', error);
      setError(`Failed to load qualified leads: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  useEffect(() => {
    fetchQualifiedLeads();
  }, [user, timeFilter, sourceFilter, customStartDate, customEndDate]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredLeads(leads);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = leads.filter(lead => {
      return (
        lead.nome?.toLowerCase().includes(searchLower) ||
        lead.telefone?.toString().includes(searchLower) ||
        lead.fonte?.toString().includes(searchLower) ||
        getSourceDisplayNameSync(lead.fonte)?.toLowerCase().includes(searchLower) ||
        new Date(lead.created_at).toLocaleDateString('pt-BR').includes(searchLower)
      );
    });
    setFilteredLeads(filtered);
  }, [searchTerm, leads]);

  useEffect(() => {
    fetchAvailableSources();
  }, [user]);

  const exportToCSV = () => {
    if (leads.length === 0) {
      alert('Nenhum dado para exportar');
      return;
    }

    const headers = ['Data de Criação', 'Nome', 'Telefone', 'Fonte'];
    const csvContent = [
      headers.join(','),
      ...leads.map(lead => [
        new Date(lead.created_at).toLocaleDateString('pt-BR'),
        `"${lead.nome || 'N/A'}"`,
        lead.telefone || 'N/A',
        `"${lead.fonte || 'N/A'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `qualified-leads-${timeFilter}-${sourceFilter}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filterButtons = [
    { key: 'day' as TimeFilter, label: 'Hoje', icon: Calendar },
    { key: 'week' as TimeFilter, label: 'Semana', icon: Calendar },
    { key: 'month' as TimeFilter, label: 'Mês', icon: Calendar },
    { key: 'year' as TimeFilter, label: 'Ano', icon: Calendar },
    { key: 'custom' as TimeFilter, label: 'Personalizado', icon: Calendar },
  ];

  const getTimeFilterLabel = () => {
    switch (timeFilter) {
      case 'day': return 'hoje';
      case 'week': return 'esta semana';
      case 'month': return 'este mês';
      case 'year': return 'este ano';
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${new Date(customStartDate).toLocaleDateString('pt-BR')} - ${new Date(customEndDate).toLocaleDateString('pt-BR')}`;
        } else if (customStartDate) {
          return `desde ${new Date(customStartDate).toLocaleDateString('pt-BR')}`;
        }
        return 'período personalizado';
      default: return 'este mês';
    }
  };

  const getSourceFilterLabel = () => {
    if (sourceFilter === 'all') return 'Todas as Fontes';
    return `Fonte: ${getSourceDisplayNameSync(sourceFilter) || sourceFilter}`;
  };

  const getFilteredCount = () => {
    return filteredLeads.length;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={onBack}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
           Voltar ao Painel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Leads Qualificados</h1>
          </div>

          {companyName ? (
            <div className="flex flex-col items-end">
              {fullName && <div className="text-sm font-medium text-gray-900">{fullName}</div>}
              <div className="text-sm text-gray-600">{companyName}</div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              {getFilteredCount()} leads qualificados {getTimeFilterLabel()} ({getSourceFilterLabel()})
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone, fonte ou data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              {/* Custom Date Range Inputs */}
              {timeFilter === 'custom' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data Inicial
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data Final
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        min={customStartDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end mt-6">
            <button
              onClick={exportToCSV}
              disabled={loading || leads.length === 0}
              className="flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Exportar CSV
            </button>
          </div>
        </div>

            <h1 className="text-xl font-semibold text-gray-900">Leads Qualificados</h1>
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Leads Qualificados</h3>
            <p className="text-gray-600 text-sm mt-1">
              Todos os leads qualificados de {getTimeFilterLabel()} ({getSourceFilterLabel()})
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Criação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Informações de Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fonte
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    WhatsApp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Carregando leads qualificados...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center space-y-3">
                        <UserCheck className="w-12 h-12 text-gray-300" />
                        <div>
                          <p className="text-lg font-medium">Nenhum lead encontrado</p>
                          <p className="text-sm">{searchTerm ? 'Nenhum lead corresponde à sua busca' : 'Nenhum lead qualificado corresponde aos filtros selecionados'}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {new Date(lead.created_at).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(lead.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {lead.nome ? lead.nome.split('Tel:')[0].trim() || 'N/A' : 'N/A'}
                            </div>
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
                        <div className="flex items-center">
                          <Globe className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {getSourceDisplayNameSync(lead.fonte) || lead.fonte || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {lead.telefone ? (
                          <a
                            href={`https://wa.me/${lead.telefone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                            title="Abrir WhatsApp"
                          >
                            <MessageCircle className="w-5 h-5" />
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {filteredLeads.length > 0 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Mostrando {getFilteredCount()} de {leads.length} lead{leads.length !== 1 ? 's' : ''} qualificado{leads.length !== 1 ? 's' : ''} {getTimeFilterLabel()} ({getSourceFilterLabel()})
                </span>
                <span>
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
          window.location.reload();
        }}
      />
    </div>
  );
};

export default QualifiedLeads;