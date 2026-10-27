// La banda que acompanya: bateria, baix, teclat i guitarra.
// Quan toques la guitarra, la guitarra de la banda calla; quan toques el baix, calla el baix.
// Cada estil diu què toca cada instrument en un compàs, a partir de l'acord.
// Els temps es compten en negres des de l'inici del compàs.

import { mod, chordAt } from './theory.js';

export const STYLES = {
  pop: { nom: 'Pop', metres: ['4/4', '2/4'] },
  rock: { nom: 'Rock', metres: ['4/4', '2/4'] },
  balada: { nom: 'Balada', metres: ['4/4'] },
  funk: { nom: 'Funk', metres: ['4/4'] },
  reggaeton: { nom: 'Reggaeton', metres: ['4/4'] },
  reggae: { nom: 'Reggae', metres: ['4/4'] },
  rumba: { nom: 'Rumba', metres: ['4/4', '2/4'] },
  shuffle: { nom: 'Blues shuffle', metres: ['4/4'] },
  vals: { nom: 'Vals', metres: ['3/4'] },
  balada3: { nom: 'Balada en 3', metres: ['3/4'] },
  balada68: { nom: 'Balada en 6/8', metres: ['6/8', '12/8'] },
  rock68: { nom: 'Rock en 6/8', metres: ['6/8', '12/8'] },
  metronom: { nom: 'Només metrònom', metres: ['4/4', '3/4', '2/4', '6/8', '12/8'] },
};
export const stylesFor = (metreId) => Object.entries(STYLES).filter(([, s]) => s.metres.includes(metreId)).map(([id, s]) => ({ id, ...s }));
export const defaultStyle = (metreId) => ({ '3/4': 'vals', '6/8': 'balada68', '12/8': 'balada68' }[metreId] ?? 'pop');

// ---- Veus ---------------------------------------------------------------------------------------------------
const inRange = (pc, low) => low + mod(pc - low, 12);
const bassR = (c) => inRange(c.root, 28);
const bass5 = (c) => bassR(c) + (c.fifth ?? 7);
const bass3 = (c) => bassR(c) + (c.third ?? 4);

function keys(c, sevenths = false) {
  const pcs = [c.root, c.root + (c.third ?? 4), c.root + (c.fifth ?? 7)];
  if (sevenths && c.intervals.some((i) => i === 10 || i === 11)) pcs.push(c.root + c.intervals.find((i) => i === 10 || i === 11));
  let best = null;
  for (let r = 0; r < pcs.length; r++) {
    const rot = [...pcs.slice(r), ...pcs.slice(0, r)];
    const notes = [];
    let low = 55;
    for (const pc of rot) { const n = inRange(mod(pc, 12), low); notes.push(n); low = n + 1; }
    const centre = notes.reduce((a, b) => a + b, 0) / notes.length;
    if (!best || Math.abs(centre - 64) < best.d) best = { notes, d: Math.abs(centre - 64) };
  }
  return best.notes;
}
const power = (c) => { const r = inRange(c.root, 40); return [r, r + 7, r + 12]; };
const strum = (c) => { const r = inRange(c.root, 40); return [r, r + 7, r + 12, r + 12 + (c.third ?? 4), r + 19]; };

const ev = (inst, beat, dur, notes, gain, extra = {}) => ({ inst, beat, dur, notes: Array.isArray(notes) ? notes : [notes], gain, ...extra });
const dr = (piece, beats, vel = 1) => beats.map((b) => ({ inst: 'drum', piece, beat: b, vel }));
const range = (n, step, from = 0) => Array.from({ length: n }, (_, i) => from + i * step);

// Cada estil: (c = acord, at = acord a cada temps, M = compàs) → esdeveniments.
// `fam`: 'drums' | 'bass' | 'keys' | 'gtr' (per treure l'instrument que toca l'alumnat).
const STYLE = {
  pop(c, M) {
    const B = M.beats;
    return [
      ...dr('hh', range(B * 2, 0.5), 0.8), ...dr('sn', [1, 3].filter((b) => b < B)), ...dr('kk', [0, 1.5, 2].filter((b) => b < B)),
      ...[[0, 1.4, bassR, 0.6], [1.5, 0.45, bassR, 0.45], [2, 0.9, bassR, 0.55], [3, 0.45, bass5, 0.45], [3.5, 0.45, (x) => bassR(x) + 12, 0.4]]
        .filter(([b]) => b < B).map(([b, d, f, g]) => ev('baix', b, d, f(c), g, { fam: 'bass' })),
      ev('rhodes', 0, B - 0.1, keys(c), 0.09, { fam: 'keys' }),
      ...[[0, 1, 1], [1, 0.5, 1], [1.5, 0.5, -1], [2.5, 0.5, -1], [3, 0.5, 1], [3.5, 0.45, -1]].filter(([b]) => b < B)
        .map(([b, d, dir]) => ev('acustica', b, d, dir > 0 ? strum(c) : strum(c).slice(1).reverse(), dir > 0 ? 0.2 : 0.13, { strum: 0.012, fam: 'gtr' })),
    ];
  },
  rock(c, M) {
    const B = M.beats;
    const e = range(B * 2, 0.5);
    return [
      ...dr('hh', e, 0.85), ...dr('sn', [1, 3].filter((b) => b < B)), ...dr('kk', [0, 2, 2.5].filter((b) => b < B)), ...dr('crash', []),
      ...e.map((b) => ev('baix', b, 0.42, bassR(c), b % 1 ? 0.42 : 0.55, { fam: 'bass' })),
      ...e.map((b) => ev('guitarra_dist', b, 0.3, power(c), b % 1 ? 0.12 : 0.15, { strum: 0.006, fam: 'gtr' })),
      ev('rhodes', 0, B - 0.1, keys(c), 0.05, { fam: 'keys' }),
    ];
  },
  balada(c) {
    const k = keys(c);
    return [
      ...dr('hh', [0, 1, 2, 3], 0.6), ...dr('stick', [1, 3], 0.8), ...dr('kk', [0, 2.5]),
      ev('baix', 0, 1.9, bassR(c), 0.55, { fam: 'bass' }), ev('baix', 2, 1.4, bassR(c), 0.5, { fam: 'bass' }), ev('baix', 3.5, 0.45, bass5(c), 0.4, { fam: 'bass' }),
      ev('rhodes', 0, 3.9, k, 0.1, { fam: 'keys' }),
      ...range(8, 0.5).map((b, i) => ev('acustica', b, 0.6, strum(c)[[0, 2, 3, 4, 1, 3, 2, 4][i]], 0.13, { fam: 'gtr' })),
    ];
  },
  funk(c) {
    const r = bassR(c);
    return [
      ...dr('hh', range(16, 0.25), 0.5), ...dr('sn', [1, 3]), ...dr('ghost', [1.75, 3.25], 0.4), ...dr('kk', [0, 0.75, 2.5]),
      ...[[0, 0.3, r, 0.65], [0.75, 0.2, r + 12, 0.45], [1.5, 0.2, r, 0.5], [2, 0.4, r, 0.6], [2.75, 0.2, r + 10, 0.45], [3, 0.2, r, 0.5], [3.5, 0.2, r + 7, 0.5]]
        .map(([b, d, n, g]) => ev('baix', b, d, n, g, { fam: 'bass' })),
      ...[0.5, 1.75, 2.5, 3.75].map((b) => ev('rhodes', b, 0.18, keys(c, true), 0.17, { fam: 'keys' })),
      ...range(16, 0.25).filter((b, i) => i % 2 === 1 || i % 4 === 0).map((b, i) => ev('guitarra', b, 0.08, strum(c).slice(2), i % 3 ? 0.05 : 0.12, { strum: 0.004, fam: 'gtr' })),
    ];
  },
  reggaeton(c) {
    const r = bassR(c);
    return [
      ...dr('kk', [0, 1, 2, 3]), ...dr('sn', [0.75, 1.5, 2.75, 3.5], 0.8), ...dr('hh', range(8, 0.5), 0.5),
      ev('baix', 0, 1.4, r, 0.65, { fam: 'bass' }), ev('baix', 1.5, 0.4, r, 0.5, { fam: 'bass' }), ev('baix', 2, 1.4, r, 0.6, { fam: 'bass' }), ev('baix', 3.5, 0.4, r + 7, 0.5, { fam: 'bass' }),
      ...[0, 0.75, 1.5, 2, 2.75, 3.5].map((b) => ev('rhodes', b, 0.22, keys(c), 0.12, { fam: 'keys' })),
      ...[0.75, 1.5, 2.75, 3.5].map((b) => ev('acustica', b, 0.15, strum(c).slice(2), 0.12, { strum: 0.005, fam: 'gtr' })),
    ];
  },
  reggae(c) {
    const r = bassR(c);
    return [
      ...dr('hh', range(8, 0.5), 0.6), ...dr('stick', [2]), ...dr('kk', [2]),
      ev('baix', 0, 0.9, r, 0.6, { fam: 'bass' }), ev('baix', 1.5, 0.4, r, 0.45, { fam: 'bass' }), ev('baix', 2, 0.6, r + 7, 0.55, { fam: 'bass' }), ev('baix', 3, 0.4, r + 12, 0.5, { fam: 'bass' }), ev('baix', 3.5, 0.4, r + 10, 0.45, { fam: 'bass' }),
      ...[0.5, 1.5, 2.5, 3.5].map((b) => ev('rhodes', b, 0.15, keys(c), 0.12, { fam: 'keys' })),
      ...[0.5, 1.5, 2.5, 3.5].map((b) => ev('guitarra', b, 0.1, strum(c).slice(2), 0.16, { strum: 0.004, fam: 'gtr' })),
    ];
  },
  rumba(c, M) {
    const r = bassR(c);
    const down = strum(c);
    const up = strum(c).slice(1).reverse();
    const B = M.beats;
    return [
      ...dr('kk', [0, 1.5, 2, 3.5].filter((b) => b < B)), ...dr('stick', [1, 3].filter((b) => b < B), 0.8), ...dr('hh', range(B * 2, 0.5), 0.4),
      ...[[0, 0.9, r], [1.5, 0.4, r + 7], [2, 0.9, r], [3.5, 0.4, r + 7]].filter(([b]) => b < B).map(([b, d, n]) => ev('baix', b, d, n, 0.55, { fam: 'bass' })),
      ...range(B, 1).flatMap((b) => [
        ev('acustica', b, 0.3, down, 0.22, { strum: 0.01, fam: 'gtr' }),
        ev('acustica', b + 0.5, 0.06, down.slice(2), 0.1, { strum: 0.004, fam: 'gtr' }),
        ev('acustica', b + 0.75, 0.2, up, 0.12, { strum: 0.008, fam: 'gtr' }),
      ]),
      ev('rhodes', 0, B - 0.1, keys(c), 0.05, { fam: 'keys' }),
    ];
  },
  shuffle(c) {
    const r = bassR(c);
    const walk = [r, r + (c.third ?? 4), r + 7, r + 9];
    const sw = [0, 1, 2, 3].flatMap((b) => [b, b + 2 / 3]);
    return [
      ...dr('hh', sw, 0.7), ...dr('sn', [1, 3]), ...dr('kk', [0, 2]),
      ...[0, 1, 2, 3].flatMap((b) => [ev('baix', b, 0.6, walk[b], 0.6, { fam: 'bass' }), ev('baix', b + 2 / 3, 0.3, walk[b], 0.4, { fam: 'bass' })]),
      ...[1, 3].map((b) => ev('rhodes', b, 0.5, keys({ ...c, intervals: [...c.intervals, 10] }, true), 0.12, { fam: 'keys' })),
      ...[0, 1, 2, 3].flatMap((b) => { const p = inRange(c.root, 40); return [ev('guitarra', b, 0.5, [p, p + 7], 0.14, { fam: 'gtr' }), ev('guitarra', b + 2 / 3, 0.3, [p, p + (b % 2 ? 9 : 7)], 0.1, { fam: 'gtr' })]; }),
    ];
  },
  vals(c) {
    return [
      ...dr('kk', [0]), ...dr('hh', [1, 2], 0.6), ...dr('stick', [1, 2], 0.5),
      ev('baix', 0, 0.9, bassR(c), 0.6, { fam: 'bass' }), ev('baix', 2, 0.9, bass5(c), 0.45, { fam: 'bass' }),
      ev('rhodes', 1, 0.6, keys(c), 0.12, { fam: 'keys' }), ev('rhodes', 2, 0.6, keys(c), 0.1, { fam: 'keys' }),
      ev('acustica', 0, 0.8, strum(c)[0], 0.2, { fam: 'gtr' }), ev('acustica', 1, 0.5, strum(c).slice(2), 0.14, { strum: 0.008, fam: 'gtr' }), ev('acustica', 2, 0.5, strum(c).slice(2), 0.12, { strum: 0.008, fam: 'gtr' }),
    ];
  },
  balada3(c) {
    const s = strum(c);
    return [
      ...dr('kk', [0]), ...dr('hh', [0, 1, 2], 0.5), ...dr('stick', [2], 0.6),
      ev('baix', 0, 2.8, bassR(c), 0.55, { fam: 'bass' }),
      ev('rhodes', 0, 2.9, keys(c), 0.09, { fam: 'keys' }),
      ...range(6, 0.5).map((b, i) => ev('acustica', b, 0.6, s[[0, 2, 3, 4, 3, 2][i]], 0.13, { fam: 'gtr' })),
    ];
  },
  balada68(c, M) {
    const P = M.pulses;
    const s = strum(c);
    const k = keys(c);
    return [
      ...dr('hh', range(P * 3, 0.5), 0.55), ...dr('kk', range(P, 1.5).filter((_, i) => i % 2 === 0)), ...dr('stick', range(P, 1.5).filter((_, i) => i % 2 === 1), 0.8),
      ...range(P, 1.5).filter((_, i) => i % 2 === 0).map((b) => ev('baix', b, 1.4, bassR(c), 0.55, { fam: 'bass' })),
      ...range(P, 1.5).filter((_, i) => i % 2 === 1).map((b) => ev('baix', b, 1.4, bass5(c), 0.45, { fam: 'bass' })),
      ...range(P * 3, 0.5).map((b, i) => ev('rhodes', b, 0.55, k[[0, 1, 2][i % 3]] + (i % 3 === 2 ? 0 : 0), 0.08, { fam: 'keys' })),
      ...range(P * 3, 0.5).map((b, i) => ev('acustica', b, 0.6, s[[0, 3, 4, 2, 3, 4][i % 6]], 0.12, { fam: 'gtr' })),
    ];
  },
  rock68(c, M) {
    const P = M.pulses;
    const e = range(P * 3, 0.5);
    return [
      ...dr('hh', e, 0.7), ...dr('kk', range(P, 1.5).filter((_, i) => i % 2 === 0).flatMap((b) => [b, b + 1])), ...dr('sn', range(P, 1.5).filter((_, i) => i % 2 === 1)),
      ...e.map((b, i) => ev('baix', b, 0.42, bassR(c), i % 3 ? 0.42 : 0.55, { fam: 'bass' })),
      ...range(P, 1.5).map((b) => ev('guitarra_dist', b, 1.3, power(c), 0.15, { strum: 0.008, fam: 'gtr' })),
      ev('rhodes', 0, M.beats - 0.1, keys(c), 0.06, { fam: 'keys' }),
    ];
  },
  metronom() { return []; },
};

/** Mostres que fa servir la banda. */
export const BAND_SETS = ['bateria', 'baix', 'rhodes', 'acustica', 'guitarra', 'guitarra_dist'];

/**
 * Els esdeveniments de la banda d'un compàs. `bar` és la llista de segments [{chord, start, len}].
 * `without`: 'gtr' o 'bass' (l'instrument que toca l'alumnat).
 */
export function bandBar(styleId, bar, M, without) {
  const fn = STYLE[styleId] ?? STYLE.pop;
  const out = [];
  // Si el compàs té dos acords, cada meitat fa servir el seu (els esdeveniments es filtren per temps).
  for (const seg of bar) {
    const from = seg.start * M.beats;
    const to = (seg.start + seg.len) * M.beats;
    for (const e of fn(seg.chord, M)) {
      if (e.beat < from - 1e-6 || e.beat >= to - 1e-6) continue;
      if (e.fam === without) continue;
      out.push(e.dur ? { ...e, dur: Math.min(e.dur, to - e.beat) } : e);
    }
  }
  return out;
}

/** Clics de metrònom d'un compàs (a cada pulsació; el primer accentuat). */
export const clicksBar = (M) => range(M.pulses, M.pulseLen).map((b, i) => ({ inst: 'click', beat: b, accent: i === 0 }));

export { chordAt };
