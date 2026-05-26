/**
 * GuideNurse Oncology — app.js v3.0
 * Sistema completo com busca, cálculo ASC, risk engine expandido,
 * indicadores e evolução clínica
 */

const API_BASE = window.ONCOGUIA_API || 'https://oncoguia-api-production.up.railway.app/api';

// Usuários do sistema — mapeados por nome de seleção
const USERS = {
    'Carla Alves':     { id: 1, name: 'Carla Alves',     email: 'enfcarlaonco@gmail.com' },
    'Danielle Cabral': { id: 2, name: 'Danielle Cabral',  email: 'danielle@guidenurse.com' },
};

// Orientações ao cuidador por código NIC (Column F da planilha)
// Fallback local usado quando o banco ainda não tem contexto_uso populado
const ORIENT_CUIDADOR_MAP = {
    180:  'Entenda que a fadiga não é "preguiça".\nAjude nas atividades quando necessário.\nRespeite os momentos de descanso.\nIncentive, mas sem pressionar.\nSono: mantenha horários regulares; evite celular/TV antes de dormir; avise se tiver dificuldade para dormir.',
    200:  'Emoções: o cansaço pode afetar o humor. Fale sobre como está se sentindo; buscar apoio psicológico pode ajudar.',
    221:  'Ajudar com segurança, sem fazer tudo pelo paciente.\nIncentivar independência.\nEstar atento ao risco de quedas e atuar na prevenção.\nApoiar, mas respeitar limites.\nSinal de alerta: queda ou fraqueza intensa — procurar atendimento.',
    430:  'Ajudar na hidratação.\nObservar sinais de piora.\nAuxiliar nos cuidados com higiene.',
    450:  'Incentivar ingestão de líquidos.\nAjudar na alimentação adequada.\nEstimular mobilidade.\nObservar alterações no hábito intestinal.',
    460:  'Apoiar na alimentação adequada.',
    590:  'Observar se o paciente está urinando.\nIncentivar hidratação.\nComunicar alterações à equipe.',
    1100: 'Incentivar sem forçar.\nOferecer alimentos preferidos do paciente.\nRespeitar limites, mas estimular a alimentação.\nAjudar na organização das refeições.',
    1160: 'Se tiver dor na boca: escolha alimentos macios e pastosos.\nSe tiver alteração de paladar: testar novos temperos pode ajudar.\nHidratação: beba líquidos ao longo do dia; evite beber muito líquido junto das refeições.',
    1400: 'Acredite quando o paciente relatar dor.\nAjude a lembrar os horários dos medicamentos.\nObserve mudanças de comportamento.\nOfereça apoio sem julgar.',
    1450: 'Ajudar na alimentação.\nObservar sinais de desidratação: boca seca, pouca urina, urina escura, fraqueza.\nIncentivar uso correto da medicação.',
    1570: 'Oferecer alimentos em pequenas porções.\nIncentivar a alimentação oferecendo alimentos variados.',
    1710: 'Incentivar e ajudar na higiene oral.\nObservar lesões na boca.\nApoiar na alimentação adequada.\nComunicar alterações à equipe.',
    1720: 'Sinais de alerta — procurar atendimento se piorarem: feridas na boca, placas brancas, sangramento, dificuldade para engolir.',
    1801: 'Ajudar sem tirar autonomia.\nRespeitar privacidade.\nEstimular participação.\nEvitar fazer tudo pelo paciente ou expor desnecessariamente.\nProcurar ajuda se houver lesões ou piora rápida da funcionalidade.',
    1850: 'Respeitar o momento de descanso.\nEvitar interrupções desnecessárias.',
    2120: 'Ajudar no controle da glicemia.\nObservar sinais de alteração.\nAuxiliar na alimentação.\nApoiar adesão ao tratamento.',
    2380: 'Informe se estiver usando remédios que prendem o intestino.\nSinal de alerta: muitos dias sem evacuar — procurar atendimento.',
    2440: 'Avisar a equipe imediatamente: vermelhidão que não desaparece ou dor em alguma região.',
    3140: 'Manter ambiente calmo.\nAjudar a posicionar o paciente.\nObservar sinais de piora.\nAcionar ajuda quando necessário.',
    3590: 'Ajudar na mudança de posição.\nObservar a pele diariamente.\nAuxiliar na higiene.\nIncentivar alimentação e hidratação.',
    3740: 'Observar sinais de alerta.\nAjudar a medir temperatura.\nLevar rapidamente ao serviço em caso de febre.\nTer o telefone do serviço acessível.',
    4040: 'Ajudar no controle de medicamentos.\nObservar sinais de piora.\nApoiar na alimentação adequada.\nIncentivar acompanhamento médico.',
    4120: 'Incentivar ingestão de líquidos.\nObservar sinais de desidratação.\nAjudar no controle de ingestão.',
    4130: 'Procurar ajuda se houver piora.\nObserve diarreia ou vômitos e avise a equipe.\nSinais de desidratação: boca seca, pouca urina, tontura, olhos fundos.',
    4250: 'Observar sinais de piora.\nNão esperar para procurar ajuda.\nApoiar no acompanhamento do paciente.',
    4360: 'Ajudar na organização dos horários.\nApoiar sem pressionar.\nParticipação nas orientações.\nEstar atento a sinais de dificuldade.',
    5100: 'Estar presente emocionalmente.\nManter contato frequente.\nEscutar sem julgamento.\nEvitar superproteção, minimizar sentimentos ou afastamento excessivo.',
    5220: 'Respeitar o tempo do paciente.\nEvitar críticas ou comparações.\nOferecer apoio emocional.\nOuvir com atenção.\nComunicar à equipe tristeza intensa ou isolamento social.',
    5270: 'Quando procurar ajuda: ansiedade intensa ou constante, crises de pânico, insônia persistente, dificuldade para realizar atividades do dia a dia.\nBuscar ajuda profissional; não esperar piorar.',
    5290: 'Esteja presente.\nOuça sem julgar.\nEvite minimizar a dor.\nRespeite o tempo do paciente.',
    5310: 'Ouvir sem julgar.\nEvitar frases como "Você precisa ser forte".\nEstar presente.\nIncentivar tratamento.',
    5380: 'Ouça o paciente sem julgar.\nNão minimize o medo.\nEsteja presente.\nAjude a buscar informações com a equipe.',
    5602: 'Sinais de alerta: saiba quando procurar atendimento; em caso de dúvida, entre em contato com a equipe.',
    5606: 'Participar das orientações ajuda muito.\nAjudar a lembrar horários e cuidados.\nIncentivar o paciente a seguir o tratamento.\nAjudar na organização das informações.',
    5614: 'Sinais de alerta — informar a equipe: perda de peso, falta de apetite persistente, dificuldade para engolir, fraqueza intensa.\nSinais de desidratação: sede aumentada, boca seca, urina escura, tontura.',
    5820: 'Ouça sem julgar.\nEvite minimizar o sentimento.\nAjude a esclarecer dúvidas com a equipe.\nOfereça presença e apoio.',
    6040: 'Ajudar a manter ambiente tranquilo.\nQuando procurar ajuda: insônia persistente ou cansaço intenso durante o dia.',
    6490: 'Acompanhar pacientes de risco.\nAdaptar o ambiente: evite tapetes soltos, deixe o caminho livre, use boa iluminação à noite.\nEstar atento a mudanças.',
    6540: 'Procurar atendimento imediatamente: sangue nas fezes.',
    6550: 'Apoiar nos cuidados com higiene e alimentação.\nEvitar exposição a aglomerações ou pessoas doentes.\nSinal de alerta IMEDIATO: febre ≥ 38 °C, calafrios, fraqueza intensa ou qualquer sinal de infecção.',
    7040: 'Compartilhar responsabilidades.\nApoiar o cuidador principal.\nEvitar sobrecarga em uma única pessoa.\nManter comunicação aberta.',
    7370: 'Alimentação, hidratação e atividade física leve são importantes para a recuperação.',
    // Entradas complementares (NICs sem mapa original)
    570:  'Incentivar horários regulares para urinar (a cada 2-3 horas).\nEvitar bebidas com cafeína.\nRegistrar padrão urinário se solicitado pela equipe.',
    610:  'Manter a bolsa coletora sempre abaixo do nível da bexiga.\nNão dobrar ou obstruir o tubo.\nSinal de alerta: urina turva, com sangue, odor forte ou febre — comunicar à equipe.',
    740:  'Ajudar a mudar de posição a cada 2 horas.\nObservar vermelhidão ou feridas na pele.\nManter lençóis limpos e secos.\nEstimular movimentos leves no leito.',
    840:  'Ajudar a mudar a posição do paciente regularmente.\nUsar travesseiros de suporte.\nObservar dor ou desconforto ao movimentar.\nEvitar pressão prolongada em pontos ósseos.',
    1050: 'Oferecer alimentos na consistência indicada pela equipe.\nNão apressar o paciente.\nObservar tosse ou engasgo durante a refeição.\nComunicar dificuldade para engolir.',
    1060: 'Oferecer alimentos em pequenas porções e com frequência.\nRespeitar preferências alimentares quando possível.\nAnotar se o paciente recusa comer ou tem piora do apetite.',
    1240: 'Oferecer alimentos calóricos e nutritivos com frequência.\nIncentivar sem pressionar.\nRegistrar peso quando solicitado.\nComunicar perda de peso significativa à equipe.',
    1320: 'Acredite quando o paciente relatar dor.\nAjude nos horários dos medicamentos.\nObserve mudanças de comportamento.\nNão espere a dor ficar intensa para pedir ajuda.',
    1800: 'Ajudar nas atividades do dia a dia sem tirar a autonomia do paciente.\nEstimular a participação nas próprias atividades.\nRespeitar a privacidade e o ritmo do paciente.',
    1860: 'Posicionar o paciente sentado durante as refeições.\nOferecer alimentos na consistência orientada pela equipe.\nObservar sinais de engasgo.\nNão oferecer líquidos ralos se houver orientação contrária.',
    2130: 'Sinais de açúcar baixo: tremor, suor frio, tontura, fraqueza — ofereça açúcar ou suco imediatamente.\nTer sempre algo doce acessível.\nComunicar à equipe se o episódio se repetir.',
    2210: 'Ajudar o paciente a tomar a medicação para dor no horário certo.\nNão esperar a dor piorar para dar o remédio.\nAnotar se a dor melhora após a medicação ou persiste.',
    2300: 'Ajudar a organizar e administrar os medicamentos nos horários corretos.\nNunca suspender ou alterar doses sem orientação médica.\nAnotar e comunicar qualquer reação inesperada.',
    3320: 'Manter o dispositivo de oxigênio no rosto do paciente conforme orientado.\nNão fumar ou usar chama próximo ao oxigênio.\nSinal de alerta: falta de ar piora, lábios azulados ou agitação.',
    3350: 'Observar se o paciente respira com dificuldade ou tem lábios azulados.\nComunicar à equipe imediatamente se isso ocorrer.\nManter o ambiente arejado e sem odores fortes.',
    3500: 'Ajudar a mudar de posição regularmente.\nUsar colchão e almofadas conforme orientado.\nObservar áreas vermelhas ou doloridas na pele e comunicar à equipe.',
    3660: 'Não remover curativos sem orientação.\nSinais de infecção: vermelhidão, pus, cheiro ruim, febre — comunicar à equipe.\nManter a área limpa e seca conforme orientado.',
    3900: 'Manter o paciente aquecido ou fresco conforme necessário.\nVerificar temperatura quando o paciente se sentir mal.\nSinal de alerta: febre ≥ 38°C — procurar atendimento.',
    4044: 'Chamar ajuda imediatamente se: dor no peito, falta de ar intensa, desmaio ou batimentos irregulares.\nNão deixar o paciente fazer esforço.\nTer o número de emergência sempre acessível.',
    4150: 'Sinais de alerta: tontura ao levantar, palidez, falta de ar, pulso rápido ou lento.\nAjudar o paciente a se levantar devagar.\nComunicar à equipe qualquer alteração.',
    5230: 'Ouça sem minimizar as preocupações do paciente.\nEsteja presente nos momentos difíceis.\nIncentivar busca de apoio profissional quando necessário.',
    5246: 'Seguir as orientações da equipe sobre alimentação.\nAnotar dúvidas para perguntar na próxima consulta.\nComunicar mudanças no apetite ou no peso.',
    5280: 'Esteja presente e ouça com atenção.\nNão julgue os sentimentos do paciente.\nRespeite o processo emocional — cada pessoa lida de forma diferente.',
    5400: 'Valorize as conquistas do paciente, mesmo as pequenas.\nEvite comparações ou críticas.\nEstimule atividades que dão prazer e sensação de competência.',
    5440: 'Mobilize familiares e amigos para dividir os cuidados.\nEvite sobrecarga em uma única pessoa.\nComunicar à equipe se o cuidador principal estiver exausto.',
    5616: 'Ajudar a entender para que serve cada medicamento.\nAnotar dúvidas para perguntar à equipe.\nNunca suspender a medicação sem orientação médica.',
    5618: 'Participar das orientações sobre o tratamento.\nAnotar as instruções dadas pela equipe.\nComunicar se o paciente tiver dúvidas ou resistência.',
    6412: 'EMERGÊNCIA — ligar 192 (SAMU) imediatamente se: inchaço no rosto ou garganta, dificuldade para respirar, urticária intensa.\nNão espere — é uma emergência.',
    6480: 'Adaptar o domicílio: remova tapetes soltos, melhore a iluminação, deixe o banheiro acessível.\nInstalar barras de apoio se necessário.\nManter o ambiente limpo e arejado.',
    6482: 'Manter o ambiente silencioso e com temperatura agradável.\nReduzir odores fortes (comida, perfume).\nPerguntar ao paciente o que o faz se sentir melhor.',
    6530: 'Avisar a equipe sobre vacinas recentes do paciente.\nNão vacinar sem autorização da equipe durante o tratamento.\nComunicar se houve contato com pessoas doentes.',
    6552: 'Higienizar as mãos com frequência antes de tocar o paciente.\nEvitar exposição a pessoas doentes.\nSinal de alerta IMEDIATO: febre ≥ 38°C, calafrios ou fraqueza intensa.',
    6650: 'Observe o paciente com atenção e comunique qualquer mudança à equipe.\nAnote horários de sintomas e medicações.\nNão espere piorar para buscar ajuda.',
    7110: 'Participar ativamente do cuidado é muito importante.\nCompartilhe informações com os outros membros da família.\nPeça ajuda quando necessário.',
    7140: 'Cuidar do cuidador também é essencial.\nBusque apoio emocional quando necessário.\nConverse com a equipe sobre suas dúvidas e dificuldades.\nPermita-se descansar.',
    7290: 'Manter a comunicação aberta dentro da família.\nDividir as responsabilidades de cuidado.\nRespeitar as decisões do paciente.\nBuscar apoio quando houver conflitos.',
    7910: 'Participar das consultas com a equipe multiprofissional.\nAnotar as orientações recebidas.\nComunicar dúvidas entre as consultas à equipe de referência.',
    8100: 'Seguir as orientações do encaminhamento.\nLevar toda a documentação médica nas consultas.\nComunicar à equipe de referência qualquer dúvida sobre o encaminhamento.',
};

// Cache em memória: codigo_nic → { orientacao_paciente, orientacao_cuidador }
const nicDataCache = {};

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
    patient:        { id: null, initials: '', reg: '', ciclo: '', protocol: '' },
    currentUser:    null,   // { id, name, email } — preenchido no login
    consultaId:     null,
    ultimaConsulta: null,
    ecog:           null,
    symptoms:       {},
    segSymptoms:    {},
    riskLevel:      'baixo',
    nandaCache:     [],
    plano:          [],
    focusDx:        null,
    focusNic:       null,
};

// ── PAINEL DO ENFERMEIRO ──────────────────────────────────────────────────────
(function() {
    var PAINEL_PRIO_COLOR = { critica:'#7c1d1d', alta:'#DC2626', moderada:'#D97706', baixa:'#2563EB', padrao:'#6B7280' };
    var PAINEL_PRIO_BG    = { critica:'#fee2e2', alta:'#fee2e2', moderada:'#fef3c7', baixa:'#dbeafe', padrao:'#f1f5f9' };
    var PAINEL_PRIO_LABEL = { critica:'Crítica', alta:'Alta', moderada:'Moderada', baixa:'Baixa', padrao:'Padrão' };
    var RISCO_COLOR = { alto:'#DC2626', critico:'#7c1d1d', medio:'#D97706', baixo:'#2CA76E' };

    function todayISO() {
        return new Date().toISOString().slice(0, 10);
    }

    window.loadPainel = async function(data) {
        if (!state.currentUser) return;
        var dt = data || (document.getElementById('painel-data') && document.getElementById('painel-data').value) || todayISO();
        if (!document.getElementById('painel-data').value) document.getElementById('painel-data').value = dt;

        // loading state
        ['pn-tarefas-body','pn-pend-criticas-body','pn-consultas-body'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.innerHTML = '<tr><td colspan="5" class="table-empty">Carregando...</td></tr>';
        });

        try {
            var url = '/painel/enfermeiro?user=' + encodeURIComponent(state.currentUser.name) + '&data=' + dt;
            var d = await api('GET', url);
            renderPainel(d);
        } catch(e) {
            ['pn-tarefas-body','pn-pend-criticas-body','pn-consultas-body'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.innerHTML = '<tr><td colspan="5" class="table-empty" style="color:#DC2626">Erro ao carregar.</td></tr>';
            });
        }
    };

    function renderPainel(d) {
        var r = d.resumo || {};
        var set = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val != null ? val : '--'; };
        set('pn-tarefas-pend',  r.tarefas_pendentes);
        set('pn-tarefas-conc',  r.tarefas_concluidas);
        set('pn-pend-abertas',  r.pendencias_abertas);
        set('pn-pend-criticas', r.pendencias_criticas);
        set('pn-alto-risco',    r.pacientes_alto_risco);

        // Alertas
        var alertaEl = document.getElementById('painel-alertas');
        if (d.alertas && d.alertas.length) {
            alertaEl.style.display = 'block';
            alertaEl.innerHTML = d.alertas.map(function(a) {
                var bg = a.nivel === 'critico' ? '#fee2e2' : '#fef3c7';
                var co = a.nivel === 'critico' ? '#7c1d1d' : '#92400e';
                return '<div style="background:' + bg + ';color:' + co + ';border-radius:8px;padding:10px 14px;font-size:0.82rem;font-weight:600;margin-bottom:6px">' +
                    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
                    a.mensagem + '</div>';
            }).join('');
        } else {
            alertaEl.style.display = 'none';
        }

        // Tarefas do dia
        var tbody = document.getElementById('pn-tarefas-body');
        if (!d.tarefas_do_dia || !d.tarefas_do_dia.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Nenhuma tarefa para esta data.</td></tr>';
        } else {
            tbody.innerHTML = d.tarefas_do_dia.map(function(t) {
                var pr = t.prioridade || 'padrao';
                var prStyle = 'background:' + (PAINEL_PRIO_BG[pr]||'#f1f5f9') + ';color:' + (PAINEL_PRIO_COLOR[pr]||'#6B7280') +
                              ';font-weight:700;font-size:0.7rem;padding:2px 7px;border-radius:20px';
                var horario = t.data_prevista
                    ? new Date(t.data_prevista).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})
                    : '—';
                var stCo = t.status === 'concluida' ? '#15803d' : t.status === 'cancelada' ? '#6B7280' : '#D97706';
                return '<tr>' +
                    '<td style="font-size:0.8rem;white-space:nowrap">' + horario + '</td>' +
                    '<td style="font-weight:600;font-size:0.82rem">' + (t.iniciais_nome||'—') + '</td>' +
                    '<td style="font-size:0.8rem">' + (t.tipo_tarefa||'').replace(/_/g,' ') + '</td>' +
                    '<td><span style="' + prStyle + '">' + (PAINEL_PRIO_LABEL[pr]||pr) + '</span></td>' +
                    '<td style="font-size:0.78rem;font-weight:600;color:' + stCo + '">' + (t.status||'—') + '</td>' +
                    '</tr>';
            }).join('');
        }

        // Pendências críticas
        var tbody2 = document.getElementById('pn-pend-criticas-body');
        if (!d.pendencias_criticas || !d.pendencias_criticas.length) {
            tbody2.innerHTML = '<tr><td colspan="5" class="table-empty" style="color:#2CA76E">Nenhuma pendência crítica em aberto.</td></tr>';
        } else {
            tbody2.innerHTML = d.pendencias_criticas.map(function(p) {
                var desc = p.descricao || '—';
                var dtAb = (p.data_abertura || p.created_at)
                    ? new Date(p.data_abertura || p.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'})
                    : '—';
                return '<tr>' +
                    '<td style="font-weight:600;font-size:0.82rem">' + (p.iniciais_nome||'—') + '</td>' +
                    '<td style="font-size:0.8rem">' + (p.categoria||'—') + '</td>' +
                    '<td style="font-size:0.8rem"><span title="' + desc.replace(/"/g,'') + '">' + (desc.length>42?desc.substring(0,42)+'…':desc) + '</span></td>' +
                    '<td><span style="background:#fee2e2;color:#7c1d1d;font-size:0.7rem;font-weight:700;padding:2px 7px;border-radius:20px">' + (p.status||'—') + '</span></td>' +
                    '<td style="font-size:0.78rem;white-space:nowrap">' + dtAb + '</td>' +
                    '</tr>';
            }).join('');
        }

        // Consultas do dia
        var tbody3 = document.getElementById('pn-consultas-body');
        if (!d.consultas_do_dia || !d.consultas_do_dia.length) {
            tbody3.innerHTML = '<tr><td colspan="5" class="table-empty">Nenhuma consulta registrada para esta data.</td></tr>';
        } else {
            tbody3.innerHTML = d.consultas_do_dia.map(function(c) {
                var horario = c.data_hora
                    ? new Date(c.data_hora).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})
                    : '—';
                var risco = c.classificacao_risco_validada || c.classificacao_risco_automatica || '—';
                var riscoCo = RISCO_COLOR[risco.toLowerCase()] || '#6B7280';
                return '<tr>' +
                    '<td style="font-size:0.8rem;white-space:nowrap">' + horario + '</td>' +
                    '<td style="font-weight:600;font-size:0.82rem">' + (c.iniciais_nome||'—') + '</td>' +
                    '<td style="font-size:0.8rem">' + (c.tipo_consulta||'—') + '</td>' +
                    '<td style="font-size:0.78rem;font-weight:600;color:' + riscoCo + '">' + risco + '</td>' +
                    '<td style="font-size:0.78rem">' + (c.status_consulta||'—') + '</td>' +
                    '</tr>';
            }).join('');
        }
    }

    // Handlers inicializados após DOM pronto
    document.addEventListener('DOMContentLoaded', function() {
        var btnAtualizar = document.getElementById('btn-atualizar-painel');
        if (btnAtualizar) {
            btnAtualizar.addEventListener('click', function() {
                loadPainel(document.getElementById('painel-data').value || todayISO());
            });
        }
        var btnAgenda = document.getElementById('btn-painel-ir-agenda');
        if (btnAgenda) btnAgenda.addEventListener('click', function() { activateModule('module-tasks'); });
        var btnPend = document.getElementById('btn-painel-ir-pendencias');
        if (btnPend) btnPend.addEventListener('click', function() { activateModule('module-pendencias'); });
    });
})();
// ─────────────────────────────────────────────────────────────────────────────

function activateModule(targetId) {
    document.querySelectorAll('.module').forEach(function(m){ m.classList.remove('active'); });
    document.querySelectorAll('.nav-item, .tab').forEach(function(el){ el.classList.remove('active'); });
    const mod = document.getElementById(targetId);
    if (mod) mod.classList.add('active');
    document.querySelectorAll('[data-target="' + targetId + '"]').forEach(function(el){ el.classList.add('active'); });
    // Mostra/esconde sub-itens da sidebar dependendo de estar no contexto de paciente
    const patientModules = ['module-id','module-triage','module-nanda','module-followup'];
    const inPatient = patientModules.indexOf(targetId) >= 0;
    document.querySelectorAll('.nav-item-sub').forEach(function(el){
        el.style.opacity = inPatient ? '1' : '0.45';
    });
    if (targetId === 'module-patients')   loadPatientsList();
    if (targetId === 'module-nanda')      loadNanda(document.getElementById('dx-search') ? document.getElementById('dx-search').value : '');
    if (targetId === 'module-followup')   buildFollowupPanel();
    if (targetId === 'module-painel')      loadPainel();
    if (targetId === 'module-tasks')       loadTarefas();
    if (targetId === 'module-pendencias')  loadPendencias();
    if (targetId === 'module-indicators')  loadIndicators();
    if (targetId === 'module-evolution')   loadEvolution();
}

// Exibe orientações de uma NIC no painel 3 (preview, não editável)
function showNicOrientPreview(codigoNic) {
    const panel = document.getElementById('orient-panel');
    if (!panel) return;
    const data = nicDataCache[codigoNic];
    if (!data) {
        panel.innerHTML = '<div class="empty-panel"><p style="font-size:0.78rem">Sem orientações para esta NIC.</p></div>';
        return;
    }
    let html = '';
    if (data.orientacao_paciente) {
        html += '<div class="orient-section-header pac"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Orientação ao Paciente</div>';
        html += '<div class="orient-preview-text">' + data.orientacao_paciente.replace(/\n/g, '<br>') + '</div>';
    }
    if (data.orientacao_cuidador) {
        html += '<div class="orient-section-header fam" style="margin-top:10px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> Orientação ao Cuidador</div>';
        html += '<div class="orient-preview-text">' + data.orientacao_cuidador.replace(/\n/g, '<br>') + '</div>';
    }
    if (!html) {
        html = '<div class="empty-panel"><p style="font-size:0.78rem">Sem orientações cadastradas.</p></div>';
    }
    panel.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {

    document.querySelectorAll('[data-target]').forEach(function(el) {
        el.addEventListener('click', function() { activateModule(el.dataset.target); });
    });

    const screenLogin = document.getElementById('screen-login');
    const appMain     = document.getElementById('app-main');

    // ── NAVEGAÇÃO ENTRE TELAS ──
    function showLogin() {
        screenLogin.style.display = 'flex';
        appMain.style.display     = 'none';
    }
    function showPatients() {
        screenLogin.style.display = 'none';
        appMain.style.display     = 'flex';
        activateModule('module-patients');
    }
    function showApp() {
        screenLogin.style.display = 'none';
        appMain.style.display     = 'flex';
    }
    function showSearch() {
        document.getElementById('search-reg').value = '';
        document.getElementById('search-result').style.display = 'none';
        state.ultimaConsulta = null;
        activateModule('module-patients');
    }

    document.getElementById('btn-login').addEventListener('click', function() {
        const userName = document.getElementById('login-user').value;
        const senha    = document.getElementById('login-senha').value;
        const err      = document.getElementById('login-error');
        const user     = USERS[userName];
        if (!user || senha !== 'guidenurse@2026') { err.style.display = 'block'; return; }
        err.style.display = 'none';
        state.currentUser = user;
        document.getElementById('logged-user-badge').textContent = user.name;
        // Propaga nome para displays de sessão (read-only)
        document.querySelectorAll('.session-user-name-display').forEach(function(el){ el.textContent = user.name; });
        var enf1 = document.getElementById('enfermeiro-session-name');
        var enf2 = document.getElementById('seg-enfermeiro-session-name');
        if (enf1) enf1.textContent = user.name;
        if (enf2) enf2.textContent = user.name;
        showPatients();
    });
    document.getElementById('login-senha').addEventListener('keydown', function(e){
        if (e.key === 'Enter') document.getElementById('btn-login').click();
    });

    document.getElementById('btn-logout').addEventListener('click', function() {
        state.currentUser = null;
        state.patient = { id: null, initials: '', reg: '', ciclo: '', protocol: '' };
        state.consultaId = null;
        state.ultimaConsulta = null;
        showLogin();
    });

    // ── TELA 2: LISTA DE PACIENTES ──
    async function loadPatientsList(q) {
        const tbody = document.getElementById('patients-table-body');
        tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Carregando...</td></tr>';
        try {
            const pacientes = await api('GET', '/pacientes/busca?q=' + encodeURIComponent(q || ''));
            if (!pacientes.length) {
                tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Nenhum paciente cadastrado.</td></tr>';
                return;
            }
            tbody.innerHTML = pacientes.map(function(p) {
                const dn = p.data_nascimento ? new Date(p.data_nascimento).toLocaleDateString('pt-BR') : '—';
                return '<tr data-id="' + p.id_paciente + '" data-reg="' + p.registro_instituicao + '" data-iniciais="' + p.iniciais_nome + '">' +
                    '<td><div class="patients-avatar-cell"><div class="patients-avatar-sm">' + (p.iniciais_nome||'?').substring(0,2) + '</div>' + (p.iniciais_nome||'—') + '</div></td>' +
                    '<td>' + (p.registro_instituicao||'—') + '</td>' +
                    '<td>' + dn + '</td>' +
                    '<td>' + (p.sexo || '—') + '</td>' +
                    '<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (p.diagnostico_oncologico||'—') + '</td>' +
                    '<td>' + (p.protocolo_atual||'—') + '</td>' +
                    '<td><span class="followup-badge nic" style="font-size:0.65rem">' + (p.status_paciente||'ativo') + '</span></td>' +
                    '<td><button class="btn-abrir" data-id="' + p.id_paciente + '" data-reg="' + p.registro_instituicao + '" data-iniciais="' + p.iniciais_nome + '" data-status="' + (p.status_paciente||'ativo') + '">Abrir</button></td>' +
                    '</tr>';
            }).join('');
            tbody.querySelectorAll('.btn-abrir').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    openPatient(btn.dataset.id, btn.dataset.reg, btn.dataset.iniciais, btn.dataset.status);
                });
            });
        } catch(e) {
            tbody.innerHTML = '<tr><td colspan="8" class="table-empty" style="color:#DC2626">Erro ao carregar pacientes.</td></tr>';
        }
    }

    // ── Carrega dados do paciente nos campos de identificação ──
    async function loadPatientIdentification(id) {
        try {
            const p = await api('GET', '/pacientes/' + id);
            if (!p) return;
            var setVal = function(elId, val) { var el = document.getElementById(elId); if (el) el.value = val || ''; };
            setVal('reg-inst',              p.registro_instituicao);
            setVal('pac-iniciais',          p.iniciais_nome);
            setVal('pac-nascimento',        p.data_nascimento ? p.data_nascimento.split('T')[0] : '');
            setVal('pac-sexo',              p.sexo);
            setVal('pac-tel',               p.telefone_1);
            setVal('pac-tel2',              p.telefone_2);
            setVal('pac-cuidador',          p.nome_cuidador);
            setVal('pac-tel-cuidador',      p.telefone_cuidador);
            setVal('pac-dx',                p.diagnostico_oncologico);
            setVal('pac-protocol',          p.protocolo_atual);
            setVal('pac-ciclo',             p.ciclo_atual);
            setVal('pac-ultima-qt',         p.data_ultima_qt ? p.data_ultima_qt.split('T')[0] : '');
            setVal('pac-proxima-qt',        p.data_proxima_qt_prevista ? p.data_proxima_qt_prevista.split('T')[0] : '');
            setVal('pac-data-diagnostico',  p.data_diagnostico ? p.data_diagnostico.split('T')[0] : '');
            setVal('pac-tipo-tratamento',   p.tipo_tratamento);
            if (p.faz_radioterapia) {
                var rxtEl = document.querySelector('input[name="pac-radioterapia"][value="' + p.faz_radioterapia + '"]');
                if (rxtEl) rxtEl.checked = true;
                var localEl = document.getElementById('pac-local-radioterapia');
                if (localEl) { localEl.style.display = p.faz_radioterapia === 'sim' ? 'block' : 'none'; localEl.value = p.local_radioterapia || ''; }
            }
            if (p.alergia) {
                var alEl = document.querySelector('input[name="pac-alergia"][value="' + p.alergia + '"]');
                if (alEl) alEl.checked = true;
                var alDescEl = document.getElementById('pac-alergia-desc');
                if (alDescEl) { alDescEl.style.display = p.alergia === 'sim' ? 'block' : 'none'; alDescEl.value = p.alergia_descricao || ''; }
            }
            // Atualiza display
            if (p.iniciais_nome) {
                document.getElementById('display-patient-name').textContent = p.iniciais_nome;
                document.getElementById('patient-avatar').textContent = p.iniciais_nome.substring(0,2);
            }
            if (p.registro_instituicao) document.getElementById('display-reg').textContent = p.registro_instituicao;
            if (p.ciclo_atual)          document.getElementById('display-ciclo').textContent = p.ciclo_atual;
            if (p.protocolo_atual)      document.getElementById('display-protocol').textContent = p.protocolo_atual;
            // Calcular idade
            if (p.data_nascimento) {
                var nasc = new Date(p.data_nascimento), hoje = new Date();
                var idade = hoje.getFullYear() - nasc.getFullYear();
                var m = hoje.getMonth() - nasc.getMonth();
                if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
                var idadeEl = document.getElementById('pac-idade');
                if (idadeEl) idadeEl.value = isNaN(idade) ? '' : idade;
            }
        } catch(e) { console.warn('[loadPatientIdentification]', e); }
    }

    // ── Aplica modo somente leitura (paciente inativo) ──
    function setReadOnlyMode(ativo) {
        var banner = document.getElementById('banner-inativo');
        var btnSalvar = document.getElementById('btn-salvar-id');
        var btnInativar = document.getElementById('btn-inativar-paciente');
        if (!ativo) {
            // Modo leitura
            if (banner)     { banner.style.display = 'flex'; }
            if (btnSalvar)  { btnSalvar.style.display = 'none'; }
            if (btnInativar){ btnInativar.style.display = 'none'; }
            document.querySelectorAll('#module-id input, #module-id select, #module-id textarea').forEach(function(el){ el.disabled = true; });
        } else {
            // Modo edição normal
            if (banner)     { banner.style.display = 'none'; }
            if (btnSalvar)  { btnSalvar.style.display = ''; }
            if (btnInativar){ btnInativar.style.display = state.patient.id ? '' : 'none'; }
            document.querySelectorAll('#module-id input, #module-id select, #module-id textarea').forEach(function(el){ el.disabled = false; });
        }
    }

    // ── Abre paciente: verifica última consulta e exibe modal de escolha ──
    async function openPatient(id, reg, iniciais, status) {
        state.patient.id       = parseInt(id);
        state.patient.reg      = reg;
        state.patient.initials = iniciais;
        state.patient.inativo  = (status === 'inativo');

        // Busca última consulta
        try { state.ultimaConsulta = await api('GET', '/consultas/paciente/' + id + '/ultima-concluida'); }
        catch(e) { state.ultimaConsulta = null; }

        // Paciente inativo: vai direto para identificação em modo leitura
        if (state.patient.inativo) {
            await loadPatientIdentification(id);
            setupPatientDisplay();
            showApp();
            setReadOnlyMode(false);
            activateModule('module-id');
            return;
        }

        if (state.ultimaConsulta) {
            const dataFmt = new Date(state.ultimaConsulta.data_hora).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
            document.getElementById('modal-choice-title').textContent = iniciais;
            document.getElementById('modal-choice-desc').textContent =
                'Última Consulta de Enfermagem realizada em ' + dataFmt + '. Como deseja prosseguir?';
            document.getElementById('modal-consulta-choice').style.display = 'flex';
        } else {
            startNovaConsulta();
        }
    }

    document.getElementById('close-modal-choice').addEventListener('click', function() {
        document.getElementById('modal-consulta-choice').style.display = 'none';
    });

    document.getElementById('btn-choice-ver-id').addEventListener('click', async function() {
        document.getElementById('modal-consulta-choice').style.display = 'none';
        await loadPatientIdentification(state.patient.id);
        setupPatientDisplay();
        showApp();
        setReadOnlyMode(true);
        document.getElementById('btn-inativar-paciente').style.display = '';
        activateModule('module-id');
    });

    document.getElementById('btn-choice-seguimento').addEventListener('click', function() {
        document.getElementById('modal-consulta-choice').style.display = 'none';
        setupPatientDisplay();
        showApp();
        activateModule('module-followup');
    });

    document.getElementById('btn-choice-nova-consulta').addEventListener('click', function() {
        document.getElementById('modal-consulta-choice').style.display = 'none';
        startNovaConsulta();
    });

    // ── Inativar Paciente ──
    document.getElementById('btn-inativar-paciente').addEventListener('click', function() {
        document.getElementById('motivo-inativacao').value = '';
        document.getElementById('modal-inativar').style.display = 'flex';
    });
    document.getElementById('close-modal-inativar').addEventListener('click', function() {
        document.getElementById('modal-inativar').style.display = 'none';
    });
    document.getElementById('btn-cancel-inativar').addEventListener('click', function() {
        document.getElementById('modal-inativar').style.display = 'none';
    });
    document.getElementById('btn-confirm-inativar').addEventListener('click', async function() {
        const motivo = document.getElementById('motivo-inativacao').value;
        if (!motivo) { alert('Selecione o motivo da inativação.'); return; }
        try {
            await api('PATCH', '/pacientes/' + state.patient.id + '/inativar', { motivo_inativacao: motivo });
            document.getElementById('modal-inativar').style.display = 'none';
            alert('Paciente inativado com sucesso.');
            showSearch();
        } catch(e) {
            alert('Erro ao inativar paciente.');
        }
    });

    async function startNovaConsulta() {
        try {
            const c = await api('POST', '/consultas', { id_paciente: state.patient.id, tipo_consulta: 'retorno' });
            state.consultaId = c.id_consulta;
        } catch(e) {}
        var rSel = document.getElementById('risco-validado');
        if (rSel) { rSel.value = 'baixo'; delete rSel.dataset.manualOverride; }
        setReadOnlyMode(true);
        setupPatientDisplay();
        showApp();
        activateModule('module-triage');
    }

    function setupPatientDisplay() {
        document.getElementById('display-patient-name').textContent = state.patient.initials || 'Paciente';
        document.getElementById('display-reg').textContent = state.patient.reg;
        document.getElementById('patient-avatar').textContent = (state.patient.initials || 'N/A').substring(0,2);
    }

    document.getElementById('btn-back-search').addEventListener('click', showSearch);

    document.getElementById('btn-new-patient').addEventListener('click', function() {
        state.patient = { id: null, initials: '', reg: '', ciclo: '', protocol: '' };
        state.consultaId = null;
        state.ultimaConsulta = null;
        state.plano = [];
        state.focusDx = null;
        state.focusNic = null;
        state.ecog = null;
        state.symptoms = {};
        state.segSymptoms = {};
        state.riskLevel = 'baixo';

        // Limpar campos de Identificação
        ['reg-inst','pac-iniciais','pac-nascimento','pac-idade','pac-tel','pac-tel2',
         'pac-cuidador','pac-tel-cuidador','pac-dx','pac-protocol','pac-ciclo',
         'pac-ultima-qt','pac-proxima-qt','pac-data-diagnostico',
         'pac-local-radioterapia','pac-alergia-desc'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
        });
        var sexoEl = document.getElementById('pac-sexo');
        if (sexoEl) sexoEl.value = '';
        var tipoTratEl = document.getElementById('pac-tipo-tratamento');
        if (tipoTratEl) tipoTratEl.value = '';
        document.querySelectorAll('input[name="pac-radioterapia"], input[name="pac-alergia"]').forEach(function(r){ r.checked = false; });
        var localRxtEl = document.getElementById('pac-local-radioterapia');
        if (localRxtEl) localRxtEl.style.display = 'none';
        var alDescEl = document.getElementById('pac-alergia-desc');
        if (alDescEl) alDescEl.style.display = 'none';

        // Limpar campos de Triagem
        var tipoEl = document.getElementById('tipo-consulta');
        if (tipoEl) { tipoEl.value = ''; }
        document.getElementById('tipo-outro-group').style.display = 'none';
        document.getElementById('form-inicio-tratamento').style.display = 'none';
        // Limpar campos de texto da anamnese estendida
        ['fit-escolaridade','fit-profissao','fit-naturalidade','fit-cidade-residencia','fit-religiao',
         'fit-comorbidade-outros','fit-cirurgia-desc','fit-hist-familiar-desc',
         'fit-dum','fit-morse','fit-dor-local','fit-dor-eva',
         'fit-dx-histologico','fit-dx-data','fit-estadiamento-desc','fit-protocolo-proposto',
         'fit-mucosa-oral','fit-ox-dispositivo','fit-ox-fr','fit-ox-spo2','fit-ox-o2',
         'fit-cv-fc','fit-cv-pa','fit-abdome','fit-nut-dispositivo','fit-nut-hidratacao',
         'fit-integridade-desc','fit-dados-relevantes','fit-filhos-qtd'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
        });
        // Recolher campos condicionais da anamnese
        ['fit-filhos-qtd-group','fit-dor-detail','fit-esvaziamento-membro-group'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        ['fit-cirurgia-desc','fit-hist-familiar-desc',
         'fit-estadiamento-desc','fit-integridade-desc'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        // Restaurar ef-card-padrao
        var efCard = document.getElementById('ef-card-padrao');
        if (efCard) efCard.style.display = '';
        // Resetar modo leitura
        setReadOnlyMode(true);
        document.getElementById('btn-inativar-paciente').style.display = 'none';
        ['peso','altura','asc','ef-pa','ef-fc','ef-fr','ef-temp','ef-sato2',
         'ef-obs','medicamentos','comorbidade-outros','suporte-outro',
         'nutricao-outros','outros-sintomas',
         'lab-data','lab-leuco','lab-neutro','lab-plaquetas','lab-hb','lab-creatinina'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
        });
        ['ef-hidratacao','ef-mucosa'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
        });
        // Desmarcar todos os radios e checkboxes da triagem
        document.querySelectorAll('#module-triage input[type=radio], #module-triage input[type=checkbox]').forEach(function(el) {
            el.checked = false;
        });
        // Resetar botões de grau dos sintomas para grau 0
        document.querySelectorAll('.symptom-row').forEach(function(row) {
            row.querySelectorAll('.sg').forEach(function(btn, idx) {
                btn.classList.toggle('active', idx === 0);
            });
        });

        // Limpar display do paciente
        document.getElementById('display-patient-name').textContent = 'Novo Paciente';
        document.getElementById('display-reg').textContent = '---';
        document.getElementById('display-ciclo').textContent = '---';
        document.getElementById('display-protocol').textContent = '---';
        document.getElementById('patient-avatar').textContent = 'N/A';

        // Resetar risco
        var rSel = document.getElementById('risco-validado');
        if (rSel) { rSel.value = 'baixo'; delete rSel.dataset.manualOverride; }
        evaluateRisk();

        showApp();
        activateModule('module-id');
    });

    document.getElementById('btn-search').addEventListener('click', function() {
        const q = document.getElementById('search-reg').value.trim();
        loadPatientsList(q);
        document.getElementById('search-result').style.display = 'none';
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

    // Mostrar/esconder campo local de radioterapia
    document.querySelectorAll('input[name="pac-radioterapia"]').forEach(function(radio) {
        radio.addEventListener('change', function() {
            document.getElementById('pac-local-radioterapia').style.display =
                this.value === 'sim' ? 'block' : 'none';
        });
    });

    // Mostrar/esconder campo descrição de alergia
    document.querySelectorAll('input[name="pac-alergia"]').forEach(function(radio) {
        radio.addEventListener('change', function() {
            document.getElementById('pac-alergia-desc').style.display =
                this.value === 'sim' ? 'block' : 'none';
        });
    });

    document.getElementById('btn-salvar-id').addEventListener('click', async function() {
        const reg      = document.getElementById('reg-inst').value.trim();
        const iniciais = document.getElementById('pac-iniciais').value.trim();
        if (!reg || !iniciais) { alert('Preencha o Registro e as Iniciais do paciente.'); return; }
        try {
            var alergiaRadio = document.querySelector('input[name="pac-alergia"]:checked');
            var rxtRadio     = document.querySelector('input[name="pac-radioterapia"]:checked');
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
                data_diagnostico: document.getElementById('pac-data-diagnostico').value || null,
                tipo_tratamento: document.getElementById('pac-tipo-tratamento').value || null,
                faz_radioterapia: rxtRadio ? rxtRadio.value : null,
                local_radioterapia: document.getElementById('pac-local-radioterapia').value || null,
                alergia: alergiaRadio ? alergiaRadio.value : null,
                alergia_descricao: document.getElementById('pac-alergia-desc').value || null,
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
        const val = e.target.value;
        document.getElementById('tipo-outro-group').style.display = val === 'Outro' ? 'block' : 'none';
        const isAbertura = val === 'Consulta de início de tratamento' || val === 'Consulta de troca de protocolo';
        document.getElementById('form-inicio-tratamento').style.display = isAbertura ? 'block' : 'none';
        // Oculta exame físico padrão nas consultas de abertura (seção 7 da anamnese o substitui)
        var efCard = document.getElementById('ef-card-padrao');
        if (efCard) efCard.style.display = isAbertura ? 'none' : '';
    });

    // ── ANAMNESE ESTENDIDA — listeners de campos condicionais ──
    (function() {
        function toggleOnSim(radioName, targetId) {
            document.querySelectorAll('input[name="' + radioName + '"]').forEach(function(r) {
                r.addEventListener('change', function() {
                    document.getElementById(targetId).style.display = r.value === 'sim' ? 'block' : 'none';
                });
            });
        }
        function toggleOnValue(radioName, targetId, triggerValue) {
            document.querySelectorAll('input[name="' + radioName + '"]').forEach(function(r) {
                r.addEventListener('change', function() {
                    document.getElementById(targetId).style.display = r.value === triggerValue ? 'block' : 'none';
                });
            });
        }
        toggleOnSim('fit_filhos',              'fit-filhos-qtd-group');
        toggleOnSim('fit_comorbidade_pre',      'fit-comorbidade-desc');
        toggleOnSim('fit_cirurgia_prev',        'fit-cirurgia-desc');
        toggleOnSim('fit_hist_familiar',        'fit-hist-familiar-desc');
        toggleOnSim('fit_dor',                  'fit-dor-detail');
        toggleOnSim('fit_esvaziamento_axilar',  'fit-esvaziamento-membro-group');
        toggleOnValue('fit_estadiamento',       'fit-estadiamento-desc',    'sim');
        toggleOnValue('fit_integridade_cutanea','fit-integridade-desc',     'lesao');
    })();

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

    (function() {
        var rSel = document.getElementById('risco-validado');
        if (rSel) rSel.addEventListener('change', function() { this.dataset.manualOverride = '1'; });
    })();

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
        var rSel = document.getElementById('risco-validado');
        if (rSel && !rSel.dataset.manualOverride) rSel.value = level;
    }

    let sintomasTimer = null;
    async function autoSaveSintomas() {
        if (!state.consultaId) return;
        clearTimeout(sintomasTimer);
        sintomasTimer = setTimeout(async function() {
            const sintomas = Object.entries(state.symptoms).filter(function(e){ return e[1].grade > 0 || e[1].isRisk; }).map(function(e){ return { tipo_sintoma: e[0], grau_ctcae: e[1].grade, alerta_risco: e[1].isRisk }; });
            try { await api('PUT', '/consultas/' + state.consultaId + '/sintomas', { sintomas: sintomas, classificacao_risco_automatica: state.riskLevel, updated_by_user_name: state.currentUser ? state.currentUser.name : null }); } catch(e) {}
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
        document.getElementById('orient-panel').innerHTML = '<div class="empty-panel"><p style="font-size:0.78rem">Clique em uma NIC para ver as orientações</p></div>';
        try {
            const data = await api('GET', '/referencia/nanda/' + codigo + '/sugestoes');
            const intervencoes_nic = data.intervencoes_nic || [];
            const resultados_noc   = data.resultados_noc   || [];

            const planDx       = state.plano.find(function(p){ return p.codigo === codigo; });
            const selectedNics = planDx ? planDx.nics.map(function(n){ return n.id; }) : [];
            const selectedNocs = planDx ? planDx.nocs.map(function(n){ return n.id; }) : [];
            const dxData       = state.nandaCache.find(function(d){ return d.codigo_nanda === codigo; });
            const enunciado    = dxData ? (dxData.enunciado_pes || '') : '';

            // Popula cache de orientações por NIC (combina API + mapa local para cuidador)
            intervencoes_nic.forEach(function(nic) {
                const pac = nic.orientacao_paciente_sugerida || nic.orientacao_paciente || '';
                // contexto_uso = contexto clínico para enfermagem, não orientação ao cuidador
                // A orientação ao cuidador vem do ORIENT_CUIDADOR_MAP (hardcoded) até a migração correta rodar no banco
                const cui = ORIENT_CUIDADOR_MAP[nic.codigo_nic] || '';
                nicDataCache[nic.codigo_nic] = { orientacao_paciente: pac, orientacao_cuidador: cui };
            });

            const nicHtml = intervencoes_nic.map(function(i) {
                const uid     = 'nic_' + i.codigo_nic;
                const checked = selectedNics.indexOf(uid) >= 0 ? ' checked' : '';
                const texto   = (i.nome_intervencao || '').replace(/"/g, '&quot;');
                const temPac  = !!(nicDataCache[i.codigo_nic] && nicDataCache[i.codigo_nic].orientacao_paciente);
                const temCui  = !!(nicDataCache[i.codigo_nic] && nicDataCache[i.codigo_nic].orientacao_cuidador);
                const dots = (temPac ? '<span class="orient-dot pac" title="Orientação ao paciente">P</span>' : '') +
                             (temCui ? '<span class="orient-dot cui" title="Orientação ao cuidador">C</span>' : '');
                return '<div class="tag-item nic' + checked + '"' +
                    ' data-id="' + uid + '" data-tipo="nic" data-codigo="' + i.codigo_nic + '" data-texto="' + texto + '">' +
                    '<span class="tag-item-label">' + i.nome_intervencao + '</span>' +
                    dots +
                    '<span class="tag-check">✓</span></div>';
            }).join('') || '<div class="loading-state">Nenhuma intervenção cadastrada.</div>';

            const nocHtml = resultados_noc.map(function(r) {
                const uid   = 'noc_' + r.codigo_noc;
                const checked = selectedNocs.indexOf(uid) >= 0 ? ' checked' : '';
                const texto = (r.nome_resultado || '').replace(/"/g, '&quot;');
                return '<div class="tag-item noc' + checked + '" data-id="' + uid + '" data-tipo="noc" data-codigo="' + r.codigo_noc + '" data-texto="' + texto + '">' +
                    r.nome_resultado + '<span class="tag-check">✓</span></div>';
            }).join('') || '<div class="loading-state">Nenhum resultado cadastrado.</div>';

            panel.innerHTML =
                '<div class="nicnoc-dx-header">' +
                    '<div class="dx-name">' + titulo + '</div>' +
                    (enunciado ? '<div class="dx-enunciado">' + enunciado.replace(/Enunciado P[EPS]+[^:]*:/g, '').trim() + '</div>' : '') +
                '</div>' +
                '<div class="nic-noc-section-title nic-title"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/></svg> Intervenções NIC <span style="font-size:0.65rem;font-weight:400;color:var(--text-light)">(P=paciente C=cuidador)</span></div>' +
                '<div class="tag-row" id="nic-tags">' + nicHtml + '</div>' +
                '<div class="nic-noc-section-title noc-title" style="margin-top:12px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> Resultados NOC</div>' +
                '<div class="tag-row" id="noc-tags">' + nocHtml + '</div>' +
                '<button class="btn-add-dx-plan" id="btn-add-dx-plan" data-codigo="' + codigo + '" data-titulo="' + (titulo || '').replace(/"/g, '&quot;') + '" data-enunciado="' + enunciado.replace(/"/g, '&quot;') + '">' +
                '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
                (planDx ? 'Atualizar no Plano' : 'Adicionar ao Plano') + '</button>';

            // Clique em NIC → alterna marcação + mostra orientações no painel 3
            panel.querySelectorAll('.tag-item.nic').forEach(function(tag) {
                tag.addEventListener('click', function() {
                    tag.classList.toggle('checked');
                    state.focusNic = tag.dataset.id;
                    showNicOrientPreview(parseInt(tag.dataset.codigo));
                });
            });

            // Clique em NOC → apenas alterna marcação
            panel.querySelectorAll('.tag-item.noc').forEach(function(tag) {
                tag.addEventListener('click', function() { tag.classList.toggle('checked'); });
            });

            // Adicionar ao Plano — cada NIC carrega suas próprias orientações
            document.getElementById('btn-add-dx-plan').addEventListener('click', function(e) {
                const dxCodigo = e.currentTarget.dataset.codigo;
                const dxTitulo = e.currentTarget.dataset.titulo;
                const dxEnunc  = e.currentTarget.dataset.enunciado;
                const existingDx = state.plano.find(function(p){ return p.codigo === dxCodigo; });

                // Merge: mantém NICs existentes no plano + adiciona os marcados agora
                const nicMap = {};
                (existingDx ? existingDx.nics : []).forEach(function(n){ nicMap[n.id] = n; });
                Array.from(panel.querySelectorAll('.tag-item.nic.checked')).forEach(function(t) {
                    const codigoNic = parseInt(t.dataset.codigo);
                    const cached = nicDataCache[codigoNic] || {};
                    nicMap[t.dataset.id] = {
                        id:  t.dataset.id,
                        codigo: codigoNic,
                        nome: t.dataset.texto,
                        orientacao_paciente: cached.orientacao_paciente || '',
                        orientacao_cuidador: cached.orientacao_cuidador || '',
                    };
                });
                const nicsSelected = Object.values(nicMap);

                const nocMap = {};
                (existingDx ? existingDx.nocs : []).forEach(function(n){ nocMap[n.id] = n; });
                Array.from(panel.querySelectorAll('.tag-item.noc.checked')).forEach(function(t) {
                    nocMap[t.dataset.id] = { id: t.dataset.id, codigo: parseInt(t.dataset.codigo), nome: t.dataset.texto };
                });
                const nocsSelected = Object.values(nocMap);

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
                    const hasOrient = n.orientacao_paciente || n.orientacao_cuidador;
                    return '<div class="plano-item nic">' +
                        '<div class="plano-item-main"><span class="plano-item-badge">NIC</span>' +
                        '<span class="plano-item-text">' + n.nome + '</span>' +
                        '<button class="plano-item-remove" onclick="removeItemFromPlan(\'' + dx.codigo + '\',\'nic\',\'' + n.id + '\')" title="Remover">✕</button></div>' +
                        (hasOrient ? '<div class="plano-orient-nic">' +
                            (n.orientacao_paciente ? '<div class="plano-orient-row pac"><span class="plano-orient-label">Pac:</span> ' + n.orientacao_paciente.replace(/\n/g, '<br>') + '</div>' : '') +
                            (n.orientacao_cuidador ? '<div class="plano-orient-row cui"><span class="plano-orient-label">Cuid:</span> ' + n.orientacao_cuidador.replace(/\n/g, '<br>') + '</div>' : '') +
                            '</div>' : '') +
                        '</div>';
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
        if (state.focusDx === codigo) {
            state.focusDx = null;
            document.getElementById('nic-noc-panel').innerHTML = '<div class="empty-panel"><p>Clique em um diagnóstico</p></div>';
            document.getElementById('orient-panel').innerHTML  = '<div class="empty-panel"><p>Selecione um diagnóstico para ver as orientações</p></div>';
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
                    resultados_esperados: state.plano.flatMap(function(dx){ return dx.nocs.map(function(n){ return { codigo_noc: n.codigo }; }); }),
                    updated_by_user_name: state.currentUser ? state.currentUser.name : null
                });
            } catch(err) { console.warn('[autoSavePlano]', err.message); }
            try {
                var orientacoes = state.plano.flatMap(function(dx) {
                    return dx.nics.flatMap(function(n) {
                        var entries = [];
                        if (n.orientacao_paciente && n.orientacao_paciente.trim())
                            entries.push({ codigo_nic: n.codigo, tipo: 'paciente', texto: n.orientacao_paciente });
                        if (n.orientacao_cuidador && n.orientacao_cuidador.trim())
                            entries.push({ codigo_nic: n.codigo, tipo: 'cuidador', texto: n.orientacao_cuidador });
                        return entries;
                    });
                });
                if (state.currentUser) {
                    await api('POST', '/consultas/' + state.consultaId + '/orientacoes', {
                        orientacoes: orientacoes,
                        updated_by_user_name: state.currentUser.name
                    });
                }
            } catch(err) { console.error('[autoSavePlano:orientacoes]', err.message); }
        }, 1500);
    }

    // ── SEGUIMENTO ──
    window.buildFollowupPanel = async function buildFollowupPanel() {
        const panel = document.getElementById('followup-actions-panel');

        // ── Exibe contexto da última consulta concluída ──
        const ctxCard  = document.getElementById('ultima-consulta-ctx');
        const ctxPlano = document.getElementById('ultima-consulta-plano');
        const ctxData  = document.getElementById('ultima-consulta-data');
        const ctxRisco = document.getElementById('ultima-consulta-risco');

        // Tenta buscar se ainda não foi carregado
        if (!state.ultimaConsulta && state.patient.id) {
            try { state.ultimaConsulta = await api('GET', '/consultas/paciente/' + state.patient.id + '/ultima-concluida'); }
            catch(e) {}
        }

        if (state.ultimaConsulta) {
            const uc = state.ultimaConsulta;
            const dataFmt = new Date(uc.data_hora).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
            ctxData.textContent = dataFmt;
            const ricoMap = { alto: 'Alto Risco', moderado: 'Risco Moderado', baixo: 'Risco Baixo' };
            const riscoClass = uc.risco === 'alto' ? 'red' : uc.risco === 'moderado' ? 'amber' : 'green';
            ctxRisco.innerHTML = '<span class="risk-dot-sm ' + riscoClass + '"></span>' + (ricoMap[uc.risco] || uc.risco || '');

            let html = '';
            if (uc.diagnosticos && uc.diagnosticos.length) {
                html += '<div style="margin-bottom:8px"><span style="font-size:0.7rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:.04em">Diagnósticos NANDA</span><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">';
                uc.diagnosticos.forEach(function(d) {
                    html += '<span style="background:#EFF6FF;color:#1d4ed8;border-radius:4px;padding:2px 7px;font-size:0.72rem">' + d.titulo_diagnostico + '</span>';
                });
                html += '</div></div>';
            }
            if (uc.intervencoes && uc.intervencoes.length) {
                html += '<div><span style="font-size:0.7rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:.04em">Intervenções NIC</span><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">';
                uc.intervencoes.forEach(function(n) {
                    html += '<span style="background:#F0FDF4;color:#15803d;border-radius:4px;padding:2px 7px;font-size:0.72rem">' + n.nome_intervencao + '</span>';
                });
                html += '</div></div>';
            }
            if (uc.conduta) {
                html += '<div style="margin-top:8px;font-size:0.75rem;color:var(--text-light)"><strong>Conduta anterior:</strong> ' + uc.conduta + '</div>';
            }
            ctxPlano.innerHTML = html || '<span style="font-size:0.78rem;color:var(--text-light)">Plano não registrado nesta consulta.</span>';
            ctxCard.style.display = 'block';
        } else {
            ctxCard.style.display = 'none';
        }

        // ── Metas do plano de cuidado ──
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
        // Fallback: usa intervenções da última consulta concluída
        if (!items.length && state.ultimaConsulta && state.ultimaConsulta.intervencoes) {
            items = state.ultimaConsulta.intervencoes.map(function(n){
                return { id: 'nic_'+n.codigo_nic, tipo: 'nic', texto: n.nome_intervencao };
            });
        }

        if (!items.length) { panel.innerHTML = '<div class="empty-state-sm">Complete o Plano de Cuidado SAE para carregar as metas aqui.</div>'; return; }
        panel.innerHTML = items.map(function(item) {
            return '<div class="followup-item"><span class="followup-badge ' + item.tipo + '">' + item.tipo.toUpperCase() + '</span>' +
                '<span class="followup-text">' + item.texto + (item.dx ? ' <span style="color:var(--text-light);font-size:0.7rem">(' + item.dx + ')</span>' : '') + '</span>' +
                '<select class="followup-select" data-id="' + item.id + '"><option value="">Status...</option><option value="resolvido">Resolvido ✓</option><option value="parcialmente_resolvido">Parcialmente resolvido</option><option value="nao_resolvido">Não resolvido</option><option value="piorou">Piorou ↓</option></select></div>';
        }).join('');
    }

    // ── Lógica de vínculo do seguimento (atrelado / não atrelado) ──
    function aplicarVinculoSeguimento(atrelado) {
        var simArea    = document.getElementById('seg-atrelado-sim-area');
        var naoArea    = document.getElementById('seg-atrelado-nao-area');
        var ctxCard    = document.getElementById('ultima-consulta-ctx');
        var metasPanel = document.getElementById('seg-metas-panel');
        var miniTriag  = document.getElementById('seg-mini-triagem');
        var ctcae      = document.getElementById('seg-ctcae-completo');
        if (atrelado === 'sim') {
            if (simArea)    simArea.style.display    = 'block';
            if (naoArea)    naoArea.style.display    = 'none';
            if (metasPanel) metasPanel.style.display = 'block';
            if (miniTriag)  miniTriag.style.display  = 'block';
            if (ctcae)      ctcae.style.display      = 'none';
            // Preencher data da última consulta automaticamente
            var display = document.getElementById('seg-data-consulta-ref-display');
            var hidden  = document.getElementById('seg-data-consulta-ref');
            if (display && hidden) {
                if (state.ultimaConsulta) {
                    var dFmt = new Date(state.ultimaConsulta.data_hora).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
                    display.textContent  = dFmt;
                    display.style.color  = '#175C9D';
                    hidden.value = state.ultimaConsulta.data_hora.split('T')[0];
                } else {
                    display.textContent  = 'Não existe Consulta de Enfermagem para esse paciente.';
                    display.style.color  = '#dc2626';
                    hidden.value = '';
                }
            }
            // Exibir contexto da última consulta se existir
            if (state.ultimaConsulta && ctxCard) ctxCard.style.display = 'block';
        } else if (atrelado === 'nao') {
            if (simArea)    simArea.style.display    = 'none';
            if (naoArea)    naoArea.style.display    = 'block';
            if (metasPanel) metasPanel.style.display = 'none';
            if (miniTriag)  miniTriag.style.display  = 'none';
            if (ctcae)      ctcae.style.display      = 'block';
            if (ctxCard)    ctxCard.style.display    = 'none';
        }
    }

    document.querySelectorAll('input[name="seg-atrelado"]').forEach(function(radio) {
        radio.addEventListener('change', function() {
            aplicarVinculoSeguimento(this.value);
        });
    });

    // Inicializar botões de grau nos novos sintomas CTCAE do seguimento
    (function() {
        document.querySelectorAll('#seg-ctcae-list .symptom-row').forEach(function(row) {
            row.querySelectorAll('.sg').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    row.querySelectorAll('.sg').forEach(function(b){ b.classList.remove('active'); });
                    btn.classList.add('active');
                    var sym = row.dataset.sym;
                    if (sym) state.segSymptoms[sym] = { grade: parseInt(btn.dataset.g), isRisk: btn.classList.contains('risk') };
                });
            });
        });
    })();

    document.getElementById('btn-salvar-seguimento').addEventListener('click', async function() {
        if (!state.patient.id) { alert('Selecione um paciente antes de salvar o seguimento.'); return; }
        const modalidade  = document.getElementById('seg-modalidade').value;
        const momento     = document.getElementById('seg-momento').value;
        const ciclo       = parseInt(document.getElementById('seg-ciclo').value) || null;
        const enfermeiro  = state.currentUser ? state.currentUser.name : '';
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
        const atreladoRadio = document.querySelector('input[name="seg-atrelado"]:checked');
        const atrelado      = atreladoRadio ? atreladoRadio.value : null;
        const motivoRadio   = document.querySelector('input[name="seg-motivo"]:checked');
        const motivo        = motivoRadio ? motivoRadio.value : null;
        const dataConsRef   = document.getElementById('seg-data-consulta-ref').value || null;

        try {
            await api('POST', '/seguimentos', {
                id_paciente:              state.patient.id,
                id_consulta_origem:       state.consultaId || null,
                modalidade:               modalidade,
                momento_seguimento:       momento || null,
                ciclo_referencia:         ciclo,
                enfermeiro_oncologista:   enfermeiro || null,
                created_by_user_name:     enfermeiro || null,
                mini_triagem_resumo:      resumo || null,
                conduta_realizada:        conduta || null,
                efetividade:              null,
                necessita_novo_seguimento: necessita,
                sintomas:                 sintomas,
                atrelado_consulta:        atrelado,
                data_consulta_referencia: dataConsRef,
                motivo_seguimento:        motivo,
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
    var PRIOR_LABEL = { critica:'Crítica', alta:'Alta', moderada:'Moderada', baixa:'Baixa', padrao:'Padrão' };
    var PRIOR_COLOR = { critica:'#7c1d1d', alta:'#DC2626', moderada:'#D97706', baixa:'#2563EB', padrao:'#6B7280' };
    var PRIOR_BG    = { critica:'#fee2e2', alta:'#fee2e2', moderada:'#fef3c7', baixa:'#dbeafe', padrao:'#f1f5f9' };

    async function loadTarefas(url) {
        var tbody = document.getElementById('tasks-table-body');
        tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Carregando...</td></tr>';
        try { renderTarefas(await api('GET', url || '/tarefas')); }
        catch(e) { tbody.innerHTML = '<tr><td colspan="8" class="table-empty" style="color:#DC2626">Erro ao carregar.</td></tr>'; }
    }

    function renderTarefas(tarefas) {
        var tbody = document.getElementById('tasks-table-body');
        if (!tarefas.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Nenhuma tarefa encontrada.</td></tr>';
            return;
        }
        tbody.innerHTML = tarefas.map(function(t) {
            var pr    = t.prioridade || 'padrao';
            var prStyle = 'background:' + (PRIOR_BG[pr]||'#f1f5f9') + ';color:' + (PRIOR_COLOR[pr]||'#6B7280') +
                          ';font-weight:700;font-size:0.72rem;padding:2px 8px;border-radius:20px;white-space:nowrap';
            var stCls = t.status === 'concluida' ? '#15803d' : t.status === 'cancelada' ? '#6B7280' : '#D97706';
            var stStyle = 'font-size:0.72rem;font-weight:600;color:' + stCls;
            var dtFmt  = t.data_prevista
                ? new Date(t.data_prevista).toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})
                : '—';
            var tipo   = (t.tipo_tarefa || '').replace(/_/g, ' ');
            var result = t.conduta_realizada
                ? '<span title="' + t.conduta_realizada.replace(/"/g,'') + '" style="font-size:0.72rem;color:#374151;cursor:help">' +
                  (t.conduta_realizada.length > 35 ? t.conduta_realizada.substring(0,35)+'…' : t.conduta_realizada) + '</span>'
                : '<span style="color:#94a3b8;font-size:0.72rem">—</span>';
            var acao = t.status !== 'concluida' && t.status !== 'cancelada'
                ? '<button class="btn-task-done" data-id="' + t.id_tarefa + '" data-tipo="' + tipo +
                  '" data-pac="' + (t.iniciais_nome||'') + '" data-pr="' + (PRIOR_LABEL[pr]||pr) +
                  '" style="font-size:0.75rem;padding:4px 10px">Concluir</button>'
                : '<span style="font-size:0.72rem;color:#94a3b8">' + (t.completed_by_user_name || '—') + '</span>';
            return '<tr>' +
                '<td><span style="' + prStyle + '">' + (PRIOR_LABEL[pr] || pr) + '</span></td>' +
                '<td><span style="' + stStyle + '">' + (t.status || '—') + '</span></td>' +
                '<td style="font-weight:600;font-size:0.83rem">' + (t.iniciais_nome || '—') + '</td>' +
                '<td style="font-size:0.82rem">' + tipo + '</td>' +
                '<td style="font-size:0.8rem;white-space:nowrap">' + dtFmt + '</td>' +
                '<td style="font-size:0.8rem">' + (t.responsavel || t.created_by_user_name || '—') + '</td>' +
                '<td>' + result + '</td>' +
                '<td>' + acao + '</td>' +
                '</tr>';
        }).join('');
        tbody.querySelectorAll('.btn-task-done').forEach(function(btn) {
            btn.addEventListener('click', function() {
                document.getElementById('ct-tarefa-id').value = btn.dataset.id;
                document.getElementById('ct-resultado').value = '';
                document.getElementById('ct-efetividade').value = '';
                document.getElementById('ct-erro').style.display = 'none';
                document.getElementById('ct-info').textContent =
                    'Paciente: ' + btn.dataset.pac + ' | Tipo: ' + btn.dataset.tipo + ' | Prioridade: ' + btn.dataset.pr;
                document.getElementById('concluir-tarefa-modal').style.display = 'flex';
            });
        });
    }

    // Filtros de tarefas
    document.querySelectorAll('#module-tasks .filter-chip').forEach(function(chip) {
        chip.addEventListener('click', async function() {
            document.querySelectorAll('#module-tasks .filter-chip').forEach(function(c){ c.classList.remove('active'); });
            chip.classList.add('active');
            var f = chip.dataset.filter;
            var url = '/tarefas';
            if (f === 'pendente')  url = '/tarefas?status=pendente';
            if (f === 'concluida') url = '/tarefas?status=concluida';
            if (f === 'hoje')      url = '/tarefas?periodo=hoje';
            if (f === 'proximas')  url = '/tarefas?periodo=proximas';
            try { renderTarefas(await api('GET', url)); } catch(e) {}
        });
    });

    // Modal: Nova Tarefa
    document.getElementById('btn-nova-tarefa').addEventListener('click', function() {
        document.getElementById('nt-paciente-display').value =
            state.patient && state.patient.initials ? state.patient.initials + ' (' + state.patient.reg + ')' : '';
        document.getElementById('nt-paciente-id').value = state.patient ? (state.patient.id || '') : '';
        document.getElementById('nt-tipo').value = '';
        document.getElementById('nt-prioridade').value = 'moderada';
        document.getElementById('nt-data').value = '';
        document.getElementById('nt-descricao').value = '';
        document.getElementById('nt-erro').style.display = 'none';
        document.getElementById('nova-tarefa-modal').style.display = 'flex';
    });
    document.getElementById('close-nova-tarefa-modal').addEventListener('click', function() {
        document.getElementById('nova-tarefa-modal').style.display = 'none';
    });
    document.getElementById('btn-salvar-nova-tarefa').addEventListener('click', async function() {
        var tipo   = document.getElementById('nt-tipo').value;
        var pacId  = parseInt(document.getElementById('nt-paciente-id').value);
        var erro   = document.getElementById('nt-erro');
        if (!tipo)  { erro.textContent = 'Selecione o tipo de tarefa.'; erro.style.display = 'block'; return; }
        if (!pacId) { erro.textContent = 'Nenhum paciente selecionado. Abra um paciente antes de criar a tarefa.'; erro.style.display = 'block'; return; }
        if (!state.currentUser) { erro.textContent = 'Usuário não autenticado.'; erro.style.display = 'block'; return; }
        try {
            await api('POST', '/tarefas', {
                id_paciente:          pacId,
                id_consulta_origem:   state.consultaId || null,
                tipo_tarefa:          tipo,
                descricao:            document.getElementById('nt-descricao').value || null,
                prioridade:           document.getElementById('nt-prioridade').value,
                data_prevista:        document.getElementById('nt-data').value || null,
                created_by_user_name: state.currentUser.name
            });
            document.getElementById('nova-tarefa-modal').style.display = 'none';
            loadTarefas();
        } catch(e) { erro.textContent = 'Erro ao criar tarefa: ' + e.message; erro.style.display = 'block'; }
    });

    // Modal: Concluir Tarefa
    document.getElementById('close-concluir-tarefa-modal').addEventListener('click', function() {
        document.getElementById('concluir-tarefa-modal').style.display = 'none';
    });
    document.getElementById('btn-confirmar-conclusao').addEventListener('click', async function() {
        var id       = document.getElementById('ct-tarefa-id').value;
        var resultado = document.getElementById('ct-resultado').value.trim();
        var efet     = document.getElementById('ct-efetividade').value;
        var erro     = document.getElementById('ct-erro');
        if (!resultado) { erro.textContent = 'Informe o resultado da intervenção.'; erro.style.display = 'block'; return; }
        if (!state.currentUser) { erro.textContent = 'Usuário não autenticado.'; erro.style.display = 'block'; return; }
        try {
            await api('PUT', '/tarefas/' + id + '/concluir', {
                resultado:             resultado,
                efetividade:           efet || null,
                completed_by_user_name: state.currentUser.name
            });
            document.getElementById('concluir-tarefa-modal').style.display = 'none';
            loadTarefas();
        } catch(e) { erro.textContent = 'Erro: ' + e.message; erro.style.display = 'block'; }
    });

    // ── PENDÊNCIAS ──
    var PEND_STATUS_COLOR = {
        aberta:           { text:'#92400e', bg:'#fef3c7' },
        em_acompanhamento:{ text:'#1e40af', bg:'#dbeafe' },
        resolvida:        { text:'#14532d', bg:'#dcfce7' },
        cancelada:        { text:'#374151', bg:'#f1f5f9' }
    };
    var PEND_STATUS_LABEL = {
        aberta:'Aberta', em_acompanhamento:'Acompanhamento', resolvida:'Resolvida', cancelada:'Cancelada'
    };
    var PEND_CAT_LABEL = {
        clinica:'Clínica', medicamentosa:'Medicamentosa', social:'Social',
        administrativa:'Administrativa', laboratorial:'Laboratorial',
        psicologica:'Psicológica', nutricional:'Nutricional',
        adesao:'Adesão', acesso_rede:'Acesso à Rede'
    };

    async function loadPendencias(url) {
        var tbody = document.getElementById('pendencias-table-body');
        tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Carregando...</td></tr>';
        try { renderPendencias(await api('GET', url || '/pendencias')); }
        catch(e) { tbody.innerHTML = '<tr><td colspan="8" class="table-empty" style="color:#DC2626">Erro ao carregar.</td></tr>'; }
    }

    function renderPendencias(lista) {
        var tbody = document.getElementById('pendencias-table-body');
        if (!lista.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Nenhuma pendência encontrada.</td></tr>';
            return;
        }
        tbody.innerHTML = lista.map(function(p) {
            var pr     = p.prioridade || 'moderada';
            var prStyle = 'background:' + (PRIOR_BG[pr]||'#f1f5f9') + ';color:' + (PRIOR_COLOR[pr]||'#6B7280') +
                          ';font-weight:700;font-size:0.72rem;padding:2px 8px;border-radius:20px;white-space:nowrap';
            var st     = p.status || 'aberta';
            var stInfo = PEND_STATUS_COLOR[st] || { text:'#374151', bg:'#f1f5f9' };
            var stStyle = 'background:' + stInfo.bg + ';color:' + stInfo.text +
                          ';font-size:0.72rem;font-weight:600;padding:2px 8px;border-radius:20px;white-space:nowrap';
            var dtFmt  = p.data_abertura
                ? new Date(p.data_abertura).toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit',year:'2-digit'})
                : (p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '—');
            var desc   = p.descricao || '—';
            var descCell = '<span title="' + desc.replace(/"/g,'') + '" style="font-size:0.8rem;cursor:help">' +
                (desc.length > 45 ? desc.substring(0,45)+'…' : desc) + '</span>';
            var catLabel = PEND_CAT_LABEL[p.categoria] || p.categoria || '—';
            var resp   = p.created_by_user_name || '—';
            var ativo  = st !== 'resolvida' && st !== 'cancelada';
            var acao = ativo
                ? '<button class="btn-task-done" data-id="' + p.id_pendencia +
                  '" data-pac="' + (p.iniciais_nome||'') + '" data-cat="' + catLabel +
                  '" data-pr="' + (PRIOR_LABEL[pr]||pr) + '" data-desc="' + desc.replace(/"/g,'').substring(0,60) +
                  '" style="font-size:0.75rem;padding:4px 10px;background:#2CA76E">Resolver</button>'
                : '<span style="font-size:0.72rem;color:#94a3b8">' + (p.resolved_by_user_name || p.created_by_user_name || '—') + '</span>';
            return '<tr>' +
                '<td><span style="' + prStyle + '">' + (PRIOR_LABEL[pr]||pr) + '</span></td>' +
                '<td><span style="' + stStyle + '">' + (PEND_STATUS_LABEL[st]||st) + '</span></td>' +
                '<td style="font-weight:600;font-size:0.83rem">' + (p.iniciais_nome||'—') + '</td>' +
                '<td style="font-size:0.82rem">' + catLabel + '</td>' +
                '<td>' + descCell + '</td>' +
                '<td style="font-size:0.8rem;white-space:nowrap">' + dtFmt + '</td>' +
                '<td style="font-size:0.8rem">' + resp + '</td>' +
                '<td>' + acao + '</td>' +
                '</tr>';
        }).join('');
        tbody.querySelectorAll('.btn-task-done').forEach(function(btn) {
            btn.addEventListener('click', function() {
                document.getElementById('rp-pendencia-id').value = btn.dataset.id;
                document.getElementById('rp-conduta').value = '';
                document.getElementById('rp-erro').style.display = 'none';
                document.getElementById('rp-info').textContent =
                    'Paciente: ' + btn.dataset.pac + ' | Categoria: ' + btn.dataset.cat +
                    ' | Prioridade: ' + btn.dataset.pr + '\n' + btn.dataset.desc;
                document.getElementById('resolver-pendencia-modal').style.display = 'flex';
            });
        });
    }

    // Filtros de pendências
    document.querySelectorAll('#module-pendencias .filter-chip').forEach(function(chip) {
        chip.addEventListener('click', async function() {
            document.querySelectorAll('#module-pendencias .filter-chip').forEach(function(c){ c.classList.remove('active'); });
            chip.classList.add('active');
            document.getElementById('pend-cat-filter').value = '';
            var f = chip.dataset.filter;
            var url = '/pendencias';
            if (f === 'aberta')           url = '/pendencias?status=aberta';
            if (f === 'em_acompanhamento') url = '/pendencias?status=em_acompanhamento';
            if (f === 'resolvida')         url = '/pendencias?status=resolvida';
            if (f === 'critica')           url = '/pendencias?prioridade=critica';
            await loadPendencias(url);
        });
    });

    document.getElementById('pend-cat-filter').addEventListener('change', async function() {
        var cat = this.value;
        document.querySelectorAll('#module-pendencias .filter-chip').forEach(function(c){ c.classList.remove('active'); });
        document.querySelector('#module-pendencias .filter-chip[data-filter="todas"]').classList.add('active');
        await loadPendencias(cat ? '/pendencias?categoria=' + cat : '/pendencias');
    });

    // Modal: Nova Pendência
    document.getElementById('btn-nova-pendencia').addEventListener('click', function() {
        document.getElementById('np-paciente-display').value =
            state.patient && state.patient.initials ? state.patient.initials + ' (' + state.patient.reg + ')' : '';
        document.getElementById('np-paciente-id').value  = state.patient ? (state.patient.id || '') : '';
        document.getElementById('np-consulta-id').value  = state.consultaId || '';
        document.getElementById('np-categoria').value    = '';
        document.getElementById('np-prioridade').value   = 'moderada';
        document.getElementById('np-descricao').value    = '';
        document.getElementById('np-erro').style.display = 'none';
        var consultaInfo = document.getElementById('np-consulta-info');
        if (state.consultaId) {
            document.getElementById('np-consulta-texto').textContent = 'Vinculada à consulta atual (ID: ' + state.consultaId + ')';
            consultaInfo.style.display = 'block';
        } else {
            consultaInfo.style.display = 'none';
        }
        document.getElementById('nova-pendencia-modal').style.display = 'flex';
    });
    document.getElementById('close-nova-pendencia-modal').addEventListener('click', function() {
        document.getElementById('nova-pendencia-modal').style.display = 'none';
    });
    document.getElementById('btn-salvar-nova-pendencia').addEventListener('click', async function() {
        var cat   = document.getElementById('np-categoria').value;
        var desc  = document.getElementById('np-descricao').value.trim();
        var pacId = parseInt(document.getElementById('np-paciente-id').value);
        var erro  = document.getElementById('np-erro');
        if (!cat)  { erro.textContent = 'Selecione a categoria.'; erro.style.display = 'block'; return; }
        if (!desc) { erro.textContent = 'Informe a descrição da pendência.'; erro.style.display = 'block'; return; }
        if (!pacId){ erro.textContent = 'Nenhum paciente selecionado. Abra um paciente antes.'; erro.style.display = 'block'; return; }
        if (!state.currentUser) { erro.textContent = 'Usuário não autenticado.'; erro.style.display = 'block'; return; }
        try {
            await api('POST', '/pendencias', {
                id_paciente:          pacId,
                id_consulta_origem:   document.getElementById('np-consulta-id').value || null,
                categoria:            cat,
                descricao:            desc,
                prioridade:           document.getElementById('np-prioridade').value,
                created_by_user_name: state.currentUser.name
            });
            document.getElementById('nova-pendencia-modal').style.display = 'none';
            loadPendencias();
        } catch(e) { erro.textContent = 'Erro ao criar pendência: ' + e.message; erro.style.display = 'block'; }
    });

    // Modal: Resolver Pendência
    document.getElementById('close-resolver-pendencia-modal').addEventListener('click', function() {
        document.getElementById('resolver-pendencia-modal').style.display = 'none';
    });
    document.getElementById('btn-confirmar-resolucao').addEventListener('click', async function() {
        var id      = document.getElementById('rp-pendencia-id').value;
        var conduta = document.getElementById('rp-conduta').value.trim();
        var erro    = document.getElementById('rp-erro');
        if (!conduta) { erro.textContent = 'Informe a conduta realizada.'; erro.style.display = 'block'; return; }
        if (!state.currentUser) { erro.textContent = 'Usuário não autenticado.'; erro.style.display = 'block'; return; }
        try {
            await api('PUT', '/pendencias/' + id + '/resolver', {
                conduta_atual:        conduta,
                resolved_by_user_name: state.currentUser.name
            });
            document.getElementById('resolver-pendencia-modal').style.display = 'none';
            loadPendencias();
        } catch(e) { erro.textContent = 'Erro: ' + e.message; erro.style.display = 'block'; }
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
            }
        } catch(e) {}
        try {
            const pends = await api('GET', '/pendencias?status=aberta');
            if (document.getElementById('ind-pendencias')) document.getElementById('ind-pendencias').textContent = pends.length;
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

    // ── RELATÓRIO CLÍNICO ──
    async function gerarRelatorio() {
        if (!state.consultaId) { alert('Nenhuma consulta aberta.'); return; }
        document.getElementById('relatorio-modal').style.display = 'flex';
        document.getElementById('relatorio-text').value = 'Carregando dados do banco...';
        try {
            var d = await api('GET', '/consultas/' + state.consultaId);
            var c = d.consulta;
            var agora     = new Date().toLocaleString('pt-BR');
            var dtConsulta = c.data_hora ? new Date(c.data_hora).toLocaleString('pt-BR') : '—';
            var paciente  = (state.patient && state.patient.initials) ? state.patient.initials : '—';
            var registro  = (state.patient && state.patient.reg)      ? state.patient.reg      : '—';
            var enfermeiro = c.completed_by_user_name || c.updated_by_user_name || '—';
            var tipoDropdown = (document.getElementById('tipo-consulta')?.value || '').trim();
            var tipoDb   = c.tipo_consulta || '';
            var tipoRaw  = tipoDropdown || tipoDb;
            var tipo     = tipoRaw ? (tipoRaw.charAt(0).toUpperCase() + tipoRaw.slice(1)) : '—';
            var status    = c.status_consulta || '—';
            var riscAuto  = c.classificacao_risco_automatica || '—';
            var riscVal   = c.classificacao_risco_validada   || '—';
            var sep = '─'.repeat(78);
            var txt = '';

            txt += '═'.repeat(78) + '\n';
            txt += '                       CONSULTA DE ENFERMAGEM\n';
            txt += '      GESTÃO DO CUIDADO ONCOLÓGICO — AMBULATÓRIO BORGES DA COSTA\n';
            txt += '═'.repeat(78) + '\n\n';
            txt += 'Paciente   : ' + paciente + '\n';
            txt += 'Registro   : ' + registro + '\n';
            txt += 'Data/Hora  : ' + dtConsulta + '\n';
            txt += 'Tipo       : ' + tipo + '\n';
            txt += 'Status     : ' + status + '\n';
            txt += 'Enfermeiro : ' + enfermeiro + '\n\n';

            txt += sep + '\n1. CLASSIFICAÇÃO DE RISCO\n' + sep + '\n\n';
            txt += '  Automática : ' + riscAuto + '\n';
            txt += '  Validada   : ' + riscVal  + '\n\n';

            txt += sep + '\n2. TRIAGEM CTCAE\n' + sep + '\n\n';
            if (d.sintomas && d.sintomas.length) {
                d.sintomas.forEach(function(s) {
                    txt += '  • ' + s.tipo_sintoma + ' — Grau ' + s.grau_ctcae;
                    if (s.alerta_risco) txt += ' [ALERTA]';
                    if (s.observacao)   txt += '\n    ' + s.observacao;
                    txt += '\n';
                });
            } else { txt += '  Sem sintomas registrados.\n'; }
            txt += '\n';

            txt += sep + '\n3. DIAGNÓSTICOS DE ENFERMAGEM (NANDA)\n' + sep + '\n\n';
            if (d.diagnosticos && d.diagnosticos.length) {
                d.diagnosticos.forEach(function(dx, i) {
                    txt += '  ' + (i + 1) + '. [' + dx.codigo_nanda + '] ' + dx.titulo_diagnostico + '\n';
                });
            } else { txt += '  Sem diagnósticos registrados.\n'; }
            txt += '\n';

            txt += sep + '\n4. INTERVENÇÕES DE ENFERMAGEM (NIC)\n' + sep + '\n\n';
            if (d.intervencoes && d.intervencoes.length) {
                d.intervencoes.forEach(function(n) {
                    txt += '  • [' + n.codigo_nic + '] ' + n.nome_intervencao + '\n';
                });
            } else { txt += '  Sem intervenções registradas.\n'; }
            txt += '\n';

            txt += sep + '\n5. RESULTADOS ESPERADOS (NOC)\n' + sep + '\n\n';
            if (d.resultados_esperados && d.resultados_esperados.length) {
                d.resultados_esperados.forEach(function(r) {
                    txt += '  • [' + r.codigo_noc + '] ' + r.nome_resultado + '\n';
                });
            } else { txt += '  Sem resultados esperados registrados.\n'; }
            txt += '\n';

            txt += sep + '\n6. ORIENTAÇÕES AO PACIENTE\n' + sep + '\n\n';
            var orPac = (d.orientacoes || []).filter(function(o){ return o.tipo === 'paciente'; });
            if (orPac.length) {
                orPac.forEach(function(o) {
                    var nicObj = (d.intervencoes || []).find(function(n){ return n.codigo_nic === o.codigo_nic; });
                    txt += '  [' + o.codigo_nic + '] ' + (nicObj ? nicObj.nome_intervencao : '') + '\n';
                    o.texto.split('\n').forEach(function(l){ if (l.trim()) txt += '  ' + l + '\n'; });
                    txt += '\n';
                });
            } else { txt += '  Sem orientações ao paciente registradas.\n\n'; }

            txt += sep + '\n7. ORIENTAÇÕES AO FAMILIAR/CUIDADOR\n' + sep + '\n\n';
            var orCui = (d.orientacoes || []).filter(function(o){ return o.tipo === 'cuidador'; });
            if (orCui.length) {
                orCui.forEach(function(o) {
                    var nicObj = (d.intervencoes || []).find(function(n){ return n.codigo_nic === o.codigo_nic; });
                    txt += '  [' + o.codigo_nic + '] ' + (nicObj ? nicObj.nome_intervencao : '') + '\n';
                    o.texto.split('\n').forEach(function(l){ if (l.trim()) txt += '  ' + l + '\n'; });
                    txt += '\n';
                });
            } else { txt += '  Sem orientações ao cuidador registradas.\n\n'; }

            txt += sep + '\n8. PLANO DE SEGUIMENTO\n' + sep + '\n\n';
            if (d.plano_seguimento && d.plano_seguimento.length) {
                d.plano_seguimento.forEach(function(p) {
                    txt += '  • ' + (p.tipo_seguimento || '—');
                    if (p.data_prevista) txt += ' — ' + new Date(p.data_prevista).toLocaleDateString('pt-BR');
                    if (p.responsavel)   txt += ' | Responsável: ' + p.responsavel;
                    if (p.observacao)    txt += '\n    ' + p.observacao;
                    txt += '\n';
                });
            } else { txt += '  Sem plano de seguimento registrado.\n'; }
            txt += '\n';

            txt += '═'.repeat(78) + '\n';
            txt += 'Relatório gerado em: ' + agora + '\n';
            txt += 'Usuário: ' + (state.currentUser ? state.currentUser.name : '—') + '\n';
            txt += 'Enfermeiro Gestor do Cuidado — Borges da Costa — Ambulatório de Quimioterapia\n';
            txt += '═'.repeat(78) + '\n';

            document.getElementById('relatorio-text').value = txt;
        } catch(err) {
            console.error('[gerarRelatorio]', err.message);
            document.getElementById('relatorio-text').value = 'Erro ao gerar relatório: ' + err.message;
        }
    }

    document.getElementById('btn-relatorio').addEventListener('click', gerarRelatorio);
    document.getElementById('close-relatorio-modal').addEventListener('click', function() {
        document.getElementById('relatorio-modal').style.display = 'none';
    });
    document.getElementById('regenerar-relatorio').addEventListener('click', gerarRelatorio);
    document.getElementById('copy-relatorio').addEventListener('click', function(e) {
        var ta = document.getElementById('relatorio-text');
        ta.select();
        document.execCommand('copy');
        var btn = e.currentTarget;
        btn.textContent = '✓ Copiado!';
        setTimeout(function() {
            btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copiar Relatório';
        }, 3000);
    });

    // ── CONCLUIR ──
    document.getElementById('btn-concluir').addEventListener('click', async function() {
        const conduta      = (document.getElementById('followup-conduta')?.value || '');
        const followupData = (document.getElementById('followup-data')?.value || '');
        const enfermeiro   = state.currentUser ? state.currentUser.name : '';
        const tipoConsulta = (document.getElementById('tipo-consulta')?.value || '');
        const peso         = (document.getElementById('peso')?.value || '');
        const altura       = (document.getElementById('altura')?.value || '');
        const asc          = (document.getElementById('asc')?.value || '');
        const isAberturaRel = tipoConsulta === 'Consulta de início de tratamento' || tipoConsulta === 'Consulta de troca de protocolo';
        const pa    = isAberturaRel ? (document.getElementById('fit-cv-pa')?.value || '')   : (document.getElementById('ef-pa')?.value || '');
        const temp  = isAberturaRel ? ''                                                      : (document.getElementById('ef-temp')?.value || '');
        const sato2 = isAberturaRel ? (document.getElementById('fit-ox-spo2')?.value || '') : (document.getElementById('ef-sato2')?.value || '');

        const sympsArr = Object.entries(state.symptoms)
            .filter(function(e){ return e[1].grade > 0 || e[1].isRisk; })
            .map(function(e){ return e[1].label + ': ' + (e[1].isRisk ? 'Sim (G3+)' : 'Grau ' + e[1].grade); });

        const riscoValidado = (document.getElementById('risco-validado')?.value || state.riskLevel);
        const riskLabels = { baixo:'BAIXO RISCO', moderado:'RISCO MODERADO', alto:'ALTO RISCO' };
        const saePlan    = (state.plano || []);

        const saeText = saePlan.length
            ? saePlan.map(function(dx) {
                const nicsText = dx.nics.map(function(n) {
                    let t = '     ▸ [NIC] ' + n.nome;
                    if (n.orientacao_paciente) t += '\n          [Paciente] ' + n.orientacao_paciente.replace(/\n/g, '\n          ');
                    if (n.orientacao_cuidador) t += '\n          [Cuidador] ' + n.orientacao_cuidador.replace(/\n/g, '\n          ');
                    return t;
                }).join('\n');
                const nocsText = dx.nocs.map(function(n){ return '     ▸ [NOC] ' + n.nome; }).join('\n');
                return '▸ ' + dx.titulo.toUpperCase() + ' [' + dx.codigo + ']\n' + nicsText + (nicsText && nocsText ? '\n' : '') + nocsText;
            }).join('\n\n')
            : 'Nenhum diagnóstico selecionado.';

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
'Risco Automático: ' + riskLabels[state.riskLevel] + '\n' +
'Risco Validado  : ' + riskLabels[riscoValidado] + '\n' +
(sympsArr.length ? sympsArr.map(function(s){ return '▸ '+s; }).join('\n') : 'Sem toxicidade relatada.') + '\n\n' +
'[PLANO DE CUIDADO SAE — ' + saePlan.length + ' diagnóstico(s)]\n' +
saeText + '\n\n' +
'[CONDUTA DE SEGUIMENTO]\n' +
(conduta || 'Apenas registro assistencial.') + '\n' +
(followupData ? 'Agendado para: ' + new Date(followupData).toLocaleString('pt-BR') : '');

        const riskCls    = state.riskLevel==='alto'?'risk-label-high':state.riskLevel==='moderado'?'risk-label-mod':'risk-label-low';
        const riskClsVal = riscoValidado==='alto'?'risk-label-high':riscoValidado==='moderado'?'risk-label-mod':'risk-label-low';
        const visualHtml =
            '<strong>Paciente:</strong> ' + state.patient.initials + ' (' + state.patient.reg + ')<br>' +
            '<strong>Risco Automático:</strong> <span class="' + riskCls + '">' + riskLabels[state.riskLevel] + '</span><br>' +
            '<strong>Risco Validado:</strong> <span class="' + riskClsVal + '">' + riskLabels[riscoValidado] + '</span><br>' +
            '<strong>Enfermeiro(a):</strong> ' + enfermeiro + '<br><br>' +
            '<strong>Sintomas:</strong><br>' +
            (sympsArr.length ? sympsArr.map(function(s){ return '<span style="display:block;margin-left:8px">▸ ' + s + '</span>'; }).join('') : '<em>Nenhum</em>') + '<br>' +
            '<strong>Plano SAE (' + saePlan.length + ' diagnóstico(s)):</strong><br>' +
            saePlan.map(function(dx) {
                return '<span style="display:block;margin-left:4px;margin-top:6px;font-weight:600;color:#175C9D">▸ ' + dx.titulo + '</span>' +
                    dx.nics.map(function(n) {
                    return '<span style="display:block;margin-left:16px;font-size:0.78rem">NIC: ' + n.nome + '</span>' +
                        (n.orientacao_paciente ? '<span style="display:block;margin-left:24px;font-size:0.72rem;color:#1a5276">[Pac] ' + n.orientacao_paciente.replace(/\n/g,' · ') + '</span>' : '') +
                        (n.orientacao_cuidador ? '<span style="display:block;margin-left:24px;font-size:0.72rem;color:#7d6608">[Cuid] ' + n.orientacao_cuidador.replace(/\n/g,' · ') + '</span>' : '');
                }).join('') +
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
                const isAbertura = tipoConsulta === 'Consulta de início de tratamento' || tipoConsulta === 'Consulta de troca de protocolo';
                const anamnese = isAbertura ? (function() {
                    function rv(name) { var el = document.querySelector('input[name="'+name+'"]:checked'); return el ? el.value : null; }
                    function txv(id) { var el = document.getElementById(id); return el ? (el.value||'').trim()||null : null; }
                    function chk(name) { return Array.from(document.querySelectorAll('input[name="'+name+'"]:checked')).map(function(e){return e.value;}); }
                    return {
                        escolaridade:          txv('fit-escolaridade'),
                        profissao:             txv('fit-profissao'),
                        ocupacao:              rv('fit_ocupacao'),
                        estado_civil:          rv('fit_estado_civil'),
                        filhos:                rv('fit_filhos'),
                        filhos_qtd:            txv('fit-filhos-qtd'),
                        naturalidade:          txv('fit-naturalidade'),
                        cidade_residencia:     txv('fit-cidade-residencia'),
                        religiao:              txv('fit-religiao'),
                        comorbidades:          chk('fit_comorbidade'),
                        comorbidade_outros:    txv('fit-comorbidade-outros'),
                        cirurgia_prev:         rv('fit_cirurgia_prev'),
                        cirurgia_desc:         txv('fit-cirurgia-desc'),
                        hist_familiar:         rv('fit_hist_familiar'),
                        hist_familiar_desc:    txv('fit-hist-familiar-desc'),
                        sono:                  rv('fit_sono'),
                        atividade_fisica:      rv('fit_atividade_fisica'),
                        etilismo:              rv('fit_etilismo'),
                        tabagismo:             rv('fit_tabagismo'),
                        vida_sexual:           rv('fit_vida_sexual'),
                        dum:                   txv('fit-dum'),
                        amenorreia:            rv('fit_amenorreia'),
                        seg_emocional:         rv('fit_seg_emocional'),
                        neurologico:           rv('fit_neurologico'),
                        acuidade_visual:       rv('fit_acuidade_visual'),
                        acuidade_auditiva:     rv('fit_acuidade_auditiva'),
                        risco_queda:           rv('fit_risco_queda'),
                        morse:                 txv('fit-morse'),
                        dor:                   rv('fit_dor'),
                        dor_local:             txv('fit-dor-local'),
                        dor_eva:               txv('fit-dor-eva'),
                        dx_histologico:        txv('fit-dx-histologico'),
                        dx_data:               txv('fit-dx-data'),
                        estadiamento:          rv('fit_estadiamento'),
                        estadiamento_desc:     txv('fit-estadiamento-desc'),
                        metastase:             rv('fit_metastase'),
                        protocolo_proposto:    txv('fit-protocolo-proposto'),
                        finalidade_qt:         rv('fit_finalidade_qt'),
                        tto_anterior:          chk('fit_tto_anterior'),
                        conhecimento_doenca:   rv('fit_conhecimento_doenca'),
                        geral:                 chk('fit_geral'),
                        edema:                 rv('fit_edema'),
                        mucosa_oral:           (document.getElementById('fit-mucosa-oral')?.value||null),
                        oxigenacao:            rv('fit_oxigenacao'),
                        ox_dispositivo:        txv('fit-ox-dispositivo'),
                        ox_fr:                 txv('fit-ox-fr'),
                        ox_spo2:               txv('fit-ox-spo2'),
                        ox_o2:                 txv('fit-ox-o2'),
                        cardiovascular:        rv('fit_cardiovascular'),
                        cv_fc:                 txv('fit-cv-fc'),
                        cv_pa:                 txv('fit-cv-pa'),
                        abdome:                (document.getElementById('fit-abdome')?.value||null),
                        nutricao_ef:           rv('fit_nutricao_ef'),
                        nut_dispositivo:       txv('fit-nut-dispositivo'),
                        nut_hidratacao:        txv('fit-nut-hidratacao'),
                        elin_urinaria:         rv('fit_elin_urinaria'),
                        elin_intestinal:       rv('fit_elin_intestinal'),
                        integridade_cutanea:   rv('fit_integridade_cutanea'),
                        integridade_desc:      txv('fit-integridade-desc'),
                        esvaziamento_axilar:   rv('fit_esvaziamento_axilar'),
                        esvaziamento_membro:   rv('fit_esvaziamento_membro'),
                        dados_relevantes:      txv('fit-dados-relevantes'),
                    };
                })() : null;

                await api('POST', '/consultas/'+state.consultaId+'/concluir', {
                    tipo_consulta:                 tipoConsulta || null,
                    classificacao_risco_validada:  riscoValidado,
                    texto_copiavel_prontuario:     plainText,
                    plano_cuidado_resumido:        saePlan.length ? saePlan[0].titulo : '',
                    conduta_seguimento_definida:   conduta,
                    tipo_tarefa:                   tipo_tarefa,
                    data_prevista_tarefa:          data_prevista_tarefa,
                    prioridade_tarefa:             prioridade_tarefa,
                    responsavel:                   enfermeiro,
                    completed_by_user_name:        enfermeiro,
                    anamnese:                      anamnese,
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
    window.loadNanda          = loadNanda;
    window.activateModule     = activateModule;
    window.loadPatientsList   = loadPatientsList;
    window.loadTarefas        = loadTarefas;
    window.loadPendencias     = loadPendencias;
    window.loadIndicators     = loadIndicators;
    window.loadEvolution      = loadEvolution;
});
