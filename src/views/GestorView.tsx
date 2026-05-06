import React, { useState, useEffect } from 'react';
import { User } from '../TriageApp';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, FileText, Users, Clock, CheckCircle, LayoutDashboard, MonitorPlay } from 'lucide-react';
import UserManagement from './UserManagement';
import SupervisorView from './SupervisorView';

export default function GestorView({ user }: { user: User }) {
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'supervisor'>('dashboard');

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => {
        if (!r.ok) throw new Error('Falha ao obter stats');
        return r.json();
      })
      .then(setStats)
      .catch(err => {
        console.error(err);
        setStats({ aguardando: 0, concluidos: 0, total: 0, byService: [] });
      });
  }, []);

  const handleExportCSV = () => {
    window.open('/api/relatorios/exportar', '_blank');
  };

  const handleExportPDF = () => {
    window.open('/api/relatorios/analise-ia', '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 h-full min-h-0">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Portal do Gestor</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Gerencie a operação e a equipe de atendimento.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold transition-colors ${activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('supervisor')}
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold transition-colors ${activeTab === 'supervisor' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <MonitorPlay size={16} /> Fila / Triagem
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold transition-colors ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Users size={16} /> Equipe
          </button>
        </div>
      </div>

      {activeTab === 'users' ? (
        <UserManagement />
      ) : activeTab === 'supervisor' ? (
        <SupervisorView user={user} />
      ) : stats ? (
        <div className="flex-1 flex flex-col gap-6 min-h-0">
          <div className="flex justify-between items-center shrink-0">
            <h2 className="text-lg font-bold text-slate-800">Visão Geral da Operação</h2>
            <div className="flex items-center gap-3">
              <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 rounded text-sm font-semibold transition-colors shadow-sm">
                <Download size={16} /> Dados.CSV
              </button>
              <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition-colors shadow-sm">
                <FileText size={16} /> Relatório Resumo (PDF)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Hoje</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900">{stats.total}</h3>
              <p className="text-xs text-slate-500 mt-2">Status: Operação Normal</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aguardando Fila</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900">{stats.aguardando}</h3>
              <p className="text-xs text-orange-600 mt-2">Neste momento</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Concluídos</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900">{stats.concluidos}</h3>
              <p className="text-xs text-green-600 mt-2">Registrados no sistema</p>
            </div>
             <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tempo Médio (TME)</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900">~14m</h3>
              <p className="text-xs text-slate-500 mt-2">Estimativa geral</p>
            </div>
          </div>

          <div className="flex-1 flex gap-6 min-h-0">
            <div className="flex-[2] bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 text-sm">Volumetria de Atendimentos</h3>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.byService || []}>
                    <XAxis dataKey="servico" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'}} />
                    <Bar dataKey="c" fill="#2563eb" radius={[4, 4, 0, 0]} name="Atendimentos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex-[1] bg-blue-900 text-white rounded-xl shadow-xl p-6 flex flex-col gap-6 overflow-hidden border border-blue-800">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-blue-200">Relatórios</h2>
                </div>
                <h3 className="text-xl font-semibold leading-tight">Resumo de Atendimentos</h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-800/50 p-4 rounded-lg border border-blue-700">
                  <p className="text-xs text-blue-300 font-bold mb-1 uppercase">Relatório PDF</p>
                  <p className="text-sm leading-relaxed text-blue-50">
                    O sistema processa o histórico e gera um relatório consolidado com a quantidade de atendimentos, os dias, as pessoas atendidas e os serviços utilizados.
                  </p>
                </div>
              </div>

              <div className="mt-auto">
                <button onClick={handleExportPDF} className="w-full py-3 bg-white text-blue-900 rounded font-bold text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-lg">
                  <FileText size={16} /> Gerar PDF (Resumo)
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-500 font-medium">Carregando dashboard...</div>
      )}
    </div>
  );
}
