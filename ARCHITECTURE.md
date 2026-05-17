# OncoGuia — Arquitetura v1.3.0

**Marco estável:** 17/05/2026  
**Backend tag:** `v1.3.0` — `oncoguia-api` — commit `c05d2d9` (Railway)  
**Frontend tag:** `v1.3.0` — `oncoguia-pwa` — commit `7e2084a` (GitHub Pages)

| Versão | Backend | Frontend | Data |
|---|---|---|---|
| v1.0.0 | `1d62a0b` | `878e27b` | 17/05/2026 |
| v1.1.0 | `1ea01de` | `cf021e8` | 17/05/2026 |
| v1.2.0 | `74cb8ea` | `cde9b41` | 17/05/2026 |
| v1.3.0 | `c05d2d9` | `7e2084a` | 17/05/2026 |

---

## 1. Visão Geral

| Camada | Tecnologia | Hospedagem | URL |
|---|---|---|---|
| Frontend | Vanilla JS / PWA | GitHub Pages (`gh-pages`) | `https://enfcarlaonco.github.io/oncoguia-pwa/` |
| Backend | Node.js / Express | Railway (`main`) | `https://oncoguia-api-production.up.railway.app/api` |
| Banco | PostgreSQL | Railway | projeto `precious-healing`, serviço `oncoguia-api` |

**Autenticação:** seleção de usuário no login local (sem JWT). `state.currentUser = { id, name, email }` propagado em todos os requests como `updated_by_user_name`.

---

## 2. Rotas do Backend

### `/api/pacientes`
| Método | Rota | Descrição |
|---|---|---|
| GET | `/busca?q=` | Busca por registro ou iniciais (q vazio = todos) |
| GET | `/:id` | Visão longitudinal completa do paciente |
| POST | `/` | Cadastra novo paciente |

### `/api/consultas`
| Método | Rota | Descrição |
|---|---|---|
| POST | `/` | Abre nova consulta (status `rascunho`) |
| PUT | `/:id/sintomas` | Salva triagem CTCAE — requer `updated_by_user_name` |
| PUT | `/:id/plano` | Salva diagnósticos NANDA + intervenções NIC + resultados NOC — requer `updated_by_user_name` |
| POST | `/:id/concluir` | Conclui consulta, gera tarefa opcional |
| POST | `/:id/orientacoes` | Salva orientações ao paciente e cuidador — requer `updated_by_user_name` |
| GET | `/paciente/:id_paciente` | Histórico de consultas do paciente (array, pode ser vazio) |
| GET | `/paciente/:id_paciente/ultima-concluida` | Última consulta concluída com plano resumido |
| GET | `/:id/plano` | Plano SAE completo (NANDA + NIC + NOC) |
| GET | `/:id` | Consulta completa com todos os subtables |

> **Ordem crítica no Express:** `GET /paciente/:id` deve preceder `GET /:id` para evitar captura indevida do literal "paciente" como ID.

### `/api/seguimentos`
| Método | Rota | Descrição |
|---|---|---|
| POST | `/` | Registra seguimento de enfermagem |
| GET | `/paciente/:id_paciente` | Lista seguimentos do paciente |

### `/api/tarefas`
| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | Lista tarefas com filtros (status, prioridade, id_paciente, periodo, data) |
| POST | `/` | Cria tarefa manualmente — requer `created_by_user_name` |
| GET | `/:id` | Detalhe de uma tarefa (com join em `pacientes`) |
| PUT | `/:id/concluir` | Conclui tarefa com resultado e efetividade — requer `completed_by_user_name` |
| PATCH | `/:id` | Atualiza campos parciais — requer `completed_by_user_name` |

**Parâmetros de filtro em `GET /api/tarefas`:**
- `status` — valor exato (pendente, em_andamento, concluida, cancelada)
- `prioridade` — valor exato (critica, alta, moderada, baixa, padrao)
- `id_paciente` — filtra por paciente
- `data` — filtra por `data_prevista::date = $data`
- `periodo=hoje` — `data_prevista::date = CURRENT_DATE`
- `periodo=proximas` — `data_prevista` nos próximos 7 dias

**Ordenação padrão:** por prioridade decrescente (crítica→alta→moderada→baixa→padrão), depois `data_prevista ASC NULLS LAST`.

### `/api/pendencias`
| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | Lista pendências com filtros (status, prioridade, categoria, id_paciente) |
| POST | `/` | Cria pendência — requer `created_by_user_name` |
| GET | `/:id` | Detalhe de uma pendência (com join em `pacientes`) |
| PUT | `/:id/resolver` | Resolve pendência com conduta — requer `resolved_by_user_name` |
| PATCH | `/:id` | Atualiza status, categoria, prioridade ou conduta — requer `updated_by_user_name` |

**Parâmetros de filtro em `GET /api/pendencias`:**
- `status` — valor exato (aberta, em_acompanhamento, resolvida, cancelada)
- `prioridade` — valor exato (critica, alta, moderada, baixa)
- `categoria` — valor exato (clinica, medicamentosa, social, administrativa, laboratorial, psicologica, nutricional, adesao, acesso_rede)
- `id_paciente` — filtra por paciente

**Ordenação padrão:** por prioridade decrescente (crítica→alta→moderada→baixa), depois `created_at ASC NULLS LAST`.

### `/api/painel`
| Método | Rota | Descrição |
|---|---|---|
| GET | `/enfermeiro` | Resumo operacional diário — requer `user` como query param |

**Parâmetros de `GET /api/painel/enfermeiro`:**
- `user` — nome do usuário autenticado (obrigatório; ausente → 401)
- `data` — data no formato `YYYY-MM-DD` (opcional; padrão: data atual)
- `responsavel` — filtra `tarefas_do_dia` por responsável (opcional)

### `/api/referencia`
| Método | Rota | Descrição |
|---|---|---|
| GET | `/nanda` | Lista diagnósticos NANDA com NIC e NOC vinculados |
| GET | `/nanda/:codigo/sugestoes` | Sugestões de NIC/NOC para um diagnóstico NANDA |

### `/api/admin`
| Método | Rota | Descrição |
|---|---|---|
| POST | `/migrate-col-f?secret=oncoguia2024` | One-time: popula `contexto_uso` nos NICs |
| GET | `/verificar-fase1?secret=oncoguia2024` | Verifica tabelas e colunas de auditoria |

---

## 3. Tabelas do Banco

### Tabelas de referência (somente leitura pelo app)
| Tabela | Conteúdo |
|---|---|
| `diagnosticos_nanda` | Diagnósticos NANDA com `codigo_nanda`, `titulo_diagnostico` |
| `intervencoes_nic` | Intervenções NIC com `codigo_nic`, `nome_intervencao`, `orientacao_paciente`, `contexto_uso` |
| `resultados_noc` | Resultados NOC com `codigo_noc`, `nome_resultado` |

### Tabelas transacionais
| Tabela | Chave | Descrição |
|---|---|---|
| `pacientes` | `id_paciente` | Cadastro de pacientes oncológicos |
| `consultas_enfermagem` | `id_consulta` | Consulta principal com dados clínicos e status |
| `consulta_sintomas_ctcae` | `id_consulta` | Sintomas CTCAE da triagem |
| `consulta_diagnosticos` | `id_consulta` | Diagnósticos NANDA selecionados no plano SAE |
| `consulta_intervencoes` | `id_consulta` | Intervenções NIC selecionadas no plano SAE |
| `consulta_resultados_esperados` | `id_consulta` | Resultados NOC do plano SAE |
| `consulta_orientacoes` | `id_consulta` | Orientações ao paciente e cuidador por NIC |
| `seguimentos_enfermagem` | `id_seguimento` | Seguimentos registrados |
| `tarefas_assistenciais` | `id_tarefa` | Tarefas geradas por consultas ou manualmente |
| `pendencias_paciente` | `id_pendencia` | Pendências clínicas e administrativas do paciente (Fase 7) |

### Tabelas de apoio (criadas na Fase 1, ainda não utilizadas pelo frontend)
| Tabela | Descrição |
|---|---|
| `consulta_comorbidades` | Comorbidades da consulta |
| `consulta_exame_fisico` | Dados do exame físico |
| `consulta_exames_laboratoriais` | Resultados laboratoriais |
| `planos_seguimento` | Planejamento de seguimento |

### Colunas de auditoria adicionadas na Fase 1
| Tabela | Colunas adicionadas |
|---|---|
| `consultas_enfermagem` | `completed_by_user_name`, `completed_at`, `updated_by_user_name` |
| `tarefas_assistenciais` | `created_by_user_name`, `completed_by_user_name`, `updated_by_user_name` |
| `seguimentos_enfermagem` | `created_by_user_name`, `updated_by_user_name` |
| `pacientes` | `created_by_user_name`, `updated_by_user_name` |

### Colunas adicionadas na Fase 7 em `pendencias_paciente`
A tabela foi criada na Fase 1 com colunas mínimas. As seguintes foram adicionadas via migração segura:

| Coluna | Tipo | Descrição |
|---|---|---|
| `id_consulta_origem` | INTEGER FK | Consulta que originou a pendência (opcional) |
| `categoria` | VARCHAR(40) | Categoria clínica/administrativa da pendência |
| `prioridade` | VARCHAR(20) DEFAULT `'moderada'` | Nível de prioridade |
| `conduta_atual` | TEXT | Conduta registrada ao resolver |
| `created_by_user_name` | TEXT | Quem criou a pendência |
| `resolved_by_user_name` | TEXT | Quem resolveu a pendência |
| `resolved_at` | TIMESTAMPTZ | Momento da resolução |
| `created_at` | TIMESTAMPTZ DEFAULT NOW() | Criação (usado na ordenação) |

### Estrutura completa de `pendencias_paciente`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id_pendencia` | SERIAL PK | Identificador |
| `id_paciente` | INTEGER FK | Referência a `pacientes` |
| `id_consulta_origem` | INTEGER FK | Consulta de origem (opcional) |
| `categoria` | VARCHAR(40) | clinica \| medicamentosa \| social \| administrativa \| laboratorial \| psicologica \| nutricional \| adesao \| acesso_rede |
| `descricao` | TEXT | Descrição do problema ou situação |
| `prioridade` | VARCHAR(20) | critica \| alta \| moderada \| baixa |
| `status` | VARCHAR(20) | aberta \| em_acompanhamento \| resolvida \| cancelada |
| `conduta_atual` | TEXT | O que foi realizado para resolver |
| `data_abertura` | TIMESTAMPTZ | Preenchida automaticamente na criação (legado) |
| `created_at` | TIMESTAMPTZ | Criação — usada na ordenação |
| `data_fechamento` | TIMESTAMPTZ | Preenchida ao resolver (legado, sincronizado com `resolved_at`) |
| `resolved_at` | TIMESTAMPTZ | Momento da resolução |
| `created_by_user_name` | TEXT | Quem registrou a pendência |
| `resolved_by_user_name` | TEXT | Quem resolveu a pendência |

> **Regra fundamental:** pendências **nunca** são excluídas fisicamente. Descarte usa `status = 'cancelada'`. Histórico completo sempre preservado.

### Coluna adicionada na Fase 6
| Tabela | Coluna | Tipo | Descrição |
|---|---|---|---|
| `tarefas_assistenciais` | `descricao` | `TEXT` | Descrição livre da tarefa (opcional) |

### Estrutura de `tarefas_assistenciais` (colunas relevantes)
| Coluna | Tipo | Descrição |
|---|---|---|
| `id_tarefa` | SERIAL PK | Identificador da tarefa |
| `id_paciente` | INTEGER FK | Referência a `pacientes` |
| `origem` | VARCHAR | `'manual'` ou `'consulta'` |
| `origem_clinica_id` | INTEGER | `id_consulta` de origem (opcional) |
| `tipo_tarefa` | VARCHAR | Ex: `retorno`, `avaliacao_urgente`, `ligacao`, `contato_telefonico` |
| `descricao` | TEXT | Descrição livre (Fase 6) |
| `prioridade` | VARCHAR | `critica` \| `alta` \| `moderada` \| `baixa` \| `padrao` |
| `status` | VARCHAR | `pendente` \| `em_andamento` \| `concluida` \| `cancelada` |
| `conduta_realizada` | TEXT | Resultado do atendimento (mapeado de `resultado` no PUT /concluir) |
| `efetividade` | VARCHAR | `resolvido` \| `melhora_parcial` \| `sem_melhora` \| `piora` \| `encaminhado` |
| `responsavel` | TEXT | Nome do responsável |
| `data_prevista` | TIMESTAMPTZ | Data/hora prevista para execução |
| `data_conclusao` | TIMESTAMPTZ | Preenchido automaticamente ao concluir |
| `created_by_user_name` | TEXT | Quem criou |
| `completed_by_user_name` | TEXT | Quem concluiu |
| `updated_by_user_name` | TEXT | Última atualização |

### Estrutura de `consulta_orientacoes`
```sql
CREATE TABLE consulta_orientacoes (
    id_orientacao   SERIAL          PRIMARY KEY,
    id_consulta     INTEGER         NOT NULL
                    REFERENCES consultas_enfermagem(id_consulta) ON DELETE CASCADE,
    codigo_nic      INTEGER         REFERENCES intervencoes_nic(codigo_nic),
    tipo            VARCHAR(20)     NOT NULL,   -- 'paciente' | 'cuidador'
    texto           TEXT            NOT NULL,
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);
```

---

## 4. Fluxo Completo do Autosave SAE

```
Usuário seleciona NANDA → abre painel de NIC/NOC
    ↓
Marca NICs e NOCs → clica "Adicionar ao Plano"
    ↓
state.plano é atualizado com o diagnóstico + nics + nocs
    ↓
renderPlanoMontado() redesenha o painel
    ↓
autoSavePlano() é chamado (debounce 1500 ms)
    ↓
[1] PUT /api/consultas/:id/plano
        body: { diagnosticos, intervencoes, resultados_esperados, updated_by_user_name }
        → salva em: consulta_diagnosticos, consulta_intervencoes, consulta_resultados_esperados
    ↓
[2] POST /api/consultas/:id/orientacoes   ← Fase 4.1
        body: { orientacoes, updated_by_user_name }
        → salva em: consulta_orientacoes
        → falha aqui NÃO cancela o plano (try/catch independente)
```

As chamadas [1] e [2] ocorrem sequencialmente dentro do mesmo `setTimeout`. Falha em [2] gera `console.error` mas não apaga o plano SAE.

---

## 5. Estrutura de `state.plano`

```javascript
state.plano = [
    {
        codigo:   "00146",           // codigo_nanda (string)
        titulo:   "ANSIEDADE",
        enunciado: "...",
        nics: [
            {
                id:   "nic_5820",
                codigo: 5820,        // codigo_nic (integer)
                nome: "Redução da Ansiedade",
                orientacao_paciente: "texto completo da orientação ao paciente",
                orientacao_cuidador: "texto completo da orientação ao cuidador"
            },
            // ... mais NICs
        ],
        nocs: [
            {
                id:    "noc_1211",
                codigo: 1211,
                nome:  "Nível de Ansiedade"
            }
        ]
    },
    // ... mais diagnósticos
]
```

**Fonte das orientações:**
- `orientacao_paciente` → campo `orientacao_paciente` da tabela `intervencoes_nic` (via API `/referencia/nanda`)
- `orientacao_cuidador` → `ORIENT_CUIDADOR_MAP[codigo_nic]` (hardcoded em `app.js`) com fallback para `i.contexto_uso`

---

## 6. Payload de Orientações

### Request — `POST /api/consultas/:id/orientacoes`
```json
{
  "orientacoes": [
    {
      "codigo_nic": 5820,
      "tipo": "paciente",
      "texto": "texto completo da orientação ao paciente"
    },
    {
      "codigo_nic": 5820,
      "tipo": "cuidador",
      "texto": "texto completo da orientação ao cuidador"
    }
  ],
  "updated_by_user_name": "Carla Alves"
}
```

**Regras:**
- Apaga e reinserere todas as orientações da consulta (DELETE + INSERT em transação)
- Registros com `texto` vazio ou apenas espaços **não são enviados** (filtrado no frontend)
- Se `updated_by_user_name` ausente → `401`
- Se `id_consulta` inexistente → `404`
- Payload vazio (`orientacoes: []`) limpa todas as orientações da consulta

### Response — sucesso
```json
{ "ok": true, "registros": 4 }
```

---

## 7. Dependências Críticas Frontend ↔ Backend

| Dependência | Frontend | Backend | Risco se quebrar |
|---|---|---|---|
| `estado.currentUser.name` em todos os requests | `app.js` → todos os `api()` calls | Validação `updated_by_user_name` em PUT/POST/PATCH | Retorna 401, bloqueia salvamento |
| Ordem das rotas no Express | — | `GET /paciente/:id` antes de `GET /:id` em `consultas.js` | "paciente" seria tratado como ID numérico |
| `nicDataCache[codigo_nic]` populado antes de montar o plano | `app.js` → `buildDxPanel()` | — | Orientações ficam em branco no plano |
| `state.consultaId` definido antes do autosave | `app.js` → `autoSavePlano()` | `PUT /:id/plano`, `POST /:id/orientacoes` | Requests para `/undefined/plano` |
| `ORIENT_CUIDADOR_MAP` como fallback | `app.js` → `nicDataCache` | `intervencoes_nic.contexto_uso` (parcialmente populado) | Orientação ao cuidador em branco |
| Transação DELETE + INSERT em orientações | — | `POST /:id/orientacoes` | Orientações duplicadas se chamado duas vezes |
| `ON DELETE CASCADE` em `consulta_orientacoes` | — | FK para `consultas_enfermagem` | Limpeza automática ao excluir consulta |

---

## 8. Painel Agenda do Enfermeiro (Fase 6)

### Fluxo de carregamento

```
Usuário clica em "Agenda" no menu lateral
    ↓
showModule('module-tasks') → loadTarefas()
    ↓
GET /api/tarefas  (sem filtros — lista todas)
    ↓
renderTarefas(tarefas) — tabela com cores por prioridade
```

### Chips de filtro

| Chip | URL chamada |
|---|---|
| Todas | `GET /api/tarefas` |
| Hoje | `GET /api/tarefas?periodo=hoje` |
| Próximas | `GET /api/tarefas?periodo=proximas` |
| Pendentes | `GET /api/tarefas?status=pendente` |
| Concluídas | `GET /api/tarefas?status=concluida` |

### Cores por prioridade (frontend)

| Prioridade | Cor do texto | Fundo |
|---|---|---|
| `critica` | `#7c1d1d` | `#fee2e2` |
| `alta` | `#DC2626` | `#fee2e2` |
| `moderada` | `#D97706` | `#fef3c7` |
| `baixa` | `#2563EB` | `#dbeafe` |
| `padrao` | `#6B7280` | `#f1f5f9` |

### Modal "Nova Tarefa"

**Campos:** tipo_tarefa (select), descrição (textarea), prioridade (select), data prevista (datetime-local).  
**Submit:** `POST /api/tarefas` com `id_paciente = state.patient.id` e `created_by_user_name = state.currentUser.name`.  
**Pós-criação:** fecha modal + `loadTarefas()`.

### Modal "Concluir Tarefa"

**Campos:** resultado (textarea), efetividade (select).  
**Submit:** `PUT /api/tarefas/:id/concluir` com `completed_by_user_name = state.currentUser.name`.  
**Mapeamento:** campo `resultado` do formulário → coluna `conduta_realizada` no banco.  
**Pós-conclusão:** fecha modal + `loadTarefas()`.

### Regras de negócio

- Tarefas **nunca** são excluídas fisicamente do banco; usam `status = 'cancelada'` quando descartadas.
- `updated_by_user_name` ausente em qualquer write → retorno `401`.
- A ordenação é sempre por prioridade (crítica primeiro) e depois por `data_prevista ASC`.
- O chip ativo destaca visualmente a seleção; os demais são estilo secundário.

---

## 9. Painel Pendências do Paciente (Fase 7)

### Conceito clínico

**Pendência ≠ Tarefa.**  
- **Tarefa:** ação operacional do enfermeiro (ligar, encaminhar, reavaliar).  
- **Pendência:** problema ou situação clínica/administrativa ainda não resolvida do paciente (dor sem controle, perda ponderal, dificuldade de acesso à medicação, etc.).

### Fluxo de carregamento

```
Usuário clica em "Pendências" no menu lateral
    ↓
activateModule('module-pendencias') → loadPendencias()
    ↓
GET /api/pendencias  (sem filtros — lista todas)
    ↓
renderPendencias(lista) — tabela com cores por prioridade e badges de status
```

### Chips de filtro

| Chip | URL chamada |
|---|---|
| Todas | `GET /api/pendencias` |
| Abertas | `GET /api/pendencias?status=aberta` |
| Acompanhamento | `GET /api/pendencias?status=em_acompanhamento` |
| Resolvidas | `GET /api/pendencias?status=resolvida` |
| Críticas | `GET /api/pendencias?prioridade=critica` |
| Select categoria | `GET /api/pendencias?categoria={valor}` |

### Cores de status (frontend)

| Status | Cor do texto | Fundo |
|---|---|---|
| `aberta` | `#92400e` | `#fef3c7` |
| `em_acompanhamento` | `#1e40af` | `#dbeafe` |
| `resolvida` | `#14532d` | `#dcfce7` |
| `cancelada` | `#374151` | `#f1f5f9` |

### Cores de prioridade

Reutiliza as mesmas constantes de `PRIOR_COLOR` / `PRIOR_BG` das tarefas.

### Modal "Nova Pendência"

**Campos:** paciente (read-only), categoria (select obrigatório), descrição (textarea obrigatório), prioridade (select).  
**Integração com consulta:** se `state.consultaId` estiver definido, o campo `id_consulta_origem` é preenchido automaticamente e exibido como info. Isso satisfaz a **Fase 7.3** — vínculo com a consulta atual sem alterar a tela SAE.  
**Submit:** `POST /api/pendencias` com `id_paciente = state.patient.id` e `created_by_user_name = state.currentUser.name`.

### Modal "Resolver Pendência"

**Campos:** conduta realizada (textarea obrigatório).  
**Submit:** `PUT /api/pendencias/:id/resolver` com `resolved_by_user_name = state.currentUser.name`.  
**Efeitos no banco:** `status → 'resolvida'`, `resolved_at = NOW()`, `data_fechamento = NOW()` (legado), `conduta_atual` preenchida.  
**Pós-resolução:** fecha modal + `loadPendencias()` — registro permanece visível na lista.

### Integração com Indicadores

`loadIndicators()` chama `GET /api/pendencias?status=aberta` e exibe a contagem no card "Pendências Abertas".

### Regras de negócio

- Pendências **nunca** são excluídas fisicamente.
- Pendências resolvidas continuam visíveis — filtro "Resolvidas" exibe o histórico completo.
- Críticas sempre aparecem no topo (ordenação por prioridade).
- `created_by_user_name` ausente no POST → retorno `401`.
- `resolved_by_user_name` ausente no PUT → retorno `401`.
- `updated_by_user_name` ausente no PATCH → retorno `401`.

---

## 10. Painel do Enfermeiro (Fase 8)

### Propósito

Visão operacional diária unificada. O enfermeiro abre o painel e vê, em uma única tela, todas as demandas do dia: tarefas planejadas, pendências críticas sem resolução e consultas registradas. Não substitui os módulos Agenda, Pendências ou Consultas — resume e direciona.

### Modelo operacional

O sistema opera com múltiplos enfermeiros (atualmente: Carla Alves e Danielle Cabral). O painel **não filtra por responsável por padrão** — exibe todos os dados da data selecionada. O filtro `responsavel` é opcional e, quando informado, restringe `tarefas_do_dia` à pessoa especificada. Pendências e consultas sempre aparecem independentemente do responsável.

> **Decisão de design:** sem bloqueio por responsável nesta fase. O painel é compartilhado — qualquer enfermeira logada vê a operação completa do dia.

### Fluxo de carregamento

```
Usuário clica em "Painel" no menu lateral
    ↓
activateModule('module-painel') → loadPainel()
    ↓
GET /api/painel/enfermeiro?user={currentUser.name}&data={painel-data}
    ↓
renderPainel(d) — atualiza cards, tabelas e alertas
```

### Estrutura do JSON de resposta

```json
{
  "data": "2026-05-17",
  "resumo": {
    "tarefas_pendentes": 1,
    "tarefas_concluidas": 1,
    "pendencias_abertas": 3,
    "pendencias_criticas": 1,
    "pacientes_alto_risco": 1
  },
  "tarefas_do_dia": [
    {
      "id_tarefa": 23,
      "tipo_tarefa": "reavaliacao_toxicidade",
      "descricao": "Reavaliar toxicidade hematologica",
      "prioridade": "alta",
      "status": "pendente",
      "data_prevista": "2026-05-17T10:00:00Z",
      "responsavel": null,
      "created_by_user_name": "Enf. Carla",
      "iniciais_nome": "A.C.P",
      "registro_instituicao": "7654321"
    }
  ],
  "pendencias_criticas": [
    {
      "id_pendencia": 4,
      "categoria": "clinica",
      "descricao": "Toxicidade grau 3 persistente — vomitos incoerciveis",
      "prioridade": "critica",
      "status": "aberta",
      "created_by_user_name": "Enf. Carla",
      "iniciais_nome": "A.C.P"
    }
  ],
  "pendencias_abertas": [ "... todas com status aberta ou em_acompanhamento ..." ],
  "consultas_do_dia": [
    {
      "id_consulta": 22,
      "tipo_consulta": "retorno",
      "status_consulta": "concluida",
      "data_hora": "2026-05-17T09:00:00Z",
      "classificacao_risco_validada": "moderado",
      "iniciais_nome": "A.C.P"
    }
  ],
  "alertas": [
    { "nivel": "critico", "mensagem": "1 pendência(s) crítica(s) em aberto." },
    { "nivel": "alto",    "mensagem": "1 tarefa(s) com prazo vencido." }
  ]
}
```

### Cálculo dos cards de resumo

| Card | Campo | Cálculo |
|---|---|---|
| Tarefas Pendentes | `tarefas_pendentes` | `tarefas_do_dia` com `status IN ('pendente', 'em_andamento')` |
| Concluídas Hoje | `tarefas_concluidas` | `tarefas_do_dia` com `status = 'concluida'` |
| Pendências Abertas | `pendencias_abertas` | Contagem de `pendencias_abertas` (todos com status aberta/em_acompanhamento) |
| Pendências Críticas | `pendencias_criticas` | Contagem de `pendencias_criticas` (prioridade=crítica, não resolvidas) |
| Pacientes Alto Risco | `pacientes_alto_risco` | `COUNT(DISTINCT id_paciente)` com risco alto/crítico nos últimos 30 dias |

> **Observação:** `tarefas_do_dia` e `consultas_do_dia` são filtradas pela data selecionada (`data_prevista::date` e `data_hora::date`). `pendencias_abertas` e `pendencias_criticas` são **sempre globais** — não filtradas por data, pois representam situações em curso independentemente do dia.

### Regras de alertas automáticos

Alertas são gerados dinamicamente no backend a partir dos dados retornados:

| Condição | Nível | Mensagem |
|---|---|---|
| `pendencias_criticas.length > 0` | `critico` | `N pendência(s) crítica(s) em aberto.` |
| Tarefas do dia com `status pendente/em_andamento` e `data_prevista < agora` | `alto` | `N tarefa(s) com prazo vencido.` |

Alertas são exibidos em banda colorida no topo do painel (vermelho escuro = crítico, âmbar = alto). Desaparecem quando não há condição ativa.

### Autenticação

- `user` ausente no query param → `401 Usuário não autenticado.`
- Não há JWT; o `user` é o `state.currentUser.name` propagado pelo frontend.
- Nenhum dado é filtrado por `user` exceto quando `responsavel` é explicitamente passado.

### Botões de navegação

| Botão | Ação |
|---|---|
| "Ver Agenda" | `activateModule('module-tasks')` |
| "Ver Pendências" | `activateModule('module-pendencias')` |

### Filtro de data (frontend)

Input `type="date"` com valor padrão = data atual (ISO). Ao clicar "Atualizar", chama `loadPainel(data)` com a nova data. Arrays vazios retornam mensagem amigável sem quebrar a tela.

---

## 11. Deploy

| Componente | Trigger | Destino |
|---|---|---|
| Backend | Push para `main` em `oncoguia-api` | Railway (auto-deploy via webhook GitHub) |
| Frontend | Push para `gh-pages` em `oncoguia-pwa` | GitHub Actions → Pages (workflow `deploy.yml`) |

**Configuração obrigatória no GitHub Pages:**  
Environment `github-pages` → Deployment branches → **No restriction** (necessário para deploy do branch `gh-pages`)