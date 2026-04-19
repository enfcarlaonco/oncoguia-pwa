/**
 * GuideNurse Oncology — app.js v2.0
 * Cockpit de Decisão Clínica
 */

const API_BASE = window.ONCOGUIA_API || 'http://localhost:3001/api';

async function api(method, path, body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    try {
        const res = await fetch(`${API_BASE}${path}`, opts);
        const data = await res.json();
        if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
        return data;
    } catch (err) {
        console.warn('[API]', err.message);
        throw err;
    }
}

// ══════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════
const state = {
    patient:    { id: null, initials: '', reg: '', ciclo: '', protocol: '' },
    consultaId: null,
    ecog:       null,
    symptoms:   {},   // { key: { label, grade, isRisk } }
    riskLevel:  'baixo',
    nandaSelectedCodigo: null,
    nandaSelectedTitle:  null,
    selectedNicNoc:      [],
    tasks:               [],
    nandaCache:          [],
};

// ══════════════════════════════════════════════════
// NAVEGAÇÃO — sidebar + tabs topo
// ══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

    function activateModule(targetId) {
        document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
        document.querySelectorAll('.nav-item, .tab').forEach(el => el.classList.remove('active'));

        const mod = document.getElementById(targetId);
        if (mod) mod.classList.add('active');
        document.querySelectorAll(`[data-target="${targetId}"]`).forEach(el => el.classList.add('active'));

        if (targetId === 'module-nanda'   && state.nandaCache.length === 0) loadNanda();
        if (targetId === 'module-followup') buildFollowupPanel();
        if (targetId === 'module-tasks')    loadTarefas();
    }

    document.querySelectorAll('[data-target]').forEach(el => {
        el.addEventListener('click', () => activateModule(el.dataset.target));
    });

    // ══════════════════════════════════════════════
    // ABA 1 — IDENTIFICAÇÃO
    // ══════════════════════════════════════════════
    document.getElementById('pac-iniciais').addEventListener('input', e => {
        state.patient.initials = e.target.value.toUpperCase();
        document.getElementById('display-patient-name').textContent = state.patient.initials || 'Novo Paciente';
        document.getElementById('patient-avatar').textContent = state.patient.initials.substring(0, 2) || 'N/A';
    });
    document.getElementById('reg-inst').addEventListener('input', e => {
        state.patient.reg = e.target.value;
        document.getElementById('display-reg').textContent = e.target.value || '---';
    });
    document.getElementById('pac-ciclo').addEventListener('input', e => {
        document.getElementById('display-ciclo').textContent = e.target.value || '---';
    });
    document.getElementById('pac-protocol').addEventListener('input', e => {
        document.getElementById('display-protocol').textContent = e.target.value || '---';
    });

    // Persiste paciente + abre consulta ao navegar para próxima aba
    document.querySelectorAll('[data-target]').forEach(el => {
        el.addEventListener('click', async () => {
            const reg      = document.getElementById('reg-inst').value.trim();
            const iniciais = document.getElementById('pac-iniciais').value.trim();
            if (!reg || !iniciais || state.consultaId) return;
            try {
                const paciente = await api('POST', '/pacientes', {
                    registro_instituicao: reg,
                    iniciais_nome:        iniciais,
                    telefone_1:           document.getElementById('pac-tel').value.trim() || null,
                    protocolo_atual:      document.getElementById('pac-protocol').value.trim() || null,
                    ciclo_atual:          parseInt(document.getElementById('pac-ciclo').value) || null,
                });
                state.patient.id = paciente.id_paciente;
                const consulta = await api('POST', '/consultas', { id_paciente: state.patient.id, tipo_consulta: 'retorno' });
                state.consultaId = consulta.id_consulta;
            } catch (err) { /* offline — continua sem persistir */ }
        });
    });

    // ══════════════════════════════════════════════
    // ABA 2 — TRIAGEM + RISK ENGINE
    // ══════════════════════════════════════════════

    // ECOG
    document.querySelectorAll('input[name="ecog"]').forEach(radio => {
        radio.addEventListener('change', e => {
            state.ecog = e.target.value;
            document.querySelectorAll('.ecog-btn').forEach(b => b.classList.remove('selected'));
            e.target.closest('.ecog-btn').classList.add('selected');
            evaluateRisk();
            autoSaveSintomas();
        });
    });

    // CTCAE sintomas
    document.querySelectorAll('.symptom-row').forEach(row => {
        const key   = row.dataset.sym;
        const label = row.querySelector('.sym-name').textContent;
        state.symptoms[key] = { label, grade: 0, isRisk: false };

        row.querySelectorAll('.sg').forEach(btn => {
            btn.addEventListener('click', () => {
                row.querySelectorAll('.sg').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const g = parseInt(btn.dataset.g);
                state.symptoms[key].grade  = g;
                state.symptoms[key].isRisk = btn.classList.contains('risk') && g > 0;
                evaluateRisk();
                updateSymptomRowStyle(row, key);
                autoSaveSintomas();
            });
        });
    });

    function updateSymptomRowStyle(row, key) {
        row.classList.remove('has-risk', 'has-moderate');
        const s = state.symptoms[key];
        if (s.grade >= 3 || s.isRisk) row.classList.add('has-risk');
        else if (s.grade === 2)        row.classList.add('has-moderate');
    }

    // ══════════════════════════════════════════════
    // RISK ENGINE
    // ══════════════════════════════════════════════
    function evaluateRisk() {
        let highCount = 0, modCount = 0;
        const criteria = [];

        if (state.ecog === '3' || state.ecog === '4') {
            highCount++;
            criteria.push({ text: `ECOG ${state.ecog}`, level: 'red' });
        }

        Object.entries(state.symptoms).forEach(([, s]) => {
            if (s.grade >= 3 || s.isRisk) {
                highCount++;
                criteria.push({ text: `${s.label}: Grau ${s.grade || '3+'}`, level: 'red' });
            } else if (s.grade === 2) {
                modCount++;
                criteria.push({ text: `${s.label}: Grau 2`, level: 'amber' });
            }
        });

        let level = 'baixo';
        if (highCount > 0)       level = 'alto';
        else if (modCount > 0)   level = 'moderado';

        state.riskLevel = level;
        updateRiskUI(level, criteria);
    }

    function updateRiskUI(level, criteria) {
        const card      = document.getElementById('risk-level-card');
        const text      = document.getElementById('risk-level-text');
        const sub       = document.getElementById('risk-sublabel');
        const icon      = document.getElementById('risk-icon');
        const fill      = document.getElementById('risk-bar-fill');
        const thumb     = document.getElementById('risk-bar-thumb');
        const badge     = document.getElementById('risk-badge-inline');
        const riskDotSb = document.querySelector('#sidebar-risk .risk-dot');
        const labelSb   = document.getElementById('risk-label-sidebar');
        const listEl    = document.getElementById('criteria-list');

        const cfg = {
            baixo:    { cls: 'green', label: 'Baixo Risco',    sub: 'Sem critérios de alerta', pct: '5%',  iconPath: '<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>' },
            moderado: { cls: 'amber', label: 'Risco Moderado', sub: 'Monitorar de perto',       pct: '50%', iconPath: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
            alto:     { cls: 'red',   label: 'Alto Risco',     sub: 'Atenção imediata necessária', pct: '92%', iconPath: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' },
        }[level];

        card.className  = `risk-level-card ${cfg.cls}`;
        text.textContent = cfg.label;
        sub.textContent  = cfg.sub;
        icon.className   = `risk-icon ${cfg.cls}`;
        icon.innerHTML   = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${cfg.iconPath}</svg>`;
        fill.style.width = cfg.pct;
        thumb.style.left = cfg.pct;

        // Badge topo
        if (badge) {
            badge.className = `risk-badge-inline ${cfg.cls === 'green' ? '' : cfg.cls}`;
            badge.innerHTML = `<span class="risk-dot-sm ${cfg.cls}"></span>${cfg.label}`;
        }

        // Sidebar
        if (riskDotSb) riskDotSb.className = `risk-dot ${cfg.cls}`;
        if (labelSb)   labelSb.textContent  = cfg.label;

        // Critérios
        if (criteria.length === 0) {
            listEl.innerHTML = '<div class="criteria-empty">Nenhum critério de risco identificado.</div>';
        } else {
            listEl.innerHTML = criteria.map(c =>
                `<div class="criterion-item ${c.level}">${c.text}</div>`
            ).join('');
        }
    }

    let sintomasTimer = null;
    async function autoSaveSintomas() {
        if (!state.consultaId) return;
        clearTimeout(sintomasTimer);
        sintomasTimer = setTimeout(async () => {
            const sintomas = Object.entries(state.symptoms)
                .filter(([, v]) => v.grade > 0 || v.isRisk)
                .map(([k, v]) => ({ tipo_sintoma: k, grau_ctcae: v.grade, alerta_risco: v.isRisk }));
            try {
                await api('PUT', `/consultas/${state.consultaId}/sintomas`, {
                    sintomas, classificacao_risco_automatica: state.riskLevel
                });
            } catch {}
        }, 1500);
    }

    // ══════════════════════════════════════════════
    // ABA 3 — NANDA / NIC / NOC
    // ══════════════════════════════════════════════
    async function loadNanda(filter = '') {
        const list = document.getElementById('dx-list');
        if (state.nandaCache.length === 0) {
            list.innerHTML = '<div class="loading-state">Carregando base NANDA...</div>';
            try {
                state.nandaCache = await api('GET', '/referencia/nanda');
            } catch {
                list.innerHTML = '<div class="loading-state">Erro ao carregar. Verifique a conexão.</div>';
                return;
            }
        }
        renderNandaList(filter);
    }

    function renderNandaList(filter = '') {
        const list     = document.getElementById('dx-list');
        const filtered = state.nandaCache.filter(dx =>
            dx.titulo_diagnostico.toLowerCase().includes(filter.toLowerCase())
        );
        if (!filtered.length) {
            list.innerHTML = '<div class="loading-state">Nenhum diagnóstico encontrado.</div>';
            return;
        }
        list.innerHTML = filtered.map(dx => `
            <div class="dx-card${state.nandaSelectedCodigo === dx.codigo_nanda ? ' selected' : ''}"
                 data-codigo="${dx.codigo_nanda}">
                <div class="dx-title">${dx.titulo_diagnostico}</div>
                <div class="dx-code">[${dx.codigo_nanda}] · ${dx.dominio || ''}</div>
            </div>
        `).join('');

        list.querySelectorAll('.dx-card').forEach(card => {
            card.addEventListener('click', () => {
                list.querySelectorAll('.dx-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                state.nandaSelectedCodigo = card.dataset.codigo;
                state.nandaSelectedTitle  = card.querySelector('.dx-title').textContent;
                loadNicNoc(card.dataset.codigo);
            });
        });
    }

    async function loadNicNoc(codigo) {
        const panel = document.getElementById('nic-noc-panel');
        panel.innerHTML = '<div class="loading-state" style="padding:24px">Carregando sugestões...</div>';
        try {
            const { intervencoes_nic, resultados_noc } = await api('GET', `/referencia/nanda/${codigo}/sugestoes`);

            const nicHtml = intervencoes_nic.map(i => `
                <div class="tag-item nic${state.selectedNicNoc.find(x => x.id === i.nic_id_lc) ? ' checked' : ''}"
                     data-id="${i.nic_id_lc}" data-tipo="nic" data-codigo="${i.codigo_nic}"
                     data-texto="${i.nome_intervencao.replace(/"/g, '&quot;')}">
                    ${i.nome_intervencao}
                    <span class="tag-check">✓</span>
                </div>`).join('');

            const nocHtml = resultados_noc.map(r => `
                <div class="tag-item noc${state.selectedNicNoc.find(x => x.id === r.noc_id_lc) ? ' checked' : ''}"
                     data-id="${r.noc_id_lc}" data-tipo="noc" data-codigo="${r.codigo_noc}"
                     data-texto="${r.nome_resultado.replace(/"/g, '&quot;')}">
                    ${r.nome_resultado}
                    <span class="tag-check">✓</span>
                </div>`).join('');

            panel.innerHTML = `
                <div class="nic-noc-section-title nic-title">Intervenções NIC</div>
                <div class="tag-row">${nicHtml || '<div class="loading-state">Nenhuma intervenção cadastrada.</div>'}</div>
                <div class="nic-noc-section-title noc-title">Resultados NOC</div>
                <div class="tag-row">${nocHtml || '<div class="loading-state">Nenhum resultado cadastrado.</div>'}</div>
            `;

            panel.querySelectorAll('.tag-item').forEach(tag => {
                tag.addEventListener('click', () => {
                    tag.classList.toggle('checked');
                    const checked = tag.classList.contains('checked');
                    if (checked) {
                        state.selectedNicNoc.push({ id: tag.dataset.id, tipo: tag.dataset.tipo, codigo: parseInt(tag.dataset.codigo), texto: tag.dataset.texto });
                    } else {
                        state.selectedNicNoc = state.selectedNicNoc.filter(x => x.id !== tag.dataset.id);
                    }
                    autoSavePlano();
                });
            });
        } catch {
            panel.innerHTML = '<div class="loading-state" style="color:#DC2626">Erro ao carregar sugestões.</div>';
        }
    }

    document.getElementById('dx-search').addEventListener('input', e => renderNandaList(e.target.value));

    let planoTimer = null;
    async function autoSavePlano() {
        if (!state.consultaId || !state.nandaSelectedCodigo) return;
        clearTimeout(planoTimer);
        planoTimer = setTimeout(async () => {
            try {
                await api('PUT', `/consultas/${state.consultaId}/plano`, {
                    diagnosticos: [{ codigo_nanda: state.nandaSelectedCodigo, prioridade: 1, origem: 'selecionado' }],
                    intervencoes: state.selectedNicNoc.filter(x => x.tipo === 'nic').map(x => ({ codigo_nic: x.codigo, nic_id_lc: x.id })),
                    resultados_esperados: state.selectedNicNoc.filter(x => x.tipo === 'noc').map(x => ({ codigo_noc: x.codigo, noc_id_lc: x.id })),
                });
            } catch {}
        }, 1500);
    }

    // ══════════════════════════════════════════════
    // ABA 4 — SEGUIMENTO
    // ══════════════════════════════════════════════
    async function buildFollowupPanel() {
        const panel = document.getElementById('followup-actions-panel');
        let items = state.selectedNicNoc;

        if (!items.length && state.consultaId) {
            try {
                const plano = await api('GET', `/consultas/${state.consultaId}/plano`);
                items = [
                    ...plano.intervencoes.map(i => ({ id: i.nic_id_lc, tipo: 'nic', texto: i.nome_intervencao })),
                    ...plano.resultados_esperados.map(r => ({ id: r.noc_id_lc, tipo: 'noc', texto: r.nome_resultado })),
                ];
            } catch {}
        }

        if (!items.length) {
            panel.innerHTML = '<div class="empty-state-sm">Complete o Plano SAE para carregar as metas aqui.</div>';
            return;
        }

        panel.innerHTML = items.map(item => `
            <div class="followup-item">
                <span class="followup-badge ${item.tipo}">${item.tipo.toUpperCase()}</span>
                <span class="followup-text">${item.texto}</span>
                <select class="followup-select efetividade-select" data-id="${item.id}">
                    <option value="">Status...</option>
                    <option value="resolvido">Resolvido ✓</option>
                    <option value="parcialmente_resolvido">Parcialmente resolvido</option>
                    <option value="nao_resolvido">Não resolvido</option>
                    <option value="piorou">Piorou ↓</option>
                </select>
            </div>
        `).join('');
    }

    // ══════════════════════════════════════════════
    // ABA 5 — TAREFAS
    // ══════════════════════════════════════════════
    async function loadTarefas() {
        const tbody = document.getElementById('tasks-table-body');
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Carregando...</td></tr>';
        try {
            const tarefas = await api('GET', '/tarefas');
            renderTarefas(tarefas);
        } catch {
            tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Erro ao carregar tarefas.</td></tr>';
        }
    }

    function renderTarefas(tarefas) {
        const tbody = document.getElementById('tasks-table-body');
        if (!tarefas.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Nenhuma tarefa na agenda.</td></tr>';
            return;
        }
        tbody.innerHTML = tarefas.map(t => `
            <tr>
                <td><span class="status-pill ${t.status}">${t.status}</span></td>
                <td style="font-weight:600">${t.iniciais_nome || '---'}</td>
                <td>${(t.tipo_tarefa || '').replace(/_/g,' ')}</td>
                <td><span class="priority-badge ${t.prioridade}">${t.prioridade === 'alta' ? 'Alta' : 'Padrão'}</span></td>
                <td>${t.data_prevista ? new Date(t.data_prevista).toLocaleDateString('pt-BR') : 'Hoje'}</td>
                <td><button class="btn-task-done" data-id="${t.id_tarefa}">Concluir</button></td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.btn-task-done').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    await api('PATCH', `/tarefas/${btn.dataset.id}`, { status: 'concluida' });
                    loadTarefas();
                } catch {}
            });
        });
    }

    // ══════════════════════════════════════════════
    // CONCLUIR CONSULTA
    // ══════════════════════════════════════════════
    document.getElementById('btn-concluir').addEventListener('click', async () => {
        const conduta   = document.getElementById('followup-conduta')?.value || '';
        const modalidade = document.getElementById('followup-modalidade')?.value || 'telefonico';

        const sympsArr = Object.entries(state.symptoms)
            .filter(([, v]) => v.grade > 0 || v.isRisk)
            .map(([, v]) => `${v.label}: ${v.isRisk ? 'Sim (G3+)' : 'Grau ' + v.grade}`);

        const riskLabels = { baixo: 'BAIXO RISCO', moderado: 'RISCO MODERADO', alto: 'ALTO RISCO' };

        const plainText = `[GUIDENURSE ONCOLOGY — RESUMO DA CONSULTA]
Paciente: ${state.patient.initials || '---'} | Reg: ${state.patient.reg || '---'}
Risco Estratificado: ${riskLabels[state.riskLevel]}
ECOG: ${state.ecog || 'N/A'}

[TRIAGEM CTCAE]
${sympsArr.length ? sympsArr.map(s => '▸ ' + s).join('\n') : 'Sem toxicidade relatada.'}

[PLANO DE CUIDADO SAE]
Diagnóstico Principal: ${state.nandaSelectedTitle || 'Não avaliado'}
${state.selectedNicNoc.map(n => `▸ [${n.tipo.toUpperCase()}] ${n.texto}`).join('\n') || 'Nenhuma intervenção selecionada.'}

[CONDUTA]
${conduta || 'Apenas registro assistencial.'}`;

        const riskCls = state.riskLevel === 'alto' ? 'risk-label-high' : 'risk-label-low';
        const visualHtml = `
            <strong>Paciente:</strong> ${state.patient.initials} (${state.patient.reg})<br>
            <strong>Risco:</strong> <span class="${riskCls}">${riskLabels[state.riskLevel]}</span><br><br>
            <strong>Sintomas:</strong><br>
            ${sympsArr.length ? sympsArr.map(s => `<span style="display:block;margin-left:8px">▸ ${s}</span>`).join('') : '<em>Nenhum</em>'}<br>
            <strong>Diagnóstico:</strong> ${state.nandaSelectedTitle || '—'}<br>
            ${state.selectedNicNoc.map(n => `<span style="display:block;margin-left:8px">▸ [${n.tipo.toUpperCase()}] ${n.texto}</span>`).join('')}
        `;

        document.getElementById('summary-visual-preview').innerHTML = visualHtml;
        document.getElementById('summary-text').value = plainText;
        document.getElementById('summary-modal').style.display = 'flex';

        if (state.consultaId) {
            try {
                let tipo_tarefa = null, data_prevista_tarefa = null, prioridade_tarefa = 'padrao';
                if (conduta) {
                    tipo_tarefa = 'contato_telefonico';
                    if (conduta.includes('24h') || conduta.includes('imediato')) prioridade_tarefa = 'alta';
                    const d = new Date();
                    d.setDate(d.getDate() + (conduta.includes('48h') ? 2 : 1));
                    data_prevista_tarefa = d.toISOString().split('T')[0];
                }
                await api('POST', `/consultas/${state.consultaId}/concluir`, {
                    classificacao_risco_validada: state.riskLevel,
                    texto_copiavel_prontuario:    plainText,
                    plano_cuidado_resumido:        state.nandaSelectedTitle,
                    conduta_seguimento_definida:   conduta,
                    tipo_tarefa, data_prevista_tarefa, prioridade_tarefa
                });
            } catch {}
        }
    });

    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('summary-modal').style.display = 'none';
    });

    document.getElementById('copy-clipboard').addEventListener('click', e => {
        const ta = document.getElementById('summary-text');
        ta.select();
        document.execCommand('copy');
        e.target.textContent = '✓ Copiado!';
        setTimeout(() => {
            e.target.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copiar para Prontuário`;
        }, 2500);
    });

    // Init
    evaluateRisk();
});
