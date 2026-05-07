import React, { useState } from 'react';
import { User } from '../TriageApp';
import { Send, CheckCircle2 } from 'lucide-react';

import { api } from '../api';

export default function AtendenteView({ user }: { user: User }) {
  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    telefone: '',
    endereco: '',
    cidade: "Olho d'Água das Flores, AL",
    servico: 'Cadastro novo',
    prioridade: false
  });
  
  const [ticket, setTicket] = useState<{ id: number, senha: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isValidCPF = (cpf: string) => {
    const numbers = cpf.replace(/[^\d]+/g, '');
    return numbers.length === 11;
  };

  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidCPF(formData.cpf)) {
      setErrorMsg('CPF inválido. Verifique o número digitado.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const data = await api.createTriagem({ ...formData, atendente_id: user.id });
      if (data.senha) setTicket(data);
    } catch(err: any) {
      if (err.message === 'Failed to fetch') {
         setErrorMsg("Erro de conexão. O servidor pode estar indisponível.");
      } else {
         setErrorMsg(err.message || "Erro ao criar triagem");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setTicket(null);
    setFormData({ ...formData, nome_completo: '', cpf: '', telefone: '', endereco: '', prioridade: false, cidade: "Olho d'Água das Flores, AL" });
  };

  if (ticket) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center mt-8">
        <div className="mx-auto w-16 h-16 bg-green-100 text-green-700 flex items-center justify-center rounded-full mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Paciente Triado!</h2>
        <p className="text-sm font-medium text-slate-500 mb-6">Aguardando chamada pelo supervisor.</p>
        
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mb-8">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Senha Gerada</p>
          <p className="text-4xl font-mono font-bold text-slate-800">{ticket.senha}</p>
        </div>

        <button 
          onClick={handleNew}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors"
        >
          Nova Triagem +
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Nova Triagem</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Preencha os dados primários do cidadão para gerar a senha.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
        {errorMsg && (
          <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded text-sm font-semibold text-center mb-4">
            {errorMsg}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Completo</label>
            <input 
              type="text" required
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-300"
              value={formData.nome_completo}
              onChange={e => setFormData({...formData, nome_completo: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CPF</label>
            <input 
              type="text" required
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-300"
              value={formData.cpf}
              onChange={e => setFormData({...formData, cpf: maskCPF(e.target.value)})}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6 mt-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone</label>
            <input 
              type="tel" required
              placeholder="(00) 00000-0000"
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-300"
              value={formData.telefone}
              onChange={e => setFormData({...formData, telefone: maskPhone(e.target.value)})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cidade</label>
            <select 
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
              value={formData.cidade}
              onChange={e => setFormData({...formData, cidade: e.target.value})}
            >
              <option value="Olho d'Água das Flores, AL">Olho d'Água das Flores, AL</option>
              <option value="Outra">Outra</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 mt-6">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Endereço (Opcional)</label>
          <input 
            type="text" 
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-300"
            value={formData.endereco}
            onChange={e => setFormData({...formData, endereco: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6 mt-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Serviço Necessário</label>
            <select 
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
              value={formData.servico}
              onChange={e => setFormData({...formData, servico: e.target.value})}
            >
              <optgroup label="Atendimento Cadúnico">
                <option value="Cadastro novo">Cadastro novo</option>
                <option value="Atualização cadastral">Atualização cadastral</option>
                <option value="Exclusão">Exclusão</option>
                <option value="Transferência">Transferência</option>
                <option value="Agendamento de Visita domiciliar">Agendamento de Visita domiciliar</option>
              </optgroup>
              <optgroup label="Serviço Social">
                <option value="Requerimento BPC">Requerimento BPC</option>
                <option value="Processo de avaliação BPC">Processo de avaliação BPC</option>
                <option value="Orientação Social">Orientação Social</option>
                <option value="Requerimento de carteira do idoso">Requerimento de carteira do idoso</option>
                <option value="Requerimento carteira da pessoa com deficiência">Requerimento carteira da pessoa com deficiência</option>
                <option value="Carteira CIPTEA">Carteira CIPTEA</option>
                <option value="Solicitação Passe Livre">Solicitação Passe Livre</option>
                <option value="Inclusão ou consulta CRIA">Inclusão ou consulta CRIA</option>
                <option value="Requerimento ou renovação de Benefício Eventual">Requerimento ou renovação de Benefício Eventual</option>
              </optgroup>
              <optgroup label="Coordenação de programas sociais">
                <option value="Atendimento Olho d' Água Feliz">Atendimento Olho d' Água Feliz</option>
                <option value="Atendimento Programa do Leite">Atendimento Programa do Leite</option>
              </optgroup>
              <optgroup label="Gestão">
                <option value="Secretário(a)">Secretário(a)</option>
              </optgroup>
            </select>
          </div>

          <div className="flex items-center pt-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                checked={formData.prioridade}
                onChange={e => setFormData({...formData, prioridade: e.target.checked})}
              />
              <span className="text-sm font-semibold text-slate-700">Atendimento Prioritário</span>
            </label>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            type="submit" disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-70"
          >
            {loading ? 'Processando...' : <><Send size={16} /> Gerar Senha</>}
          </button>
        </div>
      </form>
    </div>
  );
}
