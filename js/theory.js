// Teoria: acords, progressions i compassos.

export const mod = (n, m) => ((n % m) + m) % m;

const LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const SOLFA = ['Do', 'Do#', 'Re', 'Mi♭', 'Mi', 'Fa', 'Fa#', 'Sol', 'La♭', 'La', 'Si♭', 'Si'];
export const pcName = (pc) => SHARP[mod(pc, 12)];
export const solfa = (pc) => SOLFA[mod(pc, 12)];
export const midiName = (m) => `${SHARP[mod(m, 12)]}${Math.floor(m / 12) - 1}`;

// Intervals de cada tipus d'acord (des de la fonamental). `q` és el nom curt que fan servir les posicions.
const TYPES = [
  [/^(maj7|M7|Δ7?|ma7)$/, 'maj7', [0, 4, 7, 11]],
  [/^(m7b5|ø7?|-7b5)$/, 'm7b5', [0, 3, 6, 10]],
  [/^(dim7?|°7?|º7?|o7?)$/, 'dim', [0, 3, 6]],
  [/^(m7|min7|-7)$/, 'm7', [0, 3, 7, 10]],
  [/^(m|min|-)$/, 'm', [0, 3, 7]],
  [/^7sus4$/, '7sus4', [0, 5, 7, 10]],
  [/^(sus4?|4)$/, 'sus4', [0, 5, 7]],
  [/^(sus2|2)$/, 'sus2', [0, 2, 7]],
  [/^(aug|\+)$/, 'aug', [0, 4, 8]],
  [/^5$/, '5', [0, 7]],
  [/^7$/, '7', [0, 4, 7, 10]],
  [/^(6)$/, '6', [0, 4, 7, 9]],
  [/^(m6|-6)$/, 'm6', [0, 3, 7, 9]],
  [/^(add9|9)$/, 'add9', [0, 4, 7, 14]],
  [/^(M|maj)?$/, '', [0, 4, 7]],
];
const SUFFIX = { '': '', m: 'm', 7: '7', m7: 'm7', maj7: 'maj7', sus2: 'sus2', sus4: 'sus4', '7sus4': '7sus4', dim: 'dim', m7b5: 'm7b5', aug: 'aug', 5: '5', 6: '6', m6: 'm6', add9: 'add9' };

/**
 * Llegeix un acord com l'escriu el professorat ("C", "Am", "D-", "F#m7", "Bº", "A5", "G/B").
 * Torna { symbol, root, q, intervals, pcs, third, bass } o null.
 */
export function parseChord(text) {
  const t = String(text ?? '').trim().replace(/♯/g, '#').replace(/♭/g, 'b');
  const m = /^([A-Ga-g])([#b]?)([^/]*)(?:\/([A-Ga-g])([#b]?))?$/.exec(t);
  if (!m) return null;
  const root = mod(LETTER[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0), 12);
  const rest = m[3].trim();
  const type = TYPES.find(([re]) => re.test(rest));
  if (!type) return null;
  const [, q, intervals] = type;
  const bass = m[4] ? mod(LETTER[m[4].toUpperCase()] + (m[5] === '#' ? 1 : m[5] === 'b' ? -1 : 0), 12) : root;
  const name = m[1].toUpperCase() + m[2];
  const third = intervals.includes(3) ? 3 : intervals.includes(4) ? 4 : null;
  return {
    symbol: name + SUFFIX[q] + (m[4] ? `/${m[4].toUpperCase()}${m[5]}` : ''),
    root, q, intervals,
    pcs: intervals.map((i) => mod(root + i, 12)),
    third,
    fifth: intervals.includes(6) ? 6 : intervals.includes(8) ? 8 : 7,
    minor: third === 3,
    bass,
  };
}

/**
 * Una progressió escrita: compassos separats per «|», salts de línia o comes.
 * Dins d'un compàs hi pot haver dos acords («C G»): cadascun ocupa la meitat.
 * «%» repeteix el compàs anterior. «[Tornada]» davant d'un compàs posa nom a la part que hi comença.
 * Torna { bars: [[{chord, start(0–1), len}]], errors }; un compàs pot portar `.part` (nom de la part).
 */
export function parseProgression(text) {
  const errors = [];
  const bars = [];
  let label = null;
  const raw = String(text ?? '').replace(/\n+/g, '|').split('|').map((s) => s.trim()).filter(Boolean);
  for (let cell of raw) {
    const m = /^\[([^\]]+)\]\s*/.exec(cell);
    if (m) { label = m[1].trim(); cell = cell.slice(m[0].length).trim(); }
    if (!cell) continue;
    let bar = null;
    if (cell === '%') {
      if (bars.length) bar = bars.at(-1).map((seg) => ({ ...seg }));
    } else {
      const tokens = cell.split(/[\s,]+/).filter(Boolean);
      const chords = [];
      for (const tk of tokens) {
        if (tk === '/' || tk === '-') { if (chords.length) chords.push(chords.at(-1)); continue; }
        const c = parseChord(tk);
        if (c) chords.push(c); else errors.push(tk);
      }
      if (chords.length) bar = chords.map((chord, i) => ({ chord, start: i / chords.length, len: 1 / chords.length }));
    }
    if (!bar) continue;
    if (label) { bar.part = label; label = null; }
    bars.push(bar);
  }
  return { bars, errors };
}

/** Text d'una progressió amb parts: [{ name, bars: ['C', 'G'…] }] → «[A] C | G | … | [B] …». */
export const progressionText = (parts) => parts.map((p) => p.bars.map((b, i) => (i === 0 && p.name ? `[${p.name}] ${b}` : b)).join(' | ')).join(' | ');

/** L'acord que sona a la posició `x` (0–1) d'un compàs. */
export const chordAt = (bar, x) => (bar.find((s) => x >= s.start - 1e-6 && x < s.start + s.len - 1e-6) ?? bar.at(-1)).chord;

// ---- Compassos ---------------------------------------------------------------------------------------------
// beats: durada del compàs en negres · pulses: pulsacions que es compten · pulseLen: durada de la pulsació en negres
export const METRES = {
  '4/4': { id: '4/4', beats: 4, pulses: 4, pulseLen: 1, sub: 2, nom: '4/4 (quatre temps)' },
  '3/4': { id: '3/4', beats: 3, pulses: 3, pulseLen: 1, sub: 2, nom: '3/4 (tres temps, vals)' },
  '2/4': { id: '2/4', beats: 2, pulses: 2, pulseLen: 1, sub: 2, nom: '2/4 (dos temps)' },
  '6/8': { id: '6/8', beats: 3, pulses: 2, pulseLen: 1.5, sub: 3, nom: '6/8 (dues pulsacions en tres)' },
  '12/8': { id: '12/8', beats: 6, pulses: 4, pulseLen: 1.5, sub: 3, nom: '12/8 (quatre pulsacions en tres)' },
};
export const metre = (id) => METRES[id] ?? METRES['4/4'];

/** Tonalitat probable d'una progressió: el primer acord mana. */
export function guessKey(bars) {
  const c = bars[0]?.[0]?.chord;
  if (!c) return { root: 9, minor: true };
  return { root: c.root, minor: !!c.minor };
}

/** Pentatònica (menor o major) d'una tonalitat. */
export const pentatonic = (key) => (key.minor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9]).map((i) => mod(key.root + i, 12));

/** El tros d'una cançó per practicar: la primera part que no és la intro (com a molt 8 compassos). */
export function practicePart(text) {
  const { bars } = parseProgression(text);
  if (!bars.length) return text;
  const starts = bars.map((b, i) => (b.part || i === 0 ? i : -1)).filter((i) => i >= 0);
  let from = 0;
  for (const i of starts) if (!/^intro/i.test(bars[i].part ?? '')) { from = i; break; }
  let to = bars.findIndex((b, i) => i > from && b.part);
  if (to < 0) to = bars.length;
  const slice = bars.slice(from, Math.min(to, from + 8));
  return slice.map((b, i) => `${i === 0 && b.part ? `[${b.part}] ` : ''}${b.map((sg) => sg.chord.symbol).join(' ')}`).join(' | ');
}
