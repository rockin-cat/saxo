// Què es guarda al navegador: qui toca, com li ha anat cada pas, les seves cançons i la configuració.
// Si el navegador no deixa guardar (mode privat), el joc funciona igual i només s'oblida en tancar.

const KEY = 'rockin.saxo.v1';
const blank = () => ({ players: {}, current: null, settings: { metronome: false, guide: 0, nextLead: 2 } });

let data = blank();
try {
  const raw = localStorage.getItem(KEY);
  if (raw) data = { ...blank(), ...JSON.parse(raw) };
  data.settings = { ...blank().settings, ...(data.settings ?? {}) };
} catch {
  data = blank();
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* sense lloc on guardar */ }
}

export const settings = () => data.settings;
export const players = () => Object.keys(data.players).sort((a, b) => a.localeCompare(b, 'ca'));
export const currentName = () => data.current;

export function player(name = data.current) {
  if (!name) return null;
  const p = (data.players[name] ??= { inst: 'alt', steps: {}, songs: [], created: Date.now() });
  p.steps ??= {}; p.songs ??= []; p.inst ??= 'alt';
  return p;
}

export function setCurrent(name) { data.current = name; player(name); save(); }
export function removePlayer(name) { delete data.players[name]; if (data.current === name) data.current = null; save(); }
export function setInstrument(inst) { const p = player(); if (p) { p.inst = inst; save(); } }
export const instrumentOf = () => player()?.inst ?? 'alt';

/** status: 'no' (En procés), 'gairebe' (A prop), 'ok' (Ja ho tens!). `best` és intern: el nivell més alt assolit. */
export function markStep(id, status, tempo) {
  const p = player();
  if (!p) return null;
  const s = (p.steps[id] ??= { status: null, tempo: 0, attempts: 0, best: null });
  s.attempts++;
  // quantes vegades seguides ha quedat «En procés»
  s.noRun = status === 'no' ? (s.status === 'no' ? (s.noRun ?? 1) : 0) + 1 : 0;
  s.status = status;
  // el que ha faltat es tria després de marcar; un intent nou comença net
  s.gaps = [];
  const rank = { no: 0, gairebe: 1, ok: 2 };
  if (s.best == null || rank[status] > rank[s.best] || (status === s.best && tempo > s.tempo)) { s.best = status; s.tempo = tempo; }
  s.last = Date.now();
  save();
  return s;
}
export const stepState = (id) => player()?.steps[id] ?? null;
/** Què t'ha faltat a l'últim intent (camp opcional `gaps` del pas). */
export function setGaps(id, gaps) {
  const s = player()?.steps[id];
  if (!s) return;
  s.gaps = [...gaps];
  save();
}

export const songs = () => player()?.songs ?? [];
export function saveSong(song) {
  const p = player();
  if (!p) return;
  song.id ??= `s${Date.now().toString(36)}`;
  const i = p.songs.findIndex((s) => s.id === song.id);
  if (i >= 0) p.songs[i] = song; else p.songs.unshift(song);
  save();
  return song;
}
export function deleteSong(id) { const p = player(); if (!p) return; p.songs = p.songs.filter((s) => s.id !== id); save(); }

/** La cançó amb què treballa el full de ruta: { titol, artista, prog, metre, tempo, estil, saxo: [melodies del Generador] }. */
export const workSong = () => player()?.song ?? null;
export function setWorkSong(song) { const p = player(); if (!p) return; p.song = song ? { titol: song.titol, artista: song.artista ?? '', prog: song.prog, metre: song.metre ?? '4/4', tempo: Number(song.tempo) || 90, estil: song.estil, saxo: Array.isArray(song.saxo) && song.saxo.length ? song.saxo : undefined, font: song.font ?? null, ref: song.ref ?? null } : null; save(); }
/** Quina melodia del Generador es fa servir (si la cançó en té més d'una). */
export const lineIdx = () => player()?.lineIdx ?? 0;
export function setLineIdx(i) { const p = player(); if (!p) return; p.lineIdx = i; save(); }

/** El percentatge que el joc ha sentit l'última vegada a cada pas (per comparar amb ajuda i a cegues). */
export const heardOf = (id) => player()?.heard?.[id] ?? null;
export function setHeard(id, pct) { const p = player(); if (!p) return; (p.heard ??= {})[id] = pct; save(); }
