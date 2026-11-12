'use strict';
/* ============================================================
   CÓDIGO PALAVRA — jogo de alfabetização e letramento (PWA)
   ============================================================ */
const $ = (s, e = document) => e.querySelector(s);
const V = $('#view');
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const sample = (a, n) => shuffle(a).slice(0, n);

/* ---------- SAVE ---------- */
const SAVE_KEY = 'codigo-palavra-v1';
const defaults = { xp: 0, coins: 0, bestCombo: 0, done: {}, stars: {}, avatar: 'cyber', theme: 'ciano', ownedAv: ['cyber'], ownedTh: ['ciano'], auto: true };
function load() { try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) { return Object.assign({}, defaults); } }
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
let S = load();
const lvl = () => Math.floor(S.xp / 100) + 1;

/* ---------- ÁUDIO: efeitos (Web Audio) ---------- */
let AC;
function ac() {
  if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (C) AC = new C(); }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(f, t0, d, type = 'sine', v = .12) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + .05);
}
const sfx = {
  tap() { tone(520, 0, .07, 'triangle') },
  ok() { tone(660, 0, .1, 'square', .07); tone(880, .09, .18, 'square', .07) },
  err() { tone(220, 0, .18, 'sawtooth', .06); tone(170, .12, .22, 'sawtooth', .06) },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * .11, .28, 'square', .07)) },
  coin() { tone(988, 0, .08, 'square', .06); tone(1319, .08, .22, 'square', .06) },
  level() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * .09, .22, 'triangle', .1)) }
};
const vib = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } };

/* ---------- ÁUDIO: narração (speechSynthesis pt-BR) ---------- */
let voice = null, readTok = 0;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices();
  voice = vs.find(v => v.lang === 'pt-BR') || vs.find(v => v.lang.replace('_', '-').toLowerCase() === 'pt-br') || vs.find(v => v.lang.startsWith('pt')) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text, o = {}) {
  const { rate = .9, cancel = true, onend } = o;
  if (!('speechSynthesis' in window)) { onend && onend(); return; }
  if (cancel) { readTok++; speechSynthesis.cancel(); }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'pt-BR'; if (voice) u.voice = voice; u.rate = rate; u.pitch = 1;
  if (onend) { u.onend = onend; u.onerror = onend; }
  speechSynthesis.speak(u);
}
const speakAuto = (t, o) => { if (S.auto) speak(t, o); };
const LETTER = { A: 'á', B: 'bê', C: 'cê', D: 'dê', E: 'é', F: 'éfe', G: 'gê', H: 'agá', I: 'i', J: 'jota', L: 'éle', M: 'ême', N: 'ene', O: 'ó', P: 'pê', Q: 'quê', R: 'érre', S: 'ésse', T: 'tê', U: 'u', V: 'vê', X: 'xis', Z: 'zê' };
const VOWELS = 'AEIOU';

/* ---------- TEMAS E AVATARES ---------- */
const AV = {
  cyber: { n: 'Cyber', e: '🤖', p: 0 }, gamer: { n: 'Gamer', e: '🎮', p: 40 }, ninja: { n: 'Ninja', e: '🥷', p: 70 },
  hacker: { n: 'Hacker', e: '🧑‍💻', p: 100 }, espacial: { n: 'Espacial', e: '🚀', p: 140 }
};
const TH = {
  ciano: { n: 'Ciano', a: '#00e5ff', b: '#7c4dff', p: 0 }, roxo: { n: 'Roxo', a: '#b26bff', b: '#ff4fd8', p: 60 },
  verde: { n: 'Matrix', a: '#22ff88', b: '#00c2ff', p: 80 }, laranja: { n: 'Lava', a: '#ff8a1f', b: '#ff3d6e', p: 100 },
  rosa: { n: 'Neon Rosa', a: '#ff3d9a', b: '#ffd23d', p: 120 }
};
function applyTheme() {
  const t = TH[S.theme] || TH.ciano, r = document.documentElement.style;
  r.setProperty('--accent', t.a); r.setProperty('--accent2', t.b);
}

/* ---------- BANCO DE PALAVRAS ---------- */
const W2 = [
  { w: 'JOGO', s: ['JO', 'GO'], e: '🎮' }, { w: 'FONE', s: ['FO', 'NE'], e: '🎧' }, { w: 'TELA', s: ['TE', 'LA'], e: '🖥️' },
  { w: 'BOLA', s: ['BO', 'LA'], e: '⚽' }, { w: 'REDE', s: ['RE', 'DE'], e: '🌐' }, { w: 'CARRO', s: ['CAR', 'RO'], e: '🏎️' },
  { w: 'VÍDEO', s: ['VÍ', 'DE', 'O'], e: '🎬' }, { w: 'MÚSICA', s: ['MÚ', 'SI', 'CA'], e: '🎵' },
  { w: 'AMIGO', s: ['A', 'MI', 'GO'], e: '🤝' }, { w: 'PIZZA', s: ['PIZ', 'ZA'], e: '🍕' }
];
const W3 = [
  { w: 'TRABALHO', s: ['TRA', 'BA', 'LHO'], e: '💼', g: { p: 'TRABA_O', a: 'LH', o: ['LH', 'NH', 'CH'] } },
  { w: 'CAMINHO', s: ['CA', 'MI', 'NHO'], e: '🛣️', g: { p: 'CAMI_O', a: 'NH', o: ['NH', 'LH', 'CH'] } },
  { w: 'CACHORRO', s: ['CA', 'CHOR', 'RO'], e: '🐕', g: { p: 'CA_ORRO', a: 'CH', o: ['CH', 'LH', 'NH'] } },
  { w: 'GUITARRA', s: ['GUI', 'TAR', 'RA'], e: '🎸', g: { p: 'GUITA_A', a: 'RR', o: ['RR', 'SS', 'LL'] } },
  { w: 'PLANETA', s: ['PLA', 'NE', 'TA'], e: '🪐', g: { p: 'P_ANETA', a: 'L', o: ['L', 'R', 'N'] } },
  { w: 'CELULAR', s: ['CE', 'LU', 'LAR'], e: '📱', g: { p: 'CELU_AR', a: 'L', o: ['L', 'R', 'LH'] } },
  { w: 'MENSAGEM', s: ['MEN', 'SA', 'GEM'], e: '💬', g: { p: 'ME_SAGEM', a: 'N', o: ['N', 'M', 'NH'] } },
  { w: 'CHUTEIRA', s: ['CHU', 'TEI', 'RA'], e: '👟', g: { p: '_UTEIRA', a: 'CH', o: ['CH', 'LH', 'NH'] } },
  { w: 'FLORESTA', s: ['FLO', 'RES', 'TA'], e: '🌳', g: { p: 'F_ORESTA', a: 'L', o: ['L', 'R', 'LH'] } },
  { w: 'PASSAGEM', s: ['PAS', 'SA', 'GEM'], e: '🎫', g: { p: 'PA__AGEM', a: 'SS', o: ['SS', 'RR', 'CH'] } }
];
const W4 = [
  { sc: 'Você chegou em casa com muita fome.', e: '🏠🍕', o: ['Eu pedi uma pizza.', 'Eu perdi o fone.', 'Eu vi um filme.'] },
  { sc: 'Seu amigo chamou para jogar online.', e: '🎮🌙', o: ['Vamos jogar hoje à noite.', 'Vamos jantar de manhã.', 'Vamos andar de moto.'] },
  { sc: 'A bateria do celular acabou.', e: '📱🪫', o: ['O celular está sem bateria.', 'O celular está muito caro.', 'O cachorro está sem comida.'] },
  { sc: 'Você quer ouvir música, mas esqueceu o fone.', e: '🎧❌', o: ['Esqueci o fone em casa.', 'Esqueci a bola na escola.', 'Encontrei o fone novo.'] },
  { sc: 'Está chovendo forte e você precisa sair.', e: '🌧️☂️', o: ['Eu levo o guarda-chuva.', 'Eu levo o chapéu de praia.', 'Eu levo a bola de futebol.'] },
  { sc: 'Você tirou uma foto legal com a turma.', e: '📸👥', o: ['Tirei uma foto com os amigos.', 'Tirei um dia de folga.', 'Troquei a foto do carro.'] },
  { sc: 'O ônibus da escola demorou muito.', e: '🚌⏰', o: ['O ônibus está atrasado.', 'O almoço está pronto.', 'A aula está legal.'] },
  { sc: 'Você venceu a partida e comemorou.', e: '🏆🎉', o: ['Eu ganhei o jogo!', 'Eu perdi o jogo.', 'Eu comprei um jogo.'] }
];
const W5 = [
  { from: 'Lucas', msg: 'Salve! Vamos jogar bola hoje?', b: 'Bora! Eu levo a ', a: '.', t: 'BOLA', s: ['BO', 'LA'], x: ['TE', 'MI', 'RA'] },
  { from: 'Duda', msg: 'Qual é o seu jogo favorito?', b: 'Meu favorito é o ', a: '!', t: 'FUTEBOL', s: ['FU', 'TE', 'BOL'], x: ['JO', 'CA', 'LU'] },
  { from: 'Mãe', msg: 'Você já fez o dever de casa?', b: 'Já! Terminei a ', a: '.', t: 'TAREFA', s: ['TA', 'RE', 'FA'], x: ['MI', 'GO', 'LA'] },
  { from: 'Pedro', msg: 'Me manda uma foto da festa?', b: 'Claro! Já mandei a ', a: '.', t: 'FOTO', s: ['FO', 'TO'], x: ['VÍ', 'DE', 'PA'] },
  { from: 'Bia', msg: 'Qual música você curte?', b: 'Eu amo essa ', a: '!', t: 'MÚSICA', s: ['MÚ', 'SI', 'CA'], x: ['TE', 'BO', 'NE'] },
  { from: 'Rafa', msg: 'Você vai de ônibus amanhã?', b: 'Vou sim, pego o ', a: '.', t: 'ÔNIBUS', s: ['Ô', 'NI', 'BUS'], x: ['CAR', 'RO', 'LA'] },
  { from: 'Gabi', msg: 'Valeu pela ajuda no jogo!', b: 'De nada, ', a: '!', t: 'AMIGO', s: ['A', 'MI', 'GO'], x: ['BO', 'LA', 'TE'] },
  { from: 'Davi', msg: 'Que horas começa a aula?', b: 'Começa na ', a: '.', t: 'ESCOLA', s: ['ES', 'CO', 'LA'], x: ['RE', 'DE', 'TO'] }
];
const WORLDS = [
  { n: 1, ico: '🎧', t: 'Decodificador de Sons', d: 'Letras, vogais e sons', say: 'Mundo um. Decodificador de sons.', rounds: 8 },
  { n: 2, ico: '⚙️', t: 'Forja de Sílabas', d: 'Monte palavras com sílabas', say: 'Mundo dois. Forja de sílabas.', rounds: 6 },
  { n: 3, ico: '🧩', t: 'Missão Ortográfica', d: 'LH, NH, CH, RR, SS, L e R', say: 'Mundo três. Missão ortográfica.', rounds: 6 },
  { n: 4, ico: '⚡', t: 'Conexão Rápida', d: 'Leia e escolha a frase', say: 'Mundo quatro. Conexão rápida.', rounds: 6 },
  { n: 5, ico: '💬', t: 'Mestre do Chat', d: 'Responda mensagens', say: 'Mundo cinco. Mestre do chat.', rounds: 6 }
];

/* ---------- GERADORES DE RODADAS ---------- */
function mkBlocks(syl, extraPool, minLen = 4) {
  const pool = syl.slice();
  const extras = shuffle(extraPool.filter(x => !syl.includes(x)));
  while (pool.length < minLen && extras.length) pool.push(extras.pop());
  return shuffle(pool);
}
function buildW1() {
  const out = [], words = shuffle(W2), alpha = Object.keys(LETTER);
  for (let i = 0; i < 8; i++) {
    const k = i % 4, it = words[i % words.length], W = it.w.replace(/[ÍÚ]/g, c => c === 'Í' ? 'I' : 'U');
    if (k === 0) {
      const a = W[0], opts = shuffle([a, ...sample(alpha.filter(x => x !== a), 2)]);
      out.push({ type: 'choice', say: `Qual letra começa a palavra: ${it.w.toLowerCase()}?`, prompt: 'Qual letra COMEÇA a palavra?', big: '❓', reveal: `${it.w} ${it.e}`, options: opts.map(l => ({ l, say: LETTER[l] })), ans: opts.indexOf(a), okSay: `Isso! ${LETTER[a]} de ${it.w.toLowerCase()}.`, failSay: `Quase! A letra certa é ${LETTER[a]}, de ${it.w.toLowerCase()}.` });
    } else if (k === 1) {
      const a = W[W.length - 1], opts = shuffle([a, ...sample(alpha.filter(x => x !== a), 2)]);
      out.push({ type: 'choice', say: `Qual letra termina a palavra: ${it.w.toLowerCase()}?`, prompt: 'Qual letra TERMINA a palavra?', big: '❓', reveal: `${it.w} ${it.e}`, options: opts.map(l => ({ l, say: LETTER[l] })), ans: opts.indexOf(a), okSay: `Muito bem! ${LETTER[a]}.`, failSay: `Quase! A palavra termina com ${LETTER[a]}.` });
    } else if (k === 2) {
      const L = rnd(alpha), v = VOWELS.includes(L), opts = ['VOGAL', 'CONSOANTE'];
      out.push({ type: 'choice', say: `A letra ${LETTER[L]} é vogal ou consoante?`, prompt: 'Vogal ou consoante?', big: L, reveal: null, cls: 'small', options: opts.map(l => ({ l, say: l.toLowerCase() })), ans: v ? 0 : 1, okSay: v ? 'Isso! É vogal.' : 'Isso! É consoante.', failSay: v ? 'Quase! É vogal.' : 'Quase! É consoante.' });
    } else {
      const first = it.s[0], others = words.filter(x => x !== it).map(x => x.s[0]).filter(x => x !== first);
      const opts = shuffle([first, ...sample([...new Set(others)], 2)]);
      out.push({ type: 'choice', say: `Qual sílaba começa a palavra: ${it.w.toLowerCase()}?`, prompt: 'Qual SÍLABA começa a palavra?', big: '❓', reveal: `${it.w} ${it.e}`, cls: 'small', options: opts.map(l => ({ l, say: l.toLowerCase() })), ans: opts.indexOf(first), okSay: `Isso! ${first.toLowerCase()}.`, failSay: `Quase! A sílaba é ${first.toLowerCase()}.` });
    }
  }
  return out;
}
function buildW2() {
  const all = W2.flatMap(x => x.s);
  return sample(W2, 6).map(it => ({ type: 'build', word: it.w, emoji: it.e, syl: it.s, pool: mkBlocks(it.s, all, 4), say: `Monte a palavra: ${it.w.toLowerCase()}`, pos: 0, mistakes: 0 }));
}
function buildW3() {
  const all = W3.flatMap(x => x.s);
  return sample(W3, 6).map((it, i) => i % 2 === 0
    ? { type: 'build', word: it.w, emoji: it.e, syl: it.s, pool: mkBlocks(it.s, all, 5), say: `Monte a palavra: ${it.w.toLowerCase()}`, pos: 0, mistakes: 0 }
    : { type: 'choice', say: `Qual letra falta na palavra: ${it.w.toLowerCase()}?`, prompt: 'Complete a palavra', big: it.g.p, emoji: it.e, reveal: `${it.w} ${it.e}`, cls: 'small', options: shuffle(it.g.o).map(l => ({ l, say: l.toLowerCase() === 'l' ? 'éle' : l.length === 1 ? (LETTER[l] || l) : l.split('').map(c => LETTER[c] || c).join(' ') })), ans: -1, answer: it.g.a, okSay: `Isso! ${it.w.toLowerCase()}.`, failSay: `Quase! O certo é ${it.w.toLowerCase()}.` });
}
function buildW4() {
  return sample(W4, 6).map(it => {
    const opts = shuffle(it.o.map((t, i) => ({ t, ok: i === 0 })));
    return { type: 'phrase', say: `${it.sc} Qual frase combina?`, scene: it.sc, emoji: it.e, options: opts, ans: opts.findIndex(o => o.ok), okSay: 'Isso mesmo!', failSay: 'Quase! Ouça a frase certa: ' + it.o[0] };
  });
}
function buildW5() {
  const all = W5.flatMap(x => x.s);
  return sample(W5, 6).map(it => ({ type: 'chat', from: it.from, msg: it.msg, before: it.b, after: it.a, word: it.t, syl: it.s, pool: mkBlocks(it.s.concat(it.x), all, 5), say: `${it.from} escreveu: ${it.msg} Complete a sua resposta.`, pos: 0, mistakes: 0 }));
}
const BUILDERS = [null, buildW1, buildW2, buildW3, buildW4, buildW5];

/* ---------- ESTADO DO JOGO ---------- */
let G = null, deferred = null;
const mult = () => !G ? 1 : G.combo >= 6 ? 3 : G.combo >= 3 ? 2 : 1;

function renderHud() {
  $('#hud-av').textContent = AV[S.avatar].e;
  $('#hud-lv').textContent = 'NV ' + lvl();
  $('#hud-xpbar').style.width = (S.xp % 100) + '%';
  $('#hud-coins').textContent = S.coins;
  const c = $('#hud-combo');
  if (G && G.combo >= 3) { c.hidden = false; c.textContent = '🔥 x' + mult(); } else c.hidden = true;
}
function toast(t, ms = 1800) {
  const el = $('#toast'); el.textContent = t; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), ms);
}
function floatText(t, x, y) {
  const el = document.createElement('div'); el.className = 'pop-xp'; el.textContent = t;
  el.style.left = (x || innerWidth / 2) + 'px'; el.style.top = (y || innerHeight / 2) + 'px';
  document.body.appendChild(el); setTimeout(() => el.remove(), 1000);
}
function addXp(n) {
  const before = lvl(); S.xp += n; G.xp += n; save();
  if (lvl() > before) { sfx.level(); vib([60, 40, 60, 40, 120]); toast('⬆️ NÍVEL ' + lvl() + '!', 2200); confetti(60); speakAuto('Você subiu de nível!', { cancel: false }); }
  renderHud();
}

/* ---------- CONFETE ---------- */
const cv = $('#fx'), cx = cv.getContext('2d'); let parts = [], raf = 0;
function fit() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
addEventListener('resize', fit); fit();
function confetti(n = 90) {
  const cols = [getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0ef', '#ffd23d', '#2dff9a', '#ff4fd8', '#fff'];
  for (let i = 0; i < n; i++) parts.push({ x: innerWidth / 2, y: innerHeight * .4, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 3, g: .38, s: 4 + Math.random() * 6, c: rnd(cols), r: Math.random() * 6, vr: (Math.random() - .5) * .4, l: 90 + Math.random() * 40 });
  if (!raf) loop();
}
function loop() {
  cx.clearRect(0, 0, cv.width, cv.height);
  parts = parts.filter(p => p.l > 0);
  parts.forEach(p => { p.vy += p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.l--; cx.save(); cx.scale(devicePixelRatio, devicePixelRatio); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.globalAlpha = Math.min(1, p.l / 30); cx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); cx.restore(); });
  raf = parts.length ? requestAnimationFrame(loop) : 0;
  if (!raf) cx.clearRect(0, 0, cv.width, cv.height);
}

/* ---------- TELAS ---------- */
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function renderHome() {
  G = null; window.speechSynthesis && speechSynthesis.cancel(); renderHud();
  const unlocked = (n) => n === 1 || S.done[n - 1];
  V.innerHTML = `
    ${isStandalone() ? '' : '<button class="btn install" data-act="install">📲 Instalar App no Celular</button>'}
    <section class="hero">
      <h1>CÓDIGO<span>PALAVRA</span></h1>
      <p>Cumpra missões, ganhe XP e desbloqueie upgrades.</p>
      <button class="ear big" data-say="Bem-vindo ao Código Palavra! Toque em um mundo para começar a missão.">🔊</button>
    </section>
    <div class="worlds" style="margin-top:12px">
      ${WORLDS.map(w => {
    const ok = unlocked(w.n), st = S.stars[w.n] || 0;
    return `<div class="world">
          <button class="w-main" data-world="${w.n}" ${ok ? '' : 'disabled'}>
            <span class="w-ico">${ok ? w.ico : '🔒'}</span>
            <span class="w-txt"><b>${w.n}. ${w.t}</b><small>${w.d}</small></span>
            <span class="w-stars">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span>
          </button>
          <button class="ear" data-say="${w.say}" aria-label="Ouvir">🔊</button>
        </div>`;
  }).join('')}
    </div>
    <div class="row">
      <button class="btn" data-act="shop">🛒 Loja</button>
      <button class="btn ghost" data-act="auto">${S.auto ? '🔊 Voz automática: LIGADA' : '🔇 Voz automática: DESLIGADA'}</button>
    </div>
    <button class="link" data-act="reset">Zerar progresso</button>`;
}

function renderShop() {
  G = null; renderHud();
  const av = Object.entries(AV).map(([k, a]) => {
    const own = S.ownedAv.includes(k), sel = S.avatar === k;
    return `<div class="item ${sel ? 'sel' : ''}"><div class="em">${a.e}</div><b>${a.n}</b>
      <button class="btn ${own ? 'ghost' : ''}" data-buy="av:${k}">${sel ? '✔ Em uso' : own ? 'Usar' : '🪙 ' + a.p}</button></div>`;
  }).join('');
  const th = Object.entries(TH).map(([k, t]) => {
    const own = S.ownedTh.includes(k), sel = S.theme === k;
    return `<div class="item ${sel ? 'sel' : ''}"><div class="sw" style="background:linear-gradient(135deg,${t.a},${t.b})"></div><b>${t.n}</b>
      <button class="btn ${own ? 'ghost' : ''}" data-buy="th:${k}">${sel ? '✔ Em uso' : own ? 'Usar' : '🪙 ' + t.p}</button></div>`;
  }).join('');
  V.innerHTML = `<div class="shop">
    <div class="g-top"><button class="icon" data-act="home">←</button><h1 style="margin:0;font-size:1.4rem">LOJA</h1><span class="chip coins" style="margin-left:auto">🪙 ${S.coins}</span></div>
    <h2>AVATARES</h2><div class="grid">${av}</div>
    <h2>TEMAS DE COR</h2><div class="grid">${th}</div></div>`;
}

function startWorld(n) {
  ac();
  G = { w: n, rounds: BUILDERS[n](), i: 0, errors: 0, combo: 0, correct: 0, xp: 0, lock: false };
  V.innerHTML = `<div class="game">
    <div class="g-top"><button class="icon" data-act="quit" aria-label="Sair">✕</button><div class="prog"><i id="prog"></i></div><span class="g-count" id="cnt"></span></div>
    <div id="gc"></div></div>`;
  renderRound();
}
function renderRound() {
  const r = G.rounds[G.i]; G.lock = false;
  $('#prog').style.width = (G.i / G.rounds.length * 100) + '%';
  $('#cnt').textContent = (G.i + 1) + '/' + G.rounds.length;
  renderHud();
  ({ choice: renderChoice, build: renderBuild, phrase: renderPhrase, chat: renderBuild })[r.type](r);
  setTimeout(() => speakAuto(r.say, { rate: .85 }), 250);
}
const gc = () => $('#gc');
const earBtn = '<button class="ear big" data-act="repeat" aria-label="Ouvir de novo">🔊</button>';

function renderChoice(r) {
  gc().innerHTML = `
    <div class="prompt">${earBtn}<h2>${r.prompt}</h2></div>
    ${r.emoji ? `<div class="emoji-big">${r.emoji}</div>` : ''}
    <div class="reveal" id="reveal">${r.big}</div>
    <div class="opts ${r.cls || ''}">${r.options.map((o, i) => `<button class="opt ${r.cls === 'small' ? 'small' : ''}" data-i="${i}">${o.l}</button>`).join('')}</div>`;
}
function answerChoice(i) {
  const r = G.rounds[G.i]; if (G.lock) return; G.lock = true;
  const ans = r.ans >= 0 ? r.ans : r.options.findIndex(o => o.l === r.answer);
  const btns = [...document.querySelectorAll('.opt')];
  speak(r.options[i].say, { rate: .8, cancel: true });
  if (i === ans) { btns[i].classList.add('ok'); finishRound(true, r); }
  else { btns[i].classList.add('bad'); btns[ans].classList.add('show'); finishRound(false, r); }
  if (r.reveal) { const rv = $('#reveal'); if (rv) rv.innerHTML = r.reveal; }
}

function renderBuild(r) {
  const chat = r.type === 'chat';
  const slots = `<div class="slots">${r.syl.map((s, i) => `<div class="slot" data-s="${i}"></div>`).join('')}</div>`;
  gc().innerHTML = `
    ${chat ? `<div class="chat">
        <div class="bub in"><div><small>${r.from}</small>${r.msg}</div><button class="ear sm" data-say="${r.msg.replace(/"/g, '')}">🔊</button></div>
        <div class="bub out">${r.before}${slots}${r.after}</div></div>
      <div class="prompt">${earBtn}<h2>Toque nas sílabas para responder</h2></div>`
      : `<div class="prompt">${earBtn}<h2>Monte a palavra</h2></div><div class="emoji-big">${r.emoji}</div>${slots}`}
    <div class="pool">${r.pool.map((p, i) => `<button class="blk" data-b="${i}">${p}</button>`).join('')}</div>
    <div class="tools"><button class="btn ghost" data-act="hint">💡 Dica</button></div>`;
}
function hintBlock(r) {
  const want = r.syl[r.pos]; if (!want) return;
  const el = [...document.querySelectorAll('.blk')].find((b, i) => !b.classList.contains('used') && r.pool[i] === want);
  if (el) { el.classList.add('hint'); }
}
function tapBlock(i) {
  const r = G.rounds[G.i]; if (G.lock) return;
  const b = document.querySelector(`.blk[data-b="${i}"]`); if (!b || b.classList.contains('used')) return;
  const txt = r.pool[i];
  document.querySelectorAll('.blk.hint').forEach(x => x.classList.remove('hint'));
  if (txt === r.syl[r.pos]) {
    sfx.tap(); speak(txt.toLowerCase(), { rate: .75 });
    const slot = document.querySelector(`.slot[data-s="${r.pos}"]`); slot.textContent = txt; slot.classList.add('fill');
    b.classList.add('used'); r.pos++;
    if (r.pos === r.syl.length) {
      G.lock = true;
      const full = r.type === 'chat' ? r.before + r.word.toLowerCase() + r.after : r.word.toLowerCase();
      setTimeout(() => speak(full, { rate: .85 }), 450);
      finishRound(r.mistakes === 0, r, true);
    }
  } else {
    r.mistakes++; sfx.err(); vib([80, 40, 80]); G.errors++; G.combo = 0; renderHud();
    b.classList.add('bad'); setTimeout(() => b.classList.remove('bad'), 450);
    speak(`Essa não. Tente: ${r.syl[r.pos].toLowerCase()}`, { rate: .8 });
    if (r.mistakes >= 1) hintBlock(r);
  }
}

function renderPhrase(r) {
  gc().innerHTML = `
    <div class="scene">${r.emoji}</div>
    <p class="scene-txt">${r.scene}</p>
    <div class="prompt">${earBtn}<h2>Qual frase combina?</h2></div>
    <div class="phr">${r.options.map((o, i) => `<div class="card-opt" data-i="${i}" role="button">
      <button class="ear sm" data-read="${i}" aria-label="Ouvir palavra por palavra">🔊</button>
      <span class="words">${o.t.split(' ').map(w => `<b>${w}</b>`).join(' ')}</span></div>`).join('')}</div>`;
}
function readWords(i) {
  const spans = [...document.querySelectorAll(`.card-opt[data-i="${i}"] b`)];
  readTok++; const my = readTok; window.speechSynthesis && speechSynthesis.cancel();
  let k = 0;
  (function nxt() {
    document.querySelectorAll('.card-opt b.on').forEach(s => s.classList.remove('on'));
    if (my !== readTok || k >= spans.length) return;
    spans[k].classList.add('on');
    const w = spans[k].textContent.replace(/[.,!?]/g, '');
    speak(w, { rate: .75, cancel: false, onend: () => { k++; setTimeout(nxt, 60); } });
  })();
}
function answerPhrase(i) {
  const r = G.rounds[G.i]; if (G.lock) return; G.lock = true;
  const els = [...document.querySelectorAll('.card-opt')];
  if (i === r.ans) { els[i].classList.add('ok'); finishRound(true, r); }
  else { els[i].classList.add('bad'); els[r.ans].classList.add('show'); finishRound(false, r); }
}

/* ---------- FLUXO ---------- */
function finishRound(perfect, r, built) {
  if (perfect) {
    G.combo++; G.correct++; if (G.combo > S.bestCombo) S.bestCombo = G.combo;
    const m = mult(), gain = 10 * m;
    sfx.ok(); vib(40); confetti(18); floatText('+' + gain + ' XP' + (m > 1 ? ' x' + m : ''));
    addXp(gain);
    if (!built) speak(r.okSay || 'Muito bem!', { cancel: false, rate: .9 });
  } else {
    if (!built) { G.errors++; G.combo = 0; sfx.err(); vib([80, 40, 80]); speak(r.failSay || 'Quase!', { cancel: false, rate: .85 }); }
    else { addXp(4); }
    renderHud();
  }
  setTimeout(nextRound, built ? 2300 : 2600);
}
function nextRound() {
  if (!G) return;
  G.i++;
  if (G.i >= G.rounds.length) finishWorld(); else renderRound();
}
function finishWorld() {
  const n = G.w, total = G.rounds.length;
  const stars = G.errors === 0 ? 3 : G.errors <= Math.ceil(total / 2) ? 2 : 1;
  const coins = G.correct + stars * 5;
  S.coins += coins; S.done[n] = true; S.stars[n] = Math.max(S.stars[n] || 0, stars);
  addXp(20); save(); sfx.win(); vib([100, 50, 100, 50, 200]); confetti(140); setTimeout(() => sfx.coin(), 700);
  speakAuto(stars === 3 ? 'Missão perfeita! Você é incrível!' : 'Missão completa! Muito bem!');
  const next = n < WORLDS.length ? n + 1 : null;
  openModal(`<div class="sheet">
      <h2>MISSÃO COMPLETA!</h2>
      <div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <div class="stat"><div>⚡ +${G.xp + 0} XP</div><div>🪙 +${coins}</div><div>🔥 ${S.bestCombo}</div></div>
      <div class="col">
        ${next ? `<button class="btn" data-world="${next}">▶ Próximo mundo</button>` : ''}
        <button class="btn ghost" data-world="${n}">🔁 Jogar de novo</button>
        <button class="btn ghost" data-act="home">🏠 Menu</button>
      </div></div>`);
  G = null; renderHud();
}

/* ---------- MODAL ---------- */
function openModal(html) { const m = $('#modal'); m.innerHTML = html; m.hidden = false; }
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }

/* ---------- INSTALAÇÃO PWA ---------- */
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
addEventListener('appinstalled', () => { deferred = null; if (!G) renderHome(); });
async function installApp() {
  if (deferred) {
    deferred.prompt();
    try { await deferred.userChoice; } catch (e) { }
    deferred = null; renderHome(); return;
  }
  const ios = isIOS();
  const steps = ios
    ? `<li><b>1.</b> No <b>Safari</b>, toque em <b>Compartilhar</b> ⬆️ (barra de baixo).</li>
       <li><b>2.</b> Escolha <b>“Adicionar à Tela de Início”</b> ➕ e toque em <b>Adicionar</b>.</li>`
    : `<li><b>1.</b> Toque no menu <b>⋮</b> do navegador (canto superior).</li>
       <li><b>2.</b> Escolha <b>“Instalar app”</b> ou <b>“Adicionar à tela inicial”</b>.</li>`;
  openModal(`<div class="sheet"><h2>📲 Instalar no celular</h2>
    <p style="color:var(--muted);margin:4px 0">Funciona offline depois de instalado.</p>
    <ul class="steps">${steps}</ul>
    <div class="col"><button class="btn ghost" data-say="${ios ? 'Passo um: no Safari, toque em Compartilhar. Passo dois: escolha Adicionar à Tela de Início.' : 'Passo um: toque no menu de três pontinhos do navegador. Passo dois: escolha Instalar app.'}">🔊 Ouvir passos</button>
    <button class="btn" data-act="close">Entendi</button></div></div>`);
}

/* ---------- EVENTOS ---------- */
document.addEventListener('click', (e) => {
  const t = e.target;
  const say = t.closest('[data-say]'); if (say) { ac(); speak(say.dataset.say, { rate: .88 }); return; }
  const rd = t.closest('[data-read]'); if (rd) { ac(); readWords(+rd.dataset.read); return; }
  const wd = t.closest('[data-world]');
  if (wd && !wd.disabled) { closeModal(); startWorld(+wd.dataset.world); return; }
  const bu = t.closest('[data-buy]');
  if (bu) {
    const [kind, key] = bu.dataset.buy.split(':'), tbl = kind === 'av' ? AV : TH, own = kind === 'av' ? S.ownedAv : S.ownedTh;
    if (!own.includes(key)) {
      if (S.coins < tbl[key].p) { sfx.err(); toast('Faltam moedas! Complete missões 🪙'); speak('Faltam moedas. Complete missões para ganhar mais.'); return; }
      S.coins -= tbl[key].p; own.push(key); sfx.coin(); confetti(30);
    }
    if (kind === 'av') S.avatar = key; else { S.theme = key; applyTheme(); }
    save(); renderShop(); return;
  }
  const act = t.closest('[data-act]');
  if (act) {
    switch (act.dataset.act) {
      case 'install': installApp(); break;
      case 'shop': if (!G) renderShop(); break;
      case 'home': closeModal(); renderHome(); break;
      case 'close': closeModal(); break;
      case 'quit': renderHome(); break;
      case 'auto': S.auto = !S.auto; save(); renderHome(); break;
      case 'reset': if (confirm('Apagar todo o progresso?')) { S = Object.assign({}, defaults, { done: {}, stars: {}, ownedAv: ['cyber'], ownedTh: ['ciano'] }); save(); applyTheme(); renderHome(); } break;
      case 'repeat': if (G) speak(G.rounds[G.i].say, { rate: .85 }); break;
      case 'hint': if (G && !G.lock) hintBlock(G.rounds[G.i]); break;
    }
    return;
  }
  if (!G) return;
  const op = t.closest('.opt'); if (op) { answerChoice(+op.dataset.i); return; }
  const bl = t.closest('.blk'); if (bl) { tapBlock(+bl.dataset.b); return; }
  const co = t.closest('.card-opt'); if (co) { answerPhrase(+co.dataset.i); return; }
});

/* ---------- START ---------- */
applyTheme(); renderHome();
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}
