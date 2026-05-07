import React, { useState } from 'react';
import { LogOut, Monitor, Users, Activity, Lock, Mail } from 'lucide-react';
import AtendenteView from './views/AtendenteView';
import SupervisorView from './views/SupervisorView';
import GestorView from './views/GestorView';
import PublicMonitor from './views/PublicMonitor';
import { api } from './api';

type Role = 'atendente' | 'supervisor' | 'gestor';
export interface User { id: number; name: string; role: Role; }

export default function TriageApp() {
  const [user, setUser] = useState<User | null>(null);
  const [showMonitor, setShowMonitor] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Preencha os campos obrigatórios');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      const userData = await api.login(email, password);
      setUser({ id: userData.id, name: userData.name, role: userData.role as Role });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showMonitor) {
    return <PublicMonitor onBack={() => setShowMonitor(false)} />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="h-12 w-12 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xl mb-4">
              TS
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">TRIAGEM SOCIAL</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Acesso Restrito</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded text-sm font-semibold text-center">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">E-mail / Nickname</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  placeholder="seu@mail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="password" 
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>
            
            <button
              disabled={loading}
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-sm font-bold shadow-sm transition-colors mt-2"
            >
              {loading ? 'Acessando...' : 'Entrar no Sistema'}
            </button>

            <div className="my-6 border-t border-slate-100"></div>

            <button
              type="button"
              onClick={() => setShowMonitor(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded text-sm font-semibold shadow-sm transition-colors"
            >
              <Monitor size={16} /> Monitor Público
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <header className="h-auto sm:h-16 py-4 sm:py-0 bg-white border-b border-slate-200 px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between shrink-0 top-0 sticky z-10 gap-4 sm:gap-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">
            TS
          </div>
          <span className="font-bold tracking-tight text-lg text-slate-900">TRIAGEM SOCIAL</span>
          <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded border border-slate-200 uppercase font-bold tracking-wider ml-4">
            {user.role === 'supervisor' ? 'cadastro' : user.role}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <span className="text-slate-400 italic hidden sm:inline">Unidade: Centro de Atendimento Social</span>
          <span className="font-semibold text-slate-800">{user.name}</span>
          <button 
            onClick={() => setUser(null)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold border border-slate-200 hover:bg-slate-200 transition-colors shadow-sm"
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>
      
      <main className="flex-1 p-4 sm:p-8 w-full max-w-7xl mx-auto flex flex-col min-h-0">
        {user.role === 'atendente' && <AtendenteView user={user} />}
        {user.role === 'supervisor' && <SupervisorView user={user} />}
        {user.role === 'gestor' && <GestorView user={user} />}
      </main>
    </div>
  );
}
