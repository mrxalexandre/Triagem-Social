import React, { useEffect, useState } from 'react';
import { Volume2, ArrowLeft } from 'lucide-react';
import { api } from '../api';

export default function PublicMonitor({ onBack }: { onBack: () => void }) {
  const [called, setCalled] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    let lastCalledId = 0;
    const fetchEvent = async () => {
      try {
        const fila = await api.getFila();
        // find most recently called item (em_atendimento)
        const emAtendimentoAndCalledAtExists = fila.filter((i: any) => i.status === 'em_atendimento' && i.called_at).sort((a: any, b: any) => b.called_at - a.called_at);
        if (emAtendimentoAndCalledAtExists.length > 0) {
          const mostRecent = emAtendimentoAndCalledAtExists[0];
          if (mostRecent.id !== lastCalledId) {
            lastCalledId = mostRecent.id;
            setCalled(mostRecent);
            setHistory(prev => {
              const nh = [mostRecent, ...prev.filter(i => i.senha !== mostRecent.senha)];
              return nh.slice(0, 4); // Keep last 4
            });
          }
        }
      } catch (err) {}
    };
    
    fetchEvent();
    const interval = setInterval(fetchEvent, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header className="p-6 flex justify-between items-center border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-300">Painel de Atendimento</h1>
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={16} /> Voltar ao Painel
        </button>
      </header>

      <div className="flex-1 flex" style={{ height: 'calc(100vh - 80px)' }}>
        {/* Main Calling Box */}
        <div className="flex-1 flex flex-col justify-center items-center p-12 border-r border-slate-800">
          {called ? (
            <div className="text-center w-full max-w-3xl animate-in zoom-in duration-500">
              <div className="inline-flex items-center gap-3 bg-blue-500/20 text-blue-400 px-6 py-2 rounded-full mb-8">
                <Volume2 size={24} />
                <span className="text-xl font-medium tracking-wider uppercase">Por favor, dirija-se à sala</span>
              </div>
              <h2 className="text-[12rem] font-black leading-none tracking-tighter text-white drop-shadow-2xl mb-8">
                {called.senha}
              </h2>
              <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-8 backdrop-blur-sm shadow-2xl">
                <p className="text-3xl text-slate-400 mb-2 font-medium">Paciente</p>
                <p className="text-6xl font-bold text-white mb-8 truncate">{called.nome_completo}</p>
                <hr className="border-slate-700 mb-8" />
                <p className="text-7xl font-black text-amber-400 uppercase tracking-tight">{called.sala}</p>
              </div>
            </div>
          ) : (
            <div className="text-slate-600 text-3xl font-medium">Aguardando primeira chamada...</div>
          )}
        </div>

        {/* History Log */}
        <div className="w-[400px] bg-slate-950 p-6 flex flex-col gap-4">
          <h3 className="text-xl font-bold text-slate-500 mb-4 px-2 tracking-widest uppercase">Últimas Chamadas</h3>
          {history.length === 0 && <p className="text-slate-700 px-2 font-medium">Nenhum histórico</p>}
          
          {history.map((item, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-3xl font-bold text-slate-200">{item.senha}</h4>
                <span className="text-lg font-black text-amber-500">{item.sala}</span>
              </div>
              <p className="text-slate-400 text-lg truncate font-medium">{item.nome_completo}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
