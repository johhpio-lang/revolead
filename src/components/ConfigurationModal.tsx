import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getSourceMappings, saveSourceMappings, setCachedMappings } from '../utils/sourceMapping';
import { X, Save, Plus, Trash2, Phone, Tag, AlertCircle } from 'lucide-react';

interface SourceMapping {
  id: string;
  phoneNumber: string;
  customName: string;
}

interface ConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

const ConfigurationModal: React.FC<ConfigurationModalProps> = ({ isOpen, onClose, onSave }) => {
  const [sourceMappings, setSourceMappings] = useState<SourceMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSourceMappings();
    }
  }, [isOpen]);

  const loadSourceMappings = async () => {
    setLoading(true);
    try {
      const mappings = await getSourceMappings();
      setSourceMappings(mappings);
      setCachedMappings(mappings);
    } catch (error) {
      console.error('Error loading source mappings:', error);
      setError('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSourceMappings = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const result = await saveSourceMappings(sourceMappings);
      
      if (result.success) {
        // Update cached mappings
        setCachedMappings(sourceMappings);
        
        // Call onSave callback to refresh parent components
        if (onSave) {
          onSave();
        }
        
        // Close modal after a brief delay
        setTimeout(() => {
          setSaving(false);
          onClose();
        }, 500);
      } else {
        setError(result.error || 'Erro ao salvar configurações');
        setSaving(false);
      }
    } catch (error) {
      console.error('Error saving mappings:', error);
      setError('Erro ao salvar configurações');
      setSaving(false);
    }
  };

  const addMapping = () => {
    const newMapping: SourceMapping = {
      id: `new_${Date.now()}`,
      phoneNumber: '',
      customName: ''
    };
    setSourceMappings([...sourceMappings, newMapping]);
  };

  const updateMapping = (id: string, field: 'phoneNumber' | 'customName', value: string) => {
    setSourceMappings(mappings =>
      mappings.map(mapping =>
        mapping.id === id ? { ...mapping, [field]: value } : mapping
      )
    );
  };

  const removeMapping = (id: string) => {
    setSourceMappings(mappings => mappings.filter(mapping => mapping.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Configurações de Fonte</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="mb-6">
            <p className="text-gray-600 text-sm mb-4">
              Configure nomes personalizados para os números de telefone das fontes dos seus leads.
              Isso ajudará a identificar melhor a origem dos seus leads nos relatórios.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Formato do número:</p>
                <p>O número deve começar com <strong>55</strong> (código do Brasil) seguido do DDD e número.</p>
                <p className="mt-1 text-xs">Exemplo: <code className="bg-amber-100 px-1 py-0.5 rounded">5511999999999</code></p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600">Carregando configurações...</p>
            </div>
          ) : (
            <>
              {/* Mappings List */}
              <div className="space-y-4 mb-6">
                {sourceMappings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-medium">Nenhuma configuração ainda</p>
                    <p className="text-sm">Clique em "Adicionar Mapeamento" para começar</p>
                  </div>
                ) : (
                  sourceMappings.map((mapping) => (
                    <div key={mapping.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Phone Number Input */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Número de Telefone da Fonte
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={mapping.phoneNumber}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                updateMapping(mapping.id, 'phoneNumber', value);
                              }}
                              placeholder="Ex: 5511999999999"
                              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        {/* Custom Name Input */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nome Personalizado
                          </label>
                          <div className="flex space-x-2">
                            <div className="relative flex-1">
                              <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="text"
                                value={mapping.customName}
                                onChange={(e) => updateMapping(mapping.id, 'customName', e.target.value)}
                                placeholder="Ex: Facebook Ads, Google Ads, Site..."
                                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <button
                              onClick={() => removeMapping(mapping.id)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Mapping Button */}
              <button
                onClick={addMapping}
                className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Fonte
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveSourceMappings}
            disabled={saving || sourceMappings.some(m => !m.phoneNumber || !m.customName) || loading}
            className="flex items-center px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationModal;