import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const XANO_URL = 'https://x8ki-letl-twmt.n7.xano.io/api:zXMEo_7Q';

let _updateLock: Promise<void> | null = null;
async function _withLock<T>(fn: () => Promise<T>): Promise<T> {
  while (_updateLock) {
    await _updateLock;
  }
  let resolveLock!: () => void;
  _updateLock = new Promise(r => resolveLock = r);
  try {
    return await fn();
  } finally {
    _updateLock = null;
    resolveLock();
  }
}

export const api = {
  login: async (email: string, password: string) => {
    if (email === 'camillalessa' && password === 'lp2408') {
      return { id: 9999, name: 'Administrador Geral', role: 'gestor' };
    }

    const res = await fetch(`${XANO_URL}/users`);
    if (!res.ok) throw new Error('Falha ao buscar usuários');
    const users = await res.json();
    const user = Array.isArray(users) ? users.find((u: any) => u.email === email) : null;
    
    if (user) {
      if (!password) throw new Error('Senha incorreta');
      return { id: user.id, name: user.name, role: user.role };
    } else {
      throw new Error('Credenciais inválidas');
    }
  },

  createTriagem: async (data: any) => {
    const { nome_completo, cpf, endereco, servico, prioridade, atendente_id, telefone, cidade, supervisor_id, sala } = data;

    const pacRes = await fetch(`${XANO_URL}/pacientes`);
    const pacientes = await pacRes.json();
    let paciente = Array.isArray(pacientes) ? pacientes.find((p: any) => p.cpf === cpf) : null;
    
    if (!paciente) {
      const createPacRes = await fetch(`${XANO_URL}/pacientes`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ nome_completo, cpf, endereco: endereco || 'Não informado', telefone, cidade: cidade || "Olho d'Água das Flores, AL" })
      });
      paciente = await createPacRes.json();
      if (paciente.code) throw new Error(paciente.message || 'Erro ao criar paciente');
    }

    const atdsRes = await fetch(`${XANO_URL}/atendimentos`);
    const atds = await atdsRes.json();
    const atdsArray = Array.isArray(atds) ? atds : [];
    
    const today = new Date().toISOString().split('T')[0];
    const todayCount = atdsArray.filter((a: any) => new Date(a.created_at).toISOString().split('T')[0] === today).length;
    
    const exactMatch = ["Recadastro do BF","Cadastro do BF","Solicitação de visita","BPC"].includes(servico);
    
    let mappedServico = servico;
    let prefix = 'OUTR';
    let initialObs = 'Nenhuma';
    
    if (!exactMatch) {
      const sLower = servico.toLowerCase();
      if (sLower.includes('cadastro') || sLower.includes('cadastral') || sLower.includes('exclusão') || sLower.includes('transferência')) {
        mappedServico = 'Cadastro do BF';
        prefix = 'CAD';
      } else if (sLower.includes('bpc') || sLower.includes('idoso') || sLower.includes('deficiência') || sLower.includes('passe livre') || sLower.includes('benefício')) {
        mappedServico = 'BPC';
        prefix = 'BPC';
      } else if (sLower.includes('visita')) {
        mappedServico = 'Solicitação de visita';
        prefix = 'VIST';
      } else {
        mappedServico = 'Recadastro do BF';
        prefix = 'OUTR';
      }
      initialObs = JSON.stringify({ _sv: servico, obs: 'Nenhuma' });
    } else {
      prefix = servico === 'BPC' ? 'BPC' : (servico === 'Recadastro do BF' ? 'REC' : (servico === 'Cadastro do BF' ? 'CAD' : 'VIST'));
    }

    const num = String(todayCount + 1).padStart(3, '0');
    const senha = `${prefix}` + (prioridade ? 'P' : '') + `-${num}`;

    const createAtdRes = await fetch(`${XANO_URL}/atendimentos`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        paciente_id: paciente.id,
        servico: mappedServico,
        senha,
        status: 'aguardando',
        prioridade: !!prioridade,
        atendente_id,
        supervisor_id: supervisor_id || 1, // use selected supervisor_id
        sala: sala || 'Aguardando',
        observacoes: initialObs
      })
    });
    const insertAtd = await createAtdRes.json();
    if (insertAtd.code) {
      throw new Error(insertAtd.message || 'Erro ao criar atendimento');
    }

    return { id: insertAtd.id, senha };
  },

  getFila: async (bustCache: boolean = false) => {
    const ts = bustCache ? `?_t=${Date.now()}` : '';
    const atdsRes = await fetch(`${XANO_URL}/atendimentos${ts}`);
    if (!atdsRes.ok) throw new Error('Falha ao buscar fila (atendimentos)');
    const atds = await atdsRes.json();
    const atdsArray = Array.isArray(atds) ? atds : [];
    
    const pacRes = await fetch(`${XANO_URL}/pacientes${ts}`);
    if (!pacRes.ok) throw new Error('Falha ao buscar fila (pacientes)');
    const pacs = await pacRes.json();
    const pacsArray = Array.isArray(pacs) ? pacs : [];
    
    return atdsArray.map((a: any) => {
      let realServico = a.servico;
      let realObs = a.observacoes;
      
      if (typeof a.observacoes === 'string' && a.observacoes.startsWith('{"_sv":')) {
        try {
          const parsed = JSON.parse(a.observacoes);
          if (parsed._sv) realServico = parsed._sv;
          if (parsed.obs !== undefined) realObs = parsed.obs;
        } catch(e) {}
      }

      const pac = pacsArray.find((p: any) => p.id === a.paciente_id) || {};
      return {
        ...a,
        servico: realServico,
        observacoes: realObs,
        nome_completo: pac.nome_completo,
        cpf: pac.cpf,
        endereco: pac.endereco,
        called_at: a.updated_at || a.created_at || 0
      };
    }).sort((a: any, b: any) => {
      if (a.status === 'concluido' && b.status !== 'concluido') return 1;
      if (a.status !== 'concluido' && b.status === 'concluido') return -1;
      if (a.prioridade && !b.prioridade) return -1;
      if (!a.prioridade && b.prioridade) return 1;
      return a.created_at - b.created_at;
    });
  },

  chamar: async (id: number, sala: string, observacoes_supervisor: string, supervisor_id: number) => {
    return _withLock(async () => {
      const atdRes = await fetch(`${XANO_URL}/atendimentos/${id}`);
      const atd = await atdRes.json();
      
      let baseObs = observacoes_supervisor || '';
      if (!observacoes_supervisor) {
         let existingObsRaw = atd.observacoes || '';
         let extractedObs = existingObsRaw;
         if (typeof existingObsRaw === 'string' && existingObsRaw.startsWith('{"_sv":')) {
           try { extractedObs = JSON.parse(existingObsRaw).obs || ''; } catch(e){}
         }
         baseObs = extractedObs;
      }
      
      let newObsBody = baseObs;
      if (typeof atd.observacoes === 'string' && atd.observacoes.startsWith('{"_sv":')) {
         try {
            const parsed = JSON.parse(atd.observacoes);
            newObsBody = JSON.stringify({ _sv: parsed._sv, obs: baseObs });
         } catch(e) {}
      }

      const updateRes = await fetch(`${XANO_URL}/atendimentos/${id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          ...atd,
          status: 'em_atendimento',
          sala,
          observacoes: newObsBody,
          supervisor_id: supervisor_id || atd.supervisor_id
        })
      });
      if (!updateRes.ok) throw new Error('Falha ao chamar paciente');
      const updatedAtd = await updateRes.json();
      
      const pacRes = await fetch(`${XANO_URL}/pacientes/${atd.paciente_id}`);
      if (!pacRes.ok) throw new Error('Falha ao buscar paciente');
      const pac = await pacRes.json();

      return {
        senha: updatedAtd.senha,
        nome_completo: pac.nome_completo,
        sala: updatedAtd.sala
      };
    });
  },

  concluir: async (id: number) => {
    return _withLock(async () => {
      const atdRes = await fetch(`${XANO_URL}/atendimentos/${id}`);
      if (!atdRes.ok) throw new Error('Falha ao buscar atendimento');
      const atd = await atdRes.json();
      
      const updateRes = await fetch(`${XANO_URL}/atendimentos/${id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ ...atd, status: 'concluido' })
      });
      if (!updateRes.ok) throw new Error('Falha ao concluir paciente');
    });
  },

  updateObservacoes: async (id: number, observacoes: string) => {
    return _withLock(async () => {
      const atdRes = await fetch(`${XANO_URL}/atendimentos/${id}`);
      if (!atdRes.ok) throw new Error('Falha ao buscar atendimento');
      const atd = await atdRes.json();
      
      let baseObs = observacoes;
      if (typeof atd.observacoes === 'string' && atd.observacoes.startsWith('{"_sv":')) {
        try {
          const parsed = JSON.parse(atd.observacoes);
          baseObs = JSON.stringify({ _sv: parsed._sv, obs: observacoes });
        } catch(e){}
      }

      const updateRes = await fetch(`${XANO_URL}/atendimentos/${id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ ...atd, observacoes: baseObs })
      });
      if (!updateRes.ok) throw new Error('Falha ao atualizar observações');
    });
  },

  getStats: async (bustCache: boolean = false) => {
    const ts = bustCache ? `?_t=${Date.now()}` : '';
    const atdsRes = await fetch(`${XANO_URL}/atendimentos${ts}`);
    if (!atdsRes.ok) throw new Error('Falha ao buscar estatísticas');
    const atds = await atdsRes.json();
    const atdsArray = Array.isArray(atds) ? atds : [];
    
    const aguardando = atdsArray.filter((a: any) => a.status === 'aguardando').length;
    const concluidos = atdsArray.filter((a: any) => a.status === 'concluido' || a.status === 'cancelado').length;
    const total = atdsArray.length;
    
    const servicos: Record<string, number> = {};
    atdsArray.forEach((a: any) => {
      let realServico = a.servico;
      if (typeof a.observacoes === 'string' && a.observacoes.startsWith('{"_sv":')) {
        try {
          realServico = JSON.parse(a.observacoes)._sv || a.servico;
        } catch(e){}
      }
      servicos[realServico] = (servicos[realServico] || 0) + 1;
    });
    const byService = Object.keys(servicos).map(s => ({ servico: s, c: servicos[s] }));

    return { aguardando, concluidos, total, byService };
  },

  exportCsv: async () => {
    const atdsRes = await fetch(`${XANO_URL}/atendimentos`, { cache: 'no-store' });
    const atds = await atdsRes.json();
    const pacsRes = await fetch(`${XANO_URL}/pacientes`, { cache: 'no-store' });
    const pacs = await pacsRes.json();

    const data = (Array.isArray(atds) ? atds : []).map((a: any) => {
      const pac = (Array.isArray(pacs) ? pacs : []).find((p: any) => p.id === a.paciente_id) || {};
      
      let realServico = a.servico;
      let realObs = a.observacoes;
      if (typeof a.observacoes === 'string' && a.observacoes.startsWith('{"_sv":')) {
        try {
          const parsed = JSON.parse(a.observacoes);
          realServico = parsed._sv || a.servico;
          realObs = parsed.obs;
        } catch(e){}
      }
      
      return {
        id: a.id,
        nome_completo: pac.nome_completo,
        cpf: pac.cpf,
        servico: realServico,
        status: a.status,
        senha: a.senha,
        sala: a.sala,
        observacoes: realObs,
        created_at: new Date(a.created_at).toLocaleString()
      };
    }).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (!data.length) return;

    // Convert to CSV
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        return `"${String(val || '').replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    const csvString = csvRows.join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'Atendimentos.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  exportPdf: async () => {
    const atdsRes = await fetch(`${XANO_URL}/atendimentos`, { cache: 'no-store' });
    const atds = await atdsRes.json();
    const pacsRes = await fetch(`${XANO_URL}/pacientes`, { cache: 'no-store' });
    const pacs = await pacsRes.json();

    const pacientesArray = Array.isArray(pacs) ? pacs : [];
    const atendimentosArray = Array.isArray(atds) ? atds : [];

    const relatorioMap = new Map();

    atendimentosArray.forEach((a: any) => {
       const pac = pacientesArray.find((p: any) => p.id === a.paciente_id) || {};
       const pacId = a.paciente_id || `unknown-${Math.random()}`;

       let realServico = a.servico;
       if (typeof a.observacoes === 'string' && a.observacoes.startsWith('{"_sv":')) {
         try {
           realServico = JSON.parse(a.observacoes)._sv || a.servico;
         } catch(e){}
       }

       if (!relatorioMap.has(pacId)) {
          relatorioMap.set(pacId, {
             nome: pac.nome_completo || 'Desconhecido',
             cpf: pac.cpf || 'N/A',
             telefone: pac.telefone || 'N/A',
             cidade: pac.cidade || 'N/A',
             endereco: pac.endereco || 'N/A',
             servicos: [],
             count: 0
          });
       }

       const info = relatorioMap.get(pacId);
       info.servicos.push(realServico);
       info.count += 1;
    });

    const doc = new jsPDF('landscape');

    doc.text(`Relatório de Atendimentos por Pessoa - Total Geral: ${atendimentosArray.length} atendimentos`, 14, 15);

    const tableData: any[][] = [];
    relatorioMap.forEach((info) => {
       const uniqueServicos = Array.from(new Set(info.servicos));
       const servicosStr = uniqueServicos.join(', ');

       tableData.push([
          info.nome,
          info.cpf,
          info.telefone,
          info.cidade,
          info.endereco,
          servicosStr,
          info.count.toString()
       ]);
    });

    autoTable(doc, {
       head: [['Nome Completo', 'CPF', 'Telefone', 'Cidade', 'Endereço', 'Serviços Realizados', 'Qtd']],
       body: tableData,
       startY: 20,
    });

    doc.save('Relatorio_Atendimentos.pdf');
  },

  getUsers: async (bustCache: boolean = false) => {
    const ts = bustCache ? `?_t=${Date.now()}` : '';
    const res = await fetch(`${XANO_URL}/users${ts}`);
    const users = await res.json();
    return (Array.isArray(users) ? users : []).filter(u => u.email ? !u.email.includes('config') : true);
  },
  createUser: async (data: any) => {
    const res = await fetch(`${XANO_URL}/users`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    return res.json();
  },
  updateUser: async (id: number, data: any) => {
    let finalPassword = data.password;
    if (!finalPassword) {
      const uRes = await fetch(`${XANO_URL}/users/${id}`);
      const currentU = await uRes.json();
      finalPassword = currentU.password;
    }
    const res = await fetch(`${XANO_URL}/users/${id}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ ...data, password: finalPassword })
    });
    return res.json();
  },
  deleteUser: async (id: number) => {
    await fetch(`${XANO_URL}/users/${id}`, { method: 'DELETE' });
  },

  getServicosConfig: async (bustCache: boolean = true) => {
    try {
      const ts = bustCache ? `?_t=${Date.now()}` : '';
      const res = await fetch(`${XANO_URL}/users${ts}`);
      const users = await res.json();
      const configUser = (Array.isArray(users) ? users : []).find((u: any) => u.email === 'config_servicos_app@sys.com');
      if (configUser && configUser.name && configUser.name.startsWith('[')) {
        return JSON.parse(configUser.name);
      }
    } catch(e) {}
    
    // Default fallback
    return [
      { grupo: "Atendimento Cadúnico", servicos: ["Cadastro novo", "Atualização cadastral", "Exclusão", "Transferência", "Agendamento de Visita domiciliar"] },
      { grupo: "Serviço Social", servicos: ["Requerimento BPC", "Processo de avaliação BPC", "Orientação Social", "Requerimento de carteira do idoso", "Requerimento carteira da pessoa com deficiência", "Carteira CIPTEA", "Solicitação Passe Livre", "Inclusão ou consulta CRIA", "Requerimento ou renovação de Benefício Eventual"] },
      { grupo: "Coordenação de programas sociais", servicos: ["Atendimento Olho d' Água Feliz", "Atendimento Programa do Leite"] },
      { grupo: "Gestão", servicos: ["Secretário(a)"] }
    ];
  },

  saveServicosConfig: async (config: any) => {
    const configStr = JSON.stringify(config);
    const ts = `?_t=${Date.now()}`;
    const res = await fetch(`${XANO_URL}/users${ts}`);
    const users = await res.json();
    const configUser = (Array.isArray(users) ? users : []).find((u: any) => u.email === 'config_servicos_app@sys.com');
    
    if (configUser) {
      const updateRes = await fetch(`${XANO_URL}/users/${configUser.id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name: configStr, email: configUser.email, password: 'admin', role: configUser.role })
      });
      if (!updateRes.ok) throw new Error('Falha ao atualizar config');
    } else {
      const addRes = await fetch(`${XANO_URL}/users`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name: configStr, email: 'config_servicos_app@sys.com', password: 'admin', role: 'gestor' })
      });
      if (!addRes.ok) throw new Error('Falha ao criar config');
    }
  }
};
