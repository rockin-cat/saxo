// El jutge: compara cada nota que entra pel TravelSax amb la que tocava.
//
// Cada nota esperada té una finestra de temps (el 45 % de la distància fins a la nota veïna, entre 70 i 160 ms,
// segons l'exigència). Una nota dins la finestra:
//   perfect   a menys de 40 ms i la nota bona
//   good      més lluny però dins, i la nota bona (aviat / tard)
//   octava    la nota bona però a una altra octava (la clau d'octava!)
//   wrongnote una altra nota (es diu quin número tocava)
// Fora de tota finestra: extra (nota de més). Quan una nota passa sense cap atac: missed.
// Dinàmica (nivell 3): la pressió de l'aire (CC2) de cada nota es compara amb la f / p demanada → dyn-soft / dyn-loud.
// Les notes lligades (tied) no esperen cap atac.

import { heardTime } from './audio.js';
import * as midi from './midi.js';
import { numOf } from './instruments.js';
import { mod } from './theory.js';

const TOL = { facil: { perfect: 0.06, k: 1.4 }, normal: { perfect: 0.04, k: 1 }, exigent: { perfect: 0.03, k: 0.75 } };
const DYN_F = 0.55, DYN_P = 0.42;

export function createJudge(inst, { onVerdict } = {}) {
  const T = TOL[midi.settings().tol] ?? TOL.normal;
  const expected = []; // { id, time, win, midi, num, dyn, abs, spq, bar, change, status, dt, got }
  const hits = [];
  const seen = new Set();
  let nextId = 0;
  let lastOn = -1;
  let alive = true;
  let hasBreath = false;

  /** Afegeix les notes d'un compàs. `at(beat)` → temps d'àudio; `absBase` = negres des de l'inici. */
  function addBar(j, events, at, spq, absBase) {
    if (seen.has(j)) return;
    seen.add(j);
    const list = events.filter((e) => e.kind === 'note' && e.midi != null && !e.tied);
    list.forEach((e, i) => {
      const prev = list[i - 1], next = list[i + 1];
      const gapPrev = prev ? (e.beat - prev.beat) * spq : 1, gapNext = next ? (next.beat - e.beat) * spq : 1;
      const win = Math.max(0.07, Math.min(0.16, 0.45 * Math.min(gapPrev, gapNext))) * T.k;
      expected.push({ id: nextId++, time: at(e.beat), win, midi: e.midi, num: e.num, dyn: e.dyn, abs: absBase + e.beat, spq, bar: j, change: !!(prev && prev.chord !== e.chord) || (!prev && i === 0), status: 'pending', dt: null, got: null });
    });
  }

  const off = midi.onNote((m) => {
    if (!alive || !m.on) return;
    const t = heardTime(m.perf) - (midi.settings().inLat || 0) / 1000;
    if (t - lastOn < 0.03) return; // doble disparador
    lastOn = t;
    if (m.breath != null) hasBreath = true;
    let best = null, octave = null, other = null;
    for (const e of expected) {
      if (e.status !== 'pending') continue;
      const dt = t - e.time;
      if (Math.abs(dt) > e.win) continue;
      if (e.midi === m.midi) { if (!best || Math.abs(dt) < Math.abs(best.dt)) best = { e, dt }; }
      else if (mod(e.midi - m.midi, 12) === 0) { if (!octave || Math.abs(dt) < Math.abs(octave.dt)) octave = { e, dt }; }
      else if (!other || Math.abs(dt) < Math.abs(other.dt)) other = { e, dt };
    }
    let v;
    if (best) {
      const { e, dt } = best;
      e.status = Math.abs(dt) <= T.perfect ? 'perfect' : 'good';
      e.dt = dt; e.got = m.midi; e.onset = m.perf;
      v = { kind: e.status, dt, exp: e, got: m.midi };
    } else if (octave) {
      const { e, dt } = octave;
      e.status = 'octava'; e.dt = dt; e.got = m.midi;
      v = { kind: 'octava', dt, exp: e, got: m.midi };
    } else if (other) {
      const { e, dt } = other;
      e.status = 'wrongnote'; e.dt = dt; e.got = m.midi;
      v = { kind: 'wrongnote', dt, exp: e, got: m.midi };
    } else v = { kind: 'extra', got: m.midi };
    hits.push({ kind: v.kind, time: t, dt: v.dt ?? null, midi: m.midi });
    onVerdict?.(v);
  });

  /** A cada fotograma: notes que han passat sense atac i la dinàmica de les que ja sonen. `now` = temps sentit. */
  function tick(now) {
    for (const e of expected) {
      if (e.status === 'pending') {
        if (now > e.time + e.win + 0.03) { e.status = 'missed'; onVerdict?.({ kind: 'missed', exp: e }); }
        continue;
      }
      if (e.dyn && !e.dynChecked && (e.status === 'perfect' || e.status === 'good') && now > e.time + 0.25) {
        e.dynChecked = true;
        const peak = midi.breathPeak();
        if (peak == null) continue;
        e.breath = peak;
        let kind = null;
        if (e.dyn === 'f' && peak < DYN_F) kind = 'dyn-soft';
        if (e.dyn === 'p' && peak > DYN_P) kind = 'dyn-loud';
        if (kind) { e.dynBad = kind; onVerdict?.({ kind, exp: e, breath: peak }); }
      }
    }
  }

  function summary() {
    const done = expected.filter((e) => !['pending'].includes(e.status));
    const n = done.length;
    const c = (s) => done.filter((e) => e.status === s).length;
    const perfect = c('perfect'), good = c('good'), octava = c('octava'), wrongnote = c('wrongnote'), missed = c('missed');
    const extras = hits.filter((h) => h.kind === 'extra').length;
    const score = n ? Math.max(0, Math.min(1, (perfect + 0.85 * good + 0.45 * octava + 0.2 * wrongnote - 0.35 * extras) / n)) : 0;
    const level = score >= 0.9 ? 'ok' : score >= 0.75 ? 'gairebe' : 'no';
    const dts = done.filter((e) => e.dt != null).map((e) => e.dt * 1000);
    const mean = dts.length ? dts.reduce((a, b) => a + b, 0) / dts.length : 0;
    const sd = dts.length > 1 ? Math.sqrt(dts.reduce((a, b) => a + (b - mean) ** 2, 0) / (dts.length - 1)) : 0;
    const onTime = done.filter((e) => e.status !== 'missed' && e.dt != null && Math.abs(e.dt) <= 0.06).length;
    const right = perfect + good;
    const changes = done.filter((e) => e.change);
    const badAtChange = changes.filter((e) => !['perfect', 'good'].includes(e.status)).length;
    const others = done.filter((e) => !e.change);
    const badOther = others.filter((e) => !['perfect', 'good'].includes(e.status)).length;
    const dyn = done.filter((e) => e.dynChecked);
    const dynBad = dyn.filter((e) => e.dynBad).length;
    // quins números fallen més
    const wrongNums = {};
    for (const e of done) if (e.status === 'wrongnote' || e.status === 'octava') wrongNums[e.num] = (wrongNums[e.num] ?? 0) + 1;
    const worst = Object.entries(wrongNums).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);

    const gaps = [], tips = [];
    if (n && missed > n * 0.3) { gaps.push('banda'); tips.push('Moltes notes han passat sense sonar: baixa el tempo i torna-hi.'); }
    if (dts.length >= 6 && Math.abs(mean) > 25) { gaps.push('pols'); tips.push(mean < 0 ? 'Vas una mica avançat: escolta la bateria i deixa que la nota caigui amb ella.' : 'Vas una mica endarrerit: prepara els dits abans de bufar.'); }
    else if (dts.length >= 6 && sd > 45) { gaps.push('ritme'); tips.push('El temps va i ve: compta en veu alta o encén el metrònom.'); }
    else if (dts.length >= 6 && sd < 22) tips.push('El temps és molt regular. Molt bé!');
    if (octava >= Math.max(1, n * 0.15)) { gaps.push('octava'); tips.push('La nota és bona però a una altra octava: fixa\'t en l\'apòstrof (\') del número, que és la clau d\'octava amb el polze.'); }
    if (wrongnote > Math.max(1, n * 0.2)) { gaps.push('notes'); tips.push(`Algunes notes no eren les bones${worst.length ? ` (sobretot ${worst.join(' i ')})` : ''}: mira el diagrama abans de bufar.`); }
    if (changes.length >= 2 && badAtChange / changes.length >= 0.5 && (others.length ? badOther / others.length : 0) <= 0.25) { gaps.push('canvi'); tips.push('El que més falla és la primera nota de cada acord: prepara la digitació just abans del canvi.'); }
    if (extras > Math.max(2, n * 0.15)) { gaps.push('aire'); tips.push('Hi ha notes de més: cada bufada ha de ser una nota de la pista. Si l\'aire es talla, la nota es repeteix sola.'); }
    if (dyn.length >= 3 && dynBad / dyn.length > 0.4) { gaps.push('dinamica'); tips.push('La dinàmica no es nota prou: a les notes fortes bufa més (i obre la gola); a les fluixes, menys aire però sense deixar de sostenir.'); }

    return { n, timed: n, perfect, good, octava, wrongnote, missed, extras, air: 0, score, level, meanMs: mean, sdMs: sd, onTime, right, pitched: n, strums: 0, dynChecked: dyn.length, dynBad, hasBreath, gaps: [...new Set(gaps)], tips };
  }

  function destroy() { alive = false; off(); }
  return { addBar, tick, summary, destroy, expected, hits };
}

/** El text curt de cada veredicte (sobre l'escenari). */
export function verdictText(v, inst) {
  const num = (m) => numOf(inst, m) ?? '?';
  switch (v.kind) {
    case 'perfect': return 'Perfecte!';
    case 'good': return v.dt < 0 ? 'Una mica aviat' : 'Una mica tard';
    case 'octava': return `Era ${v.exp.num}: l'altra octava`;
    case 'wrongnote': return `Era ${v.exp.num} (has fet ${num(v.got)})`;
    case 'missed': return `No ha sonat el ${v.exp.num}`;
    case 'extra': return 'Nota de més';
    case 'dyn-soft': return 'Més fort!';
    case 'dyn-loud': return 'Més fluix…';
    default: return '';
  }
}
export const verdictClass = (k) => ({ perfect: 'ok', good: 'ok', octava: 'mid', 'dyn-soft': 'mid', 'dyn-loud': 'mid', missed: 'bad', wrongnote: 'bad', extra: 'bad' }[k] ?? '');
