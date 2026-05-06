# Arquitetura e Modelagem para o Xano Backend

Em resposta à sua solicitação, abaixo está a documentação técnica constando a estrutura SQL/JSON para ser importada ou recriada no Xano, os endpoints propostos para a API REST e a lógica com o prompt de Inteligência Artificial para geração do Relatório Analítico em PDF.

---

## 1. Schema Baseado em Xano (JSON/SQL-like)

O Xano permite criar as tabelas rapidamente através do painel. Abaixo está o schema representativo contendo os tipos nativos e as dependências:

### Tabela `users`
Controles de acesso e cadastro de funcionários (Atendentes, Supervisores, Gestores).
```json
{
  "table": "users",
  "columns": [
    { "name": "id", "type": "integer", "primary": true, "auto_increment": true },
    { "name": "name", "type": "text", "required": true },
    { "name": "email", "type": "email", "required": true, "unique": true },
    { "name": "password", "type": "password", "required": true },
    { "name": "role", "type": "enum", "values": ["atendente", "supervisor", "gestor"], "required": true }
  ]
}
```

### Tabela `pacientes`
Dados brutos do cidadão atendido.
```json
{
  "table": "pacientes",
  "columns": [
    { "name": "id", "type": "integer", "primary": true, "auto_increment": true },
    { "name": "nome_completo", "type": "text", "required": true },
    { "name": "cpf", "type": "text", "required": true, "unique": true, "index": true },
    { "name": "endereco", "type": "text" },
    { "name": "created_at", "type": "timestamp", "default": "now" }
  ]
}
```

### Tabela `atendimentos`
Registro da triagem, fluxo de fila e vinculação entre paciente e funcionários.
```json
{
  "table": "atendimentos",
  "columns": [
    { "name": "id", "type": "integer", "primary": true, "auto_increment": true },
    { "name": "paciente_id", "type": "table_reference", "reference": "pacientes", "required": true },
    { "name": "servico", "type": "enum", "values": ["Recadastro do BF", "Cadastro do BF", "Solicitação de visita", "BPC"], "required": true },
    { "name": "status", "type": "enum", "values": ["aguardando", "em_atendimento", "concluido", "cancelado"], "default": "aguardando" },
    { "name": "senha", "type": "text", "required": true },
    { "name": "prioridade", "type": "boolean", "default": false },
    { "name": "sala", "type": "text" },
    { "name": "observacoes_supervisor", "type": "text" },
    { "name": "atendente_id", "type": "table_reference", "reference": "users", "required": true },
    { "name": "supervisor_id", "type": "table_reference", "reference": "users" },
    { "name": "created_at", "type": "timestamp", "default": "now" },
    { "name": "updated_at", "type": "timestamp", "default": "now" }
  ]
}
```

---

## 2. Endpoints REST (Xano API)

Para suportar todas as operações do Sistema de Triagem, o Xano deverá espor os seguintes endpoints organizados por grupos de permissão (Middleware de Auth/RBAC):

### Autenticação / Usuários
* `POST /auth/login` - Retorna token JWT.
* `POST /users` (Somente Gestor) - Cadastra um novo Atendente/Supervisor/Gestor.
* `GET /users` (Somente Gestor) - Lista usuários cadastrados.

### Pacientes & Triagem (Acesso: Atendentes, Gestores)
* `POST /pacientes` - Cria (ou retorna se já existir pelo CPF) um registro na tabela `pacientes`.
* `POST /atendimentos/triagem` - Endpoint principal do Atendente.
  * **Payload esperado:** `{ paciente_id, servico, prioridade }`
  * **Lógica Interna do Xano:** Gera a string da "senha" via Função Customizada concatenando a sigla do serviço (Ex: `BPC-`, `CAD-`) e um identificador sequencial (ex: contador em uma variável redigida ou ID da tabela de senhas do dia). Adiciona o `atendente_id` pegando do Token JWT (`auth.id`).
  * **Retorno:** Status da Senha gerada.

### Fila & Atendimento (Acesso: Supervisores, Gestores)
* `GET /atendimentos/fila` - Retorna `atendimentos` filtrados por `status = aguardando`. Pode ser ordenado por `prioridade` e `created_at`.
* `PUT /atendimentos/{id}/chamar` - Ação efetuada pelo Supervisor para mudar o status de "Aguardando" para "Em Atendimento".
  * **Payload:** `{ sala, observacoes_supervisor }`
  * **Lógica:** Atualiza `status = em_atendimento`, `supervisor_id = auth.id`, assina o `updated_at`. Dispara (via WebSocket ou webhook) atualização para a tela pública.
* `PUT /atendimentos/{id}/concluir` - Finaliza o atendimento (`status = concluido`).

### View Pública (Acesso Livre)
* `GET /atendimentos/painel-chamada` - Endpoint (idealmente com polling rápido curto ou emparelhado a um listener Real-Time do Xano/Pusher) que retorna os últimos 5 atendimentos recém atualizados para "Em Atendimento" com campos selecionados `[senha, paciente.nome, sala]`.

### Relatórios e Dashboard (Acesso: Gestores)
* `GET /dashboard/stats` - Agrega totais de atendimentos do dia, quantidade "aguardando", tempo médio (diferença avg entre upd e crt para concluídos).
* `GET /relatorios/exportar` - Retorna a base de `atendimentos` unida (`join` com `pacientes` e `users`) tratada em Buffer BLOB para `.csv`.
* `GET /relatorios/analise-ia` - Dispara a LLM, gera PDF e retorna via Buffer (ou URL S3 se hospedado).

---

## 3. Lógica e Prompt para Relatório de Inteligência Artificial usando Node (Express/Xano)

Abaixo está uma estrutura algorítmica para a Task Function (seja via Lambdas Nativas do Xano com Webhook externo para PDF, ou um script Express.js consumindo a API da Gemini/OpenAI). 

```javascript
// Exemplo de lógica em uma Cloud Function ou Route do Node.js:
import { getDbStats } from './db.js';
import { GoogleGenAI } from '@google/genai';
import PDFDocument from 'pdfkit';

// Inicialização da AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function gerarRelatorioComIAPDF(req, res) {
  // 1. Coleta de Dados Agregados do Banco (Xano/SQLite)
  const stats = await getDbStats(); 
  /* 
    Exemplo do objeto status:
    {
      tempo_medio_espera_minutos: 14,
      volume_por_servico: { "BPC": 42, "Recadastro do BF": 120, "Cadastro": 55 },
      taxa_conclusao: "87%"
    }
  */

  // 2. Construção do Prompt Inteligente
  const promptEstatistico = `
    Você é um Arquiteto de Processos e Gestor Público Especialista em Triagem.
    Analise os seguintes dados operacionais de hoje da nossa unidade de atendimento social:
    
    Tempo Médio de Espera (Aguardando -> Em Atendimento): ${stats.tempo_medio_espera_minutos} minutos
    Volume por Serviço Solicitado: ${JSON.stringify(stats.volume_por_servico)}
    Taxa de Atendimentos Concluídos: ${stats.taxa_conclusao}

    A partir destes dados numéricos cruzados, gere estritamente:
    1. PROJEÇÃO DE DEMANDA (Um parágrafo de 3 a 4 linhas focando em quais serviços vão demandar mais recursos nos próximos 3 dias).
    2. SUGESTÕES DE MELHORIA (Três bullet points diretos e práticos sobre alocação de equipe/salas, dado os gargalos notados - ex: muito tempo de recadastro).

    Não inclua saudações, gere as respostas formalmente para um relatório de diretoria.
  `;

  // 3. Chamada de IA (Gemini Model)
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: promptEstatistico,
  });
  const relatorioIA = response.text;

  // 4. Geração Dinâmica do PDF (PDFKit)
  const doc = new PDFDocument({ margin: 50 });
  
  // Resposta via HTTP (Streaming direto via Response)
  res.setHeader('Content-disposition', 'attachment; filename="Relatorio_Inteligente_Triagem.pdf"');
  res.setHeader('Content-type', 'application/pdf');
  doc.pipe(res);

  // Layout do Documento
  doc.fontSize(22).text('Relatório Analítico de Operação e Triagem', { align: 'center' });
  doc.moveDown();
  
  doc.fontSize(14).text('Estatísticas Atuais do Sistema:', { underline: true });
  doc.fontSize(12).text(`- Tempo Médio de Espera: ${stats.tempo_medio_espera_minutos} mins`);
  doc.text(`- Conformidade / Taxa de Conclusão: ${stats.taxa_conclusao}`);
  doc.moveDown();

  doc.fontSize(14).text('Previsão e Recomendações da I.A.', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12).text(relatorioIA, { align: 'justify' });

  doc.end();
}
```

> **Implementação no Aplicativo:** Neste mesmo ambiente da AI Studio, desenvolvi uma aplicação Full-Stack React + Express com os endpoints já integrados funcionando num simulador de tempo-real que espelha exatamente as regras descritas acima, que você pode validar via live preview (Dashboard, Fila de Triagem, Painel em Tela Cheia e Geração do PDF).
