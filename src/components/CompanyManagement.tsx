import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, Plus, Edit2, Trash2, X, Save } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

const CompanyManagement: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      setError('Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async () => {
    if (!companyName.trim()) {
      setError('Nome da empresa é obrigatório');
      return;
    }

    try {
      const { error } = await supabase
        .from('companies')
        .insert([{ name: companyName.trim() }]);

      if (error) throw error;

      setSuccessMessage('Empresa criada com sucesso!');
      setShowModal(false);
      setCompanyName('');
      fetchCompanies();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error creating company:', error);
      setError('Erro ao criar empresa');
    }
  };

  const handleUpdateCompany = async () => {
    if (!editingCompany || !companyName.trim()) {
      setError('Nome da empresa é obrigatório');
      return;
    }

    try {
      const { error } = await supabase
        .from('companies')
        .update({ name: companyName.trim() })
        .eq('id', editingCompany.id);

      if (error) throw error;

      setSuccessMessage('Empresa atualizada com sucesso!');
      setShowModal(false);
      setEditingCompany(null);
      setCompanyName('');
      fetchCompanies();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error updating company:', error);
      setError('Erro ao atualizar empresa');
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta empresa? Todos os dados relacionados serão perdidos.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;

      setSuccessMessage('Empresa excluída com sucesso!');
      fetchCompanies();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting company:', error);
      setError('Erro ao excluir empresa');
    }
  };

  const openCreateModal = () => {
    setEditingCompany(null);
    setCompanyName('');
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setCompanyName(company.name);
    setError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCompany(null);
    setCompanyName('');
    setError(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Empresas</h1>
          <p className="text-gray-600 mt-1">Crie e gerencie empresas do sistema</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Empresa
        </button>
      </div>

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome da Empresa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data de Criação
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    Carregando empresas...
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma empresa cadastrada
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                        <span className="text-sm font-medium text-gray-900">{company.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(company.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(company)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(company.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Digite o nome da empresa"
                  autoFocus
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={editingCompany ? handleUpdateCompany : handleCreateCompany}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingCompany ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManagement;
