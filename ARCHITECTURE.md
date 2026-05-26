# OncoGuia — Arquitetura v1.4.0

**Marco estável:** 26/05/2026
**Backend tag:** `v1.4.0` — `oncoguia-api` — commit `cf88195` (Railway)
**Frontend tag:** `v1.4.0` — `oncoguia-pwa` — commit `1222640` (GitHub Pages)

| Versão | Backend | Frontend | Data |
|---|---|---|---|
| v1.0.0 | `1d62a0b` | `878e27b` | 17/05/2026 |
| v1.1.0 | `1ea01de` | `cf021e8` | 17/05/2026 |
| v1.2.0 | `74cb8ea` | `cde9b41` | 17/05/2026 |
| v1.3.0 | `c05d2d9` | `7e2084a` | 17/05/2026 |
| v1.4.0 | `cf88195` | `1222640` | 26/05/2026 |

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
| GET | `/busca?q=` | Busca por registro ou iniciais. `q` vazio retorna apenas pacientes **ativos**, ordenados por `iniciais_nome ASC`. `q` preenchido inclui inativos no resultado. |
| GET | `/:id` | Visão longitudinal completa do paciente (inclui `status_paciente`, `motivo_inativacao`, `data_inativacao`, `inativado_by_user_name`) |
| POST | `/` | Cadastra novo paciente (upsert por `registro_instituicao`) |
| PATCH | `/:id/inativar` | Inativa o paciente. Payload: `{ motivo_inativacao, inativado_by_user_name }`. Valores válidos: `teste` \| `obito`. Salva `data_inativacao = NOW()`. |

### `/api/consultas`
| Método | Rota | Descrição |
|---|---|---|
| POST | `/` | Abre nova consulta (status `rascunho`) |
| PUT | `/:id/sintomas` | Salva triagem CTCAE — requer `updated_by_user_name` |
| PUT | `/:id/plano` | Salva diagnósticos NANDA + intervenções NIC + resultados NOC — requer `updated_by_user_name` |
| POST | `/:id/concluir` | Conclui consulta, gera tarefa opcional, salva anamnese se presente |
| POST | `/:id/orientacoes` | Salva orientações ao paciente e cuidador — requer `updated_by_user_name` |
| GET | `/paciente/:id_paciente` | Histórico de consultas do paciente (array, pode ser vazio) |
| GET | `/paciente/:id_paciente/ultima-concluida` | Última consulta concluída com plano resumido (usada no seguimento atrelado) |
| GET | `/:id/plano` | Plano SAE completo (NANDA + NIC + NOC) |
| GET | `/:id` | Consulta completa com todos os subtables, incluindo campo `anamnese` (dados JSONB de `consulta_anamnese` ou `null`) |

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
| `pacientes` | `id_paciente` | Cadastro de pacientes oncológicos (inclui status ativo/inativo) |
| `consultas_enfermagem` | `id_consulta` | Consulta principal com dados clínicos e status |
| `consulta_sintomas_ctcae` | `id_consulta` | Sintomas CTCAE da triagem |
| `consulta_diagnosticos` | `id_consulta` | Diagnósticos NANDA selecionados no plano SAE |
| `consulta_intervencoes` | `id_consulta` | Intervenções NIC selecionadas no plano SAE |
| `consulta_resultados_esperados` | `id_consulta` | Resultados NOC do plano SAE |
| `consulta_orientacoes` | `id_consulta` | Orientações ao paciente e cuidador por NIC |
| `consulta_anamnese` | `id_consulta` | Anamnese estendida em JSONB (Fase 10) — apenas para consultas de abertura |
| `consulta_exame_fisico` | `id_consulta` | Dados do exame físico (vitais mapeados da anamnese de abertura) |
| `seguimentos_enfermagem` | `id_seguimento` | Seguimentos registrados |
| `tarefas_assistenciais` | `id_tarefa` | Tarefas geradas por consultas ou manualmente |
| `pendencias_paciente` | `id_pendencia` | Pendências clínicas e administrativas do paciente |

### Tabelas de apoio (criadas na Fase 1)
| Tabela | Descrição |
|---|---|
| `consulta_comorbidades` | Comorbidades da consulta (sem uso ativo na UI) |
| `consulta_exames_laboratoriais` | Resultados laboratoriais |
| `planos_seguimento` | Planejamento de seguimento |

### Colunas de auditoria adicionadas na Fase 1
| Tabela | Colunas adicionadas |
|---|---|
| `consultas_enfermagem` | `completed_by_user_name`, `completed_at`, `updated_by_user_name` |
| `tarefas_assistenciais` | `created_by_user_name`, `completed_by_user_name`, `updated_by_user_name` |
| `seguimentos_enfermagem` | `created_by_user_name`, `updated_by_user_name` |
| `pacientes` | `created_by_user_name`, `updated_by_user_name` |

### Colunas adicionadas na Fase 6
| Tabela | Coluna | Tipo | Descrição |
|---|---|---|---|
| `tarefas_assistenciais` | `descricao` | `TEXT` | Descrição livre da tarefa (opcional) |

### Colunas adicionadas na Fase 7 em `pendencias_paciente`
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

### Colunas adicionadas na Fase 10 em `pacientes`
| Coluna | Tipo | Descrição |
|---|---|---|
| `data_diagnostico` | DATE | Data do diagnóstico oncológico |
| `tipo_tratamento` | VARCHAR(30) | Modalidade de tratamento (quimioterapia, etc.) |
| `faz_radioterapia` | VARCHAR(5) | `'sim'` \| `'nao'` |
| `local_radioterapia` | TEXT | Localização da radioterapia (quando aplicável) |
| `alergia` | VARCHAR(5) | `'sim'` \| `'nao'` |
| `alergia_descricao` | TEXT | Descrição da alergia (quando aplicável) |

### Colunas adicionadas na Fase 10 em `seguimentos_enfermagem`
| Coluna | Tipo | Descrição |
|---|---|---|
| `atrelado_consulta` | VARCHAR(5) | `'sim'` \| `'nao'` |
| `data_consulta_referencia` | DATE | Data da consulta de referência para seguimento atrelado |
| `motivo_seguimento` | TEXT | Motivo/observação do seguimento |

### Colunas adicionadas na Fase 11 / v1.4.0 em `pacientes`
| Coluna | Tipo | Descrição |
|---|---|---|
| `status_paciente` | TEXT DEFAULT `'ativo'` | Status do paciente: `'ativo'` \| `'inativo'` |
| `motivo_inativacao` | VARCHAR(20) | Motivo da inativação: `'teste'` \| `'obito'` |
| `data_inativacao` | TIMESTAMPTZ | Momento em que o paciente foi inativado |
| `inativado_by_user_name` | TEXT | Nome do usuário que realizou a inativação |

### Estrutura de `consulta_anamnese` (Fase 10)
```sql
CREATE TABLE consulta_anamnese (
    id_consulta INTEGER PRIMARY KEY
                REFERENCES consultas_enfermagem(id_consulta) ON DELETE CASCADE,
    dados       JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

> O campo `dados` armazena todo o formulário de anamnese estendida como JSONB. Chaves principais: `escolaridade`, `profissao`, `comorbidades` (array), `cirurgia_prev`, `hist_familiar`, `habitos` (array), `dor`, `dx_histologico`, `estadiamento`, `protocolo_proposto`, `cv_pa`, `cv_fc`, `ox_spo2`, `mucosa_oral`, entre outros.

---

## 4. Módulo de Pacientes — Comportamento v1.4.0

### Lista de pacientes
- Ao abrir o módulo **Pacientes**, a lista exibe apenas pacientes com `status_paciente = 'ativo'`.
- Ordenação: `iniciais_nome ASC`.
- A busca por iniciais ou registro (`q` não vazio) retorna **todos** os pacientes — inclusive inativos.
- Paciente inativo na lista exibe badge `inativo` (visível apenas via busca).

### Ações por paciente (modal de escolha)
Ao clicar em "Abrir" em qualquer paciente, o sistema exibe as opções **nesta ordem**:

1. **Ver Identificação** — carrega dados cadastrais na aba Identificação. Se o paciente estiver ativo, mostra o botão "Inativar Paciente". Se inativo, abre diretamente em modo somente leitura (sem exibir o modal).
2. **Dar Seguimento** — abre o módulo de seguimento para o paciente selecionado.
3. **Realizar Nova Consulta** — inicia uma nova consulta vinculada ao paciente.

**Paciente inativo:** o modal não é exibido. O sistema vai diretamente para a aba Identificação em modo somente leitura.

### Inativação de paciente
- Botão **"Inativar Paciente"** visível na aba Identificação apenas quando o paciente é ativo e foi acessado via "Ver Identificação".
- Abre modal com select de motivo (`Registro de teste` / `Óbito`).
- Ao confirmar:
  - Backend: `status_paciente = 'inativo'`, `motivo_inativacao`, `data_inativacao = NOW()`, `inativado_by_user_name` salvos via `PATCH /api/pacientes/:id/inativar`.
  - Frontend: retorna à tela de busca de pacientes.
- Validação backend: motivo obrigatório; aceita apenas `teste` ou `obito`.

### Modo somente leitura (paciente inativo)
- Banner vermelho no topo da aba Identificação: **"Paciente Inativo — visualização somente leitura."**
- Banner exibe detalhe: motivo, data e responsável pela inativação.
- Todos os campos da aba Identificação ficam desabilitados (`disabled`).
- Botões "Salvar Identificação" e "Inativar Paciente" ficam ocultos.
- Botões "Dar Seguimento" e "Realizar Nova Consulta" **não são exibidos** para pacientes inativos.
- Dados históricos (consultas, seguimentos, tarefas, pendências) permanecem acessíveis para consulta.
- **Nenhum dado é excluído.** A inativação é lógica, não física.

---

## 5. Anamnese Estendida (Fase 10 / v1.4.0)

### Quando é exibida
O formulário de anamnese é apresentado **exclusivamente** para os tipos de consulta:
- Consulta de início de tratamento
- Consulta de troca de protocolo

Para todos os outros tipos, o formulário permanece oculto e o card de Exame Físico padrão é exibido normalmente.

### Estrutura do formulário (7 seções)
1. Dados Pessoais e Socioeconômicos
2. Saúde Pregressa (comorbidades, cirurgia prévia no módulo Condição de Saúde)
3. História Familiar
4. Hábitos de Vida
5. Condição de Saúde (inclui Cirurgia Prévia, Dor, Esvaziamento Axilar)
6. Doença Atual (diagnóstico histológico, estadiamento, protocolo proposto)
7. Exame Físico Completo (substitui o card padrão de Exame Físico nestas consultas)

### Persistência
- Ao concluir a consulta, o campo `anamnese` é enviado no payload de `POST /api/consultas/:id/concluir`.
- Backend persiste em `consulta_anamnese.dados` (JSONB upsert).
- Vitais da anamnese (cv_pa, cv_fc, ox_fr, ox_spo2, mucosa_oral) são mapeados para `consulta_exame_fisico` para rastreamento longitudinal.
- `GET /api/consultas/:id` retorna o campo `anamnese` com os dados salvos.

### Limitação atual (melhoria futura)
O preenchimento automático dos campos do formulário ao reabrir uma consulta existente **não está implementado no frontend**. O dado está disponível via API (`GET /api/consultas/:id → anamnese`), porém não há fluxo de "edição de consulta existente" na UI. Cada atendimento inicia uma nova consulta. Esta funcionalidade está registrada como melhoria futura.

---

## 6. Seguimento Atrelado à Última Consulta

### Comportamento
Ao clicar em "Dar Seguimento" e selecionar "Este seguimento está atrelado a uma consulta de Enfermagem? → Sim":

1. O sistema busca automaticamente a última consulta concluída via `GET /api/consultas/paciente/:id/ultima-concluida`.
2. Se existir consulta concluída:
   - Exibe: `Última consulta de enfermagem: DD/MM/AAAA HH:mm — Tipo: [tipo_consulta]`
   - Vincula automaticamente `id_consulta_origem` ao seguimento.
3. Se não existir consulta concluída:
   - Exibe: **"Não existe Consulta de Enfermagem para esse paciente."**
   - O seguimento atrelado não pode ser salvo sem consulta de referência.
4. **Não é possível escolher data manualmente** neste fluxo. A data é sempre derivada da última consulta real.

---

## 7. Fluxo Completo do Autosave SAE

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

## 8. Estrutura de `state.plano`

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
            }
        ],
        nocs: [
            {
                id:    "noc_1211",
                codigo: 1211,
                nome:  "Nível de Ansiedade"
            }
        ]
    }
]
```

**Fonte das orientações:**
- `orientacao_paciente` → campo `orientacao_paciente` da tabela `intervencoes_nic` (via API `/referencia/nanda`)
- `orientacao_cuidador` → `ORIENT_CUIDADOR_MAP[codigo_nic]` (hardcoded em `app.js`) com fallback para `i.contexto_uso`

---

## 9. Payload de Orientações

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
- Apaga e reinsere todas as orientações da consulta (DELETE + INSERT em transação)
- Registros com `texto` vazio ou apenas espaços **não são enviados** (filtrado no frontend)
- Se `updated_by_user_name` ausente → `401`
- Se `id_consulta` inexistente → `404`
- Payload vazio (`orientacoes: []`) limpa todas as orientações da consulta

### Response — sucesso
```json
{ "ok": true, "registros": 4 }
```

---

## 10. Dependências Críticas Frontend ↔ Backend

| Dependência | Frontend | Backend | Risco se quebrar |
|---|---|---|---|
| `state.currentUser.name` em todos os requests | `app.js` → todos os `api()` calls | Validação `updated_by_user_name` em PUT/POST/PATCH | Retorna 401, bloqueia salvamento |
| Ordem das rotas no Express | — | `GET /paciente/:id` antes de `GET /:id` em `consultas.js` | "paciente" seria tratado como ID numérico |
| `nicDataCache[codigo_nic]` populado antes de montar o plano | `app.js` → `buildDxPanel()` | — | Orientações ficam em branco no plano |
| `state.consultaId` definido antes do autosave | `app.js` → `autoSavePlano()` | `PUT /:id/plano`, `POST /:id/orientacoes` | Requests para `/undefined/plano` |
| `ORIENT_CUIDADOR_MAP` como fallback | `app.js` → `nicDataCache` | `intervencoes_nic.contexto_uso` (parcialmente populado) | Orientação ao cuidador em branco |
| Transação DELETE + INSERT em orientações | — | `POST /:id/orientacoes` | Orientações duplicadas se chamado duas vezes |
| `ON DELETE CASCADE` em `consulta_orientacoes` | — | FK para `consultas_enfermagem` | Limpeza automática ao excluir consulta |
| `state.patient.inativo` verificado antes de Dar Seguimento / Nova Consulta | `app.js` → `openPatient()` | — | Paciente inativo poderia receber novo registro |
| `GET /consultas/paciente/:id/ultima-concluida` antes de exibir seguimento atrelado | `app.js` → `aplicarVinculoSeguimento()` | — | Seguimento sem consulta real de referência |

---

## 11. Painel Agenda do Enfermeiro (Fase 6)

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

---

## 12. Painel Pendências do Paciente (Fase 7)

### Conceito clínico

**Pendência ≠ Tarefa.**
- **Tarefa:** ação operacional do enfermeiro (ligar, encaminhar, reavaliar).
- **Pendência:** problema ou situação clínica/administrativa ainda não resolvida do paciente.

### Chips de filtro

| Chip | URL chamada |
|---|---|
| Todas | `GET /api/pendencias` |
| Abertas | `GET /api/pendencias?status=aberta` |
| Acompanhamento | `GET /api/pendencias?status=em_acompanhamento` |
| Resolvidas | `GET /api/pendencias?status=resolvida` |
| Críticas | `GET /api/pendencias?prioridade=critica` |
| Select categoria | `GET /api/pendencias?categoria={valor}` |

### Regras de negócio

- Pendências **nunca** são excluídas fisicamente.
- Críticas sempre aparecem no topo (ordenação por prioridade).
- `created_by_user_name` ausente no POST → retorno `401`.
- `resolved_by_user_name` ausente no PUT → retorno `401`.

---

## 13. Painel do Enfermeiro (Fase 8)

### Propósito

Visão operacional diária unificada. Não substitui os módulos Agenda, Pendências ou Consultas — resume e direciona.

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
  "tarefas_do_dia": [...],
  "pendencias_criticas": [...],
  "pendencias_abertas": [...],
  "consultas_do_dia": [...],
  "alertas": [
    { "nivel": "critico", "mensagem": "1 pendência(s) crítica(s) em aberto." },
    { "nivel": "alto",    "mensagem": "1 tarefa(s) com prazo vencido." }
  ]
}
```

### Regras de alertas automáticos

| Condição | Nível | Mensagem |
|---|---|---|
| `pendencias_criticas.length > 0` | `critico` | `N pendência(s) crítica(s) em aberto.` |
| Tarefas do dia com `status pendente/em_andamento` e `data_prevista < agora` | `alto` | `N tarefa(s) com prazo vencido.` |

---

## 14. Referência de Payloads dos Endpoints

> **Atenção:** todos os writes exigem o campo de auditoria correspondente (`created_by_user_name`, `updated_by_user_name` ou `completed_by_user_name`). Ausência retorna `401`.

### `PUT /api/consultas/:id/sintomas`
```json
{
  "sintomas": [
    {
      "tipo_sintoma": "nausea",
      "grau_ctcae": 2,
      "alerta_risco": false,
      "observacao": "náusea pós quimioterapia"
    }
  ],
  "classificacao_risco_automatica": "moderado",
  "updated_by_user_name": "Carla Alves"
}
```

### `POST /api/consultas/:id/concluir`
```json
{
  "classificacao_risco_validada": "moderado",
  "texto_copiavel_prontuario": "CONSULTA DE ENFERMAGEM...",
  "plano_cuidado_resumido": "Náusea",
  "conduta_seguimento_definida": "Retorno em 7 dias",
  "tipo_tarefa": "contato_telefonico",
  "data_prevista_tarefa": "2026-05-24",
  "prioridade_tarefa": "alta",
  "responsavel": "Carla Alves",
  "completed_by_user_name": "Carla Alves",
  "anamnese": { "cv_pa": "120/80", "cv_fc": "78", "comorbidades": ["HAS", "DM"] }
}
```
> `anamnese` é opcional — enviado apenas em consultas de início/troca de protocolo.

### `PATCH /api/pacientes/:id/inativar`
```json
{
  "motivo_inativacao": "obito",
  "inativado_by_user_name": "Carla Alves"
}
```
> `motivo_inativacao` obrigatório. Aceita apenas: `teste` | `obito`.
> Salva automaticamente: `status_paciente = 'inativo'`, `data_inativacao = NOW()`.

### `POST /api/tarefas`
```json
{
  "id_paciente": 16,
  "tipo_tarefa": "reavaliacao_toxicidade",
  "descricao": "Reavaliar toxicidade hematológica após próximo ciclo",
  "prioridade": "alta",
  "responsavel": "Carla Alves",
  "data_prevista": "2026-05-24",
  "created_by_user_name": "Carla Alves"
}
```

### `PUT /api/tarefas/:id/concluir`
```json
{
  "resultado": "Paciente sem novas queixas",
  "efetividade": "resolvido",
  "completed_by_user_name": "Carla Alves"
}
```

### `POST /api/pendencias`
```json
{
  "id_paciente": 16,
  "categoria": "clinica",
  "descricao": "Fadiga grau 3 limitando atividades de vida diária",
  "prioridade": "alta",
  "id_consulta_origem": 23,
  "created_by_user_name": "Carla Alves"
}
```

### `PUT /api/pendencias/:id/resolver`
```json
{
  "conduta": "Paciente encaminhada ao serviço de fadiga — hemograma solicitado",
  "resolved_by_user_name": "Carla Alves"
}
```

---

## 15. Deploy

| Componente | Trigger | Destino |
|---|---|---|
| Backend | Push para `main` em `oncoguia-api` | Railway (auto-deploy via webhook GitHub) |
| Frontend | Push para `gh-pages` em `oncoguia-pwa` | GitHub Pages — **Deploy from branch: `gh-pages` / root** |

**Configuração GitHub Pages (v1.4.0):**
- Source: **Deploy from a branch**
- Branch: `gh-pages`, pasta: `/ (root)`
- Arquivos estáticos servidos diretamente do branch, sem build step.
- Workflow `.github/workflows/deploy.yml` mantido como fallback, mas **não é o mecanismo ativo de deploy**.

> **Nota de infraestrutura:** até a v1.3.0, o deploy usava `GitHub Actions → actions/deploy-pages`. Esse mecanismo gerou falhas intermitentes de environment protection. A partir da v1.4.0, o deploy é feito diretamente pelo GitHub Pages via branch, eliminando a dependência do workflow Actions para o frontend.
