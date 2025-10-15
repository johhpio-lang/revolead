import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase, Lead } from '../lib/supabase';
import { getSourceDisplayNameSync, getSourceMappings, setCachedMappings } from '../utils/sourceMapping';
import { getCompanySourceNumbers } from '../utils/companyLeadsFilter';
import PieChart from './PieChart';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  UserCheck, 
  Calendar,
  Globe,
  Activity,
  Target,
  Clock,
  Award
} from 'lucide-react';

interface DashboardMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  conversionRate: number;
  todayLeads: number;
  weekLeads: number;
  monthLeads: number;
}

interface SourceStats {
  source: string;
  count: number;
  qualified: number;
  conversionRate: number;
}

interface BotStats {
  active: number;
  inactive: number;
}

interface QualificationStats {
  qualified: number;
  unqualified: number;
}
import { Menu } from 'lucide-react';

interface DashboardPageProps {
  toggleSidebar: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ toggleSidebar }) => {
  const { user, fullName, companyName, companyId } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalLeads: 0,
    qualifiedLeads: 0,
    conversionRate: 0,
    todayLeads: 0,
    weekLeads: 0,
    monthLeads: 0,
  });
  const [sourceStats, setSourceStats] = useState<SourceStats[]>([]);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [botStats, setBotStats] = useState<BotStats>({ active: 0, inactive: 0 });
  const [qualificationStats, setQualificationStats] = useState<QualificationStats>({ qualified: 0, unqualified: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      // Load source mappings first
      const mappings = await getSourceMappings();
      setCachedMappings(mappings);

      if (!companyId) {
        console.error('No company ID found for user');
        setLoading(false);
        return;
      }

      const companySourceNumbers = await getCompanySourceNumbers(companyId);
      console.log('Company source numbers:', companySourceNumbers);

      if (companySourceNumbers.length === 0) {
        console.log('No sources configured for company');
        setLoading(false);
        return;
      }

      // Get date ranges
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);

      // Fetch leads from clientes table filtered by company sources
      const { data: allLeads, error } = await supabase
        .from('clientes')
        .select('*')
        .in('fonte', companySourceNumbers)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const leads = allLeads || [];
      
      // Calculate metrics
      const totalLeads = leads.length;
      const qualifiedLeads = leads.filter(lead => lead.qualificado === true).length;
      const conversionRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;
      
      const todayLeads = leads.filter(lead => 
        new Date(lead.created_at) >= today
      ).length;
      
      const weekLeads = leads.filter(lead => 
        new Date(lead.created_at) >= weekAgo
      ).length;
      
      const monthLeads = leads.filter(lead => 
        new Date(lead.created_at) >= monthAgo
      ).length;

      setMetrics({
        totalLeads,
        qualifiedLeads,
        conversionRate: Math.round(conversionRate * 100) / 100,
        todayLeads,
        weekLeads,
        monthLeads,
      });

      // Calculate source statistics
      const sourceMap = new Map<string, { total: number; qualified: number }>();
      
      leads.forEach(lead => {
        const source = lead.fonte || 'Sem fonte';
        const current = sourceMap.get(source) || { total: 0, qualified: 0 };
        current.total += 1;
        if (lead.qualificado === true) {
          current.qualified += 1;
        }
        sourceMap.set(source, current);
      });

      const sourceStatsArray: SourceStats[] = Array.from(sourceMap.entries())
        .map(([source, stats]) => ({
          source,
          count: stats.total,
          qualified: stats.qualified,
          conversionRate: stats.total > 0 ? (stats.qualified / stats.total) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      setSourceStats(sourceStatsArray);
      setRecentLeads(leads.slice(0, 5));

      // Calculate bot statistics (set to 0 as clientes table doesn't have botativo)
      setBotStats({ active: 0, inactive: 0 });

      // Calculate qualification statistics
      const qualified = leads.filter(lead => lead.qualificado === true).length;
      const unqualified = leads.filter(lead => lead.qualificado === false || lead.qualificado === null).length;
      setQualificationStats({ qualified, unqualified });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare pie chart data
  const sourceChartData = sourceStats.slice(0, 5).map((stat, index) => ({
    label: getSourceDisplayNameSync(stat.source),
    value: stat.count,
    color: [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // yellow
      '#EF4444', // red
      '#8B5CF6', // purple
    ][index] || '#6B7280'
  }));

  const botChartData = [
    { label: 'Bot Ativo', value: botStats.active, color: '#10B981' },
    { label: 'Bot Inativo', value: botStats.inactive, color: '#6B7280' },
  ];

  const qualificationChartData = [
    { label: 'Qualificados', value: qualificationStats.qualified, color: '#10B981' },
    { label: 'Não Qualificados', value: qualificationStats.unqualified, color: '#EF4444' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
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
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          </div>

          {companyName && (
            <div className="flex flex-col items-end">
              {fullName && <div className="text-sm font-medium text-gray-900">{fullName}</div>}
              <div className="text-sm text-gray-600">{companyName}</div>
            </div>
          )}
        </div>

        {/* Performance Summary */}
        <div className="mb-8 bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
              Resumo de Performance
            </h3>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Captação</h4>
                <p className="text-3xl font-bold text-blue-600 mt-2">{metrics.monthLeads}</p>
                <p className="text-sm text-gray-500 mt-1">Leads este mês</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <UserCheck className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Qualificação</h4>
                <p className="text-3xl font-bold text-green-600 mt-2">{metrics.conversionRate}%</p>
                <p className="text-sm text-gray-500 mt-1">Taxa de conversão</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Crescimento</h4>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {metrics.weekLeads > 0 ? '+' : ''}{metrics.weekLeads}
                </p>
                <p className="text-sm text-gray-500 mt-1">Esta semana</p>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Leads</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{metrics.totalLeads}</p>
                <p className="text-sm text-gray-500 mt-1">Todos os tempos</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Leads Qualificados</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{metrics.qualifiedLeads}</p>
                <p className="text-sm text-gray-500 mt-1">Taxa: {metrics.conversionRate}%</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Esta Semana</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{metrics.weekLeads}</p>
                <p className="text-sm text-gray-500 mt-1">Últimos 7 dias</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hoje</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{metrics.todayLeads}</p>
                <p className="text-sm text-gray-500 mt-1">Leads de hoje</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Sources Distribution */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-blue-600" />
                Distribuição por Fonte
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                Leads por fonte de origem
              </p>
            </div>
            <PieChart 
              data={sourceChartData}
              size={240}
              title=""
            />
          </div>

          {/* Bot Status Distribution */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-green-600" />
                Status do Bot
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                Distribuição de ativação do bot
              </p>
            </div>
            <PieChart 
              data={botChartData}
              size={240}
              title=""
            />
          </div>

          {/* Qualification Status */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Target className="w-5 h-5 mr-2 text-purple-600" />
                Status de Qualificação
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                Leads qualificados vs não qualificados
              </p>
            </div>
            <PieChart 
              data={qualificationChartData}
              size={240}
              title=""
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Source Performance */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Target className="w-5 h-5 mr-2 text-blue-600" />
                Performance por Fonte
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                Análise de conversão por fonte de leads
              </p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {sourceStats.slice(0, 5).map((stat, index) => (
                  <div key={stat.source} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        index === 0 ? 'bg-gold-100' : 
                        index === 1 ? 'bg-gray-100' : 
                        index === 2 ? 'bg-orange-100' : 'bg-blue-100'
                      }`}>
                        {index === 0 ? <Award className="w-4 h-4 text-yellow-600" /> :
                         index === 1 ? <Award className="w-4 h-4 text-gray-600" /> :
                         index === 2 ? <Award className="w-4 h-4 text-orange-600" /> :
                         <Globe className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {getSourceDisplayNameSync(stat.source)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {stat.count} leads • {stat.qualified} qualificados
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {stat.conversionRate.toFixed(1)}%
                      </p>
                      <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(stat.conversionRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-green-600" />
                Atividade Recente
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                Últimos leads adicionados ao sistema
              </p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      lead.qualificado ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Users className={`w-4 h-4 ${
                        lead.qualificado ? 'text-green-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {lead.nome ? lead.nome.split('Tel:')[0].trim() || 'Lead sem nome' : 'Lead sem nome'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {getSourceDisplayNameSync(lead.fonte)} • {new Date(lead.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {lead.qualificado && (
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Qualificado
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;