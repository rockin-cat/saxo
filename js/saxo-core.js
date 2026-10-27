/* =========================================================
   SAXO — digitació Rockin i transposició
   ---------------------------------------------------------
   Mòdul compartit entre el Generador de diagrames i el joc
   de saxo. No depèn de res més: es pot copiar tal qual.

   Sistema de números (document «Notació Saxo»):
     1 = Si · 2 = La (1+2) · 3 = Sol · 4 = Fa · 5 = Mi · 6 = Re
     6C = Do greu · 2,5 = Do · 0 = Do# (cap clau)
     ' = amb la clau d'octava (6' = Re agut, 5' = Mi agut…)
     + = clau afegida (1+ = Sib, 3+ = Sol#, 6+ = Mib, 6+C = Do#)
     4,5 = Fa# (1,2,3 + 5) · «3,4» s'accepta com a sinònim
     6+B / 6+Bb = Si i Sib greus (proposta: no surten al document)
     SAXO.claus(num) → claus premudes · SAXO.svgDiagrama(num) → dibuix
   Els números es refereixen SEMPRE a la nota escrita per al saxo
   (la que llegeix el saxofonista), no a la nota real que sona.
   ========================================================= */
(function (global) {
  'use strict';

  // Tipus de saxo: quants semitons (i graus diatònics) hi ha entre
  // la nota real i la nota escrita. Alt en Mi♭: escrit = real + 6a major.
  // Tenor en Si♭: escrit = real + 9a major. «quintes» = quants sostinguts
  // més té l'armadura escrita respecte de la real (Sol M real → Mi M a l'alt).
  const SAXOS = {
    alt:   { nom: 'Saxo alt',   curt: 'Alt',   semi: 9,  diat: 5, quintes: 3, clau: 'Mi♭' },
    tenor: { nom: 'Saxo tenor', curt: 'Tenor', semi: 14, diat: 8, quintes: 2, clau: 'Si♭' }
  };
  const PER_DEFECTE = 'alt';

  // Nota escrita (MIDI) → número de digitació
  const DIGITACIO = {
    58: '6+Bb', 59: '6+B',          // Sib i Si greus (claus de les notes greus)
    60: '6C', 61: '6+C', 62: '6', 63: '6+', 64: '5', 65: '4', 66: '4,5',
    67: '3', 68: '3+', 69: '2', 70: '1+', 71: '1', 72: '2,5', 73: '0',
    74: "6'", 75: "6+'", 76: "5'", 77: "4'", 78: "4,5'", 79: "3'", 80: "3+'",
    81: "2'", 82: "1+'", 83: "1'", 84: "2,5'", 85: "0'"
  };
  const RANG = { min: 58, max: 85 };     // notes escrites que tenen número

  const DIAT = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  const DIAT_INV = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const SEMIS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const NOM_CAT = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };

  // "F#4" → { l, alt, o, diat, midi }
  function parse(p) {
    const m = String(p || '').match(/^([A-G])([#b]?)(-?\d)$/); if (!m) return null;
    const alt = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
    return { l: m[1], alt: m[2], o: +m[3], diat: +m[3] * 7 + DIAT[m[1]], midi: (+m[3] + 1) * 12 + SEMIS[m[1]] + alt };
  }
  function midiDe(p) { const x = parse(p); return x ? x.midi : null; }
  function nomDe(diat, alt) { return DIAT_INV[((diat % 7) + 7) % 7] + (alt || '') + Math.floor(diat / 7); }

  // Transposa una nota escrita amb lletra ("E4") un interval donat
  // en semitons i graus diatònics, conservant una escriptura raonable
  // (mai dobles alteracions: si cal, canvia l'enharmònic).
  function transposar(p, semi, diat) {
    const x = parse(p); if (!x) return p;
    const midi = x.midi + semi;
    let d = x.diat + diat;
    let alt = midi - naturalMidi(d);
    if (alt > 1) { d += 1; alt = midi - naturalMidi(d); }
    if (alt < -1) { d -= 1; alt = midi - naturalMidi(d); }
    // Fa♭, Do♭, Mi♯ i Si♯ els escrivim amb la nota natural veïna
    const l = DIAT_INV[((d % 7) + 7) % 7];
    if (alt === -1 && (l === 'F' || l === 'C')) { d -= 1; alt = 0; }
    if (alt === 1 && (l === 'E' || l === 'B')) { d += 1; alt = 0; }
    return nomDe(d, alt === 1 ? '#' : alt === -1 ? 'b' : '');
  }
  function naturalMidi(diat) { return (Math.floor(diat / 7) + 1) * 12 + SEMIS[DIAT_INV[((diat % 7) + 7) % 7]]; }

  function saxo(tipus) { return SAXOS[tipus] || SAXOS[PER_DEFECTE]; }
  // nota real → nota escrita per al saxo, i a l'inrevés
  function escrita(pReal, tipus) { const s = saxo(tipus); return transposar(pReal, s.semi, s.diat); }
  function real(pEscrita, tipus) { const s = saxo(tipus); return transposar(pEscrita, -s.semi, -s.diat); }

  // número de digitació d'una nota real (o null si no en té)
  function digitacio(pReal, tipus) { return digitacioEscrita(escrita(pReal, tipus)); }
  function digitacioEscrita(pEscrita) { const m = midiDe(pEscrita); return m === null ? null : (DIGITACIO[m] || null); }
  function dinsRang(pReal, tipus) { const m = midiDe(escrita(pReal, tipus)); return m !== null && m >= RANG.min && m <= RANG.max; }

  // nom català de la nota (escrita), p. ex. "Do#", "Sib"
  function nomCatala(p) { const x = parse(p); return x ? NOM_CAT[x.l] + (x.alt === '#' ? '♯' : x.alt === 'b' ? '♭' : '') : ''; }

  // Totes les notes escrites amb número, de greu a agut (útil per al joc)
  function taula() {
    return Object.keys(DIGITACIO).map(Number).sort((a, b) => a - b).map(m => ({ midi: m, numero: DIGITACIO[m] }));
  }

  /* ---------------------------------------------------------
     Diagrama de claus (el mateix dibuix que el document «Notació
     Saxo»): quines claus es premen per a cada número.
     --------------------------------------------------------- */
  // número → claus premudes. La base acumulativa 1..6 i les claus afegides.
  function claus(numero) {
    if (numero === null || numero === undefined) return null;
    let n = String(numero).trim();
    const oct = n.endsWith("'"); if (oct) n = n.slice(0, -1);
    const base = { '0': [], '1': ['1'], '1+': ['1', 'P'], '2': ['1', '2'], '2,5': ['2'],
      '3': ['1', '2', '3'], '3+': ['1', '2', '3', 'G#'], '4': ['1', '2', '3', '4'], '3,4': ['1', '2', '3', '5'], '4,5': ['1', '2', '3', '5'],
      '5': ['1', '2', '3', '4', '5'], '6': ['1', '2', '3', '4', '5', '6'],
      '6+': ['1', '2', '3', '4', '5', '6', 'Eb'], '6C': ['1', '2', '3', '4', '5', '6', 'C'], '6+C': ['1', '2', '3', '4', '5', '6', 'C#'],
      '6+B': ['1', '2', '3', '4', '5', '6', 'B'], '6+Bb': ['1', '2', '3', '4', '5', '6', 'Bb'] }[n];
    if (!base) return null;
    return oct ? ['OC', ...base] : base.slice();
  }

  // Geometria del dibuix (viewBox 0 0 136 262). c = categoria de color.
  const CLAUS_DIBUIX = [
    { id: 'OC', c: 'oct', forma: 'path', d: 'M22 20 A13 13 0 0 1 36 34 L22 34 Z', lx: 27, ly: 31 },
    { id: 'LA', c: 'oct', forma: 'path', d: 'M8 44 A13 13 0 0 0 24 56 L24 44 Z', lx: 15, ly: 54, lsize: 5 },
    { id: 'X',  c: 'agut', forma: 'ellipse', x: 66, y: 24, rx: 6, ry: 8 },
    { id: '1',  c: 'plat', forma: 'circle', x: 68, y: 48, r: 11 },
    { id: 'P',  c: 'plat', forma: 'circle', x: 79, y: 61, r: 6.5 },
    { id: '2',  c: 'plat', forma: 'circle', x: 68, y: 84, r: 11 },
    { id: '3',  c: 'plat', forma: 'circle', x: 70, y: 118, r: 11 },
    { id: 'C2', c: 'agut', forma: 'ellipse', x: 110, y: 50, rx: 5, ry: 9 },
    { id: 'C1', c: 'agut', forma: 'ellipse', x: 120, y: 66, rx: 5, ry: 9 },
    { id: 'C4', c: 'agut', forma: 'ellipse', x: 110, y: 83, rx: 5, ry: 9 },
    { id: 'G#', c: 'greu', forma: 'ellipse', x: 118, y: 104, rx: 11, ry: 6 },
    { id: 'B',  c: 'greu', forma: 'rect', x: 102, y: 110, w: 15, h: 11, rx: 4 },
    { id: 'C#', c: 'greu', forma: 'rect', x: 119, y: 110, w: 15, h: 11, rx: 4 },
    { id: 'Bb', c: 'greu', forma: 'ellipse', x: 118, y: 128, rx: 11, ry: 6 },
    { id: 'C3', c: 'agut', forma: 'rect', x: 26, y: 118, w: 11, h: 20, rx: 1 },
    { id: 'TC', c: 'tril', forma: 'rect', x: 24, y: 140, w: 11, h: 19, rx: 1 },
    { id: 'TA', c: 'tril', forma: 'rect', x: 22, y: 161, w: 11, h: 19, rx: 1 },
    { id: '4',  c: 'plat', forma: 'circle', x: 70, y: 168, r: 11 },
    { id: 'C5', c: 'agut', forma: 'rect', x: 50, y: 188, w: 9, h: 20, rx: 1 },
    { id: '5',  c: 'plat', forma: 'circle', x: 70, y: 203, r: 11 },
    { id: 'TF', c: 'tril', forma: 'rect', x: 46, y: 228, w: 12, h: 8, rx: 1 },
    { id: '6',  c: 'plat', forma: 'circle', x: 70, y: 236, r: 11 },
    { id: 'Eb', c: 'greu', forma: 'path', d: 'M6 226 A10 10 0 0 1 26 226 Z', lx: 16, ly: 223 },
    { id: 'C',  c: 'greu', forma: 'path', d: 'M6 229 A10 10 0 0 0 26 229 Z', lx: 16, ly: 237 }
  ];
  const COLORS_CLAUS = { plat: '#4472c4', greu: '#c00000', oct: '#7030a0', tril: '#00b050', agut: '#ed7d31' };

  // SVG del diagrama amb les claus del número marcades. opts: { ample, simple }
  // simple: només les claus que es fan servir als primers nivells (sense laterals ni trins)
  function svgDiagrama(numero, opts = {}) {
    const premudes = new Set(claus(numero) || []);
    const amaga = opts.simple ? new Set(['agut', 'tril']) : new Set();
    const ample = opts.ample || 100, alt = Math.round(ample * 262 / 136);
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 262" width="${ample}" height="${alt}" class="saxo-diagrama" font-family="Ubuntu, Arial, sans-serif">`;
    s += `<polygon points="48,6 86,6 102,256 32,256" fill="#fff" stroke="#222" stroke-width="2"/>`;
    s += `<circle cx="12" cy="34" r="7" fill="none" stroke="#4472c4" stroke-width="2"/>`;   // suport del polze
    CLAUS_DIBUIX.forEach(k => {
      if (amaga.has(k.c)) return;
      const on = premudes.has(k.id), col = COLORS_CLAUS[k.c];
      const fill = on ? '#1b1f2b' : col, op = on ? 1 : 0.28, stroke = on ? '#000' : col, sw = on ? 2 : 1;
      const attrs = `fill="${fill}" fill-opacity="${op}" stroke="${stroke}" stroke-width="${sw}"`;
      let lx = k.x, ly = k.y;
      if (k.forma === 'circle') s += `<circle cx="${k.x}" cy="${k.y}" r="${k.r}" ${attrs}/>`;
      else if (k.forma === 'ellipse') s += `<ellipse cx="${k.x}" cy="${k.y}" rx="${k.rx}" ry="${k.ry}" ${attrs}/>`;
      else if (k.forma === 'rect') { s += `<rect x="${k.x}" y="${k.y}" width="${k.w}" height="${k.h}" rx="${k.rx}" ${attrs}/>`; lx = k.x + k.w / 2; ly = k.y + k.h / 2; }
      else { s += `<path d="${k.d}" ${attrs}/>`; lx = k.lx; ly = k.ly; }
      const mida = k.lsize || (k.id.length > 1 ? 6 : 9);
      s += `<text x="${lx}" y="${ly + mida * 0.36}" font-size="${mida}" font-weight="${on ? 'bold' : 'normal'}" fill="${on ? '#fff' : '#222'}" text-anchor="middle">${k.id}</text>`;
    });
    s += '</svg>';
    return s;
  }

  global.SAXO = { SAXOS, PER_DEFECTE, DIGITACIO, RANG, parse, midiDe, transposar, escrita, real, digitacio, digitacioEscrita, dinsRang, nomCatala, taula, claus, svgDiagrama, CLAUS_DIBUIX, COLORS_CLAUS };
})(typeof window !== 'undefined' ? window : globalThis);

// Com a mòdul ES: el mateix fitxer que al Generador de diagrames (rockin-cat/Generador-diagrames/saxo.js), sense canvis.
export const SAXO = globalThis.SAXO;
export default SAXO;
