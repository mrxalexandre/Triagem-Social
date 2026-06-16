import React, { useEffect, useState } from 'react';
import { Volume2, ArrowLeft, Users, CheckCircle, Clock } from 'lucide-react';
import { api } from '../api';

export default function PublicMonitor({ onBack }: { onBack: () => void }) {
  const [called, setCalled] = useState<any>(null);
  const [aguardando, setAguardando] = useState<any[]>([]);
  const [emAtendimento, setEmAtendimento] = useState<any[]>([]);
  const [concluidos, setConcluidos] = useState<any[]>([]);
  const [chamadosHistory, setChamadosHistory] = useState<any[]>([]);
  const lastDataRef = React.useRef<string>('');

  useEffect(() => {
    let lastCalledId = 0;
    
    // Auto-refresh interval
    const fetchEvent = async () => {
      try {
        const fila = await api.getFila();
        const dataHash = JSON.stringify(fila);
        
        if (dataHash === lastDataRef.current) {
          return; // No changes
        }
        lastDataRef.current = dataHash;
        
        // Fila / Aguardando
        const aguard = fila.filter((i: any) => i.status === 'aguardando').slice(0, 2);

        // 1. All Em Atendimento grouped by sala
        const emAtendTodos = fila.filter((i: any) => i.status === 'em_atendimento').sort((a: any, b: any) => (b.called_at || 0) - (a.called_at || 0));
        const emAtendMap = new Map();
        for (const item of emAtendTodos) {
           if (!emAtendMap.has(item.sala)) {
              emAtendMap.set(item.sala, item);
           }
        }
        const emAtend = Array.from(emAtendMap.values());
        
        // 2. Concluídos (últimos 5) - most recently updated first
        const concl = fila
          .filter((i: any) => i.status === 'concluido')
          .sort((a: any, b: any) => (b.called_at || 0) - (a.called_at || 0))
          .slice(0, 3);
        
        setAguardando(aguard);

        if (emAtend.length > 0) {
          const mostRecent = emAtend[0];
          
          if (mostRecent && mostRecent.id !== lastCalledId) {
            lastCalledId = mostRecent.id;
            setCalled(mostRecent);
            // Add a little local history log (últimas chamadas piscando)
            setChamadosHistory(prev => {
              const nh = [mostRecent, ...prev.filter(i => i.id !== mostRecent.id)];
              return nh.slice(0, 4); // Keep last 4
            });
          }
          
          setEmAtendimento(emAtend);
        } else {
           setEmAtendimento([]);
        }
        
        setConcluidos(concl);
      } catch (err) {}
    };
    
    fetchEvent();
    const interval = setInterval(fetchEvent, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header className="p-4 flex justify-between items-center border-b border-slate-800 bg-slate-950">
        <h1 className="text-xl font-bold tracking-tight text-slate-300">Painel de Atendimento</h1>
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={16} /> Voltar ao Painel
        </button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden lg:h-[calc(100vh-65px)]">
        {/* Main Calling Box (Left side, 60%) */}
        <div className="w-full lg:w-3/5 flex flex-col justify-center items-center py-12 px-4 lg:p-8 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900 relative">
          {called ? (
            <div className="text-center w-full max-w-2xl animate-in zoom-in duration-500">
              <div className="inline-flex items-center gap-2 sm:gap-3 bg-blue-500/20 text-blue-400 px-4 sm:px-6 py-2 rounded-full mb-6">
                <Volume2 size={24} className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-sm sm:text-lg font-medium tracking-wider uppercase whitespace-nowrap">Por favor, dirija-se à sala</span>
              </div>
              <h2 className="text-[6rem] sm:text-[10rem] font-black leading-none tracking-tighter text-white drop-shadow-2xl mb-6">
                {called.senha}
              </h2>
              <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 sm:p-8 backdrop-blur-sm shadow-2xl">
                <p className="text-xl sm:text-2xl text-slate-400 mb-2 font-medium">Paciente Chamado</p>
                <p className="text-3xl sm:text-5xl font-bold text-white mb-6 truncate">{called.nome_completo}</p>
                <hr className="border-slate-700 mb-6" />
                <p className="text-4xl sm:text-6xl font-black text-amber-400 uppercase tracking-tight">{called.sala}</p>
              </div>
            </div>
          ) : (
            <div className="text-slate-600 text-xl sm:text-3xl font-medium p-8">Aguardando chamada...</div>
          )}
        </div>

        {/* Right side Panels (40%) */}
        <div className="w-full lg:w-2/5 flex flex-col bg-slate-900 lg:border-l border-slate-800">
          
          {/* Fila (Aguardando) Section */}
          <div className="flex-1 flex flex-col border-b border-slate-800 p-6 overflow-hidden">
            <h3 className="text-lg font-bold text-slate-400 mb-4 flex items-center gap-2 tracking-wider uppercase">
               <Clock size={18} className="text-amber-500" />
               Fila de Espera
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {aguardando.length === 0 && <p className="text-slate-600 font-medium">Nenhum paciente na fila.</p>}
              
              {aguardando.map((item, idx) => (
                <div key={`wait-${item.id}-${idx}`} className="bg-slate-800/30 border border-slate-700/50 p-3 rounded-xl shadow-sm flex items-center justify-between">
                  <div>
                     <h4 className="text-xl font-bold text-slate-300">{item.senha}</h4>
                     <p className="text-slate-500 text-sm truncate font-medium">{item.nome_completo}</p>
                  </div>
                  <span className="text-xs font-bold bg-slate-800 px-2 py-1 rounded text-slate-400">Aguardando</span>
                </div>
              ))}
            </div>
          </div>

          {/* Em Atendimento Section */}
          <div className="flex-1 flex flex-col border-b border-slate-800 p-4 lg:p-6 overflow-hidden">
            <h3 className="text-base lg:text-lg font-bold text-slate-400 mb-2 lg:mb-4 flex items-center gap-2 tracking-wider uppercase">
               <Users size={18} className="text-blue-400" />
               Chamando no Monitor
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {emAtendimento.length === 0 && <p className="text-slate-600 text-sm font-medium">Nenhum atendimento no momento.</p>}
              
              {emAtendimento.map((item, idx) => (
                <div key={`em-${item.id}-${idx}`} className={`bg-slate-800/50 border border-slate-700 p-2 lg:p-3 rounded-xl shadow-sm ${item.id === called?.id ? 'ring-2 ring-blue-500' : ''}`}>
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className="text-lg lg:text-xl font-bold text-slate-200">{item.senha}</h4>
                    <span className="text-xs font-bold bg-slate-700 px-2 flex items-center h-5 lg:h-6 rounded-full text-amber-400">{item.sala}</span>
                  </div>
                  <p className="text-slate-400 text-sm lg:text-base truncate font-medium">{item.nome_completo}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Concluídos Section */}
          <div className="flex-[0.8] p-6 flex flex-col overflow-hidden bg-slate-950">
            <h3 className="text-lg font-bold text-slate-500 mb-4 flex items-center gap-2 tracking-wider uppercase">
               <CheckCircle size={18} className="text-emerald-500" />
               Concluídos
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {concluidos.length === 0 && <p className="text-slate-700 font-medium">Nenhum atendimento concluído.</p>}
              
              {concluidos.map((item, idx) => (
                <div key={`conc-${item.id}-${idx}`} className="bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-sm opacity-60">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-bold text-slate-400">{item.senha}</h4>
                    <span className="text-xs font-bold bg-slate-800 px-2 py-1 rounded text-slate-500">Concluído</span>
                  </div>
                  <p className="text-slate-500 text-sm truncate font-medium">{item.nome_completo}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
