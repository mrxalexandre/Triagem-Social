import React, { useState, useEffect } from 'react';
import { User } from '../TriageApp';
import { Volume2, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { api } from '../api';

export default function SupervisorView({ user }: { user: User }) {
  const [fila, setFila] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSala, setActiveSala] = useState('Sala 01');
  
  const getLocalDateString = (d: Date = new Date()) => {
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  };

  const [filterDate, setFilterDate] = useState(getLocalDateString());
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterServico, setFilterServico] = useState('todos');

  const loadFila = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await api.getFila(showLoading);
      setFila(data);
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadFila(true);
    const interval = setInterval(() => loadFila(false), 5000); // 5 segundos
    return () => clearInterval(interval);
  }, []);

  const handleChamar = async (id: number) => {
    setFila(prev => prev.map(item => item.id === id ? { ...item, status: 'em_atendimento', sala: activeSala } : item));
    try {
      await api.chamar(id, activeSala, '', user.id);
    } catch (e) {
      loadFila();
    }
  };

  const handleConcluir = async (id: number) => {
    setFila(prev => prev.map(item => item.id === id ? { ...item, status: 'concluido' } : item));
    try {
      await api.concluir(id);
      window.alert('Atendimento concluído. Lembre-se de chamar a próxima pessoa selecionada na fila.');
    } catch (e) {
      loadFila(); // Revert on failure
    }
  };

  const updateObservacoes = async (id: number, observacoes: string, defaultObs: string) => {
    if (observacoes !== defaultObs) {
      await api.updateObservacoes(id, observacoes);
    }
  };

  const filteredFila = fila.filter(item => {
    if (filterDate && item.created_at) {
      const itemLocalDate = getLocalDateString(new Date(item.created_at));
      if (itemLocalDate !== filterDate) return false;
    }
    if (filterStatus !== 'todos' && item.status !== filterStatus) return false;
    if (filterServico !== 'todos' && item.servico !== filterServico) return false;
    return true;
  });

  if (loading && fila.length === 0) return <div className="p-8 text-center text-slate-500 font-medium">Carregando fila...</div>;

  return (
    <div className="max-w-6xl mx-auto flex flex-col min-h-0 h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 pb-4 border-b border-slate-200 shrink-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gestão de Filas</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Acompanhe a triagem e chame os pacientes em tempo real.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => loadFila(true)}
            className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors shadow-sm whitespace-nowrap"
          >
            <RefreshCw size={16} /> Atualizar Fila
          </button>
          <div className="flex-1 sm:flex-none justify-between bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Minha Sala:</span>
            <select 
              className="border-none text-sm font-semibold text-slate-800 focus:ring-0 cursor-pointer bg-slate-50 px-2 py-1 rounded"
              value={activeSala}
              onChange={(e) => setActiveSala(e.target.value)}
            >
              <option>Sala 01</option>
              <option>Sala 02</option>
              <option>Sala 03</option>
              <option>Guichê A</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-0 flex-1">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-slate-50/50 rounded-t-xl shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-slate-800 text-sm">Fila de Atendimento</h2>
            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wider">Ao vivo</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data:</span>
              <input
                type="date"
                className="border border-slate-200 text-sm font-semibold text-slate-800 bg-white px-2 py-1 rounded outline-none"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
              <select
                className="border border-slate-200 text-sm font-semibold text-slate-800 bg-white px-2 py-1 rounded outline-none cursor-pointer"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="aguardando">Aguardando</option>
                <option value="em_atendimento">Em Atendimento</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Serviço:</span>
              <select
                className="border border-slate-200 text-sm font-semibold text-slate-800 bg-white px-2 py-1 rounded outline-none cursor-pointer"
                value={filterServico}
                onChange={(e) => setFilterServico(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="Cadastro novo">Cadastro novo</option>
                <option value="Atualização cadastral">Atualização cadastral</option>
                <option value="Exclusão">Exclusão</option>
                <option value="BPC">BPC</option>
                <option value="Passe livre">Passe livre</option>
                <option value="Carteira do idoso">Carteira do idoso</option>
                <option value="Criança feliz">Criança feliz</option>
                <option value="Atendimento Técnico">Atendimento Técnico</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 z-10">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Senha</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Paciente</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Serviço</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status / Espera</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFila.map(item => (
                <React.Fragment key={item.id}>
                  <tr className={`transition-colors ${item.status === 'em_atendimento' ? 'bg-green-50/30' : 'hover:bg-slate-50'}`}>
                    <td className="p-4 align-top">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold ${item.status === 'em_atendimento' ? 'text-green-700' : 'text-slate-600'}`}>
                          {item.senha}
                        </span>
                        {item.prioridade === 1 && <span className="bg-orange-100 text-orange-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm tracking-wider">Prioridade</span>}
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="font-medium text-slate-800 text-sm">{item.nome_completo}</div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono">CPF: {item.cpf}</div>
                    </td>
                    <td className="p-4 align-top text-sm text-slate-600 font-medium">
                      {item.servico}
                    </td>
                    <td className="p-4 align-top">
                      {item.status === 'aguardando' && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                          <Clock size={12} /> Aguardando
                        </span>
                      )}
                      {item.status === 'em_atendimento' && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                          <Volume2 size={12} /> Em Atendimento
                        </span>
                      )}
                      {item.status === 'concluido' && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-200 px-2.5 py-1 rounded-full">
                          <CheckCircle size={12} /> Concluído
                        </span>
                      )}
                    </td>
                    <td className="p-4 align-top text-right">
                      {item.status === 'aguardando' && (
                        <button 
                          onClick={() => handleChamar(item.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded text-xs font-bold uppercase shadow-sm hover:bg-blue-700 transition-colors tracking-wide"
                        >
                          <Volume2 size={14} /> Chamar
                        </button>
                      )}
                      {item.status === 'em_atendimento' && (
                        <button 
                          onClick={() => handleConcluir(item.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 rounded text-xs font-bold uppercase border border-slate-200 hover:bg-slate-200 transition-colors tracking-wide"
                        >
                          <CheckCircle size={14} /> Concluir
                        </button>
                      )}
                    </td>
                  </tr>
                  {item.status === 'em_atendimento' && (
                    <tr className="bg-green-50/10">
                      <td colSpan={5} className="p-4 border-b border-slate-100">
                        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col gap-4">
                            <div className="grid grid-cols-3 gap-6 text-sm">
                              <div>
                                <p className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-1">Paciente</p>
                                <p className="text-slate-800 font-medium">{item.nome_completo}</p>
                              </div>
                              <div>
                                <p className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-1">CPF</p>
                                <p className="text-slate-800 font-medium">{item.cpf}</p>
                              </div>
                              <div>
                                <p className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-1">Endereço</p>
                                <p className="text-slate-800 font-medium">{item.endereco || 'Não informado'}</p>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Observações do Atendimento</label>
                              <textarea
                                placeholder="Digite aqui todas as informações importantes deste atendimento..."
                                className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-y min-h-[100px]"
                                onBlur={(e) => updateObservacoes(item.id, e.target.value, item.observacoes || '')}
                                defaultValue={item.observacoes || ''}
                              />
                            </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredFila.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-medium text-sm">Nenhum paciente na fila no momento de acordo com os filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
