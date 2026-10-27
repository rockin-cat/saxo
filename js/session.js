// La pantalla de pràctica: escolta → la banda continua i el diagrama et guia → com ha anat.
// També fa de joc d'afinació (nivell 7), de compositor (nivell 9) i d'improvisació (nivell 10).

import * as player from './player.js';
import { createSaxView } from './saxview.js';
import { createLane } from './lane.js';
import { INSTRUMENTS, numOf, nearestPc, chordTonesInRange, comfort, range, writtenName, realOfNum } from './instruments.js';
import { SAXO } from './saxo-core.js';
import { parseProgression, guessKey, pentatonic, mod, pcName, metre as metreOf, practicePart } from './theory.js';
import { defaultStyle, STYLES } from './band.js';
import { BINARI, TERNARI, MELODIC, cardById, cardMetre } from './data/cartes.js';
import { tone, saxTone, audioContext } from './audio.js';
import { REPTES } from './levels.js';
import { lineBars, nameToMidi } from './parts.js';
import * as store from './store.js';
import { pill, gapsFor, tipsFor, gapText, GAPS } from './assoliment.js';
import * as auto from './autoregulacio.js';
import * as midi from './midi.js';
import { createJudge, verdictText, verdictClass } from './sjudge.js';

const $ = (sel, root = document) => root.querySelector(sel);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let current = null; // la sessió oberta

export function closeSession() {
  if (!current) return;
  current.judge?.destroy();
  current.judge = null;
  current.offNote?.();
  player.stop();
  cancelAnimationFrame(current.raf);
  current.lane?.destroy();
  clearTimeout(current.tuneTimer);
  current = null;
}

/** Els dos canvis de digitació de la melodia on es mouen més dits (per al pas «canvis difícils»). */
function hardestChanges(line, inst) {
  const M = metreOf(line.compas || '4/4');
  const notes = lineBars(line, M).flat().filter((n) => !n.tied);
  const pairs = [];
  for (let i = 1; i < notes.length; i++) {
    const a = numOf(inst, notes[i - 1].midi), b = numOf(inst, notes[i].midi);
    if (!a || !b || a === b) continue;
    const ka = new Set(SAXO.claus(a) ?? []), kb = new Set(SAXO.claus(b) ?? []);
    let diff = 0;
    for (const k of ka) if (!kb.has(k)) diff++;
    for (const k of kb) if (!ka.has(k)) diff++;
    if (!pairs.some((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a))) pairs.push({ a, b, diff });
  }
  pairs.sort((x, y) => y.diff - x.diff);
  return pairs.slice(0, 2);
}

/** El pas tal com es toca: amb la cançó de treball i la melodia del Generador, si en té. */
function effectiveStep(base, instId, opts = {}) {
  const inst = INSTRUMENTS[instId];
  const s = { ...base };
  const song = store.workSong();
  const kind = base.kind ?? 'play';
  const cardId = base.carta ?? base.part?.card;
  const cm = cardId ? cardMetre(cardById(cardId)) : null;
  const usable = song && base.canco !== false && !base.custom && kind !== 'tune' && (!cm || cm === song.metre);
  s.songNote = song && !usable && base.canco !== false && kind !== 'tune' && !base.custom ? (cm && cm !== song.metre ? `Aquesta carta és de ${cm}: es practica amb una roda pròpia.` : '') : '';
  if (usable) {
    const lines = song.saxo ?? [];
    const li = Math.min(opts.lineIdx ?? store.lineIdx(), Math.max(0, lines.length - 1));
    const line = lines[li] ?? null;
    if (base.part && (base.part.type === 'melodia' || base.part.type === 'segona') && line) {
      s.part = { ...base.part, line };
      s.genLine = line.nom;
      s.lineBars = line.compassos;
    }
    if (base.part?.type === 'canvi' && base.part.fromLine && line) {
      const pairs = hardestChanges(line, inst);
      s.part = { ...base.part, seq: pairs.length ? pairs.flatMap((p) => [p.a, p.b, p.a, p.b]) : ['0', "6'"] };
      s.genLine = line.nom;
      s.canvis = pairs;
    }
    s.prog = opts.whole ? song.prog : practicePart(song.prog);
    s.metre = song.metre;
    s.estil = STYLES[song.estil]?.metres.includes(song.metre) ? song.estil : STYLES[base.estil]?.metres.includes(song.metre) ? base.estil : defaultStyle(song.metre);
    s.tempo = Math.min(base.tempo ?? 90, song.tempo ?? 90);
    s.usesSong = song.titol;
  }
  return s;
}

export function openSession(host, baseStep, ctx) {
  closeSession();
  const inst = INSTRUMENTS[ctx.inst];
  const step = effectiveStep(baseStep, ctx.inst);
  const S = store.settings();
  const kind = step.kind ?? 'play';
  const st = {
    step, baseStep, inst, kind, host, ctx, whole: false,
    tempo: step.tempo ?? 80,
    rounds: 0, // 0 = automàtic
    guide: S.guide ?? 0,
    metronome: !!S.metronome,
    plan: null, mode: 'idle', ranPlay: false, raf: 0,
    compose: kind === 'compose' ? (step.bars ? step.bars.map((b) => ({ ...b })) : null) : null,
  };
  current = st;
  window.__rkSession = st; // per a les proves
  document.body.style.setProperty('--accent', inst.color);
  document.body.style.setProperty('--accent-soft', inst.colorSoft);

  const levelText = step.nivell ? `Nivell ${step.nivell}` : step.custom ? 'La meva cançó' : '';
  host.innerHTML = '';
  const root = h(`
    <div class="session" data-kind="${kind}">
      <div class="view-head">
        <button type="button" class="btn-back" data-act="back">← ${esc(ctx.backLabel ?? 'Torna')}</button>
        <div class="vh-text sess-title">
          <small>${esc([levelText, ctx.crumb].filter(Boolean).join(' · '))}</small>
          <h2>${esc(step.titol)}</h2>
        </div>
        <div class="vh-actions"><button type="button" class="btn btn-ghost btn-small help-btn" data-go="guide" title="Què vol dir cada cosa de la pantalla">Com es llegeix?</button><button type="button" class="btn btn-ghost btn-small fs-btn" data-fs title="Pantalla completa" aria-label="Pantalla completa">⛶</button></div>
      </div>
      <div class="sess-grid">
        <div class="sess-main">
          <div class="stage">
            <div class="stage-top">
              <div class="mode-badge" data-el="badge">PREPARA'T</div>
              <div class="pulses" data-el="pulses"></div>
              <div class="bigcount" data-el="big"></div>
            </div>
            <div class="sax-host" data-el="sax"></div>
            <canvas class="lane" data-el="lane"></canvas>
            <div class="help-note" data-el="helpnote"></div>
            <div class="verdicts" data-el="verdicts"></div>
            <div class="lhud" data-el="lhud" hidden>
              <span class="lhud-l">aviat</span><div class="tc-track"><i class="tc-mid"></i><div class="tc-dots" data-el="tcdots"></div><i class="tc-needle" data-el="tcneedle"></i></div><span class="lhud-l">tard</span>
              <span class="lmeter" title="La pressió de l'aire"><i data-el="lmeter"></i></span>
            </div>
            <div class="assess" data-el="assess" hidden>
              <button type="button" class="assess-x" data-act="close-assess" aria-label="Tanca">×</button>
              <h3>Com t'ha anat?</h3>
              <div class="rate-row">
                <button type="button" class="btn btn-ghost" data-rate="no">En procés</button>
                <button type="button" class="btn btn-ghost" data-rate="gairebe">A prop</button>
                <button type="button" class="btn btn-primary" data-rate="ok">Ja ho tens!</button>
              </div>
              <p class="feedback" data-el="feedback"></p>
              <div class="result" data-el="result"></div>
              <div class="row" data-el="after"></div>
            </div>
          </div>
          <div class="composer" data-el="composer" hidden></div>
          <div class="tuner" data-el="tuner" hidden></div>
          <div class="controls" data-el="controls">
            <div class="ctrl-main">
              <button type="button" class="btn btn-ghost btn-big" data-act="listen">👂 Escolta</button>
              <button type="button" class="btn btn-primary btn-big" data-act="play">${kind === 'sing' ? '🎤 Canta' : '▶ Toca'}</button>
              <button type="button" class="btn btn-big btn-stop" data-act="stop" hidden>■ Atura</button>
              <span class="help-ind" data-el="helpind" title="El joc va retirant l'ajuda a mesura que et surt"></span>
              <button type="button" class="btn btn-ghost btn-small opts-btn" data-act="opts" aria-expanded="false">⚙ Opcions</button>
            </div>
            <div class="ctrl-drawer" data-el="drawer" hidden>
            <div class="ctrl-opts">
              <span class="tempo">Tempo <button type="button" class="icon-btn" data-act="slower" title="Més lent">−</button> <b data-el="tempo"></b> <button type="button" class="icon-btn" data-act="faster" title="Més ràpid">+</button></span>
              <label>Voltes <select data-el="rounds"><option value="0">auto</option><option value="1">1</option><option value="2">2</option><option value="4">4</option><option value="-1">sense parar</option></select></label>
              <label class="toggle"><input type="checkbox" data-el="metro"> Metrònom</label>
              <label class="toggle" title="Mentre toques tu, sona fluix el saxo del joc"><input type="checkbox" data-el="guide"> Guia sonora</label>
              <label class="toggle" title="Mentre toques tu, l'ajuda visual es va esvaint fins que ho fas sol"><input type="checkbox" data-el="fade"> Retira l'ajuda a poc a poc</label>
              <button type="button" class="btn btn-ghost btn-small" data-act="full">Escolta i toca seguit</button>
              <button type="button" class="btn btn-ghost btn-small listen-btn" data-act="midi-dlg" title="Amb el TravelSax per USB o Bluetooth, el joc sent el que toques i et corregeix">🎷 Connecta el TravelSax</button>
            </div>
            <div class="ctrl-opts ctrl-song" data-el="songbar"></div>
            </div>
          </div>
        </div>
        <aside class="side">
          <div class="card-host" data-el="card"></div>
          <div class="explain">
            <p>${esc(step.text ?? '')}</p>
            ${step.com?.length ? `<ul>${step.com.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
          </div>
        </aside>
      </div>
    </div>`);
  host.appendChild(root);
  st.root = root;
  st.el = (name) => $(`[data-el="${name}"]`, root);

  st.simple = S.simple !== false;
  st.blind = !!step.cegues;
  st.sax = createSaxView(st.el('sax'), inst, { simple: st.simple });
  st.showRole = !st.simple || ['propera', 'arp', 'compose'].includes(step.part?.type);
  st.lane = createLane(st.el('lane'), { color: inst.color });
  st.el('tempo').textContent = st.tempo;
  st.el('metro').checked = st.metronome;
  st.el('guide').checked = st.guide > 0;
  st.fade = !!S.fadeHelp;
  st.el('fade').checked = st.fade;

  if (kind === 'tune') return setupTuner(st);

  buildSong(st);
  if (kind === 'compose') setupComposer(st);
  if (kind === 'improv') {
    st.el('rounds').value = '-1';
    st.el('rounds').disabled = true;
    $('[data-act="listen"]', root).hidden = true;
    $('[data-act="full"]', root).hidden = true;
    $('[data-act="play"]', root).textContent = '▶ Comença';
  }
  if (kind === 'sing') { $('[data-act="full"]', root).hidden = true; st.el('guide').closest('label').hidden = true; st.el('fade').closest('label').hidden = true; }
  if (st.blind) { st.el('guide').closest('label').hidden = true; st.el('fade').closest('label').hidden = true; st.guide = 0; st.fade = false; }

  renderSongBar(st);
  updateMidiUi(st);
  st.auto = st.kind !== 'improv' && st.kind !== 'compose' && st.kind !== 'sing' && !st.blind;
  if (st.auto) applyAutoHelp(st);
  showHelpInd(st);
  // el que toca l'alumnat surt al diagrama (de color segons el veredicte)
  st.offNote = midi.onNote((m) => { if (current !== st) return; if (m.on) { st.lastPlayed = m.midi; if (!st.judge) st.sax.played(m.midi, ''); } else st.sax.released(); });
  root.addEventListener('click', (ev) => onClick(st, ev));
  root.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.dataset.el === 'whole') { st.whole = t.checked; rebuildStep(st); }
    else if (t.dataset.el === 'gline') { store.setLineIdx(Number(t.value)); rebuildStep(st); }
  });
  st.el('rounds').addEventListener('change', (e) => { st.rounds = Number(e.target.value); });
  st.el('metro').addEventListener('change', (e) => { st.metronome = e.target.checked; S.metronome = st.metronome; store.save(); player.setMetronome(st.metronome); });
  st.el('guide').addEventListener('change', (e) => { st.auto = false; st.guide = e.target.checked ? 0.3 : 0; S.guide = st.guide; store.save(); player.setGuide(st.guide); showHelpInd(st); });
  st.el('fade').addEventListener('change', (e) => { st.auto = false; st.fade = e.target.checked; S.fadeHelp = st.fade; store.save(); if (!st.fade) setHelp(st, 0); showHelpInd(st); });

  renderPulses(st);
  showIdle(st);
  st.raf = requestAnimationFrame(() => frame(st));
  return st;
}

function renderSongBar(st) {
  const bar = st.el('songbar');
  const b = st.baseStep;
  const parts = [];
  const lines = store.workSong()?.saxo ?? [];
  const usesLine = !!(b.part && (b.part.type === 'melodia' || b.part.type === 'segona' || b.part.fromLine));
  if (st.step.usesSong && usesLine && lines.length > 1) {
    const cur = Math.min(store.lineIdx(), lines.length - 1);
    parts.push(`<label>Melodia <select data-el="gline">${lines.map((l, i) => `<option value="${i}"${cur === i ? ' selected' : ''}>${esc(l.nom)}</option>`).join('')}</select></label>`);
  }
  if (st.step.usesSong) {
    parts.push(`<span class="song-chip">🎵 ${esc(st.step.usesSong)}</span><label class="toggle"><input type="checkbox" data-el="whole"${st.whole ? ' checked' : ''}> Cançó sencera</label>`);
  } else if (st.step.songNote) parts.push(`<span class="muted small">${esc(st.step.songNote)}</span>`);
  else if (!store.workSong() && b.canco !== false && !b.custom && st.kind !== 'tune' && st.ctx.onChooseSong) {
    parts.push('<button type="button" class="btn btn-ghost btn-small" data-act="choose-song">🎵 Tria la cançó amb què treballes</button>');
  }
  bar.innerHTML = parts.join('');
  bar.hidden = !parts.length;
}

function rebuildStep(st) {
  player.stop();
  st.step = effectiveStep(st.baseStep, st.inst.id, { whole: st.whole });
  setTempo(st, st.step.tempo ?? st.tempo);
  buildSong(st);
  renderPulses(st);
  setButtons(st, false);
  showIdle(st);
}

// ---- La cançó del pas --------------------------------------------------------------------------------------

function buildSong(st) {
  const { step, inst } = st;
  const { bars } = parseProgression(step.prog || 'C');
  st.bars = bars.length ? bars : parseProgression('C').bars;
  st.key = guessKey(st.bars);
  let part = step.part ? { ...step.part } : null;
  if (st.kind === 'compose') {
    st.compose ??= randomCompose(st, st.bars.length);
    part = { type: 'compose', bars: st.compose };
  }
  const extra = st.kind === 'improv' && step.mode === 'qa' ? (k, bar, M) => (k % 4 < 2 ? { part: questionBar(st, bar, M, k) } : { part: [] }) : null;
  st.song = player.makeSong({ inst: inst.id, bars: st.bars, metre: step.metre ?? '4/4', tempo: st.tempo, estil: step.estil ?? defaultStyle(step.metre), part: st.kind === 'improv' ? null : part, voice: step.voice, extra });
  st.M = st.song.M;
}

/** Les notes que encaixen (números) per a la improvisació: les de l'acord, o la pentatònica amb les de l'acord marcades. */
function improvNotes(st, chord) {
  const inst = st.inst;
  const [clo, chi] = comfort(inst);
  const roles = new Map(chord.pcs.map((pc, i) => [mod(pc, 12), ['1', '3', '5', '7'][i] ?? '']));
  const pcs = st.step.mode === 'chord' ? chord.pcs.slice(0, 4) : pentatonic(st.key);
  const out = [];
  for (let m = clo - 2; m <= chi + 2; m++) {
    const pc = mod(m, 12);
    if (!pcs.some((x) => mod(x, 12) === pc)) continue;
    const num = numOf(inst, m);
    if (!num) continue;
    const r = roles.get(pc);
    out.push({ num, midi: m, role: r ?? '', cls: r === '1' ? 'active' : r ? 'tone' : 'faint' });
  }
  return out;
}

/** Una frase-pregunta de dos compassos amb notes de la pentatònica (per al saxo del joc). */
function questionBar(st, bar, M, k) {
  const inst = st.inst;
  const pcs = pentatonic(st.key);
  const [clo, chi] = comfort(inst);
  const box = [];
  for (let m = clo; m <= chi; m++) if (pcs.some((pc) => mod(pc, 12) === mod(m, 12))) box.push(m);
  const rnd = mulberry(k * 7 + 3);
  const rhythms = M.beats === 4 ? ['mb2', 'mb17', 'mb18', 'mb16', 'mb11', 'mb19'] : ['mt1', 'mt18', 'mt21'];
  const card = cardById(rhythms[Math.floor(rnd() * rhythms.length)]);
  const on = card ? card.notes.map(([a, d]) => [a, d]) : [[0, 1], [1, 1], [2, 1]];
  let idx = Math.floor(box.length / 2);
  const root = box.findIndex((m) => mod(m, 12) === mod(st.key.root, 12));
  const out = [];
  on.forEach(([a, d], j) => {
    if (k % 4 === 1 && j === on.length - 1 && root >= 0) idx = root;
    else idx = Math.max(0, Math.min(box.length - 1, idx + Math.floor(rnd() * 5) - 2));
    const m = box[idx];
    out.push({ beat: a, dur: d, kind: 'note', notes: [m], midi: m, num: numOf(inst, m), label: numOf(inst, m) ?? '?' });
  });
  return out;
}

function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function rhythmDeck(M) {
  if (M.id === '4/4') return BINARI;
  return TERNARI.filter((c) => c.metre === M.id);
}

function randomCompose(st, n) {
  const M = metreOf(st.step.metre ?? '4/4');
  const deck = rhythmDeck(M).filter((c) => c.notes.length >= 2);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const a = { rhythm: pick(deck).id, melodic: pick(MELODIC).id };
  const b = { rhythm: pick(deck).id, melodic: pick(MELODIC).id };
  return Array.from({ length: Math.max(1, Math.min(8, n)) }, (_, i) => (i % 4 === 2 ? { ...b } : { ...a }));
}

// ---- Plans --------------------------------------------------------------------------------------------------

function roundsFor(st) {
  if (st.rounds === -1) return Infinity;
  if (st.rounds > 0) return st.rounds;
  if (st.fade) return Math.max(1, Math.ceil((4 * helpStep(st)) / st.bars.length));
  return Math.max(1, Math.ceil(8 / st.bars.length));
}
const helpStep = (st) => Math.max(2, Math.min(4, st.bars.length));

function makePlan(st, what) {
  const L = st.bars.length;
  let demoBars = L >= 4 ? L : L * Math.ceil(4 / L);
  if (L > 8) {
    const nextPart = st.bars.findIndex((b, j) => j > 0 && b.part);
    demoBars = nextPart > 0 && nextPart <= 12 ? nextPart : 8;
  }
  const playOffset = demoBars % L === 0 ? 0 : demoBars;
  const playBars = roundsFor(st) * L;
  if (st.kind === 'improv') {
    const qa = st.step.mode === 'qa';
    return (i) => (i === 0 ? { mode: 'count' } : { mode: qa ? ((i - 1) % 4 < 2 ? 'question' : 'answer') : 'play', k: i - 1 });
  }
  const you = (k) => (st.kind === 'sing' ? 'sing' : st.step.alternate ? (Math.floor(k / 2) % 2 === 0 ? 'sing' : 'play') : 'play');
  const listenBars = Math.max(demoBars, L);
  if (what === 'listen') return (i) => (i === 0 ? { mode: 'count' } : i <= listenBars ? { mode: 'demo', k: i - 1 } : null);
  if (what === 'play') return (i) => (i === 0 ? { mode: 'count' } : i <= playBars ? { mode: you(i - 1), k: i - 1 } : null);
  return (i) => {
    if (i === 0) return { mode: 'count' };
    if (i <= demoBars) return { mode: 'demo', k: i - 1 };
    if (i <= demoBars + playBars) return { mode: you(i - 1 - demoBars), k: i - 1 - playOffset };
    return null;
  };
}

async function go(st, what) {
  if (st.rec && !st.rec.choice && st.recAt) auto.choose(st.rec, st.tempo < st.recAt.tempo ? 'slower' : st.tempo > st.recAt.tempo ? 'faster' : !!st.guide !== st.recAt.guide ? (st.guide ? 'guide-on' : 'guide-off') : 'repeat');
  hideAssess(st);
  setButtons(st, true);
  st.el('badge').textContent = 'Carregant sons…';
  try { await player.prepare(); } catch { /* sense so, l'animació funciona igual */ }
  if (current !== st) return;
  if (midi.settings().on && !midi.isOn()) { try { await midi.connect(); } catch { /* */ } }
  st.judge?.destroy();
  st.judge = st.kind !== 'improv' && st.kind !== 'sing' ? createJudge(st.inst, { onVerdict: (v) => showVerdict(st, v) }) : null;
  st.listenSum = null;
  st.marks = [];
  resetDots(st);
  updateMidiUi(st);
  if (current !== st) return;
  st.song.tempo = st.tempo;
  st.plan = makePlan(st, what);
  st.what = what;
  st.ranPlay = false;
  st.playStart = null;
  setHelp(st, 0);
  st.reptes = shuffle([...REPTES]);
  player.start(st.song, st.plan, {
    metronome: st.metronome,
    guide: st.guide,
    singGuide: !st.step.noGuide,
    voiceGuide: !!st.step.voice && st.guide > 0,
    onEnd: () => finished(st, true),
  });
}

function stopRun(st) {
  player.stop();
  finished(st, false);
}

function finished(st, natural) {
  if (current !== st) return;
  setHelp(st, 0);
  setButtons(st, false);
  showIdle(st);
  const judge = st.judge;
  if (judge && st.ranPlay) {
    const sum = judge.summary();
    const played = judge.hits.length;
    judge.destroy();
    if (st.judge === judge) st.judge = null;
    showAssess(st);
    if (played >= 3 && sum.n >= 4) applyListen(st, sum);
    return;
  }
  if (st.kind !== 'improv' && (st.what === 'full' || st.what === 'play') && (natural || st.ranPlay)) showAssess(st);
  if (st.kind === 'improv' && st.ranPlay) showAssess(st);
}

// ---- El joc t'escolta (TravelSax) -------------------------------------------------------------------------------

function updateMidiUi(st) {
  const on = midi.isOn();
  const b = $('[data-act="midi-dlg"]', st.root);
  if (b) { b.textContent = on ? '🎷 TravelSax connectat' : '🎷 Connecta el TravelSax'; b.classList.toggle('on', on); }
  st.el('lhud').hidden = !(on || midi.settings().keys) || st.kind === 'sing' || st.kind === 'tune';
  const chip = document.getElementById('listen-chip');
  if (chip) { chip.classList.toggle('on', on); chip.textContent = on ? '🎷 TravelSax connectat' : '🎷 Connecta el TravelSax'; }
}

function resetDots(st) {
  st.el('tcdots').innerHTML = '';
  st.el('tcneedle').style.left = '50%';
  st.dts = [];
}

function showVerdict(st, v) {
  if (current !== st) return;
  const cls = verdictClass(v.kind);
  // si encara no ha tocat res, les notes perdudes no es marquen (potser no té el TravelSax connectat)
  if (v.kind === 'missed' && !(st.judge?.hits.length)) return;
  st.marks ??= [];
  const e = v.exp;
  if (e?.abs != null) st.marks.push({ abs: e.abs, cls, ring: true });
  if (e?.abs != null && v.dt != null) st.marks.push({ abs: e.abs + v.dt / e.spq, cls });
  else if (!e) { const p = player.position(); if (p) st.marks.push({ abs: p.abs - 0.03 / p.spq, cls }); }
  if (st.marks.length > 80) st.marks.splice(0, st.marks.length - 80);
  if (v.got != null) st.sax.played(v.got, cls);
  if ((v.kind === 'wrongnote' || v.kind === 'octava') && st.helpLevel >= 1 && !st.blind) st.sax.peek();
  const stage = st.root.querySelector('.stage');
  stage.classList.remove('fl-ok', 'fl-mid', 'fl-bad');
  void stage.offsetWidth;
  if (cls) stage.classList.add(`fl-${cls}`);
  if (st.helpLevel >= 3 || !store.settings().verdictText) return;
  const box = st.el('verdicts');
  const d = document.createElement('div');
  d.className = `verdict v-${cls}`;
  d.textContent = verdictText(v, st.inst);
  box.append(d);
  setTimeout(() => d.remove(), 1000);
  while (box.children.length > 3) box.firstChild.remove();
  if (v.dt != null && ['perfect', 'good', 'octava', 'wrongnote'].includes(v.kind)) {
    const ms = v.dt * 1000;
    st.dts.push(ms);
    const dot = document.createElement('i');
    dot.className = `tc-dot k-${cls}`;
    dot.style.left = `${tcPos(ms)}%`;
    st.el('tcdots').append(dot);
    while (st.el('tcdots').children.length > 16) st.el('tcdots').firstChild.remove();
    const recent = st.dts.slice(-12);
    st.el('tcneedle').style.left = `${tcPos(recent.reduce((a, b) => a + b, 0) / recent.length)}%`;
  }
}
const tcPos = (ms) => 50 + Math.max(-1, Math.min(1, ms / 100)) * 48;

/** El resultat que ha sentit el joc: marca el nivell i el que ha faltat (l'alumne ho pot canviar). */
function applyListen(st, sum) {
  st.listenSum = sum;
  if (st.step.id) store.setHeard(st.step.id, Math.round(sum.score * 100));
  rate(st, sum.level);
  const options = gapsFor(st.step, st.inst.id);
  const gaps = sum.gaps.filter((g) => options.includes(g));
  if (st.result && gaps.length && sum.level !== 'ok') {
    st.result.gaps = gaps;
    if (st.step.id) store.setGaps(st.step.id, gaps);
    if (st.rec) auto.updateRecord(st.rec, { gaps: [...gaps], heard: Math.round(sum.score * 100) });
  } else if (st.rec) auto.updateRecord(st.rec, { heard: Math.round(sum.score * 100) });
  st.el('feedback').textContent = 'El joc t\'ha sentit i ha marcat el nivell. Si creus que no és així, tria\'n un altre.';
  renderResult(st);
}

/** Registra les notes dels compassos que toques tu (el que està sonant i el següent). */
function feedJudge(st, pos) {
  const ctx = audioContext();
  const outLat = ctx.outputLatency || ctx.baseLatency || 0;
  for (let j = Math.max(0, pos.i); j <= pos.i + 1; j++) {
    const seg = pos.bars[j]?.seg ?? st.plan?.(j);
    if (!seg || seg.mode !== 'play') continue;
    const content = pos.bars[j]?.content ?? st.song.content(seg.k);
    if (!content) continue;
    const t = pos.t0 + j * pos.barDur;
    st.judge.addBar(j, content.part, (beat) => t + beat * pos.spq + outLat, pos.spq, j * st.M.beats);
  }
  st.judge.tick(pos.time);
}

function setButtons(st, playing) {
  for (const b of st.root.querySelectorAll('[data-act="full"],[data-act="slower"],[data-act="faster"]')) b.disabled = playing;
  $('[data-act="listen"]', st.root).hidden = playing || st.kind === 'improv';
  $('[data-act="play"]', st.root).hidden = playing;
  $('[data-act="stop"]', st.root).hidden = !playing;
  $('[data-act="stop"]', st.root).disabled = !playing;
  st.root.classList.toggle('playing', playing);
  for (const x of st.root.querySelectorAll('.composer select, .composer button')) x.disabled = playing;
}

// ---- Clics -------------------------------------------------------------------------------------------------

function onClick(st, ev) {
  const b = ev.target.closest('[data-act],[data-rate],[data-gap],[data-opt]');
  if (!b) return;
  const act = b.dataset.act;
  if (b.dataset.rate) return rate(st, b.dataset.rate);
  if (b.dataset.gap) return toggleGap(st, b.dataset.gap);
  if (b.dataset.opt) return pickOption(st, b.dataset.opt, b.dataset.id);
  if (act === 'goto') { closeSession(); st.ctx.nav?.goStep(b.dataset.id); return; }
  if (act === 'golevel') { closeSession(); st.ctx.nav?.goLevel(Number(b.dataset.n)); return; }
  if (act === 'back') { closeSession(); st.ctx.onBack?.(); return; }
  if (act === 'full' || act === 'listen' || act === 'play') return go(st, act);
  if (act === 'stop') return stopRun(st);
  if (act === 'opts') { const d = st.el('drawer'); d.hidden = !d.hidden; b.setAttribute('aria-expanded', String(!d.hidden)); b.classList.toggle('on', !d.hidden); return; }
  if (act === 'close-assess') { hideAssess(st); return; }
  if (act === 'midi-dlg') return midi.openDialog({ onChange: () => updateMidiUi(st) });
  if (act === 'slower' || act === 'faster') return setTempo(st, st.tempo + (act === 'faster' ? 5 : -5));
  if (act === 'next') { closeSession(); st.ctx.onNext?.(); return; }
  if (act === 'choose-song') { closeSession(); st.ctx.onChooseSong?.(); return; }
  if (act === 'again') { hideAssess(st); return go(st, 'full'); }
  if (act === 'again-play') { hideAssess(st); return go(st, 'play'); }
}

function setTempo(st, t) {
  st.tempo = Math.max(40, Math.min(200, t));
  st.el('tempo').textContent = st.tempo;
}

function rate(st, r) {
  const id = st.step.id;
  const before = id ? store.stepState(id) : null;
  const levelWasDone = !!st.ctx.nav?.levelDone();
  const s = id ? store.markStep(id, r, st.tempo) : null;
  for (const x of st.root.querySelectorAll('[data-rate]')) x.classList.toggle('chosen', x.dataset.rate === r);
  const res = { r, played: st.tempo, orig: st.step.tempo ?? st.tempo, wasOk: before?.best === 'ok', noRun: s?.noRun ?? (r === 'no' ? 1 : 0), levelWasDone, gaps: [], lastGaps: st.lastGaps ?? [] };
  st.result = res;
  if (st.autoBase) { st.autoLevel = st.autoBase.l; setTempo(st, st.autoBase.tempo); }
  res.autoMsg = stepAutoHelp(st, r);
  if (id && !st.rec) { auto.fillEffect(id, r); st.rec = auto.record({ step: id, r, gaps: [], wasOk: res.wasOk }); st.recAt = { tempo: st.tempo, guide: !!st.guide }; }
  else if (st.rec) auto.updateRecord(st.rec, { level: auto.levelOf(r), wasOk: res.wasOk || undefined });
  st.el('feedback').textContent = '';
  renderResult(st);
  st.ctx.onRated?.();
}

function toggleGap(st, g) {
  const res = st.result;
  if (!res) return;
  res.gaps = res.gaps.includes(g) ? res.gaps.filter((x) => x !== g) : [...res.gaps, g];
  if (st.step.id) store.setGaps(st.step.id, res.gaps);
  if (st.rec) auto.updateRecord(st.rec, { gaps: [...res.gaps] });
  renderResult(st);
}

/** El resultat en tres blocs: nivell, què t'ha faltat i què pots fer. */
function renderResult(st) {
  const res = st.result;
  const { r } = res;
  const nav = st.ctx.nav;
  const box = st.el('result');
  const after = st.el('after');
  after.innerHTML = '';
  const data = st.kind === 'improv' || st.kind === 'tune' ? '' : `A ${res.played} bpm${res.played < res.orig ? ` · el pas va a ${res.orig}` : ''}`;
  let html = `<div class="res-block res-level">${pill(r, 'big')}${data ? `<span class="res-data">${esc(data)}</span>` : ''}</div>`;
  if (res.autoMsg) html += `<p class="auto-msg">${esc(res.autoMsg)}</p>`;
  const L = st.listenSum;
  if (L) {
    const refPct = st.step.cegues && st.step.refId ? store.heardOf(st.step.refId) : null;
    const comp = refPct != null ? ` · amb ajuda («${esc(st.step.refTitol)}»): ${refPct} %${Math.round(L.score * 100) >= refPct - 10 ? ' · ho tens de veritat' : ' · amb la pantalla anava millor: encara depens de l\'ajuda'}` : '';
    html += `<div class="res-block res-heard"><h4>El joc t'ha sentit: ${Math.round(L.score * 100)} %${st.step.cegues ? ' a cegues' : ''}</h4>${comp ? `<p class="muted small">${comp.slice(3)}</p>` : ''}
      <div class="heard-stats"><span><b>${L.onTime}/${L.timed}</b> a temps</span><span><b>${L.right}/${L.pitched}</b> notes bones</span>${L.octava ? `<span><b>${L.octava}</b> d'una altra octava</span>` : ''}${L.missed ? `<span><b>${L.missed}</b> sense sonar</span>` : ''}${L.extras ? `<span><b>${L.extras}</b> de més</span>` : ''}${L.dynChecked ? `<span><b>${L.dynChecked - L.dynBad}/${L.dynChecked}</b> amb la dinàmica bona</span>` : ''}</div>
      ${L.tips.length ? `<ul class="res-tips">${L.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}</div>`;
  }
  const options = gapsFor(st.step, st.inst.id);
  if (r !== 'ok') {
    html += `<div class="res-block"><h4>Què t'ha faltat?</h4><p class="muted small">Marca el que no ha anat bé (pots triar-ne més d'un).</p>
      <div class="gap-chips">${options.map((g) => `<button type="button" class="gap-chip${res.gaps.includes(g) ? ' on' : ''}" data-gap="${g}" aria-pressed="${res.gaps.includes(g)}">${esc(gapText(g))}</button>`).join('')}</div>
      ${res.lastGaps.length ? `<p class="muted small last-gaps">La darrera vegada: ${esc(res.lastGaps.map(gapText).join(', '))}.</p>` : ''}</div>`;
  }
  const tips = tipsFor(res.gaps);
  if (tips.length) html += `<div class="res-block"><h4>Consells</h4><ul class="res-tips">${tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
  const opts = optionsFor(st);
  html += `<div class="res-block"><h4>Què creus que necessites ara?</h4><div class="opt-list">${opts.map((o) => `<button type="button" class="opt-btn" data-opt="${o.id}"${o.to ? ` data-id="${esc(o.to)}"` : ''}>${esc(o.text)}</button>`).join('')}</div></div>`;
  if (r !== 'no' && nav?.pathDone()) html += '<p class="path-end-inline"><b>Has acabat el camí.</b> Ja pots portar-ho al teu grup: a partir d\'ara, aquesta eina només la necessites per repassar alguna cosa concreta.</p>';
  else if (r === 'ok' && !res.levelWasDone && nav?.levelDone() && nav.nextLevel) html += `<p class="muted small">Has acabat el nivell ${st.step.nivell}. El següent és el <b>nivell ${nav.nextLevel.n} · ${esc(nav.nextLevel.titol)}</b>.</p>`;
  box.innerHTML = html;
  if (r !== 'no' && nav?.pathDone()) after.append(h('<button type="button" class="btn btn-ghost" data-go="skills">Què sé fer</button>'));
  const sug = suggestion(st, opts);
  if (st.rec) auto.updateRecord(st.rec, { suggested: sug?.id ?? null, suggestedTo: sug?.to });
}

/** Passos anteriors que treballen el que has marcat (o el pas anterior, si no has marcat res). */
function backTargets(st) {
  const nav = st.ctx.nav;
  if (!nav || !st.step.id) return [];
  const here = st.step.id;
  const out = [];
  for (const g of st.result.gaps) {
    const id = GAPS[g]?.base?.[st.inst.id];
    if (id && id !== here && nav.isBefore(id, here) && !out.some((x) => x.id === id)) out.push({ id, g });
  }
  if (!out.length && nav.prev && st.result.r !== 'ok') out.push({ id: nav.prev.id });
  return out.slice(0, 2);
}

// ---- L'ajuda es retira sola ---------------------------------------------------------------------------------

const AUTO_TXT = ['Amb guia sonora', 'Sense guia sonora', 'L\'ajuda s\'esvaeix'];
const helpMap = () => { const p = store.player(); if (!p) return {}; p.help ??= {}; return p.help; };
function autoLevel(st) {
  const id = st.step.id;
  const saved = id ? helpMap()[id] : null;
  if (saved != null) return saved;
  const b = id ? store.stepState(id)?.best : null;
  return b === 'ok' ? 2 : b === 'gairebe' ? 1 : 0;
}
function applyAutoHelp(st, level = autoLevel(st)) {
  st.autoLevel = level;
  st.guide = level === 0 ? 0.3 : 0;
  st.fade = level >= 2;
  st.el('guide').checked = st.guide > 0;
  st.el('fade').checked = st.fade;
  showHelpInd(st);
}
function showHelpInd(st) {
  const el = st.el('helpind');
  if (!el) return;
  if (st.blind) { el.innerHTML = '<span class="small">🙈 A cegues: sense ajuda visual</span>'; return; }
  if (!st.auto) { el.innerHTML = st.kind === 'sing' ? '' : '<span class="muted small">Ajuda: a mà (Opcions)</span>'; return; }
  const l = st.autoLevel ?? 0;
  el.innerHTML = `<span class="hi-dots">${[0, 1, 2].map((i) => `<i class="${i <= l ? 'on' : ''}"></i>`).join('')}</span><span class="small">${AUTO_TXT[l]}</span>`;
}
function stepAutoHelp(st, r) {
  if (!st.auto) return '';
  const id = st.step.id;
  let l = st.autoLevel ?? 0;
  const orig = st.step.tempo ?? st.tempo;
  let msg = '';
  if (r === 'ok') {
    if (l < 2) { l++; msg = l === 1 ? 'La propera vegada, sense guia sonora.' : 'La propera vegada, l\'ajuda de la pantalla s\'anirà esvaint.'; }
    else if (st.tempo < orig) { setTempo(st, Math.min(orig, st.tempo + 10)); msg = `La propera vegada, una mica més ràpid (${st.tempo}).`; }
  } else if (r === 'no') {
    if (l > 0) { l--; msg = l === 0 ? 'La propera vegada, amb la guia sonora.' : 'La propera vegada, amb tota l\'ajuda a la pantalla.'; }
    else { setTempo(st, Math.max(40, st.tempo - 10)); msg = `La propera vegada, més a poc a poc (${st.tempo}).`; }
  }
  if (id) { helpMap()[id] = l; store.save(); }
  applyAutoHelp(st, l);
  return msg;
}

function optionsFor(st) {
  const res = st.result;
  const { r } = res;
  const o = [];
  if (!st.auto && st.kind !== 'tune') {
    if (r === 'ok') o.push({ id: 'faster', text: `Pujar el tempo (a ${Math.min(200, st.tempo + 10)}) i tornar-hi` });
    else o.push({ id: 'slower', text: `Baixar el tempo (a ${Math.max(40, st.tempo - 10)}) i tornar-hi` });
    if (st.kind !== 'improv' && st.kind !== 'sing') o.push(st.guide ? { id: 'guide-off', text: 'Treure la guia sonora i tornar-hi' } : { id: 'guide-on', text: 'Posar la guia sonora (sentiràs fluix el saxo del joc) i tornar-hi' });
  }
  for (const t of backTargets(st)) {
    const info = st.ctx.nav.info(t.id);
    o.push({ id: 'back', to: t.id, text: `Tornar a «${info.titol}» (nivell ${info.nivell})${t.g ? `, que treballa ${gapText(t.g).toLowerCase()}` : ''}` });
  }
  o.push({ id: 'repeat', text: st.auto ? '▶ Torna-hi' : 'Repetir igual' });
  if (st.ctx.onNext) o.push({ id: 'next', to: st.ctx.nav?.next?.id, text: 'Passar al pas següent' });
  if (r === 'ok' && res.wasOk) o.push({ id: 'done', text: 'Ja no cal: ho porto al grup' });
  return o;
}

/** El que l'eina hauria proposat. Només es veu a «Què sé fer». */
function suggestion(st, opts) {
  const res = st.result;
  const has = (id) => opts.find((x) => x.id === id);
  if (res.r === 'no') {
    if (res.noRun >= 2) {
      const backs = opts.filter((x) => x.id === 'back');
      const byGap = backs.find((x) => /, que treballa /.test(x.text));
      if (byGap || backs[0]) return byGap ?? backs[0];
    }
    return has('slower') ?? has('repeat');
  }
  if (res.r === 'gairebe') return has('guide-off') ?? has('repeat');
  if (res.wasOk) return has('done');
  if (res.played < res.orig) return has('faster');
  return has('next') ?? has('faster');
}

function pickOption(st, id, to) {
  if (!st.result) return;
  const extra = {};
  if (id === 'back' || id === 'next') { extra.to = to || undefined; if (id === 'back' && to) extra.toOk = store.stepState(to)?.best === 'ok' || undefined; }
  auto.choose(st.rec, id, extra);
  const again = st.what === 'play' ? 'play' : 'full';
  if (st.kind === 'tune' && id === 'repeat') { hideAssess(st); return startTune(st); }
  if (id === 'slower') { setTempo(st, st.tempo - 10); hideAssess(st); return go(st, again); }
  if (id === 'faster') { setTempo(st, st.tempo + 10); hideAssess(st); return go(st, again); }
  if (id === 'guide-on' || id === 'guide-off') {
    st.guide = id === 'guide-on' ? 0.3 : 0;
    st.el('guide').checked = st.guide > 0;
    store.settings().guide = st.guide; store.save();
    hideAssess(st); return go(st, again);
  }
  if (id === 'repeat') { hideAssess(st); return go(st, again); }
  if (id === 'back' && to) { closeSession(); st.ctx.nav?.goStep(to); return; }
  if (id === 'next') { closeSession(); st.ctx.onNext?.(); return; }
  if (id === 'done') { closeSession(); if (st.ctx.nav?.goMap) st.ctx.nav.goMap(); else st.ctx.onBack?.(); }
}

function showAssess(st) {
  const a = st.el('assess');
  a.hidden = false;
  st.autoBase = { l: st.autoLevel ?? 0, tempo: st.tempo };
  const prev = st.step.id ? store.stepState(st.step.id) : null;
  st.lastGaps = prev?.status !== 'ok' ? (prev?.gaps ?? []).filter((g) => GAPS[g]) : [];
  st.el('feedback').textContent = (st.step.id ? 'Tu saps millor que ningú com ha sonat. Marca-ho i tria què vols fer ara.' : 'Marca com ha anat i tria què vols fer ara.')
    + (st.lastGaps.length ? ` La darrera vegada et va faltar: ${st.lastGaps.map(gapText).join(', ').toLowerCase()}.` : '');
  st.el('result').innerHTML = '';
  st.el('after').innerHTML = '';
  st.result = null;
  st.rec = null;
  for (const x of st.root.querySelectorAll('[data-rate]')) x.classList.remove('chosen');
}
function hideAssess(st) { st.el('assess').hidden = true; }

// ---- L'ajuda que es retira --------------------------------------------------------------------------------

// Les capes: 1 = sense el diagrama (els dits de memòria) · 2 = sense números (la pista només porta el ritme) · 3 = sense pista
const HELP_NOTES = ['', 'Sense el diagrama: els dits, de memòria. Si t\'equivoques, torna un instant.', 'Sense números: recorda la nota; la pista només porta el ritme.', 'Ara sol: només el pols.'];

function setHelp(st, level) {
  if (st.helpLevel === level) return;
  st.helpLevel = level;
  const stage = st.root?.querySelector('.stage');
  if (!stage) return;
  stage.dataset.help = String(level);
  st.root.querySelector('.side')?.setAttribute('data-help', String(level));
  const note = st.el('helpnote');
  if (level > 0) {
    note.textContent = HELP_NOTES[level];
    note.classList.remove('show');
    void note.offsetWidth;
    note.classList.add('show');
  } else note.classList.remove('show');
}

function renderPulses(st) {
  const M = st.M ?? metreOf('4/4');
  st.el('pulses').innerHTML = Array.from({ length: M.pulses }, (_, i) => `<span>${i + 1}</span>`).join('');
}

function eventsAround(st, pos) {
  const list = [];
  const add = (i) => {
    if (i < 0) return;
    const b = pos.bars[i];
    let content = b?.content;
    let seg = b?.seg;
    if (!b) { seg = st.plan?.(i); content = seg && seg.mode !== 'count' ? st.song.content(seg.k) : null; }
    if (!content) return;
    for (const e of content.part) if (!e.tied) list.push({ ...e, abs: i * st.M.beats + e.beat, id: `${i}:${e.beat}`, mode: seg?.mode });
  };
  add(pos.i - 1); add(pos.i); add(pos.i + 1); add(pos.i + 2);
  let cur = null;
  let next = null;
  for (const e of list) {
    if (e.abs <= pos.abs + 0.02) cur = e;
    else if (!next) next = e;
  }
  return { cur, next, list };
}

function frame(st) {
  if (current !== st) return;
  st.raf = requestAnimationFrame(() => frame(st));
  if (st.kind === 'tune') return;
  const pos = player.position();
  if (!pos || pos.i < 0) { if (pos) drawIdleLane(st, pos); return; }
  const seg = pos.bar?.seg ?? st.plan?.(pos.i);
  const mode = seg?.mode ?? 'count';
  if (mode === 'play' || mode === 'answer' || mode === 'sing') st.ranPlay = true;
  if (st.judge) feedJudge(st, pos);
  const br = midi.breath();
  if (br != null) st.el('lmeter').style.width = `${Math.round(br * 100)}%`;
  const M = st.M;
  const pulse = Math.floor(pos.beat / M.pulseLen);
  if (st.blind) setHelp(st, mode === 'play' || mode === 'sing' ? 3 : 0);
  else if (st.fade && (mode === 'play' || mode === 'sing') && st.kind !== 'improv') {
    st.playStart ??= pos.i;
    const total = roundsFor(st) * st.bars.length;
    const per = Number.isFinite(total) ? Math.max(1, total / 4) : helpStep(st);
    setHelp(st, Math.min(3, Math.floor((pos.i - st.playStart) / per)));
  } else if (st.helpLevel) setHelp(st, 0);

  const badge = st.el('badge');
  const big = st.el('big');
  const nextSeg = st.plan?.(pos.i + 1);
  let label = { count: 'COMPTE', demo: 'ESCOLTA', play: 'ARA TU', sing: 'CANTA TU', question: 'ESCOLTA LA PREGUNTA', answer: 'RESPON TU' }[mode] ?? '';
  let bigText = '';
  if (mode === 'count') bigText = String(pulse + 1);
  if (mode === 'demo' && (nextSeg?.mode === 'play' || nextSeg?.mode === 'sing')) { label = nextSeg.mode === 'sing' ? 'CANTA TU…' : 'ARA TU…'; bigText = String(M.pulses - pulse); }
  if (mode === 'sing' && nextSeg?.mode === 'play') { label = 'CANTA · ARA VE TOCAR'; }
  if (mode === 'play' && nextSeg?.mode === 'sing') { label = 'TOCA · ARA VE CANTAR'; }
  if (mode === 'demo' && !nextSeg) label = 'ESCOLTA (últim compàs)';
  if (st.kind === 'improv' && st.step.mode === 'free' && seg?.k != null) {
    big.classList.add('repte');
    bigText = st.reptes[Math.floor(seg.k / 4) % st.reptes.length];
  } else big.classList.remove('repte');
  badge.textContent = label;
  badge.dataset.mode = mode;
  if (big.textContent !== bigText) big.textContent = bigText;
  const pulses = st.el('pulses').children;
  for (let p = 0; p < pulses.length; p++) pulses[p].classList.toggle('on', p === pulse);

  const content = seg && seg.mode !== 'count' ? st.song.content(seg.k) : null;
  const { cur, next } = eventsAround(st, pos);
  const chordNow = content ? chordAtBeat(content.bar, pos.beat, M) : firstChord(st);
  if (st.kind === 'improv' && !(mode === 'question' && cur && cur.abs >= pos.i * M.beats)) {
    st.sax.show({ mode: 'scale', notes: improvNotes(st, chordNow), key: `${chordNow.symbol}:${st.step.mode}`, label: `${chordNow.symbol} · ${st.step.mode === 'chord' ? 'notes de l\'acord' : `pentatònica de ${pcName(st.key.root)}${st.key.minor ? ' menor' : ' major'}`}` });
  } else if (cur || next) {
    const e = cur ?? next;
    const lead = Math.min(store.settings().nextLead ?? 2, M.pulses) * M.pulseLen;
    const nx = next && next.num !== e.num ? next : nextDifferent(st, pos, e);
    st.sax.show({ mode: 'note', cur: e, next: nx, showNext: !!nx && nx.abs - pos.abs <= lead + 1e-6, label: e.chord ? `${e.chord}` : '', tag: mode === 'sing' ? 'CANTA' : cur ? 'ARA' : 'PRIMERA NOTA', showRole: st.showRole });
  }
  updateSide(st, content, pos, cur ?? next);
  const bars = pos.bars.slice();
  for (let j = Math.max(0, pos.i); j <= pos.i + 3; j++) {
    if (bars[j]) continue;
    const sg = st.plan?.(j);
    if (sg) bars[j] = { seg: sg, content: sg.mode === 'count' ? null : st.song.content(sg.k) };
  }
  st.lane.draw({ ...pos, bars }, { voice: !!st.step.voice, marks: st.marks, labels: (st.helpLevel ?? 0) < 2 });
}

/** La primera nota amb un número diferent de l'actual (pot ser d'aquí a més d'un compàs). */
function nextDifferent(st, pos, e) {
  const { list } = eventsAround(st, pos);
  return list.filter((x) => x.abs > pos.abs + 0.02 && x.num !== e.num).sort((a, b) => a.abs - b.abs)[0] ?? null;
}

function chordAtBeat(bar, beat, M) {
  const x = beat / M.beats;
  return (bar.find((s) => x >= s.start - 1e-6 && x < s.start + s.len - 1e-6) ?? bar.at(-1)).chord;
}
const firstChord = (st) => st.bars[0][0].chord;

function updateSide(st, content, pos, ev) {
  const host = st.el('card');
  const M = st.M;
  const step = st.step;
  let cards = [];
  if (st.kind === 'compose' && content) {
    const b = st.compose[(pos.bar?.seg?.k ?? 0) % st.compose.length];
    cards = [b.rhythm, b.melodic];
  } else if (step.carta) cards = [step.carta];
  const key = JSON.stringify([cards, step.genLine, step.canvis?.map((c) => `${c.a}-${c.b}`), step.part?.type === 'canvi' ? step.part.seq ?? [step.part.a, step.part.b] : null]);
  if (host.dataset.key !== key) {
    host.dataset.key = key;
    host.innerHTML = '';
    if (step.genLine) host.append(h(`<div class="genline">🎷 Melodia del Generador<b>${esc(step.genLine)}</b><small>La que ha escrit el professorat per a aquesta cançó${step.lineBars ? ` (${step.lineBars} compassos)` : ''}. Els números són els de la digitació ROCKIN.</small></div>`));
    for (const id of cards) {
      const c = cardById(id);
      if (!c) continue;
      host.append(h(`<div class="rcard"><img src="${c.img}" alt="Carta ${esc(id)}"><i class="sweep"></i></div>`));
    }
    if (step.part?.type === 'canvi') {
      const seq = [...new Set(step.part.seq ?? [step.part.a, step.part.b])];
      const wrap = h('<div class="boxes canvi-boxes"></div>');
      for (const n of seq) wrap.append(h(`<figure class="canvi-fig">${SAXO.svgDiagrama(n, { ample: 70 })}<figcaption>${esc(n)} · ${esc(writtenName(st.inst, realOfNum(st.inst, n) ?? 60))}</figcaption></figure>`));
      host.append(wrap);
    }
  }
  const x = content ? 7 + 86 * (pos.beat / M.beats) : -10;
  for (const s of host.querySelectorAll('.sweep')) s.style.left = `${x}%`;
}

function showIdle(st) {
  st.el('badge').textContent = 'PREPARA\'T';
  st.el('badge').dataset.mode = 'idle';
  st.el('big').textContent = '';
  st.el('big').classList.remove('repte');
  for (const p of st.el('pulses').children) p.classList.remove('on');
  if (st.kind === 'tune') return;
  const c0 = st.song.content(0);
  const e = c0.part.find((x) => !x.tied) ?? c0.part[0];
  if (st.kind === 'improv') { const ch = firstChord(st); st.sax.show({ mode: 'scale', notes: improvNotes(st, ch), key: `${ch.symbol}:${st.step.mode}`, label: `${ch.symbol} · ${st.step.mode === 'chord' ? 'notes de l\'acord' : 'pentatònica'}` }); }
  else if (e) st.sax.show({ mode: 'note', cur: e, next: c0.part.find((x) => !x.tied && x.num !== e.num) ?? null, showNext: true, label: `Comença amb: ${e.num ?? e.label}${e.chord ? ` (${e.chord})` : ''}`, tag: 'PRIMERA NOTA', showRole: st.showRole });
  else st.sax.clear();
  updateSide(st, null, { beat: 0 }, e);
  drawIdleLane(st);
}

function drawIdleLane(st, pos) {
  const plan = (i) => (i === 0 ? { mode: 'count' } : { mode: 'demo', k: i - 1 });
  const bars = [];
  for (let i = 0; i < 4; i++) { const seg = plan(i); bars[i] = { seg, content: seg.mode === 'count' ? null : st.song.content(seg.k) }; }
  st.lane.draw({ i: pos?.i ?? 0, abs: pos ? pos.abs : 0.6 * st.M.beats, beat: 0, bars, song: st.song }, { voice: !!st.step.voice });
}

// ---- Compositor (nivell 9) -----------------------------------------------------------------------------------

function setupComposer(st) {
  const box = st.el('composer');
  box.hidden = false;
  const M = st.M;
  const deck = rhythmDeck(M);
  const render = () => {
    box.innerHTML = `<div class="composer-head"><h3>La teva composició</h3>
      <button type="button" class="btn btn-ghost btn-small" data-c="random">🎲 Sorprèn-me</button>
      <button type="button" class="btn btn-ghost btn-small" data-c="save">💾 Desa-la a les meves cançons</button></div>
      <div class="composer-bars">${st.compose.map((b, i) => `
        <div class="cbar">
          <div class="cbar-chord">${esc(st.bars[i % st.bars.length].map((s) => s.chord.symbol).join(' '))}</div>
          <button type="button" class="cpick" data-c="rhythm" data-i="${i}" title="Canvia la carta rítmica"><img src="${cardById(b.rhythm)?.img}" alt=""><small>Ritme</small></button>
          <button type="button" class="cpick" data-c="melodic" data-i="${i}" title="Canvia la carta melòdica"><img src="${cardById(b.melodic)?.img}" alt=""><small>Melodia</small></button>
        </div>`).join('')}</div>
      <p class="muted small">Clica una carta per canviar-la. La carta rítmica diu quan bufes; la melòdica, si puges o baixes per les notes de l'acord (1, 3, 5, 8).</p>`;
  };
  render();
  box.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-c]');
    if (!b || st.root.classList.contains('playing')) return;
    const c = b.dataset.c;
    if (c === 'random') { st.compose = randomCompose(st, st.compose.length); rebuild(); return; }
    if (c === 'save') {
      store.saveSong({ titol: `${st.step.titol} (${new Date().toLocaleDateString('ca')})`, prog: st.step.prog, metre: M.id, tempo: st.tempo, estil: st.step.estil, nivell: 9, compose: st.compose, inst: st.inst.id });
      b.textContent = '✓ Desada';
      return;
    }
    const i = Number(b.dataset.i);
    const list = c === 'rhythm' ? deck : MELODIC;
    openPicker(list, st.compose[i][c], (id) => { st.compose[i][c] = id; rebuild(); });
  });
  function rebuild() {
    buildSong(st);
    render();
    showIdle(st);
  }
}

function openPicker(list, selected, onPick) {
  const dlg = h(`<dialog class="picker"><form method="dialog"><div class="picker-head"><h3>Tria una carta</h3><button class="btn btn-ghost btn-small" value="x">Tanca</button></div>
    <div class="picker-grid">${list.map((c) => `<button type="button" class="pcard${c.id === selected ? ' on' : ''}" data-id="${c.id}"><img src="${c.img}" alt="${c.id}" loading="lazy"></button>`).join('')}</div></form></dialog>`);
  document.body.append(dlg);
  dlg.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) { onPick(b.dataset.id); dlg.close(); } });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}
export { openPicker };

// ---- Afinar (nivell 7): un joc d'oïda -------------------------------------------------------------------------
// Sona una nota de referència (el teclat de la banda) i després el saxo, una mica alt, baix o afinat.
// L'alumne decideix què faria amb el broquet. Vuit rondes; a partir de 6 encerts, «A prop»; 8, «Ja ho tens!».

const TUNE_ROUNDS = 8;
function setupTuner(st) {
  st.el('controls').hidden = true;
  st.el('lane').hidden = true;
  st.el('sax').hidden = true;
  st.el('card').innerHTML = '';
  const box = st.el('tuner');
  box.hidden = false;
  st.el('badge').textContent = 'AFINA';
  box.innerHTML = `
    <div class="tune-game">
      <p class="muted" data-t="intro">Sona una nota de referència i després el saxo. Decideix què faries amb el broquet.</p>
      <div class="row"><button type="button" class="btn btn-primary btn-big" data-t="start">▶ Comença</button></div>
      <div class="tune-round" data-t="round" hidden>
        <div class="tune-head"><span data-t="num"></span><button type="button" class="btn btn-ghost btn-small" data-t="again">🔁 Torna a escoltar</button></div>
        <div class="tune-choices">
          <button type="button" class="tune-btn wide" data-ans="alt"><b>Va alt</b><small>treu una mica el broquet</small></button>
          <button type="button" class="tune-btn wide" data-ans="ok"><b>Afinat</b><small>deixa-ho com està</small></button>
          <button type="button" class="tune-btn wide" data-ans="baix"><b>Va baix</b><small>posa el broquet més endins</small></button>
        </div>
        <p class="tune-fb" data-t="fb"></p>
      </div>
    </div>`;
  const q = (k) => box.querySelector(`[data-t="${k}"]`);
  const play = async (round) => {
    await player.prepare();
    const ctx = audioContext();
    const t = ctx.currentTime + 0.1;
    tone('rhodes', round.ref, t, 1.6, { gain: 0.5, dest: 'me' });
    saxTone(round.ref + round.cents / 100, t + 1.0, 1.8, { gain: 0.5, dest: 'me', vel: 0.75 });
  };
  box.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-t],[data-ans]');
    if (!b) return;
    if (b.dataset.t === 'start') { startTune(st); return; }
    if (b.dataset.t === 'again') { if (st.tune?.cur) play(st.tune.cur); return; }
    if (b.dataset.ans && st.tune?.cur && !st.tune.answered) {
      const r = st.tune.cur;
      const truth = r.cents > 0 ? 'alt' : r.cents < 0 ? 'baix' : 'ok';
      const ok = b.dataset.ans === truth;
      st.tune.answered = true;
      if (ok) st.tune.hits++;
      for (const x of box.querySelectorAll('[data-ans]')) { x.classList.toggle('ok', x.dataset.ans === truth); x.classList.toggle('bad', !ok && x.dataset.ans === b.dataset.ans); }
      q('fb').textContent = ok ? `Sí: ${{ alt: 'anava alt (massa agut)', baix: 'anava baix (massa greu)', ok: 'estava afinat' }[truth]}.` : `No: ${{ alt: 'anava alt (massa agut): calia treure el broquet', baix: 'anava baix (massa greu): calia posar-lo més endins', ok: 'estava afinat' }[truth]}.`;
      setTimeout(() => { if (current === st) nextTune(st); }, 1400);
    }
  });
  st.tunePlay = play;
  st.tuneQ = q;
  st.tuneBox = box;
}
function startTune(st) {
  const [lo, hi] = st.step.cents ?? [25, 45];
  const refs = [57, 60, 62, 64, 65, 67, 69, 71];
  st.tune = { i: 0, hits: 0, rounds: Array.from({ length: TUNE_ROUNDS }, (_, i) => {
    const kind = i % 3 === 2 ? 0 : (Math.random() < 0.5 ? 1 : -1);
    return { ref: refs[Math.floor(Math.random() * refs.length)], cents: kind * (lo + Math.random() * (hi - lo)) };
  }) };
  st.tuneQ('round').hidden = false;
  st.tuneBox.querySelector('[data-t="start"]').closest('.row').hidden = true;
  hideAssess(st);
  nextTune(st);
}
function nextTune(st) {
  const T = st.tune;
  for (const x of st.tuneBox.querySelectorAll('[data-ans]')) x.classList.remove('ok', 'bad');
  st.tuneQ('fb').textContent = '';
  if (T.i >= T.rounds.length) {
    T.cur = null;
    st.tuneQ('num').textContent = `Fet: ${T.hits} de ${T.rounds.length}`;
    const r = T.hits >= 8 ? 'ok' : T.hits >= 6 ? 'gairebe' : 'no';
    showAssess(st);
    rate(st, r);
    st.el('feedback').textContent = `Has encertat ${T.hits} de ${T.rounds.length}. ${r === 'ok' ? 'L\'orella ja ho sent!' : r === 'gairebe' ? 'Gairebé: una ronda més i ho tens.' : 'Torna-hi: escolta el batec entre les dues notes.'} Si creus que no és així, tria un altre nivell.`;
    return;
  }
  T.cur = T.rounds[T.i];
  T.answered = false;
  T.i++;
  st.tuneQ('num').textContent = `Ronda ${T.i} de ${T.rounds.length}`;
  st.tunePlay(T.cur);
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
