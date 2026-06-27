/**
 * JARVIS — Sistema de Inteligência
 * jarvis.js — toda a lógica de voz, API e UI
 */

/* ═══════════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════════ */
const CONFIG = {
  elevenLabsKey: '80f20c0648bd28e0f7c7c77c6d41551f5e5e03109f94f40a9bf0176a981e5b8f',
  voiceId:       'sB7vwSCyX0tQmU24cW2C',
  claudeModel:   'claude-sonnet-4-6',
  claudeEndpoint:'https://api.anthropic.com/v1/messages',
  elevenEndpoint: id => `https://api.elevenlabs.io/v1/text-to-speech/${id}`,
};

/* ═══════════════════════════════════════════════════════════════
   BANCO DE PESSOAS
═══════════════════════════════════════════════════════════════ */
const PESSOAS = [
  {
    keywords: ['antonio', 'antonio eduardo', 'eleres das neves', 'antonio eleres', 'antonio neves'],
    campos: [
      ['NOME',          'ANTONIO EDUARDO ELERES DAS NEVES'],
      ['CPF',           '054.803.422-23'],
      ['SEXO',          'M'],
      ['NASCIMENTO',    '10/12/2010'],
      ['NOME DA MÃE',   'Tamara de Lima Eleres'],
      ['ESTADO CIVIL',  'SEM RESULTADO'],
      ['RG',            'SEM RESULTADO'],
      ['CBO',           'SEM RESULTADO'],
      ['ÓRGÃO EMISSOR', 'SEM RESULTADO'],
      ['UF EMISSOR',    'SEM RESULTADO'],
      ['DATA ÓBITO',    'SEM RESULTADO'],
      ['RENDA',         '0 reais'],
    ],
    fala: 'Dados encontrados. Antonio Eduardo Eleres das Neves. ' +
          'CPF 054.803.422-23. Sexo masculino. ' +
          'Nascimento 10 de dezembro de 2010. ' +
          'Mãe: Tamara de Lima Eleres. Renda: zero reais.',
  },
  {
    keywords: ['tamara', 'tamara de lima', 'tamara eleres', 'lima eleres'],
    campos: [
      ['NOME',          'TAMARA DE LIMA ELERES'],
      ['CPF',           '016.447.892-21'],
      ['SEXO',          'F'],
      ['NASCIMENTO',    '26/03/1993'],
      ['NOME DA MÃE',   'MARIA DA PAZ PINTO DE LIMA'],
      ['NOME DO PAI',   'ADEMIR PINHEIRO ELERES'],
      ['ESTADO CIVIL',  'SEM RESULTADO'],
      ['RG',            'SEM RESULTADO'],
      ['CBO',           'SEM RESULTADO'],
      ['ÓRGÃO EMISSOR', 'SEM RESULTADO'],
      ['UF EMISSOR',    'SEM RESULTADO'],
      ['DATA ÓBITO',    'SEM RESULTADO'],
      ['RENDA',         '576,95'],
    ],
    fala: 'Dados encontrados. Tamara de Lima Eleres. ' +
          'CPF 016.447.892-21. Sexo feminino. ' +
          'Nascimento 26 de março de 1993. ' +
          'Mãe: Maria da Paz Pinto de Lima. Pai: Ademir Pinheiro Eleres. ' +
          'Renda: 576 reais e 95 centavos.',
  },
  {
    keywords: ['jacimara', 'jacimara pinto', 'pinto de lima', 'jacimara lima'],
    campos: [
      ['NOME',              'JACIMARA PINTO DE LIMA'],
      ['CPF',               '655.948.432-72'],
      ['SEXO',              'F'],
      ['NASCIMENTO',        '20/10/1974'],
      ['NOME DA MÃE',       'MARIA DA PAZ PINTO DE LIMA'],
      ['NOME DO PAI',       'JAIRO TEIXEIRA DE LIMA'],
      ['ESTADO CIVIL',      'SEM RESULTADO'],
      ['RG',                '2847111'],
      ['CBO',               'SEM RESULTADO'],
      ['ÓRGÃO EMISSOR',     'SSP'],
      ['UF EMISSOR',        'SEM RESULTADO'],
      ['DATA ÓBITO',        'SEM RESULTADO'],
      ['RENDA',             'SEM RESULTADO'],
      ['TÍTULO DE ELEITOR', 'SEM RESULTADO'],
    ],
    fala: 'Dados encontrados. Jacimara Pinto de Lima. ' +
          'CPF 655.948.432-72. Sexo feminino. ' +
          'Nascimento 20 de outubro de 1974. ' +
          'Mãe: Maria da Paz Pinto de Lima. Pai: Jairo Teixeira de Lima. ' +
          'RG 2847111, órgão emissor SSP.',
  },
];

/* ═══════════════════════════════════════════════════════════════
   UTILIDADES
═══════════════════════════════════════════════════════════════ */
function normalizar(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function buscarPessoa(texto) {
  const q = normalizar(texto);
  for (const p of PESSOAS) {
    for (const kw of p.keywords) {
      if (q.includes(normalizar(kw))) return p;
    }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   UI HELPERS
═══════════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);

// Estado visual: 'standby' | 'listening' | 'thinking' | 'speaking'
const STATE_MAP = {
  standby:  { icon:'🤖', label:'STANDBY — DIGA "JARVIS" PARA ATIVAR', color:'#00d4ff', orbClass:'' },
  listening:{ icon:'🎙️', label:'OUVINDO — PODE FALAR...',             color:'#00ff88', orbClass:'listening' },
  thinking: { icon:'⚡',  label:'PROCESSANDO DADOS...',                color:'#ffb400', orbClass:'thinking' },
  speaking: { icon:'🔊', label:'JARVIS RESPONDENDO...',               color:'#ff8c00', orbClass:'speaking' },
};

function setEstado(estado) {
  const s = STATE_MAP[estado] || STATE_MAP.standby;
  const orb   = $('orbCore');
  const label = $('stateLabel');

  orb.textContent   = s.icon;
  orb.className     = s.orbClass;
  label.textContent = s.label;
  label.style.borderColor = s.color + '55';
  label.style.color       = s.color;
  label.style.background  = s.color + '11';

  // viz bars
  const bars = document.querySelectorAll('.viz-bar');
  const ativo = estado === 'listening' || estado === 'speaking';
  bars.forEach(b => {
    b.style.setProperty('--viz-color', s.color);
    if (ativo) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
      b.style.height = '3px';
    }
  });
}

// Toast
let toastTimer = null;
function mostrarToast(msg, cor = '#00d4ff') {
  const t = $('toast');
  t.textContent    = msg;
  t.style.display  = 'block';
  t.style.color    = cor;
  t.style.borderColor = cor;
  t.style.boxShadow   = `0 0 20px ${cor}44`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.display = 'none'; }, 3200);
}

// Mensagens
function removerEstadoVazio() {
  const e = $('emptyState');
  if (e) e.remove();
}

function adicionarMensagem(role, conteudo, isDados = false) {
  removerEstadoVazio();
  const container = $('chatMessages');

  const wrap = document.createElement('div');
  wrap.className = 'msg ' + role;

  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = role === 'user' ? '▶ VOCÊ' : '◀ JARVIS';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  if (isDados) {
    bubble.innerHTML = renderDataCard(conteudo);
  } else {
    bubble.textContent = conteudo;
  }

  wrap.appendChild(label);
  wrap.appendChild(bubble);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

function renderDataCard(campos) {
  return campos.map(([k, v]) => {
    const valClass = v === 'SEM RESULTADO' ? 'data-empty' : 'data-val';
    return `<div class="data-row"><span class="data-key">${k}:</span> <span class="${valClass}">${v}</span></div>`;
  }).join('');
}

let typingEl = null;
function mostrarTyping() {
  removerEstadoVazio();
  const container = $('chatMessages');

  const wrap = document.createElement('div');
  wrap.className = 'msg jarvis';
  wrap.id = '_typing';

  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = '◀ JARVIS';

  const bubble = document.createElement('div');
  bubble.className = 'typing-bubble';
  bubble.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

  wrap.appendChild(label);
  wrap.appendChild(bubble);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  typingEl = wrap;
}

function removerTyping() {
  if (typingEl) { typingEl.remove(); typingEl = null; }
}

/* ═══════════════════════════════════════════════════════════════
   VISUALIZER — barras animadas
═══════════════════════════════════════════════════════════════ */
(function criarBars() {
  const viz = $('visualizer');
  for (let i = 0; i < 20; i++) {
    const b = document.createElement('div');
    b.className = 'viz-bar';
    b.style.height = '3px';
    viz.appendChild(b);
  }
})();

// Animação livre das barras quando ativas
let vizInterval = null;
function iniciarViz(cor) {
  const bars = document.querySelectorAll('.viz-bar');
  vizInterval && clearInterval(vizInterval);
  vizInterval = setInterval(() => {
    bars.forEach(b => {
      if (b.classList.contains('active')) {
        const h = 4 + Math.random() * 34;
        b.style.height = h + 'px';
      }
    });
  }, 120);
}
function pararViz() {
  clearInterval(vizInterval);
  vizInterval = null;
}

/* ═══════════════════════════════════════════════════════════════
   ELEVENLABS TTS
═══════════════════════════════════════════════════════════════ */
let audioAtual = null;

async function falar(texto) {
  if (audioAtual) { audioAtual.pause(); audioAtual = null; }

  const res = await fetch(CONFIG.elevenEndpoint(CONFIG.voiceId), {
    method: 'POST',
    headers: {
      'xi-api-key': CONFIG.elevenLabsKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: texto,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.78 },
    }),
  });

  if (!res.ok) throw new Error('ElevenLabs HTTP ' + res.status);

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audioAtual  = audio;
    audio.onended = () => { URL.revokeObjectURL(url); audioAtual = null; resolve(); };
    audio.onerror = () => { URL.revokeObjectURL(url); audioAtual = null; reject(new Error('Erro no áudio')); };
    audio.play().catch(reject);
  });
}

/* ═══════════════════════════════════════════════════════════════
   ANTHROPIC CLAUDE API
═══════════════════════════════════════════════════════════════ */
async function perguntarClaude(texto) {
  const res = await fetch(CONFIG.claudeEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CONFIG.claudeModel,
      max_tokens: 1000,
      system: 'Você é JARVIS, assistente de IA avançado. ' +
              'Responda sempre em português brasileiro, ' +
              'de forma concisa e direta (máximo 3 frases). ' +
              'Sem markdown, apenas texto simples.',
      messages: [{ role: 'user', content: texto }],
    }),
  });

  if (!res.ok) throw new Error('Claude HTTP ' + res.status);
  const data = await res.json();
  return data.content?.[0]?.text || 'Sem resposta.';
}

/* ═══════════════════════════════════════════════════════════════
   PROCESSAMENTO DE ENTRADA
═══════════════════════════════════════════════════════════════ */
let processando = false;

async function processarEntrada(texto) {
  texto = texto.trim();
  if (!texto || processando) return;
  processando = true;

  adicionarMensagem('user', texto);
  setEstado('thinking');
  mostrarTyping();
  pararViz();

  let textoFala = '';

  try {
    const pessoa = buscarPessoa(texto);

    if (pessoa) {
      removerTyping();
      adicionarMensagem('jarvis', pessoa.campos, true);
      textoFala = pessoa.fala;
    } else {
      const resposta = await perguntarClaude(texto);
      removerTyping();
      adicionarMensagem('jarvis', resposta);
      textoFala = resposta;
    }

    setEstado('speaking');
    iniciarViz('#ff8c00');

    try {
      await falar(textoFala);
    } catch (e) {
      console.error('TTS:', e);
      mostrarToast('⚠ Erro no ElevenLabs: ' + e.message, '#ff3c3c');
    }

  } catch (e) {
    removerTyping();
    console.error('Erro:', e);
    const msg = 'Sistema indisponível no momento. Tente novamente.';
    adicionarMensagem('jarvis', msg);
    mostrarToast('⚠ ' + e.message, '#ff3c3c');
    try { await falar(msg); } catch (_) {}
  } finally {
    processando = false;
    setEstado(micAtivo ? 'standby' : 'standby');
    pararViz();
    if (micAtivo) reiniciarEscuta();
  }
}

/* ═══════════════════════════════════════════════════════════════
   RECONHECIMENTO DE VOZ
═══════════════════════════════════════════════════════════════ */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition  = null;
let micAtivo     = false;
let aguardandoCmd = false; // true = wake word detectada, esperando comando

function criarReconhecimento(modoComando) {
  if (!SR) return null;
  const r = new SR();
  r.lang            = 'pt-BR';
  r.continuous      = false;
  r.interimResults  = false;
  r.maxAlternatives = 3;

  r.onresult = async (e) => {
    const transcript = Array.from(e.results)
      .map(r => r[0].transcript)
      .join(' ')
      .trim();

    const q = normalizar(transcript);
    console.log('[JARVIS] Reconhecido:', transcript);

    if (!modoComando) {
      // Aguardando wake word
      if (q.includes('jarvis') || q.includes('jarviz') || q.includes('jarves')) {
        aguardandoCmd = true;
        setEstado('listening');
        iniciarViz('#00ff88');
        mostrarToast('⚡ JARVIS ATIVADO — Pode falar!', '#00ff88');
        setTimeout(() => iniciarEscuta(true), 300);
      } else {
        // Continuar ouvindo wake word
        if (micAtivo && !processando) {
          setTimeout(() => iniciarEscuta(false), 250);
        }
      }
    } else {
      // Recebeu o comando
      aguardandoCmd = false;
      pararViz();
      await processarEntrada(transcript);
    }
  };

  r.onerror = (e) => {
    if (e.error === 'no-speech' && micAtivo && !processando) {
      setTimeout(() => iniciarEscuta(modoComando), 300);
    } else if (e.error !== 'aborted') {
      console.warn('[JARVIS] Erro SR:', e.error);
    }
  };

  r.onend = () => {
    if (micAtivo && !processando && !modoComando) {
      setTimeout(() => iniciarEscuta(false), 250);
    }
  };

  return r;
}

function iniciarEscuta(modoComando = false) {
  if (recognition) { try { recognition.stop(); } catch (_) {} }
  recognition = criarReconhecimento(modoComando);
  if (!recognition) {
    mostrarToast('Reconhecimento de voz não suportado neste navegador.', '#ff3c3c');
    return;
  }
  try { recognition.start(); } catch (e) { console.warn('Start falhou:', e); }
}

function reiniciarEscuta() {
  if (micAtivo && !processando) {
    setEstado('standby');
    setTimeout(() => iniciarEscuta(false), 600);
  }
}

function pararEscuta() {
  micAtivo = false;
  aguardandoCmd = false;
  if (recognition) { try { recognition.stop(); } catch (_) {} recognition = null; }
  pararViz();
  setEstado('standby');
}

/* ═══════════════════════════════════════════════════════════════
   CONTROLLER PÚBLICO  (chamado pelo HTML)
═══════════════════════════════════════════════════════════════ */
const jarvis = {
  toggleMic() {
    if (!SR) {
      mostrarToast('Reconhecimento de voz não disponível neste navegador.', '#ff3c3c');
      return;
    }
    if (micAtivo) {
      pararEscuta();
      const btn = $('micBtn');
      btn.textContent = '🎤 MIC';
      btn.classList.remove('recording');
      mostrarToast('Microfone desativado.', '#4a7a99');
    } else {
      micAtivo = true;
      const btn = $('micBtn');
      btn.textContent = '⏹ PARAR';
      btn.classList.add('recording');
      iniciarEscuta(false);
      mostrarToast('🎤 Ouvindo... diga "Jarvis" para ativar.', '#00d4ff');
    }
  },

  sendText() {
    const input = $('textInput');
    const texto = input.value.trim();
    if (!texto) return;
    input.value = '';
    processarEntrada(texto);
  },
};

/* ═══════════════════════════════════════════════════════════════
   INICIALIZAÇÃO
═══════════════════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  // Enter no input
  $('textInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') jarvis.sendText();
  });

  // Hover nos botões genéricos
  document.querySelectorAll('.btn:not(#micBtn)').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.borderColor = '#00d4ff';
      btn.style.color       = '#00d4ff';
      btn.style.background  = 'rgba(0,212,255,.1)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.borderColor = '';
      btn.style.color       = '';
      btn.style.background  = '';
    });
  });

  // Auto-iniciar microfone se disponível
  if (SR) {
    setTimeout(() => {
      jarvis.toggleMic();
    }, 1000);
  } else {
    mostrarToast('Use o campo de texto — voz não disponível neste navegador.', '#ffb400');
  }
});

// Expor globalmente para o HTML
window.jarvis = jarvis;
