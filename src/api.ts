export const XANO_URL = 'https://x8ki-letl-twmt.n7.xano.io/api:zXMEo_7Q';

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
    const { nome_completo, cpf, endereco, servico, prioridade, atendente_id, telefone, cidade } = data;

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
        supervisor_id: 1, // fallback se precisar
        sala: 'Aguardando',
        observacoes: initialObs
      })
    });
    const insertAtd = await createAtdRes.json();
    if (insertAtd.code) {
      throw new Error(insertAtd.message || 'Erro ao criar atendimento');
    }

    return { id: insertAtd.id, senha };
  },

  getFila: async () => {
    const atdsRes = await fetch(`${XANO_URL}/atendimentos`);
    const atds = await atdsRes.json();
    const atdsArray = Array.isArray(atds) ? atds : [];
    
    const pacRes = await fetch(`${XANO_URL}/pacientes`);
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
        called_at: a.called_at || 0
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
        supervisor_id: supervisor_id || atd.supervisor_id,
        called_at: Date.now() // Record when called to show on monitor
      })
    });
    const updatedAtd = await updateRes.json();

    const pacRes = await fetch(`${XANO_URL}/pacientes/${atd.paciente_id}`);
    const pac = await pacRes.json();

    return {
      senha: updatedAtd.senha,
      nome_completo: pac.nome_completo,
      sala: updatedAtd.sala
    };
  },

  concluir: async (id: number) => {
    const atdRes = await fetch(`${XANO_URL}/atendimentos/${id}`);
    const atd = await atdRes.json();
    
    await fetch(`${XANO_URL}/atendimentos/${id}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ ...atd, status: 'concluido' })
    });
  },

  updateObservacoes: async (id: number, observacoes: string) => {
    const atdRes = await fetch(`${XANO_URL}/atendimentos/${id}`);
    const atd = await atdRes.json();
    
    let baseObs = observacoes;
    if (typeof atd.observacoes === 'string' && atd.observacoes.startsWith('{"_sv":')) {
      try {
        const parsed = JSON.parse(atd.observacoes);
        baseObs = JSON.stringify({ _sv: parsed._sv, obs: observacoes });
      } catch(e){}
    }

    await fetch(`${XANO_URL}/atendimentos/${id}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ ...atd, observacoes: baseObs })
    });
  },

  getStats: async () => {
    const atdsRes = await fetch(`${XANO_URL}/atendimentos`);
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
    const atdsRes = await fetch(`${XANO_URL}/atendimentos`);
    const atds = await atdsRes.json();
    const pacsRes = await fetch(`${XANO_URL}/pacientes`);
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
    // We will just call print on a new window or ignore since pdfkit isn't trivial in browser.
    // simpler is using browser print
    window.print();
  },

  getUsers: async () => {
    const res = await fetch(`${XANO_URL}/users`);
    return res.json();
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
  }
};
