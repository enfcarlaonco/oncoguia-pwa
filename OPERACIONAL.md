# OncoGuia PWA — Manual Operacional v1.4.0

**Versão:** 1.4.0
**Data:** 26/05/2026
**Destinado a:** Enf. Carla Alves e Enf. Danielle Cabral
**Ambiente:** https://enfcarlaonco.github.io/oncoguia-pwa/

---

## 1. Rotina Diária das Enfermeiras

### Início do turno

1. Abrir o sistema no navegador: https://enfcarlaonco.github.io/oncoguia-pwa/
2. Selecionar o nome no login (Carla Alves ou Danielle Cabral).
3. Acessar o **Painel** para ver o resumo do dia:
   - Tarefas pendentes para a data de hoje.
   - Pendências críticas em aberto.
   - Consultas já registradas no dia.
   - Alertas automáticos (pendências críticas e tarefas vencidas).
4. Verificar a **Agenda** para as tarefas do turno.
5. Verificar **Pendências** para situações em acompanhamento.

### Durante o atendimento

1. Acessar o módulo **Pacientes**.
2. Localizar o paciente na lista (apenas ativos aparecem por padrão).
3. Clicar em **Abrir** e escolher a ação:
   - **Ver Identificação:** para revisar ou atualizar dados cadastrais.
   - **Dar Seguimento:** para registrar um contato de seguimento.
   - **Realizar Nova Consulta:** para iniciar uma consulta de enfermagem completa.

### Ao final do turno

1. Verificar se todas as consultas do dia estão **concluídas** (não em rascunho).
2. Registrar tarefas e pendências identificadas durante os atendimentos.
3. Revisar o Painel para confirmar que nada ficou pendente.

---

## 2. Uso da Lista de Pacientes

### Lista inicial (padrão)
- Exibe apenas **pacientes ativos**, ordenados por iniciais em ordem alfabética.
- Ao abrir o módulo Pacientes, a lista carrega automaticamente.

### Busca de paciente
- Use o campo de busca para localizar um paciente por:
  - Iniciais do nome (ex: M.S.O)
  - Número de registro/prontuário institucional
- A busca retorna **ativos e inativos**. Paciente inativo aparece com badge "inativo".

### Identificar paciente inativo na lista
- Badge `inativo` ao lado do status.
- Ao clicar em "Abrir", o sistema vai diretamente para a aba Identificação em **modo somente leitura** (sem abrir o modal de escolha de ação).

---

## 3. Conduta para Paciente Inativo

### O que é um paciente inativo
Um paciente é marcado como inativo quando:
- Era um **registro de teste** (não corresponde a paciente real).
- Houve **óbito**.

### O que acontece ao inativar
- O paciente **não aparece mais** na lista inicial de pacientes.
- O paciente **continua acessível** pela busca (iniciais ou registro).
- Todos os dados históricos são preservados integralmente.
- Nenhum dado é excluído.

### Como inativar um paciente
1. Localizar o paciente (ativo) na lista.
2. Clicar em **Abrir → Ver Identificação**.
3. Clicar no botão **"Inativar Paciente"** (vermelho, ao lado de "Salvar Identificação").
4. Selecionar o motivo: **Registro de teste** ou **Óbito**.
5. Clicar em **"Confirmar Inativação"**.
6. O sistema retorna à tela de busca de pacientes.

O sistema registra automaticamente: data da inativação e nome do usuário que realizou a ação.

---

## 4. Regra — Nenhum Novo Registro em Paciente Inativo

Paciente inativo é **somente leitura**. O sistema bloqueia automaticamente:

| Ação bloqueada | Como o bloqueio aparece |
|---|---|
| Editar dados de identificação | Todos os campos desabilitados |
| Salvar identificação | Botão "Salvar" oculto |
| Realizar Nova Consulta | Modal de ações não é exibido |
| Dar Seguimento | Modal de ações não é exibido |
| Criar nova tarefa ou pendência | Não está vinculado ao fluxo de inativos |
| Concluir consulta | Não se aplica — nenhuma consulta pode ser aberta |

**Banner de aviso:** ao acessar um paciente inativo, aparece faixa vermelha no topo com:
- "Paciente Inativo — visualização somente leitura."
- Motivo da inativação, data e nome do responsável.

**Dados acessíveis para consulta:** identificação, histórico de consultas anteriores, seguimentos, tarefas e pendências históricas continuam visíveis.

---

## 5. Uso do Seguimento Vinculado à Última Consulta

### Quando usar
Use "Dar Seguimento" para registrar um contato de acompanhamento após uma consulta já realizada (ex: ligação de retorno, verificação de sintoma).

### Como funciona o vínculo automático
1. Clicar em **Dar Seguimento**.
2. No campo "Este seguimento está atrelado a uma consulta de Enfermagem?", selecionar **Sim**.
3. O sistema busca automaticamente a **última consulta concluída** do paciente.
4. Se existir consulta:
   - Exibe: `Última consulta de enfermagem: DD/MM/AAAA HH:mm — Tipo: [tipo]`
   - O vínculo é feito automaticamente.
5. Se não existir consulta:
   - Exibe: **"Não existe Consulta de Enfermagem para esse paciente."**
   - Neste caso, utilize "Seguimento não vinculado" ou realize uma consulta primeiro.

**Importante:** não é possível escolher uma data manualmente para o seguimento atrelado. A data é sempre derivada da consulta real mais recente.

### Seguimento não vinculado
Selecione **Não** no campo de vínculo para registrar um seguimento independente de consulta (ex: contato espontâneo do paciente, retorno não programado).

---

## 6. Consulta de Início de Tratamento / Troca de Protocolo

### Diferença em relação às demais consultas
Ao selecionar o tipo **"Consulta de início de tratamento"** ou **"Consulta de troca de protocolo"**, o sistema exibe automaticamente o **formulário de anamnese** com 7 seções:

1. Dados Pessoais e Socioeconômicos
2. Saúde Pregressa
3. História Familiar
4. Hábitos de Vida
5. Condição de Saúde
6. Doença Atual
7. Exame Físico Completo

O **card de Exame Físico padrão** é ocultado, pois a seção 7 da anamnese o substitui.

Para todos os outros tipos de consulta, o formulário de anamnese não é exibido.

### Como preencher
- Preencha apenas os campos aplicáveis ao paciente.
- Os campos condicionais (ex: "Descrever alergia") aparecem automaticamente ao selecionar "Sim".
- A anamnese é salva junto com a consulta ao clicar em "Concluir Consulta".

---

## 7. Checklist Pós-Atendimento

Após cada atendimento, verificar:

- [ ] Consulta foi **concluída** (status: concluída, não rascunho).
- [ ] Classificação de risco foi **validada** pelo enfermeiro (não apenas automática).
- [ ] Sintomas registrados na triagem CTCAE correspondem ao relato do paciente.
- [ ] Plano SAE (NANDA + NIC + NOC) foi selecionado e salvo.
- [ ] Orientações ao paciente e cuidador foram registradas.
- [ ] Se houve tarefa de acompanhamento: **tarefa criada** com data prevista e prioridade.
- [ ] Se houve problema clínico em aberto: **pendência registrada** com categoria e prioridade.
- [ ] Se foi consulta de início de tratamento ou troca de protocolo: **anamnese preenchida**.
- [ ] Painel foi verificado ao final para confirmar que nada ficou sem registro.

---

## 8. Referência Rápida — Módulos do Sistema

| Módulo | Acesso | Finalidade |
|---|---|---|
| **Painel** | Menu lateral | Resumo operacional do dia — tarefas, pendências e alertas |
| **Pacientes** | Menu lateral | Cadastro, busca e acesso ao histórico do paciente |
| **Identificação** | Via módulo Pacientes | Dados cadastrais do paciente |
| **Triagem / SAE** | Via Nova Consulta | Sintomas CTCAE, NANDA, NIC, NOC, orientações |
| **Seguimento** | Via Dar Seguimento | Registro de contatos de acompanhamento |
| **Agenda** | Menu lateral | Tarefas planejadas com filtros por período e status |
| **Pendências** | Menu lateral | Problemas clínicos/administrativos abertos |
| **Relatório** | Dentro de uma consulta | Texto estruturado para prontuário |

---

## 9. Situações Frequentes e Como Resolver

### "Não encontrei o paciente na lista"
- Use a **busca por iniciais ou registro**. Pacientes inativos não aparecem na lista padrão, mas aparecem na busca.

### "O seguimento não está aceitando vínculo com consulta"
- Verifique se o paciente tem pelo menos uma **consulta concluída**. Se não tiver, use "seguimento não vinculado" ou realize uma consulta primeiro.

### "O formulário de anamnese não apareceu"
- O formulário aparece apenas para **Consulta de início de tratamento** ou **Consulta de troca de protocolo**. Verifique o tipo selecionado no campo "Tipo de Consulta".

### "Preciso visualizar dados de um paciente que foi inativado"
- Use a busca para localizar o paciente pelas iniciais ou registro. Clique em Abrir. O sistema exibirá a identificação e o histórico em modo somente leitura.

### "O sistema não está deixando editar os dados do paciente"
- Verifique o banner vermelho no topo da aba Identificação. Se estiver visível, o paciente está **inativo** e em modo somente leitura.

---

*Manual gerado ao final da Fase 9.3 — OncoGuia PWA v1.4.0*
*Ambulatório Borges da Costa — Gestão do Cuidado Oncológico*
