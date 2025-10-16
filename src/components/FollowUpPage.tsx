import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase, Lead, FollowUpLead } from '../lib/supabase';
import { getSourceMappings, setCachedMappings, getSourceDisplayNameSync } from '../utils/sourceMapping';
import { getCompanySourceNumbers } from '../utils/companyLeadsFilter';
import ConfigurationModal from './ConfigurationModal';
import { 
  MessageCircle, 
  Clock, 
  User, 
  Phone, 
  Globe,
  Calendar,
  CheckCircle,
  AlertCircle,
  Filter,
  Search,
  Plus,
  Edit3
} from 'lucide-react';

interface FollowUpTask {
  id: string;
  leadId: number;
  leadName: string;
  leadPhone: string;
  leadSource: string;
  task: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  completed: boolean;
  createdAt: string;
}

type PriorityFilter = 'all' | 'high' | 'medium' | 'low';
type StatusFilter = 'all' | 'pending' | 'completed';
import { Menu } from 'lucide-react';

interface FollowUpPageProps {
  toggleSidebar: () => void;
}

const FollowUpPage: React.FC<FollowUpPageProps> = ({ toggleSidebar }) => {
  const { user, fullName, companyName, companyId } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [followUpLeads, setFollowUpLeads] = useState<FollowUpLead[]>([]);
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newTask, setNewTask] = useState({
    task: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: '',
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, priorityFilter, statusFilter]);

  const fetchData = async () => {
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

      // Fetch qualified leads for follow-up from clientes table
      const { data: leadsData, error: leadsError } = await supabase
        .from('clientes')
        .select('*')
        .eq('qualificado', true)
        .in('fonte', companySourceNumbers)
        .order('created_at', { ascending: false});

      if (leadsError) throw leadsError;

      setLeads(leadsData || []);

      // Fetch leads from vw_leads_followup view filtered by company_id
      const { data: followUpData, error: followUpError } = await supabase
        .from('vw_leads_followup')
        .select('*')
        .eq('company_id', companyId)
        .order('data', { ascending: false });

      if (followUpError) {
        console.error('Error fetching follow-up view:', followUpError);
      } else {
        setFollowUpLeads(followUpData || []);
      }

      // Load follow-up tasks from localStorage (in a real app, this would be from database)
      const savedTasks = localStorage.getItem('followUpTasks');
      if (savedTasks) {
        setFollowUpTasks(JSON.parse(savedTasks));
      }

    } catch (error) {
      console.error('Error fetching follow-up data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTasksToStorage = (tasks: FollowUpTask[]) => {
    localStorage.setItem('followUpTasks', JSON.stringify(tasks));
    setFollowUpTasks(tasks);
  };

  const addFollowUpTask = () => {
    if (!selectedLead || !newTask.task || !newTask.dueDate) return;

    const task: FollowUpTask = {
      id: `task_${Date.now()}`,
      leadId: selectedLead.id,
      leadName: selectedLead.nome ? selectedLead.nome.split('Tel:')[0].trim() : 'Lead sem nome',
      leadPhone: selectedLead.telefone?.toString() || '',
      leadSource: selectedLead.fonte || '',
      task: newTask.task,
      priority: newTask.priority,
      dueDate: newTask.dueDate,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const updatedTasks = [...followUpTasks, task];
    saveTasksToStorage(updatedTasks);

    // Reset form
    setNewTask({ task: '', priority: 'medium', dueDate: '' });
    setSelectedLead(null);
    setShowAddTask(false);
  };

  const toggleTaskCompletion = (taskId: string) => {
    const updatedTasks = followUpTasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    saveTasksToStorage(updatedTasks);
  };

  const deleteTask = (taskId: string) => {
    const updatedTasks = followUpTasks.filter(task => task.id !== taskId);
    saveTasksToStorage(updatedTasks);
  };

  const filteredTasks = followUpTasks.filter(task => {
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'completed' && task.completed) ||
      (statusFilter === 'pending' && !task.completed);
    const matchesSearch = task.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.task.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesPriority && matchesStatus && matchesSearch;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-4 h-4" />;
      case 'medium': return <Clock className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && !followUpTasks.find(t => t.dueDate === dueDate)?.completed;
  };

  const filteredFollowUpLeads = followUpLeads.filter(lead => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        lead.nome?.toLowerCase().includes(search) ||
        lead.telefone?.toString().includes(search) ||
        lead.observacao?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentFollowUpLeads = filteredFollowUpLeads.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredFollowUpLeads.length / itemsPerPage);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      pages.push(
        <button
          key="1"
          onClick={() => goToPage(1)}
          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(
          <span key="dots1" className="px-2 py-2 text-gray-500">
            ...
          </span>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`px-3 py-2 border rounded-lg ${
            currentPage === i
              ? 'bg-orange-600 text-white border-orange-600'
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <span key="dots2" className="px-2 py-2 text-gray-500">
            ...
          </span>
        );
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => goToPage(totalPages)}
          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {totalPages}
        </button>
      );
    }

    return (
      <div className="flex items-center justify-center space-x-2 mt-6">
        <button
          onClick={() => goToPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Anterior
        </button>
        {pages}
        <button
          onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Próximo
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando follow-ups...</p>
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
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Follow-up</h1>
          </div>

          <div className="flex items-center space-x-4">
            {companyName && (
              <div className="flex flex-col items-end">
                {fullName && <div className="text-sm font-medium text-gray-900">{fullName}</div>}
                <div className="text-sm text-gray-600">{companyName}</div>
              </div>
            )}
            <button
              onClick={() => setShowAddTask(true)}
              className="flex items-center px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Tarefa
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Search */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <Search className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-medium text-gray-900">Buscar</h2>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por lead ou tarefa..."
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-medium text-gray-900">Prioridade</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'Todas' },
                  { key: 'high', label: 'Alta' },
                  { key: 'medium', label: 'Média' },
                  { key: 'low', label: 'Baixa' },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setPriorityFilter(filter.key as PriorityFilter)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      priorityFilter === filter.key
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <Filter className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-medium text-gray-900">Status</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'Todas' },
                  { key: 'pending', label: 'Pendentes' },
                  { key: 'completed', label: 'Concluídas' },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setStatusFilter(filter.key as StatusFilter)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      statusFilter === filter.key
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Follow-up Leads Overview */}
        {followUpLeads.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border mb-8">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Histórico de Follow-up ({filteredFollowUpLeads.length}{filteredFollowUpLeads.length !== followUpLeads.length && ` de ${followUpLeads.length}`})
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                {searchTerm ? `Mostrando ${indexOfFirstItem + 1}-${Math.min(indexOfLastItem, filteredFollowUpLeads.length)} resultados` : 'Acompanhe o progresso dos seus leads nas etapas de qualificação'}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fonte</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Etapas</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentFollowUpLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center space-y-3">
                          <MessageCircle className="w-12 h-12 text-gray-300" />
                          <p className="text-lg font-medium">Nenhum lead encontrado</p>
                          <p className="text-sm">{searchTerm ? 'Nenhum lead corresponde à sua busca' : 'Nenhum lead de follow-up disponível'}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentFollowUpLeads.map((lead) => {
                    const etapas = [lead.etapa_1, lead.etapa_2, lead.etapa_3, lead.etapa_4, lead.etapa_5, lead.etapa_6, lead.etapa_7];
                    const etapasCompletas = etapas.filter(e => e !== null).length;

                    return (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900">{lead.nome}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="w-4 h-4 text-gray-400 mr-2" />
                            {lead.telefone}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {getSourceDisplayNameSync(lead.fonte.toString()) || lead.fonte}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1">
                            {etapas.map((etapa, index) => (
                              <div
                                key={index}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                  etapa
                                    ? 'bg-green-100 text-green-800 border-2 border-green-500'
                                    : 'bg-gray-100 text-gray-400 border-2 border-gray-300'
                                }`}
                                title={etapa ? `Etapa ${index + 1}: ${new Date(etapa).toLocaleDateString()}` : `Etapa ${index + 1}: Pendente`}
                              >
                                {index + 1}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-start">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              lead.data_qualificacao
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {lead.data_qualificacao ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                              {lead.observacao}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            {new Date(lead.data).toLocaleDateString()}
                          </div>
                        </td>
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredFollowUpLeads.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <span>
                    Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredFollowUpLeads.length)} de {filteredFollowUpLeads.length} lead{filteredFollowUpLeads.length !== 1 ? 's' : ''}
                    {followUpLeads.length !== filteredFollowUpLeads.length && ` (${followUpLeads.length} no total)`}
                  </span>
                </div>
                {renderPagination()}
              </div>
            )}
          </div>
        )}

        {/* Tasks List */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Tarefas de Follow-up ({filteredTasks.length})
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              Gerencie suas tarefas de acompanhamento de leads qualificados
            </p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-lg font-medium">Nenhuma tarefa encontrada</p>
                <p className="text-sm">
                  {followUpTasks.length === 0 
                    ? 'Crie sua primeira tarefa de follow-up'
                    : 'Nenhuma tarefa corresponde aos filtros selecionados'
                  }
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div key={task.id} className={`p-6 ${task.completed ? 'bg-gray-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <button
                        onClick={() => toggleTaskCompletion(task.id)}
                        className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          task.completed
                            ? 'bg-green-600 border-green-600'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {task.completed && <CheckCircle className="w-3 h-3 text-white" />}
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className={`font-medium ${
                            task.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                          }`}>
                            {task.task}
                          </h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            getPriorityColor(task.priority)
                          }`}>
                            {getPriorityIcon(task.priority)}
                            <span className="ml-1 capitalize">{task.priority}</span>
                          </span>
                          {isOverdue(task.dueDate) && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Atrasada
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {task.leadName}
                          </div>
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-1" />
                            {task.leadPhone}
                          </div>
                          <div className="flex items-center">
                            <Globe className="w-4 h-4 mr-1" />
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              {getSourceDisplayNameSync(task.leadSource) || task.leadSource || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Nova Tarefa de Follow-up</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecionar Lead
                </label>
                <select
                  value={selectedLead?.id || ''}
                  onChange={(e) => {
                    const lead = leads.find(l => l.id === parseInt(e.target.value));
                    setSelectedLead(lead || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Selecione um lead qualificado</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.nome ? lead.nome.split('Tel:')[0].trim() : `Lead ${lead.id}`} - {lead.telefone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição da Tarefa
                </label>
                <textarea
                  value={newTask.task}
                  onChange={(e) => setNewTask({ ...newTask, task: e.target.value })}
                  placeholder="Ex: Ligar para apresentar proposta comercial"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioridade
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowAddTask(false);
                  setSelectedLead(null);
                  setNewTask({ task: '', priority: 'medium', dueDate: '' });
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={addFollowUpTask}
                disabled={!selectedLead || !newTask.task || !newTask.dueDate}
                className="px-6 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Criar Tarefa
              </button>
            </div>
          </div>
        </div>
      )}

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

export default FollowUpPage;