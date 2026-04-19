/**
 * OncoGuia — app.js integrado com API REST
 * Substitui completamente o mock local por chamadas ao backend Node/PostgreSQL
 */

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================
const API_BASE = window.ONCOGUIA_API || 'http://localhost:3001/api';

async function api(method, path, body = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
    return data;
}

// ============================================================================
// STATE — persiste apenas IDs e dados de sessão; o resto vem do banco
// ============================================================================
const state = {
    patient:      { id: null, initials: '', reg: '', protocol: '' },
    consultaId:   null,
    consultation: {
        ecog: null,
        symptoms: {},
        riskLevel: 'Baixo Risco',
        nandaSelected: null,
        nandaSelectedCodigo: null,
    },
    selectedNicNoc: [],
    tasks: []
};

// ============================================================================
// NAVEGAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-links li');
    const modules  = document.querySelectorAll('.module');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(n => n.classList.remove('active'));
            modules.forEach(m => m.style.display = 'none');
            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            const targetModule = document.getElementById(targetId);
            if (targetModule) targetModule.style.display = 'block';

            if (targetId === 'module-followup') buildFollowupPanel();
            if (targetId === 'module-tasks')    loadTarefas();
        });
    });

    // =========================================================================
    // ABA 1 — IDENTIFICAÇÃO
    // =========================================================================
    document.getElementById('pac-iniciais').addEventListener('input', e => {
        state.patient.initials = e.target.value.toUpperCase() || 'Novo';
        document.getElementById('display-patient-name').textContent = state.patient.initials;
        document.getElementById('patient-avatar').textContent = state.patient.initials.substring(0, 2);
    });

    document.getElementById('reg-inst').addEventListener('input', e => {
        state.patient.reg = e.target.value || '---';
        document.getElementById('display-reg').textContent = state.patient.reg;
    });

    // Salva paciente + abre consulta ao sair da Aba 1
    document.querySelectorAll('.nav-links li').forEach(link => {
        link.addEventListener('click', async () => {
            // Só persiste se estiver saindo da aba de identificação com dados preenchidos
            const reg     = document.getElementById('reg-inst').value.trim();
            const iniciais = document.getElementById('pac-iniciais').value.trim();
            if (!reg || !iniciais || state.consultaId) return;

            try {
                // 1. Cria/atualiza paciente
                const paciente = await api('POST', '/pacientes', {
                    registro_instituicao: reg,
                    iniciais_nome:        iniciais,
                    telefone_1:           document.getElementById('pac-tel').value.trim() || null,
                    protocolo_atual:      document.getElementById('pac-protocol').value.trim() || null,
                    ciclo_atual:          parseInt(document.getElementById('pac-ciclo').value) || null,
                });
                state.patient.id = paciente.id_paciente;

                // 2. Abre consulta (rascunho)
                const consulta = await api('POST', '/consultas', {
                    id_paciente:   state.patient.id,
                    tipo_consulta: 'retorno',
                });
                state.consultaId = consulta.id_consulta;
                console.log('[OncoGuia] Consulta aberta:', state.consultaId);
            } catch (err) {
                console.error('[OncoGuia] Erro ao iniciar consulta:', err.message);
            }
        });
    });

    // =========================================================================
    // ABA 2 — TRIAGEM (Risk Engine)
    // =========================================================================
    const riskIndicator = document.getElementById('global-risk');
    const riskText      = riskIndicator.querySelector('.risk-text');
    const pulseDot      = riskIndicator.querySelector('.pulse-dot');

    function evaluateRisk() {
        let isHighRisk   = false;
        let isMediumRisk = false;

        if (state.consultation.ecog === '3' || state.consultation.ecog === '4') isHighRisk = true;

        Object.values(state.consultation.symptoms).forEach(sym => {
            if (sym.grade >= 3 || sym.isFeverHigh) isHighRisk = true;
            if (sym.grade === 2) isMediumRisk = true;
        });

        if (isHighRisk) {
            state.consultation.riskLevel = 'alto';
            riskIndicator.className = 'risk-indicator high-risk';
            riskText.textContent = 'Alto Risco';
            pulseDot.className = 'pulse-dot red';
        } else if (isMediumRisk) {
            state.consultation.riskLevel = 'moderado';
            riskIndicator.className = 'risk-indicator';
            Object.assign(riskIndicator.style, { background: '#fef3c7', color: '#b45309', borderColor: '#fcd34d' });
            riskText.textContent = 'Risco Moderado';
            pulseDot.className = 'pulse-dot';
            pulseDot.style.background = '#f59e0b';
        } else {
            state.consultation.riskLevel = 'baixo';
            riskIndicator.className = 'risk-indicator';
            Object.assign(riskIndicator.style, { background: '', color: '', borderColor: '' });
            riskText.textContent = 'Baixo Risco';
            pulseDot.className = 'pulse-dot green';
            pulseDot.style.background = '';
        }
    }

    // ECOG
    document.querySelectorAll('input[name="ecog"]').forEach(radio => {
        radio.addEventListener('change', e => {
            state.consultation.ecog = e.target.value;
            document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('active-risk'));
            if (e.target.value >= 3) e.target.closest('.radio-card').classList.add('active-risk');
            evaluateRisk();
            autoSaveSintomas();
        });
    });

    // CTCAE
    document.querySelectorAll('.symptom-item').forEach(item => {
        const symName = item.querySelector('.symptom-name').textContent;
        const symKey  = symName.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        const btns = item.querySelectorAll('.grade-btn');
        state.consultation.symptoms[symKey] = { grade: 0, isFeverHigh: false, label: symName };

        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const gradeVal = parseInt(btn.dataset.grade);
                if (symName.includes('Febre') && gradeVal === 3) {
                    state.consultation.symptoms[symKey].isFeverHigh = true;
                    state.consultation.symptoms[symKey].grade = 3;
                } else {
                    state.consultation.symptoms[symKey].grade = gradeVal;
                    state.consultation.symptoms[symKey].isFeverHigh = false;
                }
                evaluateRisk();
                autoSaveSintomas();
            });
        });
    });

    // Debounce save de sintomas
    let sintomasSaveTimer = null;
    async function autoSaveSintomas() {
        if (!state.consultaId) return;
        clearTimeout(sintomasSaveTimer);
        sintomasSaveTimer = setTimeout(async () => {
            const sintomas = Object.entries(state.consultation.symptoms)
                .filter(([, v]) => v.grade > 0 || v.isFeverHigh)
                .map(([k, v]) => ({
                    tipo_sintoma: k,
                    grau_ctcae:   v.grade || 0,
                    alerta_risco: v.grade >= 3 || v.isFeverHigh,
                }));
            try {
                await api('PUT', `/consultas/${state.consultaId}/sintomas`, {
                    sintomas,
                    classificacao_risco_automatica: state.consultation.riskLevel,
                });
            } catch (err) {
                console.warn('[OncoGuia] Erro ao salvar sintomas:', err.message);
            }
        }, 1200);
    }

    // =========================================================================
    // ABA 3 — PLANO DE CUIDADO (NANDA/NIC/NOC via API)
    // =========================================================================
    let nandaCache = [];

    async function loadNanda(filter = '') {
        const dxList = document.getElementById('dx-list');
        dxList.innerHTML = '<div class="empty-state" style="height:60px">Carregando...</div>';
        try {
            if (nandaCache.length === 0) {
                nandaCache = await api('GET', '/referencia/nanda');
            }
            renderNandaList(filter);
        } catch (err) {
            dxList.innerHTML = `<div class="empty-state" style="color:var(--danger)">Erro ao carregar: ${err.message}</div>`;
        }
    }

    function renderNandaList(filter = '') {
        const dxList = document.getElementById('dx-list');
        dxList.innerHTML = '';
        const filtered = nandaCache.filter(dx =>
            dx.titulo_diagnostico.toLowerCase().includes(filter.toLowerCase())
        );
        if (filtered.length === 0) {
            dxList.innerHTML = '<div class="empty-state">Nenhum diagnóstico encontrado.</div>';
            return;
        }
        filtered.forEach(dx => {
            const el = document.createElement('div');
            el.className = 'dx-card glass-panel';
            el.dataset.codigo = dx.codigo_nanda;
            el.innerHTML = `<div class="dx-title">[${dx.codigo_nanda}] ${dx.titulo_diagnostico}</div>
                            <div class="dx-domain">${dx.dominio || ''}</div>`;
            if (state.consultation.nandaSelectedCodigo === dx.codigo_nanda) el.classList.add('selected');
            el.addEventListener('click', () => {
                document.querySelectorAll('.dx-card').forEach(c => c.classList.remove('selected'));
                el.classList.add('selected');
                state.consultation.nandaSelected      = dx.titulo_diagnostico;
                state.consultation.nandaSelectedCodigo = dx.codigo_nanda;
                loadNicNocSugestoes(dx.codigo_nanda);
            });
            dxList.appendChild(el);
        });
    }

    async function loadNicNocSugestoes(codigoNanda) {
        const panel = document.getElementById('nic-noc-panel');
        panel.innerHTML = '<div class="empty-state">Carregando sugestões...</div>';
        try {
            const { intervencoes_nic, resultados_noc } = await api('GET', `/referencia/nanda/${codigoNanda}/sugestoes`);

            const nicHtml = intervencoes_nic.map(i =>
                `<div class="tag nic selectable-tag"
                      data-id="${i.nic_id_lc}" data-tipo="nic"
                      data-codigo="${i.codigo_nic}" data-texto="${i.nome_intervencao.replace(/"/g, '&quot;')}">
                    ${i.nome_intervencao}
                 </div>`
            ).join('');
            const nocHtml = resultados_noc.map(o =>
                `<div class="tag noc selectable-tag"
                      data-id="${o.noc_id_lc}" data-tipo="noc"
                      data-codigo="${o.codigo_noc}" data-texto="${o.nome_resultado.replace(/"/g, '&quot;')}">
                    ${o.nome_resultado}
                 </div>`
            ).join('');

            panel.innerHTML = `
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">
                    Clique nas tags para adicioná-las ao Seguimento (Plano).
                </p>
                <h4 style="color:var(--primary); margin-bottom:8px;">Intervenções NIC</h4>
                <div class="tag-list">${nicHtml || '<span class="empty-state" style="height:auto;padding:8px">Nenhuma intervenção cadastrada.</span>'}</div>
                <h4 style="color:#166534; margin-bottom:8px;">Resultados NOC</h4>
                <div class="tag-list">${nocHtml || '<span class="empty-state" style="height:auto;padding:8px">Nenhum resultado cadastrado.</span>'}</div>
            `;

            panel.querySelectorAll('.selectable-tag').forEach(tag => {
                const alreadySelected = state.selectedNicNoc.find(x => x.id === tag.dataset.id);
                if (alreadySelected) tag.classList.add('checked');

                tag.addEventListener('click', () => {
                    tag.classList.toggle('checked');
                    const isChecked = tag.classList.contains('checked');
                    if (isChecked) {
                        state.selectedNicNoc.push({
                            id:     tag.dataset.id,
                            tipo:   tag.dataset.tipo,
                            codigo: parseInt(tag.dataset.codigo),
                            texto:  tag.dataset.texto,
                        });
                    } else {
                        state.selectedNicNoc = state.selectedNicNoc.filter(x => x.id !== tag.dataset.id);
                    }
                    autoSavePlano();
                });
            });
        } catch (err) {
            panel.innerHTML = `<div class="empty-state" style="color:var(--danger)">Erro: ${err.message}</div>`;
        }
    }

    let planoSaveTimer = null;
    async function autoSavePlano() {
        if (!state.consultaId || !state.consultation.nandaSelectedCodigo) return;
        clearTimeout(planoSaveTimer);
        planoSaveTimer = setTimeout(async () => {
            const intervencoes = state.selectedNicNoc
                .filter(x => x.tipo === 'nic')
                .map(x => ({ codigo_nic: x.codigo, nic_id_lc: x.id }));
            const resultados_esperados = state.selectedNicNoc
                .filter(x => x.tipo === 'noc')
                .map(x => ({ codigo_noc: x.codigo, noc_id_lc: x.id }));
            const diagnosticos = [{
                codigo_nanda: state.consultation.nandaSelectedCodigo,
                dx_id_lc:     state.selectedNicNoc[0]?.id?.replace(/NIC|NOC/, 'DX') || null,
                prioridade:   1,
                origem:       'selecionado',
            }];
            try {
                await api('PUT', `/consultas/${state.consultaId}/plano`, {
                    diagnosticos, intervencoes, resultados_esperados
                });
            } catch (err) {
                console.warn('[OncoGuia] Erro ao salvar plano:', err.message);
            }
        }, 1500);
    }

    // Inicializa a Aba 3 quando aberta
    document.querySelector('[data-target="module-nanda"]').addEventListener('click', () => {
        if (nandaCache.length === 0) loadNanda();
    });

    document.getElementById('dx-search').addEventListener('input', e => renderNandaList(e.target.value));

    // =========================================================================
    // ABA 4 — SEGUIMENTO
    // =========================================================================
    async function buildFollowupPanel() {
        const panel = document.getElementById('followup-actions-panel');

        // Se tem consultaId, busca plano do banco. Senão, usa state local.
        let nicNocItems = state.selectedNicNoc;

        if (state.consultaId && nicNocItems.length === 0) {
            try {
                const plano = await api('GET', `/consultas/${state.consultaId}/plano`);
                nicNocItems = [
                    ...plano.intervencoes.map(i => ({ id: i.nic_id_lc, tipo: 'nic', texto: i.nome_intervencao })),
                    ...plano.resultados_esperados.map(r => ({ id: r.noc_id_lc, tipo: 'noc', texto: r.nome_resultado })),
                ];
            } catch (err) {
                console.warn('[OncoGuia] Plano não carregado do banco:', err.message);
            }
        }

        if (nicNocItems.length === 0) {
            panel.innerHTML = '<span class="empty-state">Nenhum cuidado (NIC/NOC) selecionado para monitoramento.</span>';
            return;
        }

        let content = `<div style="display:flex; flex-direction:column; gap:8px;">`;
        nicNocItems.forEach(item => {
            const labelBadge = item.tipo === 'nic'
                ? `<span style="color:#0284c7; font-weight:bold; font-size:0.75rem;">[NIC]</span>`
                : `<span style="color:#166534; font-weight:bold; font-size:0.75rem;">[NOC]</span>`;
            content += `
                <div class="checklist-item">
                    <label>${labelBadge} ${item.texto}</label>
                    <select data-id="${item.id}" class="efetividade-select">
                        <option value="">Status Atual...</option>
                        <option value="resolvido">Atingido / Resolvido</option>
                        <option value="parcialmente_resolvido">Parcialmente atingido</option>
                        <option value="nao_resolvido">Não resolvido</option>
                        <option value="piorou">Piorou</option>
                    </select>
                </div>`;
        });
        content += `</div>`;
        panel.innerHTML = content;
    }

    // =========================================================================
    // ABA 5 — AGENDA / TAREFAS
    // =========================================================================
    async function loadTarefas() {
        const tbody = document.getElementById('tasks-table-body');
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Carregando...</td></tr>';
        try {
            const tarefas = await api('GET', '/tarefas');
            renderTarefas(tarefas);
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state" style="color:var(--danger)">Erro: ${err.message}</td></tr>`;
        }
    }

    function renderTarefas(tarefas) {
        const tbody = document.getElementById('tasks-table-body');
        if (tarefas.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="5" class="empty-state">Sem tarefas na agenda.</td></tr>';
            return;
        }
        tbody.innerHTML = tarefas.map(t => `
            <tr>
                <td style="font-weight:600;">${t.iniciais_nome || t.id_paciente}</td>
                <td>${t.tipo_tarefa.replace(/_/g, ' ')}</td>
                <td style="color:${t.prioridade === 'alta' ? 'var(--danger)' : 'inherit'};
                            font-weight:${t.prioridade === 'alta' ? 'bold' : 'normal'}">
                    ${t.prioridade === 'alta' ? 'Alta' : 'Padrão'}
                </td>
                <td><span class="status-badge status-${(t.status || '').toLowerCase()}">${t.status || ''}</span></td>
                <td>${t.data_prevista ? new Date(t.data_prevista).toLocaleDateString('pt-BR') : 'Hoje'}</td>
            </tr>
        `).join('');
    }

    // =========================================================================
    // BOTÃO "CONCLUIR E RESUMIR"
    // =========================================================================
    document.getElementById('btn-concluir').addEventListener('click', async () => {
        const condutaSel  = document.getElementById('followup-conduta');
        const modalidade  = document.getElementById('followup-modalidade')?.value || null;
        const condutaVal  = condutaSel?.selectedIndex > 0 ? condutaSel.value : null;

        // Monta texto para prontuário
        const sympsArr = Object.entries(state.consultation.symptoms)
            .filter(([, v]) => v.grade > 0 || v.isFeverHigh)
            .map(([, v]) => `${v.label}: ${v.isFeverHigh ? 'Sim (G3+)' : 'Grau ' + v.grade}`);

        const riskLabel = { alto: 'ALTO RISCO', moderado: 'RISCO MODERADO', baixo: 'BAIXO RISCO' }[state.consultation.riskLevel] || state.consultation.riskLevel;

        const plainText = `[SISTEMA ONCOGUIA - RESUMO]
ID: ${state.patient.initials} | ${state.patient.reg}
Risco Estratificado: ${riskLabel}
ECOG Documentado: ${state.consultation.ecog || 'N/A'}

[TRIAGEM CTCAE ATIVOS]
${sympsArr.length > 0 ? sympsArr.map(s => '> ' + s).join('\n') : 'Sem toxicidade relatada.'}

[PLANO DE CUIDADO SAE]
Dx Principal: ${state.consultation.nandaSelected || 'Nenhum avaliado'}
Metas e Intervenções ativas:
${state.selectedNicNoc.map(n => '+ [' + n.tipo.toUpperCase() + '] ' + n.texto).join('\n')}

[CONDUTA GERADA]
${condutaVal || 'Apenas registro assistencial.'}`;

        // Monta preview visual
        const riskBadgeClass = state.consultation.riskLevel === 'alto' ? 'risk-high' : 'risk-low';
        const visualHtml = `
            <strong>Paciente:</strong> ${state.patient.initials} (Reg: ${state.patient.reg})<br>
            <strong>Status Triagem:</strong> <span class="risk-badge ${riskBadgeClass}">${riskLabel}</span><br><br>
            <strong>Sintomas Ativos (CTCAE):</strong><br>
            ${sympsArr.length > 0 ? '<ul><li>' + sympsArr.join('</li><li>') + '</li></ul>' : '<em>Nenhum sintoma clinicamente acionado.</em><br>'}
            <br>
            <strong>Plano de Ação (SAE Estruturada):</strong><br>
            ${state.consultation.nandaSelected ? `Diagnóstico Ativo: <u>${state.consultation.nandaSelected}</u><br>` : 'Sem SAE fixada'}
            <ul>${state.selectedNicNoc.map(n => `<li><b>${n.tipo.toUpperCase()}:</b> ${n.texto}</li>`).join('')}</ul>`;

        document.getElementById('summary-visual-preview').innerHTML = visualHtml;
        document.getElementById('summary-text').value = plainText;
        document.getElementById('summary-modal').style.display = 'flex';

        // Persiste no banco
        if (state.consultaId) {
            try {
                // Determina tipo e prazo da tarefa
                let tipo_tarefa = null;
                let data_prevista_tarefa = null;
                let prioridade_tarefa = 'padrao';
                if (condutaVal) {
                    tipo_tarefa = 'contato_telefonico';
                    if (condutaVal.includes('imediato')) { prioridade_tarefa = 'alta'; }
                    if (condutaVal.includes('24h')) { prioridade_tarefa = 'alta'; }
                    const d = new Date();
                    if (condutaVal.includes('48h')) d.setDate(d.getDate() + 2);
                    else d.setDate(d.getDate() + 1);
                    data_prevista_tarefa = d.toISOString().split('T')[0];
                }

                await api('POST', `/consultas/${state.consultaId}/concluir`, {
                    classificacao_risco_validada: state.consultation.riskLevel,
                    texto_copiavel_prontuario:    plainText,
                    plano_cuidado_resumido:       state.consultation.nandaSelected || null,
                    conduta_seguimento_definida:  condutaVal,
                    tipo_tarefa,
                    data_prevista_tarefa,
                    prioridade_tarefa,
                });

                // Se foi seguimento, registra também na tabela de seguimentos
                if (state.consultaId) {
                    const efetividades = [...document.querySelectorAll('.efetividade-select')]
                        .filter(s => s.value)
                        .map(s => ({ id: s.dataset.id, efetividade: s.value }));

                    if (modalidade || condutaVal) {
                        await api('POST', '/seguimentos', {
                            id_paciente:        state.patient.id,
                            id_consulta_origem: state.consultaId,
                            modalidade:         modalidade || 'telefonico',
                            conduta_realizada:  condutaVal,
                            efetividade:        efetividades[0]?.efetividade || null,
                            texto_copiavel_prontuario: plainText,
                            necessita_novo_seguimento: !!condutaVal,
                        });
                    }
                }
            } catch (err) {
                console.error('[OncoGuia] Erro ao concluir:', err.message);
            }
        }
    });

    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('summary-modal').style.display = 'none';
    });

    document.getElementById('copy-clipboard').addEventListener('click', e => {
        const ta = document.getElementById('summary-text');
        ta.select();
        document.execCommand('copy');
        e.target.textContent = 'Copiado para a Área de Transferência!';
        setTimeout(() => e.target.textContent = 'Copiar para Prontuário', 3000);
    });
});
