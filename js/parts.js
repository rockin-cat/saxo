// La part del saxo: què ha de tocar a cada compàs (i què ensenya l'animació).
//
// Un esdeveniment: { beat, dur, kind: 'note', chord, notes: [midi real], midi, num (número de digitació),
//                    label, role ('1' | '3' | '5' | '7' | '8'), dyn ('p' | 'mf' | 'f'), tied, voice }
// Especificacions de part (spec), que fan servir els nivells:
//   { type: 'arrels', rhythm | card }                        la fonamental de cada acord
//   { type: 'propera', rhythm | card, tones: 3 | 4, start }   la nota de l'acord més propera a l'anterior (camí curt)
//   { type: 'melodia', line, rhythm | card }                 la melodia del Generador (amb el seu ritme o el d'una carta)
//   { type: 'segona', line, interval: 2 | -2 }               segona veu: la melodia una tercera amunt o avall (diatònica)
//   { type: 'canvi', a: '0', b: "6'", rhythm }               dos números alternats (digitació entre notes)
//   { type: 'arp', card }                                     carta melòdica sobre 1, 3, 5, 8
//   { type: 'compose', bars: [{ rhythm, melodic }] }          composició amb cartes
//   { type: 'improv' }                                        sense notes
// Camps extra: dyn: ['f', 'p'…] (per compàs) o 'cresc' · repeat: n (cada nota es repeteix n vegades, per a l'articulació)

import { chordAt, mod, guessKey } from './theory.js';
import { cardById, cardOnsets } from './data/cartes.js';
import { instrument, numOf, nearestPc, chordTonesInRange, realOfNum, comfort, range } from './instruments.js';

const EPS = 1e-6;

/** Les notes (inici, durada) d'un ritme dins d'un compàs de `M`. */
export function rhythmOnsets(spec, M) {
  if (spec.card) {
    const c = cardById(spec.card);
    if (c?.notes) return cardOnsets(c).filter(([a]) => a < M.beats - EPS);
  }
  const B = M.beats;
  const every = (step) => Array.from({ length: Math.round(B / step) }, (_, i) => [i * step, step]);
  switch (spec.rhythm) {
    case 'W': return [[0, B]];
    case 'H': return M.pulseLen > 1 ? every(M.pulseLen * (M.pulses % 2 ? 1 : 2)) : B % 2 ? [[0, 2], [2, 1]].filter(([a]) => a < B) : every(2);
    case 'E': return every(0.5);
    case 'S': return every(0.25);
    case 'Q': default: return every(M.pulseLen);
  }
}

const segChord = (bar, beat, M) => chordAt(bar, beat / M.beats);
const ROLE = (chord, pc) => { const i = chord.pcs.indexOf(mod(pc, 12)); return i < 0 ? '' : ['1', '3', '5', '7'][i] ?? ''; };

function note(inst, real, beat, dur, chord, extra = {}) {
  if (real == null) return null;
  const num = numOf(inst, real);
  return { beat, dur, kind: 'note', chord: chord?.symbol, notes: [real], midi: real, num, label: num ?? '?', role: chord ? ROLE(chord, real) : '', ...extra };
}

// ---- La melodia del Generador ---------------------------------------------------------------------------------

/** Les notes d'una línia del Generador, compàs a compàs: [[{ a (negres), dur, midi, tied }]] (els silencis no hi són). */
export function lineBars(line, M) {
  const [num, den] = String(line.compas || '4/4').split('/').map(Number);
  const perBar = (num || 4) * (den === 8 ? 2 : 4); // semicorxeres per compàs
  const nBars = Math.max(1, Number(line.compassos) || 1);
  const bars = Array.from({ length: nBars }, () => []);
  let pos = 0;
  for (const n of line.notes ?? []) {
    const start = pos;
    const end = pos + (Number(n.d) || 0);
    pos = end;
    if (!n.p) continue;
    const midi = nameToMidi(n.p);
    if (midi == null) continue;
    // una nota pot creuar la barra: es parteix i la segona part és «lligada» (no es torna a atacar)
    for (let b = Math.floor(start / perBar); b * perBar < end && b < nBars; b++) {
      const s = Math.max(start, b * perBar), e = Math.min(end, (b + 1) * perBar);
      if (e - s <= 0) continue;
      const a = (s - b * perBar) / 4;
      if (a >= M.beats - EPS) continue;
      bars[b].push({ a, dur: Math.min((e - s) / 4, M.beats - a), midi, tied: s > start });
    }
  }
  return bars;
}

const LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function nameToMidi(p) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(String(p || ''));
  if (!m) return null;
  return (Number(m[3]) + 1) * 12 + LETTER[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

/** Escala major de la tonalitat (armadura en quintes; si no n'hi ha, la de la progressió). */
function keyScale(line, bars) {
  let root;
  if (line?.armadura != null && Number.isFinite(Number(line.armadura))) root = mod(7 * Number(line.armadura), 12);
  else { const k = guessKey(bars); root = k.minor ? mod(k.root + 3, 12) : k.root; }
  return { root, offsets: [0, 2, 4, 5, 7, 9, 11] };
}

/** Transposició diatònica: `steps` graus de l'escala amunt (+) o avall (−). Les notes fora de l'escala van amb la veïna de sota. */
function diatonic(midi, scale, steps) {
  let m = midi;
  let i = scale.offsets.indexOf(mod(m - scale.root, 12));
  if (i < 0) { m = midi - 1; i = scale.offsets.indexOf(mod(m - scale.root, 12)); }
  if (i < 0) return midi + (steps > 0 ? 3 : -3);
  const D = Math.floor((m - scale.root) / 12) * 7 + i + steps;
  return scale.root + Math.floor(D / 7) * 12 + scale.offsets[mod(D, 7)];
}

function fitRange(inst, midi) {
  const [lo, hi] = range(inst);
  let m = midi;
  while (m < lo) m += 12;
  while (m > hi) m -= 12;
  return m;
}

// ---- Preparar la part per a tota la progressió ------------------------------------------------------------------

/**
 * Prepara la part per a tota la progressió (les notes «properes» depenen de l'anterior, i la melodia va per compassos).
 * Torna (k) → esdeveniments del compàs k.
 */
export function preparePart(spec, instId, bars, M) {
  const inst = instrument(instId);
  const L = bars.length;
  const type = spec.type ?? 'arrels';
  const [clo, chi] = comfort(inst);
  const centre = inst.centre;

  const byBar = Array.from({ length: L }, () => []);
  const dynOf = (k, i, n) => {
    if (!spec.dyn) return undefined;
    if (spec.dyn === 'cresc') return n <= 1 ? 'f' : i < n / 3 ? 'p' : i < (2 * n) / 3 ? 'mf' : 'f';
    if (spec.dyn === 'dim') return n <= 1 ? 'p' : i < n / 3 ? 'f' : i < (2 * n) / 3 ? 'mf' : 'p';
    return spec.dyn[k % spec.dyn.length];
  };

  if (type === 'arrels' || type === 'propera' || type === 'canvi' || type === 'arp' || type === 'compose') {
    let prev = null;
    for (let k = 0; k < L; k++) {
      const bar = bars[k];
      let onsets;
      let ranks = null;
      if (type === 'arp') {
        const frases = cardById(spec.card)?.contour ?? [[0, 1, 2, 3]];
        const slot = M.beats / frases.length;
        onsets = []; ranks = [];
        frases.forEach((fr, j) => fr.forEach((r, i) => { onsets.push([j * slot + (i * slot) / fr.length, slot / fr.length]); ranks.push(r); }));
      } else if (type === 'compose') {
        const b = spec.bars[k % spec.bars.length];
        onsets = rhythmOnsets({ card: b.rhythm, rhythm: 'Q' }, M);
        const contour = (cardById(b.melodic)?.contour ?? [[0, 1, 2, 1]]).flat();
        ranks = onsets.map((_, i) => contour[i % contour.length]);
      } else onsets = rhythmOnsets(spec, M);
      if (spec.repeat > 1) onsets = onsets.flatMap(([a, d]) => Array.from({ length: spec.repeat }, (_, j) => [a + (j * d) / spec.repeat, d / spec.repeat]));
      onsets.forEach(([a, d], i) => {
        const chord = segChord(bar, a, M);
        let real = null;
        let extra = {};
        if (type === 'arrels') {
          real = nearestPc(inst, chord.root, prev ?? centre, { prefer: prev });
        } else if (type === 'propera') {
          const pcs = (spec.tones === 4 ? chord.pcs : chord.pcs.slice(0, 3));
          const tones = chordTonesInRange(inst, pcs);
          if (prev == null) {
            const want = { 1: chord.root, 3: chord.root + (chord.third ?? 4), 5: chord.root + (chord.fifth ?? 7) }[spec.start ?? 1] ?? chord.root;
            real = nearestPc(inst, want, centre);
          } else {
            const cost = (m) => Math.abs(m - prev) + (m < clo || m > chi ? 5 : 0);
            real = tones.sort((x, y) => cost(x) - cost(y))[0] ?? prev;
          }
        } else if (type === 'canvi') {
          const seq = spec.seq ?? [spec.a, spec.b];
          const n = seq[(spec.repeat > 1 ? Math.floor(i / spec.repeat) : i) % seq.length];
          real = realOfNum(inst, n);
          extra = { role: '' };
        } else {
          // arp / compose: l'escala de notes de l'acord des de la fonamental més greu de la zona còmoda
          const ladder = [];
          let r = nearestPc(inst, chord.root, clo + 2);
          if (r != null && r < clo) r += 12;
          const tones = chordTonesInRange(inst, chord.pcs.slice(0, 3));
          for (const m of tones) if (m >= r) ladder.push(m);
          const rk = ranks[i];
          real = ladder.length ? ladder[Math.min(rk, ladder.length - 1)] : r;
          if (real > chi + 2 && ladder.length) real = ladder[Math.min(rk, ladder.length - 1) % Math.max(1, ladder.length - 1)];
        }
        const e = note(inst, real, a, d, chord, { dyn: dynOf(k, i, onsets.length), ...extra });
        if (e) { byBar[k].push(e); prev = real; }
      });
    }
    return (k) => byBar[((k % L) + L) % L];
  }

  if (type === 'melodia' || type === 'segona') {
    const line = spec.line;
    const lb = line ? lineBars(line, M) : [[]];
    const scale = keyScale(line, bars);
    const n = lb.length;
    const out = (k) => {
      const which = ((k % n) + n) % n;
      const bar = bars[((k % L) + L) % L];
      const notes = lb[which];
      const shift = (m) => (type === 'segona' ? fitRange(inst, diatonic(m, scale, spec.interval ?? 2)) : m);
      let list;
      if (spec.card || spec.rhythm) {
        // el ritme de la carta: a cada cop, la nota de la melodia que sona en aquell moment
        list = [];
        rhythmOnsets(spec, M).forEach(([a, d]) => {
          const cur = notes.find((x) => a >= x.a - EPS && a < x.a + x.dur - EPS) ?? notes.filter((x) => x.a <= a + EPS).at(-1);
          if (!cur) return;
          const e = note(inst, shift(cur.midi), a, d, segChord(bar, a, M), {});
          if (e) list.push(e);
        });
      } else {
        list = notes.map((x) => note(inst, shift(x.midi), x.a, x.dur, segChord(bar, x.a, M), { tied: x.tied })).filter(Boolean);
      }
      return list.map((e, i) => ({ ...e, dyn: dynOf(k, i, list.length) }));
    };
    const cache = new Map();
    return (k) => { if (!cache.has(k)) cache.set(k, out(k)); return cache.get(k); };
  }

  return () => [];
}

/** La línia de veu (per cantar la melodia). spec: { voice: 'count' | 'count8' | 'root' | 'melody' | 'line', line } */
export function voiceBar(spec, bar, M, k = 0, partEvents = []) {
  if (!spec?.voice) return [];
  const v = spec.voice;
  if (v === 'count' || v === 'count8') {
    const names = ['u', 'dos', 'tres', 'quatre', 'cinc', 'sis'];
    const out = [];
    for (let p = 0; p < M.pulses; p++) {
      out.push({ beat: p * M.pulseLen, dur: M.pulseLen / 2, text: names[p], speak: true });
      if (v === 'count8') out.push({ beat: p * M.pulseLen + M.pulseLen / 2, dur: M.pulseLen / 2, text: 'i', speak: true });
    }
    return out;
  }
  if (v === 'root') {
    return bar.map((seg) => {
      const midi = 57 + mod(seg.chord.root - 57, 12);
      return { beat: seg.start * M.beats, dur: seg.len * M.beats - 0.1, text: 'uuu', midi, sing: true };
    });
  }
  if (v === 'line' || v === 'part') {
    // la mateixa melodia que toca el saxo, cantada amb «la» (a una altura de veu)
    return partEvents.filter((e) => !e.tied).map((e) => ({ beat: e.beat, dur: Math.max(0.2, e.dur - 0.05), midi: singable(e.midi), text: 'la', sing: true }));
  }
  if (v === 'melody') {
    const out = [];
    for (const seg of bar) {
      const r = 57 + mod(seg.chord.root - 57, 12);
      const tones = [r, r + (seg.chord.third ?? 4), r + (seg.chord.fifth ?? 7), r + (seg.chord.third ?? 4)];
      const from = seg.start * M.beats;
      const len = seg.len * M.beats;
      const step = M.pulseLen;
      for (let b = 0, j = 0; b < len - 1e-6; b += step, j++) out.push({ beat: from + b, dur: step * 0.9, midi: tones[(j + k) % tones.length], text: 'la', sing: true });
    }
    return out;
  }
  return [];
}
/** La nota a una altura que es pugui cantar (entre La2 i Sol4). */
const singable = (m) => { let x = m; while (x > 67) x -= 12; while (x < 45) x += 12; return x; };
