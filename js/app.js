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
    if (targetId === 'module-tasks')      loadTarefas();
    if (targetId === 'module-indicators') loadIndicators();
    if (targetId === 'module-evolution')  loadEvolution();
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
                    '<td><button class="btn-abrir" data-id="' + p.id_paciente + '" data-reg="' + p.registro_instituicao + '" data-iniciais="' + p.iniciais_nome + '">Abrir</button></td>' +
                    '</tr>';
            }).join('');
            tbody.querySelectorAll('.btn-abrir').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    openPatient(btn.dataset.id, btn.dataset.reg, btn.dataset.iniciais);
                });
            });
        } catch(e) {
            tbody.innerHTML = '<tr><td colspan="8" class="table-empty" style="color:#DC2626">Erro ao carregar pacientes.</td></tr>';
        }
    }

    // ── Abre paciente: verifica última consulta e exibe modal de escolha ──
    async function openPatient(id, reg, iniciais) {
        state.patient.id       = parseInt(id);
        state.patient.reg      = reg;
        state.patient.initials = iniciais;
        // Busca última consulta
        try { state.ultimaConsulta = await api('GET', '/consultas/paciente/' + id + '/ultima-concluida'); }
        catch(e) { state.ultimaConsulta = null; }

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

    async function startNovaConsulta() {
        try {
            const c = await api('POST', '/consultas', { id_paciente: state.patient.id, tipo_consulta: 'retorno' });
            state.consultaId = c.id_consulta;
        } catch(e) {}
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
                try { await api('PATCH', '/tarefas/'+btn.dataset.id, { status: 'concluida', completed_by_user_name: state.currentUser ? state.currentUser.name : null }); loadTarefas(); } catch(e) {}
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
        const enfermeiro   = state.currentUser ? state.currentUser.name : '';
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
'Risco Estratificado: ' + riskLabels[state.riskLevel] + '\n' +
(sympsArr.length ? sympsArr.map(function(s){ return '▸ '+s; }).join('\n') : 'Sem toxicidade relatada.') + '\n\n' +
'[PLANO DE CUIDADO SAE — ' + saePlan.length + ' diagnóstico(s)]\n' +
saeText + '\n\n' +
'[CONDUTA DE SEGUIMENTO]\n' +
(conduta || 'Apenas registro assistencial.') + '\n' +
(followupData ? 'Agendado para: ' + new Date(followupData).toLocaleString('pt-BR') : '');

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
                await api('POST', '/consultas/'+state.consultaId+'/concluir', {
                    classificacao_risco_validada:  state.riskLevel,
                    texto_copiavel_prontuario:     plainText,
                    plano_cuidado_resumido:        saePlan.length ? saePlan[0].titulo : '',
                    conduta_seguimento_definida:   conduta,
                    tipo_tarefa:                   tipo_tarefa,
                    data_prevista_tarefa:          data_prevista_tarefa,
                    prioridade_tarefa:             prioridade_tarefa,
                    responsavel:                   enfermeiro,
                    completed_by_user_name:        enfermeiro,
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
