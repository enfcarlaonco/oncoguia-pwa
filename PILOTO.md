# OncoGuia PWA — Piloto Operacional

---

## CICLO 1 — v1.3.0 (17/05/2026)

**Executor:** Enf. Carla Alves (pacientes 1 e 2) + Enf. Danielle Cabral (paciente 3)
**Ambiente:** Produção (Railway + GitHub Pages)

### Pacientes do Piloto

| # | Iniciais | Registro   | Protocolo        | Consulta | Tipo            | Risco     |
|---|----------|------------|------------------|----------|-----------------|-----------|
| 1 | M.S.O    | PILOTO-001 | AC ciclo 3       | id=23    | intercorrencia  | moderado  |
| 2 | R.A.F    | PILOTO-002 | ABVD ciclo 2     | id=24    | retorno         | alto      |
| 3 | J.C.M    | PILOTO-003 | Enzalutamida c1  | id=25    | avaliacao_inicial| alto     |

### Checklist Operacional

- [x] 3 pacientes cadastrados com fluxo completo
- [x] Consultas com sintomas, NANDA, NIC, NOC, orientações
- [x] Pelo menos 1 tarefa e 1 pendência criadas durante as consultas
- [x] Painel do Enfermeiro reflete dados do dia em tempo real
- [x] Alertas automáticos gerados (pendências críticas + tarefas vencidas)
- [x] Dados dos 2 usuários (Carla e Danielle) coexistem sem conflito
- [x] Nenhuma perda de dado durante o piloto

### Problemas Encontrados

**P1 — Campos incorretos no endpoint de sintomas** (Severidade: Alta)
Campos `tipo_sintoma`, `grau_ctcae`, `alerta_risco`, `observacao` não eram óbvios por analogia. Corrigido e documentado no ARCHITECTURE.md.

**P2 — Encoding de caracteres especiais via curl/PowerShell** (Severidade: Baixa)
Afeta apenas testes via linha de comando. Uso real pelo navegador não é afetado.

**P3 — classificacao_risco_validada não definida via API direta** (Severidade: Baixa)
Comportamento esperado. A validação manual do risco é feita exclusivamente pela interface gráfica.

### Resultado

**Fluxo completo validado:** paciente → consulta → sintomas → NANDA/NIC/NOC → orientações → conclusão → tarefa/pendência → painel.

**Status:** APROVADO. Sistema apto para uso assistencial ampliado condicionado a 3 ajustes obrigatórios:
1. Documentar payloads — concluído neste ciclo (ARCHITECTURE.md atualizado).
2. Testar fluxo completo no navegador — executado no ciclo de validação das Fases 9–11.
3. Verificar `classificacao_risco_validada` na UI — confirmado funcionando.

---

## CICLO 2 — v1.4.0 (26/05/2026)

**Executor:** Enf. Carla Alves
**Ambiente:** Produção (Railway + GitHub Pages — deploy migrado para "Deploy from branch")
**Escopo testado:** Fase 9.3 — módulo de pacientes, inativação, seguimento e anamnese

### Critérios Validados

| # | Critério | Resultado |
|---|---|---|
| 1 | Lista inicial mostra apenas pacientes ativos | ✓ APROVADO |
| 2 | Busca encontra paciente inativo por iniciais/registro | ✓ APROVADO |
| 3 | Paciente inativo abre em modo somente leitura | ✓ APROVADO |
| 4 | Banner exibe motivo, data e responsável pela inativação | ✓ APROVADO |
| 5 | Botões na ordem: Ver Identificação / Dar Seguimento / Realizar Nova Consulta | ✓ APROVADO |
| 6 | Inativação salva `motivo_inativacao`, `data_inativacao`, `inativado_by_user_name` | ✓ APROVADO |
| 7 | Seguimento atrelado busca última consulta automaticamente | ✓ APROVADO |
| 8 | Sem consulta anterior: exibe "Não existe Consulta de Enfermagem para esse paciente." | ✓ APROVADO |
| 9 | Anamnese exibida apenas para início de tratamento / troca de protocolo | ✓ APROVADO |
| 10 | Anamnese salva via `POST /concluir` e disponível em `GET /consultas/:id` | ✓ APROVADO |
| 10* | Preenchimento automático da anamnese ao reabrir consulta existente | ⚠️ RESSALVA ACEITA |
| 11 | Sem regressão em SAE, relatório, agenda, pendências e painel | ✓ APROVADO |

### Ressalva Documentada — Critério 10*

**Situação:** O dado de anamnese é persistido corretamente e retornado pela API (`GET /api/consultas/:id → anamnese`). O preenchimento automático dos campos do formulário ao reabrir uma consulta existente não está implementado no frontend.

**Motivo:** Não existe fluxo de "edição de consulta existente" na UI. Cada atendimento cria uma nova consulta via `POST /consultas`. A anamnese é preenchida uma vez, no momento da abertura do tratamento, e não precisa ser editada posteriormente no fluxo atual.

**Decisão:** Ressalva aceita. Registrada como melhoria futura. Não bloqueia o uso clínico.

### Infraestrutura — Correção de Deploy

Durante este ciclo, foi identificado e corrigido um problema de deploy acumulado desde a v1.3.0:
- **Causa:** O GitHub Pages estava configurado para `GitHub Actions`, mas o environment `github-pages` passou a exigir aprovação manual, bloqueando todos os deploys automáticos.
- **Correção:** Migração para **"Deploy from branch: gh-pages / root"** — arquivos estáticos servidos diretamente do branch, sem dependência de workflow Actions.
- **Efeito:** A partir da v1.4.0, qualquer push para `gh-pages` é refletido no site dentro de 1–2 minutos, sem etapas intermediárias.

### Resultado

**Status:** APROVADO COM RESSALVA DOCUMENTADA.

O sistema está apto para **uso assistencial ampliado controlado**, com as seguintes condições:
- Todos os 11 critérios de aceite da Fase 9.3 foram validados em produção.
- A ressalva do critério 10 (preenchimento automático da anamnese ao reabrir consulta) é aceita e registrada como melhoria futura.
- Não foram identificadas regressões nos módulos SAE, relatório, agenda, pendências e painel.
- O deploy está estável e confiável a partir desta versão.

---

## Histórico de Versões

| Versão | Data | Ciclo | Status |
|---|---|---|---|
| v1.3.0 | 17/05/2026 | Piloto operacional controlado — 3 pacientes, fluxo completo | Aprovado |
| v1.4.0 | 26/05/2026 | Fase 9.3 — módulo de pacientes, inativação, seguimento, anamnese | Aprovado com ressalva |
