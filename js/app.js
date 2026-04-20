/**
 * GuideNurse Oncology — app.js v3.0
 * Sistema completo com busca, cálculo ASC, risk engine expandido,
 * indicadores e evolução clínica
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

// ── STATE ──
const state = {
    patient:    { id: null, initials: '', reg: '', ciclo: '', protocol: '' },
    consultaId: null,
    ecog:       null,
    symptoms:   {},
    segSymptoms:{},
    riskLevel:  'baixo',
    nandaSelectedCodigo: null,
    nandaSelectedTitle:  null,
    selectedNicNoc:      [],
    nandaCache:          [],
};

// ── NAVEGAÇÃO ──
function activateModule(targetId) {
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.nav-item, .tab').forEach(el => el.classList.remove('active'));
    const mod = document.getElementById(targetId);
    if (mod) mod.classList.add('active');
    document.querySelectorAll(`[data-target="${targetId}"]`).forEach(el => el.classList.add('active'));

    if (targetId === 'module-nanda'      && state.nandaCache.length === 0) loadNanda();
    if (targetId === 'module-followup')  buildFollowupPanel();
    if (targetId === 'module-tasks')     loadTarefas();
    if (targetId === 'module-indicators') loadIndicators();
    if (targetId === 'module-evolution') loadEvolution();
}

document.addEventListener('DOMContentLoaded', () => {

    // Navegação
    document.querySelectorAll('[data-target]').forEach(el => {
        el.addEventListener('click', () => activateModule(el.dataset.target));
    });

    // ── TELA DE BUSCA ──
    const screenSearch = document.getElementById('screen-search');
    const appMain      = document.getElementById('app-main');

    function showApp() {
        screenSearch.style.display = 'none';
        appMain.style.display = 'flex';
    }
    function showSearch() {
        screenSearch.style.display = 'flex';
        appMain.style.display = 'none';
        document.getElementById('search-reg').value = '';
        document.getElementById('search-result').style.display = 'none';
    }

    document.getElementById('btn-back-search').addEventListener('click', showSearch);

    document.getElementById('btn-new-patient').addEventListener('click', () => {
        // Limpa state para novo paciente
        state.patient = { id: null, initials: '', reg: '', ciclo: '', protocol: '' };
        state.consultaId = null;
        state.selectedNicNoc = [];
        state.nandaSelectedCodigo = null;
        showApp();
        activateModule('module-id');
    });

    document.getElementById('btn-search').addEventListener('click', async () => {
        const q = document.getElementById('search-reg').value.trim();
        if (!q) return;
        const resultDiv = document.getElementById('search-result');
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div class="loading-state">Buscando...</div>';
        try {
            const pacientes = await api('GET', `/pacientes/busca?q=${encodeURIComponent(q)}`);
            if (!pacientes.length) {
                resultDiv.innerHTML = `<div class="search-not-found">
                    <p>Paciente não encontrado com registro <strong>${q}</strong>.</p>
                    <button class="btn-primary mt-8" id="btn-cadastrar-novo">Cadastrar novo paciente</button>
                </div>`;
                document.getElementById('btn-cadastrar-novo').addEventListener('click', () => {
                    document.getElementById('reg-inst').value = q;
                    state.patient.reg = q;
                    showApp();
                    activateModule('module-id');
                });
                return;
            }
            resultDiv.innerHTML = pacientes.map(p => `
                <div class="search-patient-card" data-id="${p.id_paciente}" data-reg="${p.registro_instituicao}" data-iniciais="${p.iniciais_nome}">
                    <div class="spc-avatar">${p.iniciais_nome.substring(0,2)}</div>
                    <div class="spc-info">
                        <strong>${p.iniciais_nome}</strong>
                        <span>Reg: ${p.registro_instituicao} · ${p.protocolo_atual || '—'}</span>
                    </div>
                    <button class="btn-primary btn-sm">Selecionar</button>
                </div>
            `).join('');
            resultDiv.querySelectorAll('.search-patient-card').forEach(card => {
                card.querySelector('button').addEventListener('click', async () => {
                    state.patient.id       = parseInt(card.dataset.id);
                    state.patient.reg      = card.dataset.reg;
                    state.patient.initials = card.dataset.iniciais;
                    // Preenche header
                    document.getElementById('display-patient-name').textContent = state.patient.initials;
                    document.getElementById('display-reg').textContent = state.patient.reg;
                    document.getElementById('patient-avatar').textContent = state.patient.initials.substring(0,2);
                    // Abre nova consulta
                    try {
                        const consulta = await api('POST', '/consultas', { id_paciente: state.patient.id, tipo_consulta: 'retorno' });
                        state.consultaId = consulta.id_consulta;
                    } catch {}
                    showApp();
                    activateModule('module-triage');
                });
            });
        } catch {
            resultDiv.innerHTML = '<div class="loading-state" style="color:#DC2626">Erro ao buscar. Tente novamente.</div>';
        }
    });

    document.getElementById('search-reg').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('btn-search').click();
    });

    // ── ABA 1: IDENTIFICAÇÃO ──
    document.getElementById('pac-nascimento').addEventListener('change', e => {
        const nasc = new Date(e.target.value);
        const hoje = new Date();
        let idade = hoje.getFullYear() - nasc.getFullYear();
        const m = hoje.getMonth() - nasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
        document.getElementById('pac-idade').value = isNaN(idade) ? '' : idade;
    });

    document.getElementById('pac-iniciais').addEventListener('input', e => {
        state.patient.initials = e.target.value.toUpperCase();
        e.target.value = e.target.value.toUpperCase();
        document.getElementById('display-patient-name').textContent = state.patient.initials || 'Novo Paciente';
        document.getElementById('patient-avatar').textContent = state.patient.initials.substring(0,2) || 'N/A';
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

    document.getElementById('btn-salvar-id').addEventListener('click', async () => {
        const reg      = document.getElementById('reg-inst').value.trim();
        const iniciais = document.getElementById('pac-iniciais').value.trim();
        if (!reg || !iniciais) { alert('Preencha o Registro e as Iniciais do paciente.'); return; }
        try {
            const paciente = await api('POST', '/pacientes', {
                registro_instituicao: reg,
                iniciais_nome:        iniciais,
                telefone_1:           document.getElementById('pac-tel').value || null,
                protocolo_atual:      document.getElementById('pac-protocol').value || null,
                ciclo_atual:          parseInt(document.getElementById('pac-ciclo').value) || null,
                data_nascimento:      document.getElementById('pac-nascimento').value || null,
                sexo:                 document.getElementById('pac-sexo').value || null,
                nome_cuidador:        document.getElementById('pac-cuidador').value || null,
                diagnostico_oncologico: document.getElementById('pac-dx').value || null,
                data_ultima_qt:       document.getElementById('pac-ultima-qt').value || null,
                data_proxima_qt_prevista: document.getElementById('pac-proxima-qt').value || null,
            });
            state.patient.id = paciente.id_paciente;
            if (!state.consultaId) {
                const consulta = await api('POST', '/consultas', { id_paciente: state.patient.id, tipo_consulta: 'retorno' });
                state.consultaId = consulta.id_consulta;
            }
        } catch {}
        activateModule('module-triage');
    });

    // ── CÁLCULO ASC (Mosteller) ──
    window.calcASC = function() {
        const peso   = parseFloat(document.getElementById('peso').value);
        const altura = parseFloat(document.getElementById('altura').value);
        if (peso > 0 && altura > 0) {
            const asc = Math.sqrt((altura * peso) / 3600).toFixed(2);
            document.getElementById('asc').value = `${asc} m²`;
        } else {
            document.getElementById('asc').value = '';
        }
    };

    // ── TIPO CONSULTA OUTRO ──
    document.getElementById('tipo-consulta').addEventListener('change', e => {
        document.getElementById('tipo-outro-group').style.display =
            e.target.value === 'Outro' ? 'block' : 'none';
    });

    // ── ABA 2: TRIAGEM + RISK ENGINE ──
    document.querySelectorAll('input[name="ecog"]').forEach(radio => {
        radio.addEventListener('change', e => {
            state.ecog = e.target.value;
            document.querySelectorAll('.ecog-btn').forEach(b => b.classList.remove('selected'));
            e.target.closest('.ecog-btn').classList.add('selected');
            evaluateRisk();
            autoSaveSintomas();
        });
    });

    document.querySelectorAll('#symptoms-list .symptom-row').forEach(row => {
        const key   = row.dataset.sym;
        const label = row.querySelector('.sym-name')?.textContent || key;
        if (row.querySelector('.sg')) {
            state.symptoms[key] = { label, grade: 0, isRisk: false };
            row.querySelectorAll('.sg').forEach(btn => {
                btn.addEventListener('click', () => {
                    row.querySelectorAll('.sg').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const g = parseInt(btn.dataset.g);
                    state.symptoms[key].grade  = g;
                    state.symptoms[key].isRisk = btn.classList.contains('risk') && g > 0;
                    updateSymptomRowStyle(row, key, state.symptoms);
                    evaluateRisk();
                    autoSaveSintomas();
                });
            });
        }
    });

    // Sintomas seguimento
    document.querySelectorAll('#seg-symptoms-list .symptom-row').forEach(row => {
        const key = row.dataset.sym;
        state.segSymptoms[key] = { grade: 0 };
        row.querySelectorAll('.sg').forEach(btn => {
            btn.addEventListener('click', () => {
                row.querySelectorAll('.sg').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.segSymptoms[key].grade = parseInt(btn.dataset.g);
            });
        });
    });

    function updateSymptomRowStyle(row, key, symptomsObj) {
        row.classList.remove('has-risk', 'has-moderate');
        const s = symptomsObj[key];
        if (!s) return;
        if (s.grade >= 3 || s.isRisk) row.classList.add('has-risk');
        else if (s.grade === 2)        row.classList.add('has-moderate');
    }

    // Risk engine expandido
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

        // Fatores de risco adicionais
        const rfHigh = ['rf_toxicidade', 'rf_internacao', 'rf_neutropenia'];
        rfHigh.forEach(name => {
            const el = document.querySelector(`input[name="${name}"][value="sim"]:checked`);
            if (el) { highCount++; criteria.push({ text: el.closest('.rf-item')?.querySelector('span')?.textContent || name, level: 'red' }); }
        });

        // Suporte social
        const suporteSozinho = document.querySelector('input[name="suporte"][value="sozinho_sem_suporte"]:checked');
        if (suporteSozinho) { highCount++; criteria.push({ text: 'Mora sozinho sem suporte', level: 'red' }); }

        // Nutrição
        const nutRisk = document.querySelector('input[name="nutricao"][value="nao_alimentando"]:checked, input[name="nutricao"][value="liquidos"]:checked');
        if (nutRisk) { highCount++; criteria.push({ text: 'Condição nutricional crítica', level: 'red' }); }

        // Perda de peso
        const perdaRisk = document.querySelector('input[name="perda_peso"][value="mais_10"]:checked');
        if (perdaRisk) { highCount++; criteria.push({ text: 'Perda de peso > 10%', level: 'red' }); }

        let level = 'baixo';
        if (highCount > 0)     level = 'alto';
        else if (modCount > 0) level = 'moderado';
        state.riskLevel = level;
        updateRiskUI(level, criteria);
    }

    // Escuta fatores de risco, suporte, nutrição, perda de peso
    document.querySelectorAll('input[name^="rf_"], input[name="suporte"], input[name="nutricao"], input[name="perda_peso"]').forEach(el => {
        el.addEventListener('change', evaluateRisk);
    });

    function updateRiskUI(level, criteria) {
        const card  = document.getElementById('risk-level-card');
        const text  = document.getElementById('risk-level-text');
        const sub   = document.getElementById('risk-sublabel');
        const icon  = document.getElementById('risk-icon');
        const fill  = document.getElementById('risk-bar-fill');
        const thumb = document.getElementById('risk-bar-thumb');
        const badge = document.getElementById('risk-badge-inline');
        const dot   = document.querySelector('#sidebar-risk .risk-dot');
        const lbl   = document.getElementById('risk-label-sidebar');
        const list  = document.getElementById('criteria-list');

        const cfg = {
            baixo:    { cls:'green', label:'Baixo Risco',    sub:'Sem critérios de alerta',      pct:'5%',  icon:'<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>' },
            moderado: { cls:'amber', label:'Risco Moderado', sub:'Monitorar de perto',            pct:'50%', icon:'<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
            alto:     { cls:'red',   label:'Alto Risco',     sub:'Atenção imediata necessária',   pct:'92%', icon:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' },
        }[level];

        card.className        = `risk-level-card ${cfg.cls}`;
        text.textContent      = cfg.label;
        sub.textContent       = cfg.sub;
        icon.className        = `risk-icon ${cfg.cls}`;
        icon.innerHTML        = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${cfg.icon}</svg>`;
        fill.style.width      = cfg.pct;
        thumb.style.left      = cfg.pct;
        if (dot)   dot.className = `risk-dot ${cfg.cls}`;
        if (lbl)   lbl.textContent = cfg.label;
        if (badge) {
            badge.className = `risk-badge-inline ${cfg.cls === 'green' ? '' : cfg.cls}`;
            badge.innerHTML = `<span class="risk-dot-sm ${cfg.cls}"></span>${cfg.label}`;
        }
        list.innerHTML = criteria.length
            ? criteria.map(c => `<div class="criterion-item ${c.level}">${c.text}</div>`).join('')
            : '<div class="criteria-empty">Nenhum critério de risco identificado.</div>';
    }

    let sintomasTimer = null;
    async function autoSaveSintomas() {
        if (!state.consultaId) return;
        clearTimeout(sintomasTimer);
        sintomasTimer = setTimeout(async () => {
            const sintomas = Object.entries(state.symptoms)
                .filter(([,v]) => v.grade > 0 || v.isRisk)
                .map(([k,v]) => ({ tipo_sintoma: k, grau_ctcae: v.grade, alerta_risco: v.isRisk }));
            try { await api('PUT', `/consultas/${state.consultaId}/sintomas`, { sintomas, classificacao_risco_automatica: state.riskLevel }); } catch {}
        }, 1500);
    }

    // ── ABA 3: NANDA NIC NOC ──
    async function loadNanda(filter = '') {
        const list = document.getElementById('dx-list');
        if (state.nandaCache.length === 0) {
            list.innerHTML = '<div class="loading-state">Carregando base NANDA...</div>';
            try { state.nandaCache = await api('GET', '/referencia/nanda'); }
            catch { list.innerHTML = '<div class="loading-state" style="color:#DC2626">Erro ao carregar.</div>'; return; }
        }
        renderNandaList(filter);
    }

    function renderNandaList(filter = '') {
        const list     = document.getElementById('dx-list');
        const filtered = state.nandaCache.filter(dx =>
            dx.titulo_diagnostico.toLowerCase().includes(filter.toLowerCase())
        );
        if (!filtered.length) { list.innerHTML = '<div class="loading-state">Nenhum diagnóstico encontrado.</div>'; return; }
        list.innerHTML = filtered.map(dx => `
            <div class="dx-card${state.nandaSelectedCodigo === dx.codigo_nanda ? ' selected' : ''}" data-codigo="${dx.codigo_nanda}">
                <div class="dx-title">${dx.titulo_diagnostico}</div>
                <div class="dx-code">[${dx.codigo_nanda}] · ${dx.dominio || ''}</div>
            </div>`).join('');
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
            const data = await api('GET', `/referencia/nanda/${codigo}/sugestoes`);
            console.log('[NIC/NOC]', data);
            const intervencoes_nic = data.intervencoes_nic || [];
            const resultados_noc = data.resultados_noc || [];
            const nicHtml = intervencoes_nic.map(i => {
                const uid = `nic_${i.codigo_nic}`;
                const checked = state.selectedNicNoc.find(x => x.id === uid) ? ' checked' : '';
                const texto = (i.nome_intervencao||'').replace(/"/g,'&quot;');
                return `<div class="tag-item nic${checked}" data-id="${uid}" data-tipo="nic" data-codigo="${i.codigo_nic}" data-texto="${texto}">${i.nome_intervencao}<span class="tag-check">✓</span></div>`;
            }).join('');
            const nocHtml = resultados_noc.map(r => {
                const uid = `noc_${r.codigo_noc}`;
                const checked = state.selectedNicNoc.find(x => x.id === uid) ? ' checked' : '';
                const texto = (r.nome_resultado||'').replace(/"/g,'&quot;');
                return `<div class="tag-item noc${checked}" data-id="${uid}" data-tipo="noc" data-codigo="${r.codigo_noc}" data-texto="${texto}">${r.nome_resultado}<span class="tag-check">✓</span></div>`;
            }).join('');
            panel.innerHTML = `
                <div class="nic-noc-section-title nic-title">Intervenções NIC</div>
                <div class="tag-row">${nicHtml || '<div class="loading-state">Nenhuma intervenção.</div>'}</div>
                <div class="nic-noc-section-title noc-title">Resultados NOC</div>
                <div class="tag-row">${nocHtml || '<div class="loading-state">Nenhum resultado.</div>'}</div>`;
            panel.querySelectorAll('.tag-item').forEach(tag => {
                tag.addEventListener('click', () => {
                    tag.classList.toggle('checked');
                    if (tag.classList.contains('checked')) {
                        state.selectedNicNoc.push({ id: tag.dataset.id, tipo: tag.dataset.tipo, codigo: parseInt(tag.dataset.codigo), texto: tag.dataset.texto });
                    } else {
                        state.selectedNicNoc = state.selectedNicNoc.filter(x => x.id !== tag.dataset.id);
                    }
                    autoSavePlano();
                });
            });
        } catch { panel.innerHTML = '<div class="loading-state" style="color:#DC2626">Erro ao carregar.</div>'; }
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
                    intervencoes: state.selectedNicNoc.filter(x => x.tipo === 'nic').map(x => ({ codigo_nic: x.codigo })),
                    resultados_esperados: state.selectedNicNoc.filter(x => x.tipo === 'noc').map(x => ({ codigo_noc: x.codigo })),
                });
            } catch {}
        }, 1500);
    }

    // ── ABA 4: SEGUIMENTO ──
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
        if (!items.length) { panel.innerHTML = '<div class="empty-state-sm">Complete o Plano SAE para carregar as metas aqui.</div>'; return; }
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
            </div>`).join('');
    }

    // ── ABA 5: TAREFAS ──
    async function loadTarefas() {
        const tbody = document.getElementById('tasks-table-body');
        tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Carregando...</td></tr>';
        try {
            const tarefas = await api('GET', '/tarefas');
            renderTarefas(tarefas);
        } catch { tbody.innerHTML = '<tr><td colspan="7" class="table-empty" style="color:#DC2626">Erro ao carregar.</td></tr>'; }
    }

    function renderTarefas(tarefas) {
        const tbody = document.getElementById('tasks-table-body');
        if (!tarefas.length) { tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Nenhuma tarefa na agenda.</td></tr>'; return; }
        tbody.innerHTML = tarefas.map(t => `
            <tr>
                <td><span class="status-pill ${t.status}">${t.status}</span></td>
                <td style="font-weight:600">${t.iniciais_nome || '---'}</td>
                <td>${(t.tipo_tarefa||'').replace(/_/g,' ')}</td>
                <td><span class="priority-badge ${t.prioridade}">${t.prioridade === 'alta' ? 'Alta' : 'Padrão'}</span></td>
                <td>${t.data_prevista ? new Date(t.data_prevista).toLocaleDateString('pt-BR') : 'Hoje'}</td>
                <td>${t.responsavel || '---'}</td>
                <td><button class="btn-task-done" data-id="${t.id_tarefa}">Concluir</button></td>
            </tr>`).join('');
        tbody.querySelectorAll('.btn-task-done').forEach(btn => {
            btn.addEventListener('click', async () => {
                try { await api('PATCH', `/tarefas/${btn.dataset.id}`, { status: 'concluida' }); loadTarefas(); } catch {}
            });
        });
    }

    // Filtros de tarefas
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', async () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const filter = chip.dataset.filter;
            try {
                const url = filter === 'todas' ? '/tarefas' : `/tarefas?status=${filter}`;
                const tarefas = await api('GET', url);
                renderTarefas(tarefas);
            } catch {}
        });
    });

    // ── ABA 6: INDICADORES ──
    async function loadIndicators() {
        try {
            const tarefas = await api('GET', '/tarefas');
            const pendentes  = tarefas.filter(t => t.status === 'pendente').length;
            const concluidas = tarefas.filter(t => t.status === 'concluida').length;
            const agendadas  = tarefas.filter(t => t.status === 'agendada').length;
            const altoRisco  = tarefas.filter(t => t.prioridade === 'alta').length;
            document.getElementById('ind-tarefas-pend').textContent = pendentes;
            document.getElementById('ind-tarefas-conc').textContent = concluidas;
            document.getElementById('ind-total-atend').textContent  = tarefas.length;
            document.getElementById('ind-alto-risco').textContent   = altoRisco;
            document.getElementById('ind-seguimentos').textContent  = agendadas;
        } catch {}
        // Carregar pacientes para contar atendimentos
        try {
            const pacientes = await api('GET', '/pacientes/busca?q=');
            document.getElementById('ind-total-atend').textContent = pacientes.length || '--';
        } catch {}
    }

    // ── ABA 7: EVOLUÇÃO ──
    async function loadEvolution() {
        const area = document.getElementById('evolution-chart-area');
        if (!state.patient.id) return;
        try {
            const seguimentos = await api('GET', `/seguimentos/paciente/${state.patient.id}`);
            if (!seguimentos.length) return;
            const labels = seguimentos.map(s => new Date(s.created_at).toLocaleDateString('pt-BR'));
            const efetividade = seguimentos.map(s => s.efetividade === 'resolvido' ? 3 : s.efetividade === 'parcialmente_resolvido' ? 2 : 1);
            area.innerHTML = `
                <div style="padding:16px; overflow-x:auto;">
                    <div style="display:flex; align-items:flex-end; gap:12px; height:160px; border-bottom:1px solid #e2e8f0; min-width:300px;">
                        ${efetividade.map((v, i) => `
                            <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:6px;">
                                <div style="width:100%; background:${v===3?'#2CA76E':v===2?'#F5A623':'#DC2626'}; height:${v*40}px; border-radius:4px 4px 0 0; min-height:20px;"></div>
                                <div style="font-size:0.65rem; color:#6B7280; text-align:center">${labels[i]}</div>
                            </div>`).join('')}
                    </div>
                    <div style="display:flex; gap:16px; margin-top:12px; font-size:0.75rem;">
                        <span style="color:#2CA76E">● Resolvido</span>
                        <span style="color:#F5A623">● Parcial</span>
                        <span style="color:#DC2626">● Não resolvido</span>
                    </div>
                </div>`;
        } catch {}
    }

    // ── CONCLUIR ──
    document.getElementById('btn-concluir').addEventListener('click', async () => {
        const conduta    = document.getElementById('followup-conduta')?.value || '';
        const modalidade = document.getElementById('followup-modalidade')?.value || 'telefonico';
        const followupData = document.getElementById('followup-data')?.value || '';

        const sympsArr = Object.entries(state.symptoms)
            .filter(([,v]) => v.grade > 0 || v.isRisk)
            .map(([,v]) => `${v.label}: ${v.isRisk ? 'Sim (G3+)' : 'Grau '+v.grade}`);

        const riskLabels = { baixo:'BAIXO RISCO', moderado:'RISCO MODERADO', alto:'ALTO RISCO' };
        const enfermeiro = document.getElementById('enfermeiro')?.value || '';
        const tipoConsulta = document.getElementById('tipo-consulta')?.value || '';
        const peso = document.getElementById('peso')?.value || '';
        const altura = document.getElementById('altura')?.value || '';
        const asc = document.getElementById('asc')?.value || '';
        const pa = document.getElementById('ef-pa')?.value || '';
        const temp = document.getElementById('ef-temp')?.value || '';
        const sato2 = document.getElementById('ef-sato2')?.value || '';

        const plainText = `[GUIDENURSE ONCOLOGY — CONSULTA DE ENFERMAGEM ONCOLÓGICA]
Data/Hora: ${new Date().toLocaleString('pt-BR')}
Enfermeiro(a): ${enfermeiro}
Tipo de Consulta: ${tipoConsulta}

[IDENTIFICAÇÃO]
Paciente: ${state.patient.initials} | Reg: ${state.patient.reg}
Protocolo: ${document.getElementById('pac-protocol')?.value || '---'} | Ciclo: ${document.getElementById('pac-ciclo')?.value || '---'}

[DADOS CLÍNICOS]
Peso: ${peso}kg | Altura: ${altura}cm | ASC: ${asc}
ECOG: ${state.ecog || 'N/A'}
PA: ${pa} | Temp: ${temp}°C | SatO2: ${sato2}%

[TRIAGEM CTCAE]
Risco Estratificado: ${riskLabels[state.riskLevel]}
${sympsArr.length ? sympsArr.map(s => '▸ '+s).join('\n') : 'Sem toxicidade relatada.'}

[PLANO DE CUIDADO SAE]
Diagnóstico Principal: ${state.nandaSelectedTitle || 'Não avaliado'}
${state.selectedNicNoc.map(n => `▸ [${n.tipo.toUpperCase()}] ${n.texto}`).join('\n') || 'Nenhuma intervenção selecionada.'}

[CONDUTA DE SEGUIMENTO]
${conduta || 'Apenas registro assistencial.'}
${followupData ? 'Agendado para: '+new Date(followupData).toLocaleString('pt-BR') : ''}`;

        const riskCls = state.riskLevel === 'alto' ? 'risk-label-high' : state.riskLevel === 'moderado' ? 'risk-label-mod' : 'risk-label-low';
        const visualHtml = `
            <strong>Paciente:</strong> ${state.patient.initials} (${state.patient.reg})<br>
            <strong>Risco:</strong> <span class="${riskCls}">${riskLabels[state.riskLevel]}</span><br>
            <strong>Enfermeiro(a):</strong> ${enfermeiro}<br><br>
            <strong>Sintomas:</strong><br>
            ${sympsArr.length ? sympsArr.map(s=>`<span style="display:block;margin-left:8px">▸ ${s}</span>`).join('') : '<em>Nenhum</em>'}<br>
            <strong>Diagnóstico:</strong> ${state.nandaSelectedTitle || '—'}<br>
            ${state.selectedNicNoc.map(n=>`<span style="display:block;margin-left:8px">▸ [${n.tipo.toUpperCase()}] ${n.texto}</span>`).join('')}
            <br><strong>Conduta:</strong> ${conduta || 'Registro assistencial'}`;

        document.getElementById('summary-visual-preview').innerHTML = visualHtml;
        document.getElementById('summary-text').value = plainText;
        document.getElementById('summary-modal').style.display = 'flex';

        if (state.consultaId) {
            try {
                let tipo_tarefa = null, data_prevista_tarefa = null, prioridade_tarefa = 'padrao';
                if (conduta) {
                    tipo_tarefa = 'contato_telefonico';
                    if (conduta.includes('24h') || conduta.includes('imediato') || conduta.includes('intensivo')) prioridade_tarefa = 'alta';
                    if (followupData) {
                        data_prevista_tarefa = followupData.split('T')[0];
                    } else {
                        const d = new Date();
                        d.setDate(d.getDate() + (conduta.includes('48h') ? 2 : 1));
                        data_prevista_tarefa = d.toISOString().split('T')[0];
                    }
                }
                await api('POST', `/consultas/${state.consultaId}/concluir`, {
                    classificacao_risco_validada: state.riskLevel,
                    texto_copiavel_prontuario:    plainText,
                    plano_cuidado_resumido:        state.nandaSelectedTitle,
                    conduta_seguimento_definida:   conduta,
                    tipo_tarefa, data_prevista_tarefa, prioridade_tarefa,
                    responsavel: enfermeiro,
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
        e.target.textContent = '✓ Copiado para a Área de Transferência!';
        setTimeout(() => {
            e.target.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copiar para Prontuário`;
        }, 3000);
    });

    // Inicializa risk
    evaluateRisk();
});
