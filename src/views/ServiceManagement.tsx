import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { api } from '../api';

export default function ServiceManagement({ onClose }: { onClose: () => void }) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getServicosConfig().then(data => {
      setGroups(data);
      setLoading(false);
    });
  }, []);

  const handleAddGroup = () => {
    setGroups([...groups, { grupo: 'Novo Grupo', servicos: [] }]);
  };

  const handleUpdateGroupName = (index: number, newName: string) => {
    const newGroups = [...groups];
    newGroups[index].grupo = newName;
    setGroups(newGroups);
  };

  const handleDeleteGroup = (index: number) => {
    const newGroups = groups.filter((_, i) => i !== index);
    setGroups(newGroups);
  };

  const handleAddService = (groupIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex].servicos.push('Novo Serviço');
    setGroups(newGroups);
  };

  const handleUpdateService = (groupIndex: number, serviceIndex: number, newName: string) => {
    const newGroups = [...groups];
    newGroups[groupIndex].servicos[serviceIndex] = newName;
    setGroups(newGroups);
  };

  const handleDeleteService = (groupIndex: number, serviceIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex].servicos = newGroups[groupIndex].servicos.filter((_, i) => i !== serviceIndex);
    setGroups(newGroups);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveServicosConfig(groups);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar serviços.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Gerenciar Serviços</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <p className="text-center text-slate-500 py-10">Carregando serviços...</p>
          ) : (
            <div className="space-y-8">
              {groups.map((group, gIdx) => (
                <div key={gIdx} className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <input 
                      type="text" 
                      value={group.grupo}
                      onChange={e => handleUpdateGroupName(gIdx, e.target.value)}
                      className="flex-1 font-semibold text-slate-800 bg-white border border-slate-200 px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button 
                      onClick={() => handleDeleteGroup(gIdx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                      title="Excluir Grupo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-3 pl-4 border-l-2 border-slate-200 ml-2">
                    {group.servicos.map((svc: string, sIdx: number) => (
                      <div key={sIdx} className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={svc}
                          onChange={e => handleUpdateService(gIdx, sIdx, e.target.value)}
                          className="flex-1 text-sm bg-white border border-slate-200 px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button 
                          onClick={() => handleDeleteService(gIdx, sIdx)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Excluir Serviço"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => handleAddService(gIdx)}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium mt-2"
                    >
                      <Plus className="w-4 h-4" /> Adicionar Serviço
                    </button>
                  </div>
                </div>
              ))}

              <button 
                onClick={handleAddGroup}
                className="w-full py-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:text-slate-800 hover:border-slate-400 font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" /> Adicionar Novo Grupo
              </button>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar Alterações</>}
          </button>
        </div>
      </div>
    </div>
  );
}
