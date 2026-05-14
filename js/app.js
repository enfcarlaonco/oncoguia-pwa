/**
 * GuideNurse Oncology — app.js v3.0
 * Sistema completo com busca, cálculo ASC, risk engine expandido,
 * indicadores e evolução clínica
 */

const API_BASE = window.ONCOGUIA_API || 'https://oncoguia-api-production.up.railway.app/api';

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

const state = {
    patient:    { id: null, initials: '', reg: '', ciclo: '', protocol: '' },
    consultaId: null,
    ecog:       null,
    symptoms:   {},
    segSymptoms:{},
    riskLevel:  'baixo',
    nandaCache: [],
    plano:      [],
    focusDx:    null,
    focusNic:   null,
    pendingOrient: {},  // buffer temporário: { nicId: { orientacoes_paciente: [], orientacoes_familia: [] } }
};

function activateModule(targetId) {
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.nav-item, .tab').forEach(el => el.classList.remove('active'));
    const mod = document.getElementById(targetId);
    if (mod) mod.classList.add('active');
    document.querySelectorAll(`[data-target="${targetId}"]`).forEach(el => el.classList.add('active'));
    if (targetId === 'module-nanda')      loadNanda(document.getElementById('dx-search')?.value || '');
    if (targetId === 'module-followup')   buildFollowupPanel();
    if (targetId === 'module-tasks')      loadTarefas();
    if (targetId === 'module-indicators') loadIndicators();
    if (targetId === 'module-evolution')  loadEvolution();
}

// ── Constrói linhas clicáveis de orientação ──
// IMPORTANTE: recebe nicIdParam e selectedList explicitamente
function buildOrientLines(text, type, nicIdParam, selectedList) {
    if (!text || !text.trim()) return '';
    selectedList = selectedList || [];
    const linhas = text.split('\n').map(function(l){ return l.trim(); }).filter(function(l){ return l.length > 3; });
    if (!linhas.length) return '';
    return linhas.map(function(line) {
        const isActive = selectedList.indexOf(line) >= 0;
        return '<div class="orient-line' + (isActive ? ' selected' : '') + '"' +
            ' data-type="' + type + '"' +
            ' data-nicid="' + nicIdParam + '"' +
            ' data-line="' + line.replace(/"/g, '&quot;') + '">' +
            '<span class="orient-line-check">' + (isActive ? '✓' : '+') + '</span>' +
            '<span class="orient-line-text">' + line + '</span>' +
            '</div>';
    }).join('');
}

document.addEventListener('DOMContentLoaded', function() {

    document.querySelectorAll('[data-target]').forEach(function(el) {
        el.addEventListener('click', function() { activateModule(el.dataset.target); });
    });

    // ── TELA DE BUSCA ──
    const screenSearch = document.getElementById('screen-search');
    const appMain      = document.getElementById('app-main');

    function showApp()    { screenSearch.style.display = 'none';  appMain.style.display = 'flex'; }
    function showSearch() {
        screenSearch.style.display = 'flex'; appMain.style.display = 'none';
        document.getElementById('search-reg').value = '';
        document.getElementById('search-result').style.display = 'none';
    }

    document.getElementById('btn-back-search').addEventListener('click', showSearch);

    document.getElementById('btn-new-patient').addEventListener('click', function() {
        state.patient = { id: null, initials: '', reg: '', ciclo: '', protocol: '' };
        state.consultaId = null;
        state.plano = [];
        state.focusDx = null;
        state.focusNic = null;
        showApp();
        activateModule('module-id');
    });

    document.getElementById('btn-search').addEventListener('click', async function() {
        const q = document.getElementById('search-reg').value.trim();
        if (!q) return;
        const resultDiv = document.getElementById('search-result');
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div class="loading-state">Buscando...</div>';
        try {
            const pacientes = await api('GET', '/pacientes/busca?q=' + encodeURIComponent(q));
            if (!pacientes.length) {
                resultDiv.innerHTML = '<div class="search-not-found"><p>Paciente não encontrado com registro <strong>' + q + '</strong>.</p><button class="btn-primary mt-8" id="btn-cadastrar-novo">Cadastrar novo paciente</button></div>';
                document.getElementById('btn-cadastrar-novo').addEventListener('click', function() {
                    document.getElementById('reg-inst').value = q;
                    state.patient.reg = q;
                    showApp();
                    activateModule('module-id');
                });
                return;
            }
            resultDiv.innerHTML = pacientes.map(function(p) {
                return '<div class="search-patient-card" data-id="' + p.id_paciente + '" data-reg="' + p.registro_instituicao + '" data-iniciais="' + p.iniciais_nome + '">' +
                    '<div class="spc-avatar">' + p.iniciais_nome.substring(0,2) + '</div>' +
                    '<div class="spc-info"><strong>' + p.iniciais_nome + '</strong><span>Reg: ' + p.registro_instituicao + ' · ' + (p.protocolo_atual||'—') + '</span></div>' +
                    '<button class="btn-primary btn-sm">Selecionar</button></div>';
            }).join('');
            resultDiv.querySelectorAll('.search-patient-card').forEach(function(card) {
                card.querySelector('button').addEventListener('click', async function() {
                    state.patient.id       = parseInt(card.dataset.id);
                    state.patient.reg      = card.dataset.reg;
                    state.patient.initials = card.dataset.iniciais;
                    document.getElementById('display-patient-name').textContent = state.patient.initials;
                    document.getElementById('display-reg').textContent = state.patient.reg;
                    document.getElementById('patient-avatar').textContent = state.patient.initials.substring(0,2);
                    try {
                        const consulta = await api('POST', '/consultas', { id_paciente: state.patient.id, tipo_consulta: 'retorno' });
                        state.consultaId = consulta.id_consulta;
                    } catch(e) {}
                    showApp();
                    activateModule('module-triage');
                });
            });
        } catch(e) {
            resultDiv.innerHTML = '<div class="loading-state" style="color:#DC2626">Erro ao buscar. Tente novamente.</div>';
        }
    });

    document.getElementById('search-reg').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') document.getElementById('btn-search').click();
    });

    // ── IDENTIFICAÇÃO ──
    document.getElementById('pac-nascimento').addEventListener('change', function(e) {
        const nasc = new Date(e.target.value);
        const hoje = new Date();
        let idade = hoje.getFullYear() - nasc.getFullYear();
        const m = hoje.getMonth() - nasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
        document.getElementById('pac-idade').value = isNaN(idade) ? '' : idade;
    });

    document.getElementById('pac-iniciais').addEventListener('input', function(e) {
        e.target.value = e.target.value.toUpperCase();
        state.patient.initials = e.target.value;
        document.getElementById('display-patient-name').textContent = state.patient.initials || 'Novo Paciente';
        document.getElementById('patient-avatar').textContent = state.patient.initials.substring(0,2) || 'N/A';
    });

    document.getElementById('reg-inst').addEventListener('input', function(e) {
        state.patient.reg = e.target.value;
        document.getElementById('display-reg').textContent = e.target.value || '---';
    });

    document.getElementById('pac-ciclo').addEventListener('input', function(e) {
        document.getElementById('display-ciclo').textContent = e.target.value || '---';
    });

    document.getElementById('pac-protocol').addEventListener('input', function(e) {
        document.getElementById('display-protocol').textContent = e.target.value || '---';
    });

    document.getElementById('btn-salvar-id').addEventListener('click', async function() {
        const reg      = document.getElementById('reg-inst').value.trim();
        const iniciais = document.getElementById('pac-iniciais').value.trim();
        if (!reg || !iniciais) { alert('Preencha o Registro e as Iniciais do paciente.'); return; }
        try {
            const paciente = await api('POST', '/pacientes', {
                registro_instituicao: reg, iniciais_nome: iniciais,
                telefone_1: document.getElementById('pac-tel').value || null,
                telefone_2: document.getElementById('pac-tel2').value || null,
                nome_cuidador: document.getElementById('pac-cuidador').value || null,
                telefone_cuidador: document.getElementById('pac-tel-cuidador').value || null,
                protocolo_atual: document.getElementById('pac-protocol').value || null,
                ciclo_atual: parseInt(document.getElementById('pac-ciclo').value) || null,
                data_nascimento: document.getElementById('pac-nascimento').value || null,
                sexo: document.getElementById('pac-sexo').value || null,
                diagnostico_oncologico: document.getElementById('pac-dx').value || null,
                data_ultima_qt: document.getElementById('pac-ultima-qt').value || null,
                data_proxima_qt_prevista: document.getElementById('pac-proxima-qt').value || null,
            });
            state.patient.id = paciente.id_paciente;
            if (!state.consultaId) {
                const consulta = await api('POST', '/consultas', { id_paciente: state.patient.id, tipo_consulta: 'retorno' });
                state.consultaId = consulta.id_consulta;
            }
        } catch(e) {}
        activateModule('module-triage');
    });

    // ── ASC ──
    window.calcASC = function() {
        const peso = parseFloat(document.getElementById('peso').value);
        const altura = parseFloat(document.getElementById('altura').value);
        if (peso > 0 && altura > 0) {
            document.getElementById('asc').value = Math.sqrt((altura * peso) / 3600).toFixed(2) + ' m²';
        } else {
            document.getElementById('asc').value = '';
        }
    };

    document.getElementById('tipo-consulta').addEventListener('change', function(e) {
        document.getElementById('tipo-outro-group').style.display = e.target.value === 'Outro' ? 'block' : 'none';
    });

    // ── TRIAGEM ──
    document.querySelectorAll('input[name="ecog"]').forEach(function(radio) {
        radio.addEventListener('change', function(e) {
            state.ecog = e.target.value;
            document.querySelectorAll('.ecog-btn').forEach(function(b) { b.classList.remove('selected'); });
            e.target.closest('.ecog-btn').classList.add('selected');
            evaluateRisk();
            autoSaveSintomas();
        });
    });

    document.querySelectorAll('#symptoms-list .symptom-row').forEach(function(row) {
        const key   = row.dataset.sym;
        const label = row.querySelector('.sym-name') ? row.querySelector('.sym-name').textContent : key;
        if (row.querySelector('.sg')) {
            state.symptoms[key] = { label: label, grade: 0, isRisk: false };
            row.querySelectorAll('.sg').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    row.querySelectorAll('.sg').forEach(function(b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    const g = parseInt(btn.dataset.g);
                    state.symptoms[key].grade  = g;
                    state.symptoms[key].isRisk = btn.classList.contains('risk') && g > 0;
                    updateSymptomRowStyle(row, key);
                    evaluateRisk();
                    autoSaveSintomas();
                });
            });
        }
    });

    document.querySelectorAll('#seg-symptoms-list .symptom-row').forEach(function(row) {
        const key = row.dataset.sym;
        state.segSymptoms[key] = { grade: 0 };
        row.querySelectorAll('.sg').forEach(function(btn) {
            btn.addEventListener('click', function() {
                row.querySelectorAll('.sg').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.segSymptoms[key].grade = parseInt(btn.dataset.g);
            });
        });
    });

    function updateSymptomRowStyle(row, key) {
        row.classList.remove('has-risk', 'has-moderate');
        const s = state.symptoms[key];
        if (!s) return;
        if (s.grade >= 3 || s.isRisk) row.classList.add('has-risk');
        else if (s.grade === 2)        row.classList.add('has-moderate');
    }

    function evaluateRisk() {
        let highCount = 0, modCount = 0;
        const criteria = [];
        if (state.ecog === '3' || state.ecog === '4') {
            highCount++;
            criteria.push({ text: 'ECOG ' + state.ecog, level: 'red' });
        }
        Object.entries(state.symptoms).forEach(function(entry) {
            const s = entry[1];
            if (s.grade >= 3 || s.isRisk) { highCount++; criteria.push({ text: s.label + ': Grau ' + (s.grade||'3+'), level: 'red' }); }
            else if (s.grade === 2)        { modCount++;  criteria.push({ text: s.label + ': Grau 2', level: 'amber' }); }
        });
        ['rf_toxicidade','rf_internacao','rf_pa','rf_protocolo','rf_neutropenia','rf_idade','rf_sozinho','rf_acesso'].forEach(function(name) {
            const el = document.querySelector('input[name="' + name + '"][value="sim"]:checked');
            if (el) { highCount++; criteria.push({ text: el.closest('.rf-item') ? el.closest('.rf-item').querySelector('span').textContent : name, level: 'red' }); }
        });
        if (document.querySelector('input[name="suporte"][value="sozinho_sem_suporte"]:checked')) { highCount++; criteria.push({ text: 'Mora sozinho sem suporte', level: 'red' }); }
        if (document.querySelector('input[name="nutricao"][value="nao_alimentando"]:checked,input[name="nutricao"][value="liquidos"]:checked')) { highCount++; criteria.push({ text: 'Condição nutricional crítica', level: 'red' }); }
        if (document.querySelector('input[name="perda_peso"][value="mais_10"]:checked')) { highCount++; criteria.push({ text: 'Perda de peso > 10%', level: 'red' }); }
        let level = highCount > 0 ? 'alto' : modCount > 0 ? 'moderado' : 'baixo';
        state.riskLevel = level;
        updateRiskUI(level, criteria);
    }

    document.querySelectorAll('input[name^="rf_"],input[name="suporte"],input[name="nutricao"],input[name="perda_peso"]').forEach(function(el) {
        el.addEventListener('change', evaluateRisk);
    });

    function updateRiskUI(level, criteria) {
        const cfg = {
            baixo:    { cls:'green', label:'Baixo Risco',    sub:'Sem critérios de alerta',    pct:'5%',  icon:'<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>' },
            moderado: { cls:'amber', label:'Risco Moderado', sub:'Monitorar de perto',          pct:'50%', icon:'<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
            alto:     { cls:'red',   label:'Alto Risco',     sub:'Atenção imediata necessária', pct:'92%', icon:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' },
        }[level];
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
        if (card)  card.className   = 'risk-level-card ' + cfg.cls;
        if (text)  text.textContent = cfg.label;
        if (sub)   sub.textContent  = cfg.sub;
        if (icon)  { icon.className = 'risk-icon ' + cfg.cls; icon.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + cfg.icon + '</svg>'; }
        if (fill)  fill.style.width = cfg.pct;
        if (thumb) thumb.style.left = cfg.pct;
        if (dot)   dot.className    = 'risk-dot ' + cfg.cls;
        if (lbl)   lbl.textContent  = cfg.label;
        if (badge) { badge.className = 'risk-badge-inline ' + (cfg.cls === 'green' ? '' : cfg.cls); badge.innerHTML = '<span class="risk-dot-sm ' + cfg.cls + '"></span>' + cfg.label; }
        if (list)  list.innerHTML   = criteria.length ? criteria.map(function(c){ return '<div class="criterion-item ' + c.level + '">' + c.text + '</div>'; }).join('') : '<div class="criteria-empty">Nenhum critério de risco identificado.</div>';
    }

    let sintomasTimer = null;
    async function autoSaveSintomas() {
        if (!state.consultaId) return;
        clearTimeout(sintomasTimer);
        sintomasTimer = setTimeout(async function() {
            const sintomas = Object.entries(state.symptoms).filter(function(e){ return e[1].grade > 0 || e[1].isRisk; }).map(function(e){ return { tipo_sintoma: e[0], grau_ctcae: e[1].grade, alerta_risco: e[1].isRisk }; });
            try { await api('PUT', '/consultas/' + state.consultaId + '/sintomas', { sintomas: sintomas, classificacao_risco_automatica: state.riskLevel }); } catch(e) {}
        }, 1500);
    }

    // ══════════════════════════════════════════
    // ABA 3: PLANO SAE — 4 PAINÉIS
    // ══════════════════════════════════════════

    async function loadNanda(filter) {
        filter = filter || '';
        const list = document.getElementById('dx-list');
        if (state.nandaCache.length === 0) {
            list.innerHTML = '<div class="loading-state">Carregando diagnósticos...</div>';
            try {
                const result = await api('GET', '/referencia/nanda');
                console.log('[NANDA] carregados:', result.length);
                state.nandaCache = result;
            } catch(err) {
                list.innerHTML = '<div class="loading-state" style="color:#DC2626">Erro ao carregar. <button onclick="window.loadNanda()" style="color:#175C9D;background:none;border:none;cursor:pointer;text-decoration:underline">Tentar novamente</button></div>';
                return;
            }
        }
        renderNandaList(filter);
    }

    function renderNandaList(filter) {
        filter = filter || '';
        const list = document.getElementById('dx-list');
        const filtered = state.nandaCache.filter(function(dx) {
            return dx.titulo_diagnostico.toLowerCase().includes(filter.toLowerCase()) || dx.codigo_nanda.includes(filter);
        });
        if (!filtered.length) { list.innerHTML = '<div class="loading-state">Nenhum diagnóstico encontrado.</div>'; return; }
        list.innerHTML = filtered.map(function(dx) {
            const inPlan  = state.plano.find(function(p){ return p.codigo === dx.codigo_nanda; });
            const focused = state.focusDx === dx.codigo_nanda;
            return '<div class="dx-card' + (focused?' focused':'') + (inPlan?' in-plan':'') + '" data-codigo="' + dx.codigo_nanda + '" data-titulo="' + dx.titulo_diagnostico.replace(/"/g,'&quot;') + '">' +
                '<div class="dx-title">' + dx.titulo_diagnostico + '</div>' +
                '<div class="dx-code">[' + dx.codigo_nanda + '] · ' + (dx.dominio||'') + '</div></div>';
        }).join('');
        list.querySelectorAll('.dx-card').forEach(function(card) {
            card.addEventListener('click', function() {
                state.focusDx  = card.dataset.codigo;
                state.focusNic = null;
                renderNandaList(document.getElementById('dx-search') ? document.getElementById('dx-search').value : '');
                loadNicNoc(card.dataset.codigo, card.dataset.titulo);
                document.getElementById('orient-panel').innerHTML = '<div class="empty-panel"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><p>Selecione uma intervenção NIC para ver as orientações</p></div>';
            });
        });
        const badge = document.getElementById('dx-count-badge');
        if (badge) { badge.textContent = state.plano.length; badge.className = 'card-badge' + (state.plano.length > 0 ? ' has-items' : ''); }
    }

    async function loadNicNoc(codigo, titulo) {
        const panel   = document.getElementById('nic-noc-panel');
        const titleEl = document.getElementById('nicnoc-title');
        if (titleEl) titleEl.textContent = titulo || 'NIC e NOC';
        panel.innerHTML = '<div class="loading-state" style="padding:16px">Carregando...</div>';
        try {
            const data = await api('GET', '/referencia/nanda/' + codigo + '/sugestoes');
            const intervencoes_nic = data.intervencoes_nic || [];
            const resultados_noc   = data.resultados_noc   || [];

            // DEBUG
            if (intervencoes_nic.length > 0) {
                const p = intervencoes_nic[0];
                console.log('[API campos]', Object.keys(p));
                console.log('[orientacao_paciente]', (p.orientacao_paciente||'').substring(0,80));
                console.log('[contexto_uso]', (p.contexto_uso||'').substring(0,80));
            }

            const planDx       = state.plano.find(function(p){ return p.codigo === codigo; });
            const selectedNics = planDx ? planDx.nics.map(function(n){ return n.id; }) : [];
            const selectedNocs = planDx ? planDx.nocs.map(function(n){ return n.id; }) : [];
            const dxData       = state.nandaCache.find(function(d){ return d.codigo_nanda === codigo; });
            const enunciado    = dxData ? (dxData.enunciado_pes || '') : '';

            const nicHtml = intervencoes_nic.map(function(i) {
                const uid       = 'nic_' + i.codigo_nic;
                const checked   = selectedNics.indexOf(uid) >= 0 ? ' checked' : '';
                const focused   = state.focusNic === uid ? ' focused' : '';
                const texto     = (i.nome_intervencao||'').replace(/"/g,'&quot;');
                // Col E = orientacao_paciente | Col F = contexto_uso (família)
                const orientPac = (i.orientacao_paciente || i.orientacao_paciente_sugerida || '').trim();
                const orientFam = (i.contexto_uso || '').trim();
                const hasOrient = orientPac.length > 0 || orientFam.length > 0;
                // Armazena como atributos data-* — sem codificação especial, apenas escapa aspas
                return '<div class="tag-item nic' + checked + focused + '"' +
                    ' data-id="' + uid + '"' +
                    ' data-tipo="nic"' +
                    ' data-codigo="' + i.codigo_nic + '"' +
                    ' data-texto="' + texto + '"' +
                    ' data-orient-pac="' + orientPac.replace(/"/g,'&quot;').replace(/\n/g,'&#10;') + '"' +
                    ' data-orient-fam="' + orientFam.replace(/"/g,'&quot;').replace(/\n/g,'&#10;') + '">' +
                    i.nome_intervencao +
                    (hasOrient ? ' <span style="font-size:0.65rem;opacity:0.6">📋</span>' : '') +
                    '<span class="tag-check">✓</span></div>';
            }).join('') || '<div class="loading-state">Nenhuma intervenção cadastrada.</div>';

            const nocHtml = resultados_noc.map(function(r) {
                const uid     = 'noc_' + r.codigo_noc;
                const checked = selectedNocs.indexOf(uid) >= 0 ? ' checked' : '';
                const texto   = (r.nome_resultado||'').replace(/"/g,'&quot;');
                return '<div class="tag-item noc' + checked + '" data-id="' + uid + '" data-tipo="noc" data-codigo="' + r.codigo_noc + '" data-texto="' + texto + '">' +
                    r.nome_resultado + '<span class="tag-check">✓</span></div>';
            }).join('') || '<div class="loading-state">Nenhum resultado cadastrado.</div>';

            panel.innerHTML =
                '<div class="nicnoc-dx-header">' +
                    '<div class="dx-name">' + titulo + '</div>' +
                    (enunciado ? '<div class="dx-enunciado">' + enunciado.replace(/Enunciado P[EPS]+[^:]*:/g,'').trim() + '</div>' : '') +
                '</div>' +
                '<div class="nic-noc-section-title nic-title"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/></svg> Intervenções NIC</div>' +
                '<div class="tag-row" id="nic-tags">' + nicHtml + '</div>' +
                '<div class="nic-noc-section-title noc-title" style="margin-top:12px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> Resultados NOC</div>' +
                '<div class="tag-row" id="noc-tags">' + nocHtml + '</div>' +
                '<button class="btn-add-dx-plan" id="btn-add-dx-plan" data-codigo="' + codigo + '" data-titulo="' + (titulo||'').replace(/"/g,'&quot;') + '" data-enunciado="' + enunciado.replace(/"/g,'&quot;') + '">' +
                '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
                (planDx ? 'Atualizar no Plano' : 'Adicionar ao Plano') + '</button>';

            // Clique em NIC → Painel 3
            panel.querySelectorAll('.tag-item.nic').forEach(function(tag) {
                tag.addEventListener('click', function() {
                    tag.classList.toggle('checked');
                    state.focusNic = tag.dataset.id;
                    panel.querySelectorAll('.tag-item.nic').forEach(function(t){ t.classList.remove('focused'); });
                    tag.classList.add('focused');
                    // Decodifica &#10; de volta para \n
                    const pac = (tag.dataset.orientPac||'').replace(/&#10;/g,'\n');
                    const fam = (tag.dataset.orientFam||'').replace(/&#10;/g,'\n');
                    console.log('[PAC]', pac.length, pac.substring(0,60));
                    console.log('[FAM]', fam.length, fam.substring(0,60));
                    renderOrientPanel(tag.dataset.texto, pac, fam, tag.dataset.id);
                });
            });

            // Clique em NOC
            panel.querySelectorAll('.tag-item.noc').forEach(function(tag) {
                tag.addEventListener('click', function(){ tag.classList.toggle('checked'); });
            });

            // Adicionar ao Plano
            document.getElementById('btn-add-dx-plan').addEventListener('click', function(e) {
                const dxCodigo = e.currentTarget.dataset.codigo;
                const dxTitulo = e.currentTarget.dataset.titulo;
                const dxEnunc  = e.currentTarget.dataset.enunciado;

                // Captura as linhas atualmente selecionadas no painel de orientação (NIC focada)
                const currentOrientPac = Array.from(document.querySelectorAll('#orient-panel .orient-line.selected[data-type="orientacoes_paciente"]')).map(function(el){ return el.dataset.line; });
                const currentOrientFam = Array.from(document.querySelectorAll('#orient-panel .orient-line.selected[data-type="orientacoes_familia"]')).map(function(el){ return el.dataset.line; });

                const nicsSelected = Array.from(panel.querySelectorAll('.tag-item.nic.checked')).map(function(t) {
                    const existingDx  = state.plano.find(function(p){ return p.codigo === dxCodigo; });
                    const existingNic = existingDx ? existingDx.nics.find(function(n){ return n.id === t.dataset.id; }) : null;
                    const isFocused   = t.dataset.id === state.focusNic;
                    const pending     = state.pendingOrient[t.dataset.id] || {};
                    // Prioridade: DOM (NIC focada) > buffer pendente > estado existente > vazio
                    const orientPac = isFocused && currentOrientPac.length
                        ? currentOrientPac
                        : (pending.orientacoes_paciente && pending.orientacoes_paciente.length
                            ? pending.orientacoes_paciente
                            : (existingNic ? (existingNic.orientacoes_paciente || []) : []));
                    const orientFam = isFocused && currentOrientFam.length
                        ? currentOrientFam
                        : (pending.orientacoes_familia && pending.orientacoes_familia.length
                            ? pending.orientacoes_familia
                            : (existingNic ? (existingNic.orientacoes_familia  || []) : []));
                    return {
                        id: t.dataset.id, codigo: parseInt(t.dataset.codigo), nome: t.dataset.texto,
                        orientacoes_paciente: orientPac,
                        orientacoes_familia:  orientFam,
                        _pac: (t.dataset.orientPac||'').replace(/&#10;/g,'\n'),
                        _fam: (t.dataset.orientFam||'').replace(/&#10;/g,'\n')
                    };
                });
                const nocsSelected = Array.from(panel.querySelectorAll('.tag-item.noc.checked')).map(function(t) {
                    return { id: t.dataset.id, codigo: parseInt(t.dataset.codigo), nome: t.dataset.texto };
                });
                state.plano = state.plano.filter(function(p){ return p.codigo !== dxCodigo; });
                state.plano.push({ codigo: dxCodigo, titulo: dxTitulo, enunciado: dxEnunc, nics: nicsSelected, nocs: nocsSelected });
                renderPlanoMontado();
                renderNandaList(document.getElementById('dx-search') ? document.getElementById('dx-search').value : '');
                autoSavePlano();
            });

        } catch(err) {
            console.error('[NIC/NOC]', err);
            panel.innerHTML = '<div class="loading-state" style="color:#DC2626">Erro ao carregar.</div>';
        }
    }

    // ── Painel 3: Orientações ──
    function renderOrientPanel(nomeNic, orientPac, orientFam, nicId) {
        const panel  = document.getElementById('orient-panel');
        const hasPac = orientPac && orientPac.trim().length > 3;
        const hasFam = orientFam && orientFam.trim().length > 3;

        if (!hasPac && !hasFam) {
            panel.innerHTML = '<div class="empty-panel"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/></svg><p style="font-size:0.78rem">Nenhuma orientação cadastrada.</p></div>';
            return;
        }

        // Busca selecionadas já no plano
        function getSelected(type) {
            const pd = state.plano.find(function(p){ return p.codigo === state.focusDx; });
            const pn = pd ? pd.nics.find(function(n){ return n.id === nicId; }) : null;
            return pn ? (pn[type] || []) : [];
        }

        let html = '<div class="orient-nic-header"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/></svg> NIC: ' + nomeNic + '</div>';

        if (hasPac) {
            html += '<div class="orient-section-header pac"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Orientações ao Paciente</div>';
            html += '<div class="orient-lines-group">' + buildOrientLines(orientPac, 'orientacoes_paciente', nicId, getSelected('orientacoes_paciente')) + '</div>';
        }
        if (hasFam) {
            html += '<div class="orient-section-header fam"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> Orientações à Família / Cuidador</div>';
            html += '<div class="orient-lines-group">' + buildOrientLines(orientFam, 'orientacoes_familia', nicId, getSelected('orientacoes_familia')) + '</div>';
        }

        panel.innerHTML = html;

        // Toggle seleção de cada linha
        panel.querySelectorAll('.orient-line').forEach(function(line) {
            line.addEventListener('click', function() {
                const type     = line.dataset.type;
                const lineText = line.dataset.line;
                line.classList.toggle('selected');
                const sel = line.classList.contains('selected');
                line.querySelector('.orient-line-check').textContent = sel ? '✓' : '+';

                const planDx  = state.plano.find(function(p){ return p.codigo === state.focusDx; });
                const planNic = planDx ? planDx.nics.find(function(n){ return n.id === nicId; }) : null;

                if (planNic) {
                    // NIC já no plano — atualiza diretamente
                    if (!planNic[type]) planNic[type] = [];
                    if (sel) { if (planNic[type].indexOf(lineText) < 0) planNic[type].push(lineText); }
                    else     { planNic[type] = planNic[type].filter(function(l){ return l !== lineText; }); }
                    renderPlanoMontado();
                } else {
                    // NIC ainda não no plano — salva no buffer temporário
                    if (!state.pendingOrient[nicId]) state.pendingOrient[nicId] = { orientacoes_paciente: [], orientacoes_familia: [] };
                    const buf = state.pendingOrient[nicId][type];
                    if (sel) { if (buf.indexOf(lineText) < 0) buf.push(lineText); }
                    else     { state.pendingOrient[nicId][type] = buf.filter(function(l){ return l !== lineText; }); }
                }
            });
        });
    }

    // ── Painel 4: Plano Montado ──
    function renderPlanoMontado() {
        const el    = document.getElementById('plano-montado');
        const badge = document.getElementById('dx-count-badge');
        if (badge) { badge.textContent = state.plano.length; badge.className = 'card-badge' + (state.plano.length > 0 ? ' has-items' : ''); }
        if (!state.plano.length) {
            el.innerHTML = '<div class="empty-panel" style="min-height:160px"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg><p>Plano aparece aqui</p></div>';
            return;
        }
        el.innerHTML = state.plano.map(function(dx) {
            return '<div class="plano-dx-block">' +
                '<div class="plano-dx-header"><div><div class="plano-dx-name">' + dx.titulo + '</div><div class="plano-dx-code">[' + dx.codigo + '] · ' + dx.nics.length + ' NIC · ' + dx.nocs.length + ' NOC</div></div>' +
                '<button class="btn-remove-dx" onclick="removeDxFromPlan(\'' + dx.codigo + '\')" title="Remover">✕</button></div>' +
                '<div class="plano-dx-body">' +
                dx.nics.map(function(n) {
                    const pac = (n.orientacoes_paciente||[]).length;
                    const fam = (n.orientacoes_familia||[]).length;
                    return '<div class="plano-item nic"><span class="plano-item-badge">NIC</span>' +
                        '<span class="plano-item-text">' + n.nome + (pac||fam ? ' <span style="font-size:0.68rem;color:var(--green)">(' + pac + 'p/' + fam + 'f)</span>' : '') + '</span>' +
                        '<button class="plano-item-remove" onclick="removeItemFromPlan(\'' + dx.codigo + '\',\'nic\',\'' + n.id + '\')" title="Remover">✕</button></div>';
                }).join('') +
                dx.nocs.map(function(n) {
                    return '<div class="plano-item noc"><span class="plano-item-badge">NOC</span><span class="plano-item-text">' + n.nome + '</span>' +
                        '<button class="plano-item-remove" onclick="removeItemFromPlan(\'' + dx.codigo + '\',\'noc\',\'' + n.id + '\')" title="Remover">✕</button></div>';
                }).join('') +
                '</div></div>';
        }).join('');
    }

    window.removeDxFromPlan = function(codigo) {
        state.plano = state.plano.filter(function(p){ return p.codigo !== codigo; });
        // Limpa buffer temporário de orientações pendentes associadas a este DX
        Object.keys(state.pendingOrient).forEach(function(k){ delete state.pendingOrient[k]; });
        if (state.focusDx === codigo) {
            state.focusDx = null;
            document.getElementById('nic-noc-panel').innerHTML = '<div class="empty-panel"><p>Clique em um diagnóstico</p></div>';
            document.getElementById('orient-panel').innerHTML  = '<div class="empty-panel"><p>Selecione uma intervenção NIC</p></div>';
        }
        renderPlanoMontado();
        renderNandaList(document.getElementById('dx-search') ? document.getElementById('dx-search').value : '');
        autoSavePlano();
    };

    window.removeItemFromPlan = function(dxCodigo, tipo, itemId) {
        const dx = state.plano.find(function(p){ return p.codigo === dxCodigo; });
        if (!dx) return;
        if (tipo === 'nic') dx.nics = dx.nics.filter(function(n){ return n.id !== itemId; });
        if (tipo === 'noc') dx.nocs = dx.nocs.filter(function(n){ return n.id !== itemId; });
        renderPlanoMontado();
        autoSavePlano();
    };

    document.getElementById('dx-search').addEventListener('input', function(e) { renderNandaList(e.target.value); });

    let planoTimer = null;
    async function autoSavePlano() {
        if (!state.consultaId || !state.plano.length) return;
        clearTimeout(planoTimer);
        planoTimer = setTimeout(async function() {
            try {
                await api('PUT', '/consultas/' + state.consultaId + '/plano', {
                    diagnosticos: state.plano.map(function(dx,i){ return { codigo_nanda: dx.codigo, prioridade: i+1, origem: 'selecionado' }; }),
                    intervencoes: state.plano.flatMap(function(dx){ return dx.nics.map(function(n){ return { codigo_nic: n.codigo }; }); }),
                    resultados_esperados: state.plano.flatMap(function(dx){ return dx.nocs.map(function(n){ return { codigo_noc: n.codigo }; }); })
                });
            } catch(err) { console.warn('[autoSavePlano]', err.message); }
        }, 1500);
    }

    // ── SEGUIMENTO ──
    window.buildFollowupPanel = async function buildFollowupPanel() {
        const panel = document.getElementById('followup-actions-panel');
        let items = [];
        if (state.plano && state.plano.length) {
            state.plano.forEach(function(dx) {
                dx.nics.forEach(function(n){ items.push({ id: n.id, tipo: 'nic', texto: n.nome, dx: dx.titulo }); });
                dx.nocs.forEach(function(n){ items.push({ id: n.id, tipo: 'noc', texto: n.nome, dx: dx.titulo }); });
            });
        }
        if (!items.length && state.consultaId) {
            try {
                const plano = await api('GET', '/consultas/' + state.consultaId + '/plano');
                items = plano.intervencoes.map(function(i){ return { id: 'nic_'+i.codigo_nic, tipo:'nic', texto: i.nome_intervencao||'NIC '+i.codigo_nic }; })
                    .concat(plano.resultados_esperados.map(function(r){ return { id: 'noc_'+r.codigo_noc, tipo:'noc', texto: r.nome_resultado||'NOC '+r.codigo_noc }; }));
            } catch(e) {}
        }
        if (!items.length) { panel.innerHTML = '<div class="empty-state-sm">Complete o Plano SAE para carregar as metas aqui.</div>'; return; }
        panel.innerHTML = items.map(function(item) {
            return '<div class="followup-item"><span class="followup-badge ' + item.tipo + '">' + item.tipo.toUpperCase() + '</span>' +
                '<span class="followup-text">' + item.texto + (item.dx ? ' <span style="color:var(--text-light);font-size:0.7rem">(' + item.dx + ')</span>' : '') + '</span>' +
                '<select class="followup-select" data-id="' + item.id + '"><option value="">Status...</option><option value="resolvido">Resolvido ✓</option><option value="parcialmente_resolvido">Parcialmente resolvido</option><option value="nao_resolvido">Não resolvido</option><option value="piorou">Piorou ↓</option></select></div>';
        }).join('');
    }

    document.getElementById('btn-salvar-seguimento').addEventListener('click', async function() {
        if (!state.patient.id) { alert('Selecione um paciente antes de salvar o seguimento.'); return; }
        const modalidade  = document.getElementById('seg-modalidade').value;
        const momento     = document.getElementById('seg-momento').value;
        const ciclo       = parseInt(document.getElementById('seg-ciclo').value) || null;
        const enfermeiro  = document.getElementById('seg-enfermeiro').value.trim();
        const conduta     = document.getElementById('seg-conduta').value;
        const proxData    = document.getElementById('seg-prox-data').value || null;
        const necessita   = !!conduta;

        const sintomas = Object.entries(state.segSymptoms)
            .filter(function(e){ return e[1].grade > 0; })
            .map(function(e){ return { tipo_sintoma: e[0], grau_ctcae: e[1].grade }; });

        const condutas = Array.from(document.querySelectorAll('#followup-actions-panel .followup-select'))
            .filter(function(s){ return s.value; })
            .map(function(s){ return s.closest('.followup-item').querySelector('.followup-text').textContent.trim() + ': ' + s.value; });

        const resumo = condutas.join('\n') || '';

        const btn = document.getElementById('btn-salvar-seguimento');
        btn.disabled = true;
        btn.textContent = 'Salvando...';
        try {
            await api('POST', '/seguimentos', {
                id_paciente:              state.patient.id,
                id_consulta_origem:       state.consultaId || null,
                modalidade:               modalidade,
                momento_seguimento:       momento || null,
                ciclo_referencia:         ciclo,
                enfermeiro_oncologista:   enfermeiro || null,
                mini_triagem_resumo:      resumo || null,
                conduta_realizada:        conduta || null,
                efetividade:              null,
                necessita_novo_seguimento: necessita,
                sintomas:                 sintomas,
            });
            btn.textContent = '✓ Seguimento salvo!';
            btn.style.background = 'var(--green)';
            if (proxData) {
                await api('POST', '/consultas/' + (state.consultaId || 0) + '/concluir', {
                    classificacao_risco_validada: state.riskLevel,
                    conduta_seguimento_definida: conduta,
                    tipo_tarefa: conduta ? 'contato_telefonico' : null,
                    data_prevista_tarefa: proxData ? proxData.split('T')[0] : null,
                    prioridade_tarefa: 'padrao',
                    responsavel: enfermeiro,
                }).catch(function(){});
            }
            setTimeout(function() {
                btn.disabled = false;
                btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Salvar Seguimento';
                btn.style.background = '';
            }, 3000);
        } catch(e) {
            btn.disabled = false;
            btn.textContent = 'Erro ao salvar. Tente novamente.';
            btn.style.background = '#DC2626';
            setTimeout(function(){ btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Salvar Seguimento'; btn.style.background = ''; }, 3000);
        }
    });

    // ── TAREFAS ──
    async function loadTarefas() {
        const tbody = document.getElementById('tasks-table-body');
        tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Carregando...</td></tr>';
        try { renderTarefas(await api('GET', '/tarefas')); }
        catch(e) { tbody.innerHTML = '<tr><td colspan="7" class="table-empty" style="color:#DC2626">Erro ao carregar.</td></tr>'; }
    }

    function renderTarefas(tarefas) {
        const tbody = document.getElementById('tasks-table-body');
        if (!tarefas.length) { tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Nenhuma tarefa na agenda.</td></tr>'; return; }
        tbody.innerHTML = tarefas.map(function(t) {
            return '<tr><td><span class="status-pill ' + t.status + '">' + t.status + '</span></td>' +
                '<td style="font-weight:600">' + (t.iniciais_nome||'---') + '</td>' +
                '<td>' + (t.tipo_tarefa||'').replace(/_/g,' ') + '</td>' +
                '<td><span class="priority-badge ' + t.prioridade + '">' + (t.prioridade==='alta'?'Alta':'Padrão') + '</span></td>' +
                '<td>' + (t.data_prevista ? new Date(t.data_prevista).toLocaleDateString('pt-BR') : 'Hoje') + '</td>' +
                '<td>' + (t.responsavel||'---') + '</td>' +
                '<td><button class="btn-task-done" data-id="' + t.id_tarefa + '">Concluir</button></td></tr>';
        }).join('');
        tbody.querySelectorAll('.btn-task-done').forEach(function(btn) {
            btn.addEventListener('click', async function() {
                try { await api('PATCH', '/tarefas/'+btn.dataset.id, { status: 'concluida' }); loadTarefas(); } catch(e) {}
            });
        });
    }

    document.querySelectorAll('.filter-chip').forEach(function(chip) {
        chip.addEventListener('click', async function() {
            document.querySelectorAll('.filter-chip').forEach(function(c){ c.classList.remove('active'); });
            chip.classList.add('active');
            try { renderTarefas(await api('GET', chip.dataset.filter === 'todas' ? '/tarefas' : '/tarefas?status='+chip.dataset.filter)); } catch(e) {}
        });
    });

    // ── INDICADORES ──
    async function loadIndicators() {
        try {
            const tarefas = await api('GET', '/tarefas');
            const pend = tarefas.filter(function(t){ return t.status==='pendente'; }).length;
            const conc = tarefas.filter(function(t){ return t.status==='concluida'; }).length;
            const alt  = tarefas.filter(function(t){ return t.prioridade==='alta'; }).length;
            const pend_agen = tarefas.filter(function(t){ return t.status==='agendada'; }).length;
            if (document.getElementById('ind-tarefas-pend')) document.getElementById('ind-tarefas-pend').textContent = pend + pend_agen;
            if (document.getElementById('ind-tarefas-conc')) document.getElementById('ind-tarefas-conc').textContent = conc;
            if (document.getElementById('ind-alto-risco'))   document.getElementById('ind-alto-risco').textContent   = alt;
        } catch(e) {}
        try {
            const pac = await api('GET', '/pacientes/busca?q=');
            if (document.getElementById('ind-total-atend')) document.getElementById('ind-total-atend').textContent = pac.length || '--';
        } catch(e) {
            if (document.getElementById('ind-total-atend')) document.getElementById('ind-total-atend').textContent = '--';
        }
        try {
            if (state.patient.id) {
                const segs = await api('GET', '/seguimentos/paciente/' + state.patient.id);
                if (document.getElementById('ind-seguimentos')) document.getElementById('ind-seguimentos').textContent = segs.length;
                if (document.getElementById('ind-pendencias'))  document.getElementById('ind-pendencias').textContent  = '--';
            }
        } catch(e) {}
    }

    // ── EVOLUÇÃO ──
    async function loadEvolution() {
        const area = document.getElementById('evolution-chart-area');
        if (!state.patient.id || !area) return;
        try {
            const segs = await api('GET', '/seguimentos/paciente/'+state.patient.id);
            if (!segs.length) return;
            const labels = segs.map(function(s){ return new Date(s.created_at).toLocaleDateString('pt-BR'); });
            const vals   = segs.map(function(s){ return s.efetividade==='resolvido'?3:s.efetividade==='parcialmente_resolvido'?2:1; });
            area.innerHTML = '<div style="padding:16px;overflow-x:auto;"><div style="display:flex;align-items:flex-end;gap:12px;height:160px;border-bottom:1px solid #e2e8f0;">' +
                vals.map(function(v,i){ return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;"><div style="width:100%;background:' + (v===3?'#2CA76E':v===2?'#F5A623':'#DC2626') + ';height:' + (v*40) + 'px;border-radius:4px 4px 0 0;min-height:20px;"></div><div style="font-size:0.65rem;color:#6B7280">' + labels[i] + '</div></div>'; }).join('') +
                '</div><div style="display:flex;gap:16px;margin-top:12px;font-size:0.75rem;"><span style="color:#2CA76E">● Resolvido</span><span style="color:#F5A623">● Parcial</span><span style="color:#DC2626">● Não resolvido</span></div></div>';
        } catch(e) {}
    }

    // ── CONCLUIR ──
    document.getElementById('btn-concluir').addEventListener('click', async function() {
        const conduta      = (document.getElementById('followup-conduta')?.value || '');
        const followupData = (document.getElementById('followup-data')?.value || '');
        const enfermeiro   = (document.getElementById('enfermeiro')?.value || '');
        const tipoConsulta = (document.getElementById('tipo-consulta')?.value || '');
        const peso         = (document.getElementById('peso')?.value || '');
        const altura       = (document.getElementById('altura')?.value || '');
        const asc          = (document.getElementById('asc')?.value || '');
        const pa           = (document.getElementById('ef-pa')?.value || '');
        const temp         = (document.getElementById('ef-temp')?.value || '');
        const sato2        = (document.getElementById('ef-sato2')?.value || '');

        const sympsArr = Object.entries(state.symptoms)
            .filter(function(e){ return e[1].grade > 0 || e[1].isRisk; })
            .map(function(e){ return e[1].label + ': ' + (e[1].isRisk ? 'Sim (G3+)' : 'Grau ' + e[1].grade); });

        const riskLabels = { baixo:'BAIXO RISCO', moderado:'RISCO MODERADO', alto:'ALTO RISCO' };
        const saePlan    = (state.plano || []);

        const saeText = saePlan.length
            ? saePlan.map(function(dx) {
                const nics = dx.nics.map(function(n){ return '     ▸ [NIC] ' + n.nome; }).join('\n');
                const nocs = dx.nocs.map(function(n){ return '     ▸ [NOC] ' + n.nome; }).join('\n');
                return '▸ ' + dx.titulo.toUpperCase() + ' [' + dx.codigo + ']\n' + nics + (nics&&nocs?'\n':'') + nocs;
            }).join('\n\n')
            : 'Nenhum diagnóstico selecionado.';

        const todasOrientPac = saePlan.flatMap(function(dx){ return dx.nics.flatMap(function(n){ return n.orientacoes_paciente||[]; }); }).filter(function(o){ return o && o.trim(); });
        const todasOrientFam = saePlan.flatMap(function(dx){ return dx.nics.flatMap(function(n){ return n.orientacoes_familia||[]; }); }).filter(function(o){ return o && o.trim(); });

        const plainText =
'CONSULTA DE ENFERMAGEM - GESTOR DO CUIDADO\n' +
'Data/Hora: ' + new Date().toLocaleString('pt-BR') + '\n' +
'Enfermeiro(a): ' + enfermeiro + '\n' +
'Tipo de Consulta: ' + tipoConsulta + '\n\n' +
'[IDENTIFICAÇÃO]\n' +
'Paciente: ' + state.patient.initials + ' | Reg: ' + state.patient.reg + '\n' +
'Protocolo: ' + (document.getElementById('pac-protocol')?.value||'---') + ' | Ciclo: ' + (document.getElementById('pac-ciclo')?.value||'---') + '\n\n' +
'[DADOS CLÍNICOS]\n' +
'Peso: ' + peso + 'kg | Altura: ' + altura + 'cm | ASC: ' + asc + '\n' +
'ECOG: ' + (state.ecog||'N/A') + '\n' +
'PA: ' + pa + ' | Temp: ' + temp + '°C | SatO2: ' + sato2 + '%\n\n' +
'[TRIAGEM CTCAE]\n' +
'Risco Estratificado: ' + riskLabels[state.riskLevel] + '\n' +
(sympsArr.length ? sympsArr.map(function(s){ return '▸ '+s; }).join('\n') : 'Sem toxicidade relatada.') + '\n\n' +
'[PLANO DE CUIDADO SAE — ' + saePlan.length + ' diagnóstico(s)]\n' +
saeText + '\n\n' +
'[CONDUTA DE SEGUIMENTO]\n' +
(conduta || 'Apenas registro assistencial.') + '\n' +
(followupData ? 'Agendado para: ' + new Date(followupData).toLocaleString('pt-BR') : '') +
(todasOrientPac.length ? '\n\n[ORIENTAÇÃO AO PACIENTE]\n' + todasOrientPac.map(function(o){ return o.trim(); }).join('\n') : '') +
(todasOrientFam.length ? '\n\n[ORIENTAÇÃO AO ACOMPANHANTE / FAMILIAR]\n' + todasOrientFam.map(function(o){ return o.trim(); }).join('\n') : '');

        const riskCls = state.riskLevel==='alto'?'risk-label-high':state.riskLevel==='moderado'?'risk-label-mod':'risk-label-low';
        const visualHtml =
            '<strong>Paciente:</strong> ' + state.patient.initials + ' (' + state.patient.reg + ')<br>' +
            '<strong>Risco:</strong> <span class="' + riskCls + '">' + riskLabels[state.riskLevel] + '</span><br>' +
            '<strong>Enfermeiro(a):</strong> ' + enfermeiro + '<br><br>' +
            '<strong>Sintomas:</strong><br>' +
            (sympsArr.length ? sympsArr.map(function(s){ return '<span style="display:block;margin-left:8px">▸ ' + s + '</span>'; }).join('') : '<em>Nenhum</em>') + '<br>' +
            '<strong>Plano SAE (' + saePlan.length + ' diagnóstico(s)):</strong><br>' +
            saePlan.map(function(dx) {
                return '<span style="display:block;margin-left:4px;margin-top:6px;font-weight:600;color:#175C9D">▸ ' + dx.titulo + '</span>' +
                    dx.nics.map(function(n){ return '<span style="display:block;margin-left:16px;font-size:0.78rem">NIC: ' + n.nome + '</span>'; }).join('') +
                    dx.nocs.map(function(n){ return '<span style="display:block;margin-left:16px;font-size:0.78rem;color:#1a6b42">NOC: ' + n.nome + '</span>'; }).join('');
            }).join('') +
            '<br><strong>Conduta:</strong> ' + (conduta||'Registro assistencial');

        document.getElementById('summary-visual-preview').innerHTML = visualHtml;
        document.getElementById('summary-text').value = plainText;
        document.getElementById('summary-modal').style.display = 'flex';

        if (state.consultaId) {
            try {
                let tipo_tarefa = null, data_prevista_tarefa = null, prioridade_tarefa = 'padrao';
                if (conduta) {
                    tipo_tarefa = 'contato_telefonico';
                    if (conduta.includes('24h')||conduta.includes('imediato')||conduta.includes('intensivo')) prioridade_tarefa = 'alta';
                    if (followupData) { data_prevista_tarefa = followupData.split('T')[0]; }
                    else { const d = new Date(); d.setDate(d.getDate() + (conduta.includes('48h')?2:1)); data_prevista_tarefa = d.toISOString().split('T')[0]; }
                }
                await api('POST', '/consultas/'+state.consultaId+'/concluir', {
                    classificacao_risco_validada: state.riskLevel,
                    texto_copiavel_prontuario:    plainText,
                    plano_cuidado_resumido:        saePlan.length ? saePlan[0].titulo : '',
                    conduta_seguimento_definida:   conduta,
                    tipo_tarefa: tipo_tarefa, data_prevista_tarefa: data_prevista_tarefa, prioridade_tarefa: prioridade_tarefa,
                    responsavel: enfermeiro,
                });
            } catch(e) {}
        }
    });

    document.getElementById('close-modal').addEventListener('click', function() {
        document.getElementById('summary-modal').style.display = 'none';
    });

    document.getElementById('copy-clipboard').addEventListener('click', function(e) {
        const ta = document.getElementById('summary-text');
        ta.select();
        document.execCommand('copy');
        e.target.textContent = '✓ Copiado!';
        setTimeout(function() {
            e.target.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copiar para Prontuário';
        }, 3000);
    });

    evaluateRisk();
    window.loadNanda      = loadNanda;
    window.activateModule = activateModule;
});
