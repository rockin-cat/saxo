// Icones de línia (24×24, traç del color del text). Substitueixen els emojis de la interfície.
const P = {
  nota: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  ritme: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  ma: '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.3l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>',
  micro: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/>',
  grafic: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  celleta: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5M2 17l10 5 10-5"/>',
  afinador: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  llamp: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  llapis: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  ploma: '<path d="m12 19 7-7 3 3-7 7z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18z"/><path d="m2 2 7.6 7.6"/><circle cx="11" cy="11" r="2"/>',
  mes: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/>',
  amunt: '<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>',
  ones: '<path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>',
  carta: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  escolta: '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 15a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z"/>',
  consell: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>',
  so: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  silenci: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>',
  esborra: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  cadenat: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  pantalla: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  lent: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M10 2h4"/>',
};

/** Una icona com a SVG en línia. */
export const ic = (nom, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[nom] ?? ''}</svg>`;

/** Els nivells guarden un símbol; aquí es converteix en icona. */
const DE_SIMBOL = { '♫': 'nota', '⎍': 'ritme', '✋': 'ma', '🎤': 'micro', '📈': 'grafic', '≋': 'celleta', '🎚': 'afinador', '⚡': 'llamp', '✒': 'ploma', '✎': 'llapis', '+': 'mes', '🔊': 'so', '🖐': 'ma', '👅': 'ones', '♬': 'amunt' };
export const icona = (simbol) => (DE_SIMBOL[simbol] ? ic(DE_SIMBOL[simbol]) : simbol);
