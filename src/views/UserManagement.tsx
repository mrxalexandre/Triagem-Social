import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Edit } from 'lucide-react';
import { api } from '../api';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'atendente' });

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchUsers = (showLoading = false) => {
    if (showLoading) setLoading(true);
    // Don't clear error msg on background poll
    if (showLoading) setErrorMsg('');
    
    api.getUsers(showLoading)
      .then(data => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        // Ignored to avoid error spam on rate limiting
        if (showLoading) setErrorMsg('Não foi possível carregar a lista de usuários. Tente novamente mais tarde.');
        setUsers([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers(true);
    const interval = setInterval(() => fetchUsers(false), 15000);
    return () => clearInterval(interval);
  }, []);

  const openNewModal = () => {
    setEditId(null);
    setFormData({ name: '', email: '', password: '', role: 'atendente' });
    setShowModal(true);
  };

  const openEditModal = (u: any) => {
    setEditId(u.id);
    setFormData({ name: u.name, email: u.email, password: '', role: u.role });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await api.updateUser(editId, formData);
    } else {
      await api.createUser(formData);
    }
    setShowModal(false);
    fetchUsers();
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await api.deleteUser(deleteId);
      setDeleteId(null);
      fetchUsers();
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium">Carregando usuários...</div>;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Gerenciamento de Usuários</h2>
          <p className="text-sm text-slate-500">Adicione e gerencie atendentes e cadastros.</p>
        </div>
        <button 
          onClick={openNewModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
        >
          <UserPlus size={16} /> Novo Usuário
        </button>
      </div>

      <div className="flex-1 overflow-x-auto border border-slate-200 rounded-lg">
        {errorMsg ? (
          <div className="p-8 text-center text-red-500 font-medium">{errorMsg}</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium">Nenhum usuário cadastrado.</div>
        ) : (
          <table className="w-full text-left text-sm text-slate-600 min-w-[600px]">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-6 py-3 font-semibold">Nome</th>
                <th className="px-6 py-3 font-semibold">E-mail</th>
                <th className="px-6 py-3 font-semibold">Função</th>
                <th className="px-6 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{u.name}</td>
                  <td className="px-6 py-4">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                      ${u.role === 'gestor' ? 'bg-purple-100 text-purple-700' : 
                        u.role === 'supervisor' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {u.role === 'supervisor' ? 'cadastro' : u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u.role !== 'gestor' && (
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(u)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => setDeleteId(u.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">{editId ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Completo</label>
                <input 
                  type="text" required 
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail</label>
                <input 
                  type="email" required 
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Senha {editId && <span className="text-slate-400 font-normal">(digite para alterar a atual)</span>}</label>
                <input 
                  type="password" required={!editId} minLength={4}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                  placeholder={editId ? "Nova senha..." : ""}
                  value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Função</label>
                <select 
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded focus:border-blue-500 outline-none text-sm"
                  value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="atendente">Atendente</option>
                  <option value="supervisor">Cadastro</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <Trash2 size={48} className="mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir usuário?</h3>
            <p className="text-sm text-slate-500 mb-6">Esta ação não pode ser desfeita. O usuário perderá acesso ao sistema.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
