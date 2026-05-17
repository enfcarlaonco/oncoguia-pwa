# OncoGuia — Arquitetura v1.0.0

**Marco estável:** 17/05/2026  
**Backend tag:** `v1.0.0` — `oncoguia-api` (Railway)  
**Frontend tag:** `v1.0.0` — `oncoguia-pwa` (GitHub Pages)

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
| GET | `/` | Lista tarefas (filtros por status/paciente) |
| PATCH | `/:id` | Atualiza status da tarefa — requer `completed_by_user_name` |

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

### Tabelas de apoio (criadas na Fase 1, ainda não utilizadas pelo frontend)
| Tabela | Descrição |
|---|---|
| `consulta_comorbidades` | Comorbidades da consulta |
| `consulta_exame_fisico` | Dados do exame físico |
| `consulta_exames_laboratoriais` | Resultados laboratoriais |
| `planos_seguimento` | Planejamento de seguimento |
| `pendencias_paciente` | Pendências clínicas abertas |

### Colunas de auditoria adicionadas na Fase 1
| Tabela | Colunas adicionadas |
|---|---|
| `consultas_enfermagem` | `completed_by_user_name`, `completed_at`, `updated_by_user_name` |
| `tarefas_assistenciais` | `created_by_user_name`, `completed_by_user_name`, `updated_by_user_name` |
| `seguimentos_enfermagem` | `created_by_user_name`, `updated_by_user_name` |
| `pacientes` | `created_by_user_name`, `updated_by_user_name` |

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

## 8. Deploy

| Componente | Trigger | Destino |
|---|---|---|
| Backend | Push para `main` em `oncoguia-api` | Railway (auto-deploy via webhook GitHub) |
| Frontend | Push para `gh-pages` em `oncoguia-pwa` | GitHub Actions → Pages (workflow `deploy.yml`) |

**Configuração obrigatória no GitHub Pages:**  
Environment `github-pages` → Deployment branches → **No restriction** (necessário para deploy do branch `gh-pages`)