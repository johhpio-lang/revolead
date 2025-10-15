import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase, Lead } from '../lib/supabase';
import { getSourceDisplayNameSync, getSourceMappings, setCachedMappings } from '../utils/sourceMapping';
import { getCompanySourceNumbers } from '../utils/companyLeadsFilter';
import ConfigurationModal from './ConfigurationModal';
import {
  UserCheck,
  Download,
  Calendar,
  Filter,
  ArrowLeft,
  Phone,
  User,
  Building2,
  Bot,
  Globe,
  MessageCircle
} from 'lucide-react';

type TimeFilter = 'day' | 'week' | 'month' | 'year';
type BotStatusFilter = 'all' | 'active' | 'inactive';
type SourceFilter = 'all' | string;
import { Menu } from 'lucide-react';

interface QualifiedLeadsProps {
  onBack: () => void;
  toggleSidebar: () => void;
}

const QualifiedLeads: React.FC<QualifiedLeadsProps> = ({ onBack, toggleSidebar }) => {
  const { user, fullName, companyName, companyId } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [botStatusFilter, setBotStatusFilter] = useState<BotStatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        return monthAgo.toISOString();
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
        .gte('created_at', filterDate)
        .order('created_at', { ascending: false });

      // Apply source filter
      if (sourceFilter !== 'all') {
        query = query.eq('fonte', sourceFilter);
      }

      // Note: clientes table doesn't have botativo column, so bot status filter is ignored

      const { data, error } = await query;

      console.log('Qualified leads response:', { data, error });

      if (error) throw error;

      setLeads(data || []);
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
  }, [user, timeFilter, botStatusFilter, sourceFilter]);

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
  ];

  const botStatusButtons = [
    { key: 'all' as BotStatusFilter, label: 'Todos os Bots', icon: Bot },
    { key: 'active' as BotStatusFilter, label: 'Ativo', icon: Bot },
    { key: 'inactive' as BotStatusFilter, label: 'Inativo', icon: Bot },
  ];

  const getTimeFilterLabel = () => {
    switch (timeFilter) {
      case 'day': return 'hoje';
      case 'week': return 'esta semana';
      case 'month': return 'este mês';
      case 'year': return 'este ano';
    }
  };

  const getBotStatusLabel = () => {
    switch (botStatusFilter) {
      case 'all': return 'todos os status de bot';
      case 'active': return 'apenas bots ativos';
      case 'inactive': return 'apenas bots inativos';
    }
  };

  const getSourceFilterLabel = () => {
    if (sourceFilter === 'all') return 'Todas as Fontes';
    return `Fonte: ${getSourceDisplayNameSync(sourceFilter) || sourceFilter}`;
  };

  const getFilteredCount = () => {
    if (botStatusFilter === 'all') return leads.length;
    return leads.length;
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
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center space-y-3">
                        <UserCheck className="w-12 h-12 text-gray-300" />
                        <div>
                          <p className="text-lg font-medium">Nenhum lead encontrado</p>
                          <p className="text-sm">Nenhum lead qualificado corresponde aos filtros selecionados</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
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
          {leads.length > 0 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Mostrando {getFilteredCount()} lead{getFilteredCount() !== 1 ? 's' : ''} qualificado{getFilteredCount() !== 1 ? 's' : ''} {getTimeFilterLabel()} ({getSourceFilterLabel()})
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