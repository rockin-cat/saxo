// Els dos saxos del joc. Tot el que sona i es jutja és en notes REALS (MIDI, com sonen a la banda);
// els números de digitació i les notes escrites es calculen amb saxo-core.js (el mateix fitxer del Generador).

import { SAXO } from './saxo-core.js';
import { midiName, mod } from './theory.js';

export const INSTRUMENTS = {
  alt: { id: 'alt', nom: 'Saxo alt', curt: 'Alt', clau: 'Mi♭', color: '#0ca678', colorSoft: 'rgba(12,166,120,0.18)', sound: 'sax', centre: 60 },
  tenor: { id: 'tenor', nom: 'Saxo tenor', curt: 'Tenor', clau: 'Si♭', color: '#0b7285', colorSoft: 'rgba(11,114,133,0.18)', sound: 'sax', centre: 55 },
};
export const instrument = (id) => INSTRUMENTS[id] ?? INSTRUMENTS.alt;

/** Semitons entre la nota escrita i la real (escrita = real + semi). */
export const semi = (inst) => SAXO.SAXOS[inst.id].semi;
export const toWritten = (inst, real) => real + semi(inst);
export const toReal = (inst, written) => written - semi(inst);

/** Nota real (MIDI) → número de digitació ROCKIN ("5'", "4,5", "0"…) o null si no en té. */
export const numOf = (inst, real) => SAXO.DIGITACIO[toWritten(inst, real)] ?? null;
/** Número → nota real (MIDI). Accepta «3,4» com a sinònim de «4,5». */
export function realOfNum(inst, num) {
  const n = String(num).trim().replace(/^3,4/, '4,5');
  const w = Object.keys(SAXO.DIGITACIO).map(Number).find((m) => SAXO.DIGITACIO[m] === n);
  return w == null ? null : toReal(inst, w);
}
/** Nom de la nota escrita (català): "Fa♯", "Si♭"… */
export const writtenName = (inst, real) => SAXO.nomCatala(midiName(toWritten(inst, real)));
/** Nom de la nota real (la que sent la banda). */
export const realName = (real) => SAXO.nomCatala(midiName(real));

/** Rang real amb número (greu…agut) i la zona còmoda (Re4–Do6 escrits). */
export const range = (inst) => [toReal(inst, SAXO.RANG.min), toReal(inst, SAXO.RANG.max)];
export const comfort = (inst) => [toReal(inst, 62), toReal(inst, 84)];
export const inRange = (inst, real) => real >= range(inst)[0] && real <= range(inst)[1];

/** La nota amb classe de to `pc` més propera a `around` i dins del rang (prefereix la zona còmoda). */
export function nearestPc(inst, pc, around, { prefer = null } = {}) {
  const [lo, hi] = range(inst);
  const [clo, chi] = comfort(inst);
  const cands = [];
  for (let m = lo; m <= hi; m++) if (mod(m, 12) === mod(pc, 12)) cands.push(m);
  if (!cands.length) return null;
  const cost = (m) => Math.abs(m - around) + (m < clo || m > chi ? 6 : 0) + (prefer != null && m === prefer ? -0.5 : 0);
  return cands.sort((a, b) => cost(a) - cost(b))[0];
}

/** Totes les notes de l'acord (classes de to) dins del rang, ordenades de greu a agut. */
export function chordTonesInRange(inst, pcs) {
  const [lo, hi] = range(inst);
  const out = [];
  for (let m = lo; m <= hi; m++) if (pcs.some((pc) => mod(pc, 12) === mod(m, 12))) out.push(m);
  return out;
}
