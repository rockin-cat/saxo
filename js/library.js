// La biblioteca compartida del Generador de diagrames (https://rockin-cat.github.io/Generador-diagrames/):
// les cançons que el professorat hi comparteix. El mateix codi que els jocs de teclat i bateria.

import { parseChord, progressionText } from './theory.js';

export const LIBRARY_URL = 'https://script.google.com/macros/s/AKfycbw2lhxNhxvT2EJGhQhpFlOAhT3M_RIrqN_tDQS0oChLULzyeX5dOP_HZLehm6SfXeWS/exec';
const CODE_KEY = 'rockin.play.biblio.codi';

export function savedCode() { try { return localStorage.getItem(CODE_KEY) ?? ''; } catch { return ''; } }
export function saveCode(code) { try { if (code) localStorage.setItem(CODE_KEY, code); else localStorage.removeItem(CODE_KEY); } catch { /* */ } }

async function ask(params) {
  let json;
  try {
    const res = await fetch(`${LIBRARY_URL}?${new URLSearchParams(params)}`);
    json = await res.json();
  } catch { throw new Error('xarxa'); }
  if (!json.ok) { if (json.error === 'codi') saveCode(''); throw new Error(json.error || 'error'); }
  return json;
}

export async function listLibrary(code) {
  const json = await ask({ codi: code });
  return (json.llista ?? []).slice().sort((a, b) => String(b.data).localeCompare(String(a.data)));
}
export async function loadLibrarySong(code, id) { return (await ask({ codi: code, id })).canco; }

export function errorText(error) {
  return {
    codi: 'El codi del professorat no és correcte.',
    'no-trobada': 'Aquesta cançó ja no és a la biblioteca.',
    format: 'Aquesta cançó no té acords que el joc pugui tocar.',
    xarxa: 'No s\'ha pogut connectar amb la biblioteca. Comprova la connexió a internet.',
  }[error?.message] ?? 'No s\'ha pogut obrir la biblioteca.';
}

const ok = (t) => { const c = parseChord(String(t ?? '').trim()); return c ? c.symbol : null; };

/** Un compàs del Generador ({ div, cells }) → «C» o «C G» (si canvia a mig compàs). */
function barText(bar) {
  const cells = (Array.isArray(bar?.cells) ? bar.cells : []).map(ok);
  if (!cells.some(Boolean)) return null;
  // omplim els buits amb l'acord anterior
  let last = null;
  const filled = cells.map((c) => (last = c ?? last));
  const half = Math.ceil(filled.length / 2);
  const a = filled.slice(0, half).find(Boolean) ?? filled.find(Boolean);
  const b = filled.slice(half).reverse().find(Boolean) ?? a;
  const firstHalf = new Set(filled.slice(0, half).filter(Boolean));
  const secondHalf = new Set(filled.slice(half).filter(Boolean));
  if (firstHalf.size <= 1 && secondHalf.size <= 1 && a !== b && filled.length > 1) return `${a} ${filled.slice(half).find(Boolean)}`;
  return filled.find(Boolean);
}

/**
 * Les línies de baix d'una cançó del Generador (escriptor de baix «melbaix» o tabulatura antiga).
 * Torna [{ nom, compas, compassos, notes: [{ d (semicorxeres), corda: 'e'|'a'|'d'|'g', trast } | { d, silenci }] }].
 */
export function bassLines(items) {
  const out = [];
  for (const it of Array.isArray(items) ? items : []) {
    if (it?.inst !== 'baix') continue;
    if (it.tipus === 'melbaix' && Array.isArray(it.notes) && it.notes.some((n) => !n.silenci)) {
      out.push({ nom: it.nom || `Línia ${out.length + 1}`, compas: it.compas || '4/4', compassos: Number(it.compassos) || 1, notes: it.notes.map((n) => (n.silenci || n.corda === undefined ? { d: n.d, silenci: true } : { d: n.d, corda: String(n.corda).toLowerCase(), trast: Number(n.trast) })) });
    } else if (it.tipus === 'tab') {
      // tabulatura antiga: totes les notes amb la mateixa figura
      const d = { negra: 4, blanca: 8, rodona: 16, cap: 4 }[it.figura] || 4;
      const cols = new Map();
      for (const c of ['g', 'd', 'a', 'e']) {
        const re = /\d+/g; let m;
        while ((m = re.exec(String(it[c] || '')))) if (!cols.has(m.index)) cols.set(m.index, { d, corda: c, trast: Number(m[0]) });
      }
      const notes = [...cols.entries()].sort((a, b) => a[0] - b[0]).map(([, n]) => n);
      if (notes.length) out.push({ nom: it.nom || `Línia ${out.length + 1}`, compas: '4/4', compassos: Math.max(1, Math.ceil((notes.length * d) / 16)), notes });
    }
  }
  return out;
}

/**
 * Les melodies de saxo d'una cançó del Generador (escriptor de melodia amb l'instrument Saxo).
 * Torna [{ nom, saxo: 'alt' | 'tenor', compas, compassos, notes: [{ d (semicorxeres), p (nota real o null) }], armadura }].
 */
export function saxLines(items) {
  const out = [];
  for (const it of Array.isArray(items) ? items : []) {
    if (it?.inst !== 'saxo' || it.tipus !== 'melodia' || !Array.isArray(it.notes) || !it.notes.some((n) => n.p)) continue;
    out.push({ nom: it.nom || `Melodia ${out.length + 1}`, saxo: it.saxo === 'tenor' ? 'tenor' : 'alt', compas: it.compas || '4/4', compassos: Number(it.compassos) || 1, notes: it.notes.map((n) => ({ d: Number(n.d) || 0, p: n.p || null })), armadura: Number(it.armadura) || 0 });
  }
  return out;
}

/** Una cançó del Generador → { titol, prog, metre, tempo, estil, saxo }. */
export function songFromLibrary(song, entry) {
  const est = song?.estructura ?? {};
  const parts = [];
  for (const part of est.parts ?? []) {
    let bars = Array.isArray(part.compassos) && part.compassos.length ? part.compassos.map(barText).filter(Boolean) : [];
    if (!bars.length) bars = String(part.acords ?? '').split('|').map((ch) => ch.split(/[\s,]+/).map(ok).filter(Boolean)[0]).filter(Boolean);
    if (bars.length) parts.push({ name: String(part.nom ?? '').replace(/^PART\s+/i, '').trim() || 'A', bars });
  }
  let order = [];
  const wanted = String(est.ordre ?? '').split(/[–\-—>,]+/).map((s) => s.trim()).filter(Boolean);
  for (const w of wanted) {
    const hit = parts.find((p) => p.name.toLowerCase() === w.toLowerCase()) ?? parts.find((p) => p.name.toLowerCase().startsWith(w.toLowerCase()));
    if (hit) order.push(hit);
  }
  if (!order.length) order = parts;
  let prog = order.length > 1 || (order[0] && order[0].name !== 'A') ? progressionText(order.map((p) => ({ name: p.name, bars: p.bars.slice(0, 64) }))) : order.flatMap((p) => p.bars).join(' | ');
  if (!prog) prog = String(song?.acords ?? '').split(/[\s,|]+/).map(ok).filter(Boolean).join(' | ');
  if (!prog) throw new Error('format');
  const temps = String(est.temps ?? '4');
  const metre = { 3: '3/4', 2: '2/4', 6: '6/8' }[temps] ?? '4/4';
  const text = String(est.estil ?? '').toLowerCase();
  const words = [['reggaeton', 'reggaeton'], ['funk', 'funk'], ['reggae', 'reggae'], ['rumba', 'rumba'], ['blues', 'shuffle'], ['shuffle', 'shuffle'], ['balada', 'balada'], ['rock', 'rock'], ['pop', 'pop'], ['vals', 'vals']];
  let estil = null;
  for (const [w, id] of words) if (text.includes(w)) { estil = id; break; }
  return {
    titol: song?.titol || entry?.titol || entry?.nom || 'Cançó de la biblioteca',
    artista: song?.artista || entry?.artista || '',
    prog,
    metre,
    tempo: Math.max(40, Math.min(200, parseInt(est.tempo, 10) || 90)),
    estil,
    saxo: saxLines(song?.items),
  };
}
