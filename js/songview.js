// L'estructura d'una cançó com al Generador de diagrames: els graus de la tonalitat amb els colors del llibre,
// i cada part amb la capçalera taronja i els compassos en files de quatre.

import { parseProgression, mod } from './theory.js';

const COLORS_GRAU = ['#ff1a1a', '#ffc000', '#ffff00', '#00e600', '#4d4dff', '#a347e0', '#ff4da6'];
const NOTES_SOST = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_BEM = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const NOM_CAT = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };
const MODES = {
  major: { st: [0, 2, 4, 5, 7, 9, 11], q: ['', 'm', 'm', '', '', 'm', 'dim'], rom: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'], rel: (i) => i },
  menor: { st: [0, 2, 3, 5, 7, 8, 10], q: ['m', 'dim', '', 'm', 'm', '', ''], rom: ['i', 'iiº', 'III', 'iv', 'v', 'VI', 'VII'], rel: (i) => (i + 5) % 7 },
};
const flats = (t, mode) => [5, 10, 3, 8, 1, 6].includes(mode === 'menor' ? (t + 3) % 12 : t);

/** La tonalitat més probable (el mateix càlcul que el Generador). */
export function detectKey(chords) {
  const ac = chords.map((c) => ({ semi: c.root, qual: c.q === 'dim' || c.q === 'm7b5' ? 'dim' : c.minor ? 'min' : c.q === '5' ? '5' : 'maj' }));
  if (!ac.length) return null;
  let best = null;
  for (const mode of ['major', 'menor']) {
    for (let t = 0; t < 12; t++) {
      const M = MODES[mode];
      let pts = 0;
      ac.forEach((a, k) => {
        const i = M.st.findIndex((s) => (t + s) % 12 === a.semi);
        if (i < 0) { pts -= 1; return; }
        pts += 1;
        const q = M.q[i] === 'm' ? 'min' : M.q[i] === 'dim' ? 'dim' : 'maj';
        if (a.qual === q || a.qual === '5') pts += 1;
        if (i === 0 && (k === 0 || k === ac.length - 1)) pts += 1.2;
      });
      if (!best || pts > best.pts) best = { tonica: t, mode, pts };
    }
  }
  return best;
}

export function degrees(key) {
  if (!key) return [];
  const M = MODES[key.mode];
  const bem = flats(key.tonica, key.mode);
  return M.st.map((st, i) => {
    const semi = (key.tonica + st) % 12;
    return { semi, nom: (bem ? NOTES_BEM : NOTES_SOST)[semi] + M.q[i], rom: M.rom[i], color: COLORS_GRAU[M.rel(i)] };
  });
}
export const keyName = (key) => {
  if (!key) return '';
  const n = (flats(key.tonica, key.mode) ? NOTES_BEM : NOTES_SOST)[key.tonica];
  return `${NOM_CAT[n[0]]}${n[1] === '#' ? '♯' : n[1] === 'b' ? '♭' : ''} ${key.mode}`;
};
const colorOf = (chord, degs) => degs.find((d) => d.semi === mod(chord.root, 12))?.color ?? '#e6e6e6';

/** Parts d'una progressió amb «[Nom]»: { parts: [{ nom, bars }], ordre: ['Intro', 'A', …] }. Les parts repetides es mostren un cop. */
export function songParts(prog) {
  const { bars } = parseProgression(prog);
  const runs = [];
  for (const b of bars) {
    if (b.part || !runs.length) runs.push({ nom: b.part ?? 'Roda', bars: [] });
    runs.at(-1).bars.push(b);
  }
  const sig = (r) => r.bars.map((b) => b.map((s) => s.chord.symbol).join(' ')).join('|');
  const parts = [];
  const ordre = [];
  for (const r of runs) {
    let p = parts.find((x) => x.nom === r.nom && sig(x) === sig(r));
    if (!p) {
      let nom = r.nom;
      if (parts.some((x) => x.nom === nom)) nom = `${nom} ${parts.filter((x) => x.nom.startsWith(r.nom)).length + 1}`;
      p = { nom, bars: r.bars };
      parts.push(p);
    }
    ordre.push(p.nom);
  }
  return { parts, ordre, bars };
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** HTML de l'estructura, com a la pestanya «Estructura» del Generador. */
export function structureHtml(song, { compact = false } = {}) {
  const { parts, ordre, bars } = songParts(song.prog);
  if (!bars.length) return '<p class="muted">Encara no hi ha acords.</p>';
  const key = detectKey(bars.flatMap((b) => b.map((s) => s.chord)));
  const degs = degrees(key);
  const bar = (b) => `<span class="cmp-bar">${b.map((s) => `<i style="flex:${s.len};background:${colorOf(s.chord, degs)}">${esc(s.chord.symbol.replace(/^([A-G][#b]?)m(?!aj)/, '$1-'))}</i>`).join('')}</span>`;
  const shown = compact ? parts.slice(0, 2) : parts;
  return `
    <div class="est-graus">${degs.map((d) => `<span class="est-grau" style="background:${d.color}"><small>${d.rom}</small>${esc(d.nom.replace(/^([A-G][#b]?)m$/, '$1-'))}</span>`).join('')}<span class="est-to">${esc(keyName(key))}</span></div>
    ${ordre.length > 1 ? `<p class="est-ordre"><b>Ordre:</b> ${ordre.map(esc).join(' – ')}</p>` : ''}
    ${shown.map((p) => `<div class="est-part"><div class="est-part-cap">${esc(p.nom.toUpperCase())}<small>${p.bars.length} compassos</small></div><div class="cmp-graella">${p.bars.map(bar).join('')}</div></div>`).join('')}
    ${compact && parts.length > shown.length ? `<p class="muted small">+ ${parts.length - shown.length} parts més</p>` : ''}`;
}
