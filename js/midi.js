// El TravelSax (o qualsevol vent MIDI) per Web MIDI: notes que entren i surten, la pressió de l'aire (CC2),
// el calibratge («toca un 1») i el quadre de connexió. També un teclat de prova per jugar sense TravelSax.
//
// Tot acaba en onNote({ midi (real), raw, vel, on, perf, breath }), amb `perf` al rellotge de performance.now().

import * as store from './store.js';
import { instrument, toReal, realOfNum, numOf, writtenName, semi } from './instruments.js';
import { saxStart, resumeAudio, outputLatencyMs, setExtraLatency } from './audio.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const settings = () => (store.settings().midi ??= { on: false, deviceId: '', offset: null, inLat: 0, tol: 'normal', monitor: false, keys: true });

let access = null;
let bound = [];
const listeners = new Set();
const state = { supported: !!navigator.requestMIDIAccess, devices: [], error: null, lastRaw: null, breath: null, breathPeak: 0, active: new Set() };
let learner = null;

export const isOn = () => !!access && bound.length > 0;
export const isSupported = () => state.supported;
export const deviceNames = () => state.devices.map((d) => d.name);
export const breath = () => state.breath;
/** La pressió màxima des de l'última nota (0–1), o null si l'instrument no envia CC2. */
export const breathPeak = () => (state.breath == null ? null : state.breathPeak);
export const lastRaw = () => state.lastRaw;
export const activeNotes = () => [...state.active];

/** Nota MIDI rebuda → nota real. L'offset surt del calibratge (per defecte, suposem que envia la nota escrita). */
export function toRealMidi(raw) {
  const S = settings();
  const inst = instrument(store.instrumentOf());
  const off = S.offset ?? -semi(inst);
  return raw + off;
}

function emit(msg) {
  if (learner && msg.on) { const l = learner; learner = null; l(msg); return; }
  for (const cb of listeners) cb(msg);
}

/** Registra un receptor de notes. Torna la funció per donar-se de baixa. */
export function onNote(cb) { listeners.add(cb); return () => listeners.delete(cb); }

let monitorVoices = new Map();
function monitorOn(msg) {
  if (!settings().monitor && msg.source === 'midi') return;
  if (msg.on) {
    monitorVoices.get(msg.raw)?.stop();
    monitorVoices.set(msg.raw, saxStart(msg.midi, { vel: msg.vel }));
  } else { monitorVoices.get(msg.raw)?.stop(); monitorVoices.delete(msg.raw); }
}

export async function connect() {
  if (!state.supported) {
    state.error = 'Aquest navegador no pot llegir el TravelSax (Web MIDI). Fes servir Chrome o Edge.';
    return state;
  }
  if (!access) {
    try { access = await navigator.requestMIDIAccess({ sysex: false }); } catch {
      state.error = 'El navegador no ha donat permís per llegir el MIDI. Es pot jugar amb el teclat de l\'ordinador.';
      return state;
    }
    access.onstatechange = () => { bind(); for (const cb of stateListeners) cb(state); };
  }
  bind();
  settings().on = true; store.save();
  return state;
}
const stateListeners = new Set();
export function onState(cb) { stateListeners.add(cb); return () => stateListeners.delete(cb); }

function bind() {
  for (const input of bound) input.onmidimessage = null;
  bound = [];
  state.devices = [];
  if (!access) return;
  const want = settings().deviceId;
  for (const input of access.inputs.values()) {
    state.devices.push({ id: input.id, name: input.name });
    if (want && input.id !== want) continue;
    input.onmidimessage = (ev) => handle(ev.data, ev.timeStamp || performance.now(), input.name);
    bound.push(input);
  }
  state.error = bound.length ? null : state.devices.length ? 'El TravelSax triat no hi és.' : 'No hi ha cap TravelSax connectat. Endolla\'l per USB (o aparella\'l per Bluetooth) i torna-ho a provar.';
}

function handle(data, perf, device) {
  const [status, d1, d2 = 0] = data;
  const cmd = status & 0xf0;
  if (cmd === 0xb0) {
    if (d1 === 2 || d1 === 11 || d1 === 7) { // pressió de l'aire (CC2); alguns models la posen al CC11 o CC7
      if (d1 === 2 || state.breath == null) { state.breath = d2 / 127; state.breathPeak = Math.max(state.breathPeak, d2 / 127); }
    }
    return;
  }
  if (cmd !== 0x90 && cmd !== 0x80) return;
  const on = cmd === 0x90 && d2 > 0;
  const raw = d1;
  state.lastRaw = raw;
  if (on) { state.breathPeak = state.breath ?? 0; state.active.add(raw); } else state.active.delete(raw);
  const msg = { raw, midi: toRealMidi(raw), vel: on ? d2 / 127 : 0, on, perf, breath: state.breath, source: 'midi', device };
  monitorOn(msg);
  emit(msg);
}

/** Simulació (per a les proves): una nota com si vingués del TravelSax. */
export function simulate(raw, on, vel = 100, perf = performance.now()) { handle([on ? 0x90 : 0x80, raw, on ? vel : 0], perf, 'simulat'); }
export function simulateBreath(v) { handle([0xb0, 2, Math.round(v * 127)], performance.now(), 'simulat'); }

// ---- Teclat de l'ordinador (per provar sense TravelSax) ------------------------------------------------------------
// Dígits 1–6 i 0 = els números; amb Majúscules, amb la clau d'octava (').  q=1+ · w=2,5 · e=3+ · r=4,5 · t=6+ · y=6C · u=6+C
const KEYS = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 0: '0', q: '1+', w: '2,5', e: '3+', r: '4,5', t: '6+', y: '6C', u: '6+C' };
export const KEY_HELP = 'Tecles: 1–6 i 0 són els números; amb Majúscules, la clau d\'octava (\'). q = 1+ · w = 2,5 · e = 3+ · r = 4,5 · t = 6+ · y = 6C';
let keysEnabled = () => true;
export function keysOn(fn) { keysEnabled = fn; }
const held = new Map();
window.addEventListener('keydown', (ev) => {
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
  if (ev.target.closest?.('input, textarea, select, dialog')) return;
  const base = KEYS[ev.key.toLowerCase()] ?? KEYS[ev.key];
  if (!base || !settings().keys || !keysEnabled()) return;
  ev.preventDefault();
  if (ev.repeat || held.has(ev.code)) return;
  const num = ev.shiftKey && !base.endsWith('C') ? `${base}'` : base;
  const inst = instrument(store.instrumentOf());
  const midi = realOfNum(inst, num);
  if (midi == null) return;
  held.set(ev.code, midi);
  resumeAudio();
  const perf = ev.timeStamp || performance.now();
  state.active.add(midi);
  const msg = { raw: midi - (settings().offset ?? -semi(inst)), midi, vel: 0.8, on: true, perf, breath: null, source: 'teclat' };
  monitorVoices.get(msg.raw)?.stop();
  monitorVoices.set(msg.raw, saxStart(midi, { vel: 0.8 }));
  emit(msg);
});
window.addEventListener('keyup', (ev) => {
  const midi = held.get(ev.code);
  if (midi == null) return;
  held.delete(ev.code);
  state.active.delete(midi);
  const inst = instrument(store.instrumentOf());
  const raw = midi - (settings().offset ?? -semi(inst));
  monitorVoices.get(raw)?.stop(); monitorVoices.delete(raw);
  emit({ raw, midi, vel: 0, on: false, perf: ev.timeStamp || performance.now(), breath: null, source: 'teclat' });
});

// ---- Calibratge: «toca un 1 (Si)» -----------------------------------------------------------------------------------

/** Espera la següent nota i en dedueix l'offset. Torna { raw, offset, text }. */
export function calibrate() {
  return new Promise((resolve) => {
    learner = (msg) => {
      if (msg.source !== 'midi') { resolve(null); return; }
      const inst = instrument(store.instrumentOf());
      const expected = toReal(inst, 71); // el Si escrit (número 1), com sona de veritat
      const offset = expected - msg.raw;
      settings().offset = offset;
      store.save();
      const how = offset === 0 ? 'envia la nota real (la que sona)' : offset === -semi(inst) ? 'envia la nota escrita (la que llegeix el saxofonista)' : `està transportat ${offset > 0 ? '+' : ''}${offset} semitons`;
      resolve({ raw: msg.raw, offset, text: `Fet: el TravelSax ${how}.` });
    };
  });
}
export function cancelCalibrate() { learner = null; }

// ---- El quadre «El teu TravelSax» ----------------------------------------------------------------------------------

export function openDialog({ onChange } = {}) {
  const S = settings();
  const inst = instrument(store.instrumentOf());
  const dlg = document.createElement('dialog');
  dlg.className = 'settings midi-dlg';
  const render = () => {
    const on = isOn();
    dlg.innerHTML = `<form method="dialog">
      <h2>🎷 El teu TravelSax</h2>
      <p class="muted small">Connecta'l per USB-C (el més segur a l'aula) o per Bluetooth MIDI. Funciona amb Chrome i Edge. Al TravelSax, deixa el so apagat o posa't els auriculars: el joc només necessita les notes.</p>
      <div class="midi-row">
        <button type="button" class="btn ${on ? 'btn-ghost' : 'btn-primary'}" data-m="connect">${on ? '✓ Connectat' : 'Connecta'}</button>
        ${state.devices.length > 1 ? `<label>Aparell <select data-m="device"><option value="">tots</option>${state.devices.map((d) => `<option value="${esc(d.id)}"${S.deviceId === d.id ? ' selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label>` : state.devices.length === 1 ? `<span class="muted small">${esc(state.devices[0].name)}</span>` : ''}
      </div>
      ${state.error ? `<p class="err">${esc(state.error)}</p>` : ''}
      <div class="midi-test"><small class="muted">Prova: toca una nota</small><b data-m="test">—</b><span class="muted small" data-m="testname"></span><span class="lmeter" title="Pressió de l'aire"><i data-m="breath"></i></span></div>
      <h3>Calibratge</h3>
      <p class="muted small">Toca un <b>1 (Si)</b> i el joc sabrà si el TravelSax envia la nota escrita o la real. ${S.offset == null ? 'Encara no s\'ha calibrat (suposem que envia la nota escrita).' : `Ara: ${S.offset === -semi(inst) ? 'nota escrita' : S.offset === 0 ? 'nota real' : `${S.offset > 0 ? '+' : ''}${S.offset} semitons`}.`}</p>
      <div class="row"><button type="button" class="btn btn-ghost" data-m="cal">Calibra: toca un 1</button><span class="muted small" data-m="calmsg"></span></div>
      <h3>Ajustos</h3>
      <label class="set-row">Retard de l'entrada <span><button type="button" class="icon-btn" data-m="lat-">−</button> <b data-m="lat">${S.inLat} ms</b> <button type="button" class="icon-btn" data-m="lat+">+</button></span></label>
      <p class="muted small">Si el joc diu que vas tard quan tu vas bé, puja'l (Bluetooth sol tenir 20–40 ms). La sortida de so d'aquest ordinador triga ${outputLatencyMs()} ms.</p>
      <label class="set-row">Exigència <select data-m="tol"><option value="facil"${S.tol === 'facil' ? ' selected' : ''}>fàcil</option><option value="normal"${S.tol === 'normal' ? ' selected' : ''}>normal</option><option value="exigent"${S.tol === 'exigent' ? ' selected' : ''}>exigent</option></select></label>
      <label class="toggle"><input type="checkbox" data-m="monitor"${S.monitor ? ' checked' : ''}> Sentir el saxo per l'ordinador (si el TravelSax no sona)</label>
      <label class="toggle"><input type="checkbox" data-m="keys"${S.keys ? ' checked' : ''}> Teclat de prova (jugar sense TravelSax)</label>
      <p class="muted small">${KEY_HELP}</p>
      <div class="row"><button class="btn" value="ok">Fet</button></div>
    </form>`;
  };
  render();
  document.body.append(dlg);
  const off = onNote((m) => {
    if (!m.on) return;
    const t = dlg.querySelector('[data-m="test"]');
    if (t) { t.textContent = numOf(inst, m.midi) ?? '?'; dlg.querySelector('[data-m="testname"]').textContent = `${writtenName(inst, m.midi)} escrit · MIDI ${m.raw}`; }
  });
  const meter = setInterval(() => { const b = dlg.querySelector('[data-m="breath"]'); if (b) b.style.width = `${Math.round((state.breath ?? 0) * 100)}%`; }, 80);
  dlg.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-m]');
    if (!b) return;
    const m = b.dataset.m;
    if (m === 'connect') { await connect(); render(); onChange?.(); }
    else if (m === 'cal') {
      b.disabled = true;
      dlg.querySelector('[data-m="calmsg"]').textContent = 'Toca un 1 (Si)…';
      const r = await calibrate();
      render();
      dlg.querySelector('[data-m="calmsg"]').textContent = r ? r.text : 'Només es calibra amb el TravelSax (no amb el teclat).';
      onChange?.();
    } else if (m === 'lat-' || m === 'lat+') { S.inLat = Math.max(0, Math.min(200, S.inLat + (m === 'lat+' ? 5 : -5))); setExtraLatency(0); store.save(); dlg.querySelector('[data-m="lat"]').textContent = `${S.inLat} ms`; }
  });
  dlg.addEventListener('change', (ev) => {
    const t = ev.target;
    const m = t.dataset.m;
    if (m === 'device') { S.deviceId = t.value; store.save(); bind(); render(); }
    if (m === 'tol') { S.tol = t.value; store.save(); }
    if (m === 'monitor') { S.monitor = t.checked; store.save(); }
    if (m === 'keys') { S.keys = t.checked; store.save(); }
  });
  dlg.addEventListener('close', () => { off(); clearInterval(meter); cancelCalibrate(); dlg.remove(); onChange?.(); });
  dlg.showModal();
  if (!isOn() && state.supported && S.on) connect().then(render);
}
