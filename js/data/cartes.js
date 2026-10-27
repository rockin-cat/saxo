// Les cartes ROCKIN que fa servir el joc (copiades de Cartes-rockin/dades.js).
// Cartes rítmiques: notes = [inici, durada] en negres (Binari, Ternari 3/4) o en
// pulsacions (Ternari 6/8, 9/8, 12/8: 1 = negra amb punt).
// Melòdiques: contorn per frases (0 = fonamental, 1 = 3a, 2 = 5a, 3 = 8a).
// Rascats: D/U = avall/amunt tocant; d/u = la mà es mou sense tocar.

const CARTES = (function () {
  // ---- Petites ajudes per escriure els ritmes de manera compacta ----
  // Cada pulsació es descriu amb un símbol:
  //  Q  negra          R  silenci        EE corxera+corxera
  //  Ex corxera+sil.   xE sil.+corxera   H2 blanca (2 temps)  H3 blanca amb punt
  //  W  rodona         SSSS 4 semicorxeres   ESS  corx + 2 semi
  //  SSE 2 semi + corx SES semi corx semi    E.S corx punt + semi
  //  SE. semi + corx punt   TTT treset       T21 2/3 + 1/3   T12 1/3 + 2/3
  const SYM = {
    Q: [[0, 1]], R: [], EE: [[0, .5], [.5, .5]], Ex: [[0, .5]], xE: [[.5, .5]],
    H2: [[0, 2]], H3: [[0, 3]], W: [[0, 4]],
    SSSS: [[0, .25], [.25, .25], [.5, .25], [.75, .25]],
    ESS: [[0, .5], [.5, .25], [.75, .25]],
    SSE: [[0, .25], [.25, .25], [.5, .5]],
    SES: [[0, .25], [.25, .5], [.75, .25]],
    "E.S": [[0, .75], [.75, .25]],
    "SE.": [[0, .25], [.25, .75]],
    TTT: [[0, 1 / 3], [1 / 3, 1 / 3], [2 / 3, 1 / 3]],
    T21: [[0, 2 / 3], [2 / 3, 1 / 3]],
    T12: [[0, 1 / 3], [1 / 3, 2 / 3]],
    // compàs compost (6/8): la pulsació val una negra amb punt (1.5)
    D: [[0, 1.5]],                 // negra amb punt
    ee3: [[0, .5], [.5, .5], [1, .5]], // 3 corxeres
    eq: [[0, .5], [.5, 1]],        // corxera + negra
    qe: [[0, 1], [1, .5]],         // negra + corxera
  };
  function ritme(str) {
    // "Q Q R Q" → notes. Els símbols de 2 o 3 temps avancen el temps que ocupen.
    let t = 0; const notes = [];
    str.trim().split(/\s+/).forEach(s => {
      const pat = SYM[s]; if (!pat) throw new Error("Símbol desconegut: " + s);
      pat.forEach(([a, d]) => notes.push([+(t + a).toFixed(4), +d.toFixed(4)]));
      t += (s === "H2" ? 2 : s === "H3" ? 3 : s === "W" ? 4 : (s === "D" || s === "ee3" || s === "eq" || s === "qe") ? 1.5 : 1);
    });
    return notes;
  }
  const R = (id, deck, str) => ({ id, img: `assets/cartes/${deck}/${id}.jpg`, notes: ritme(str), text: str });

  // ------------------------------ BINARI (4/4) ------------------------------
  const BINARI = [
    R("mb1", "Binari", "Q Q Q Q"), R("mb2", "Binari", "Q Q R Q"), R("mb3", "Binari", "Q R Q Q"),
    R("mb4", "Binari", "Q Q Q R"), R("mb5", "Binari", "W"), R("mb6", "Binari", "Q H2 Q"),
    R("mb7", "Binari", "Q R Q R"), R("mb8", "Binari", "Q Q R R"), R("mb9", "Binari", "R Q R Q"),
    R("mb10", "Binari", "Q R Q R"), R("mb11", "Binari", "Q Q Q xE"), R("mb12", "Binari", "xE EE xE EE"),
    R("mb13", "Binari", "EE EE EE EE"), R("mb14", "Binari", "R EE R EE"), R("mb15", "Binari", "Q EE R R"),
    R("mb16", "Binari", "Q EE EE R"), R("mb17", "Binari", "EE Q EE EE"), R("mb18", "Binari", "Q Q EE Q"),
    R("mb19", "Binari", "xE Q Q Q"), R("mb20", "Binari", "xE Q Q R"), R("mb21", "Binari", "xE xE xE xE"),
    R("mb22", "Binari", "Q xE Q Q"), R("mb23", "Binari", "Q xE Q R"), R("mb24", "Binari", "Q xE Q xE"),
    R("mb25", "Binari", "SSSS SSSS SSSS SSSS"), R("mb26", "Binari", "ESS ESS ESS ESS"),
    R("mb27", "Binari", "SSE SSE SSE SSE"), R("mb28", "Binari", "SES SES SES SES"),
    R("mb29", "Binari", "E.S E.S E.S E.S"), R("mb30", "Binari", "SE. SE. SE. SE."),
  ];

  // ------------------------------ TERNARI: quatre mètriques diferents -------------
  // Cada carta porta la seva mètrica i l'app no les barreja mai:
  //   3/4  → 3 pulsos de negra amb subdivisió binària (unitat = negra)
  //   6/8  → 2 pulsos de negra amb punt, subdivisió ternària (unitat = pulso; TTT = 3 corxeres)
  //   9/8  → 3 pulsos de negra amb punt
  //   12/8 → 4 pulsos de negra amb punt
  const T = (id, str, metre) => Object.assign(R(id, "Ternari", str), { metre });
  const TERNARI = [
    T("mt1", "Q Q Q", "3/4"), T("mt2", "Q Q R", "3/4"), T("mt3", "Q R Q", "3/4"),
    T("mt4", "R Q Q", "3/4"), T("mt5", "Q R R", "3/4"), T("mt6", "R R Q", "3/4"),
    T("mt7", "R Q R", "3/4"), T("mt8", "H2 Q", "3/4"), T("mt9", "Q H2", "3/4"),
    T("mt10", "H3", "3/4"), T("mt11", "EE EE EE", "3/4"), T("mt12", "Q Q xE", "3/4"),
    T("mt13", "xE Q Q", "3/4"), T("mt14", "xE EE xE", "3/4"), T("mt15", "Q EE xE", "3/4"),
    T("mt16", "R EE R", "3/4"), T("mt17", "Q EE R", "3/4"), T("mt18", "Q EE EE", "3/4"),
    T("mt19", "EE Q EE", "3/4"), T("mt20", "EE Q Q", "3/4"), T("mt21", "Q Q EE", "3/4"),
    T("mt22", "xE xE xE", "3/4"), T("mt23", "Q xE Q", "3/4"), T("mt24", "xE Q R", "3/4"),
    T("mt25", "xE Q xE", "3/4"),
    // 12/8: quatre cercles partits en tres
    T("mt26", "TTT TTT TTT TTT", "12/8"), T("mt27", "T21 T21 T21 T21", "12/8"), T("mt28", "T12 T12 T12 T12", "12/8"),
    // 9/8: tres cercles
    T("mt29", "Q Q Q", "9/8"), T("mt30", "TTT TTT TTT", "9/8"), T("mt31", "T21 T21 T21", "9/8"), T("mt32", "T12 T12 T12", "9/8"),
    // 6/8: dos cercles
    T("mt33", "Q Q", "6/8"), T("mt34", "TTT TTT", "6/8"), T("mt35", "T12 T12", "6/8"), T("mt36", "T21 T21", "6/8"),
  ];

  // ------------------------------ MELÒDIC (contorn) ---------------------------
  // Cada carta és una llista de FRASES (els traços separats del dibuix). Cada frase
  // és una llista d'alçades relatives (0 = la més greu). Les frases es reparteixen
  // per igual dins del compàs, i cada alçada es converteix en una nota de l'acord
  // (0 = fonamental, 1 = tercera, 2 = quinta, 3 = fonamental aguda, …).
  const M = (n, frases) => ({ id: `pm${n}`, img: `assets/cartes/Melodic/pm${n}.jpg`, contour: frases });
  // Llegit automàticament de les imatges: cada punt és una nota, cada traç és una frase.
  const MELODIC = [
    M(1, [[0, 1, 0, 1, 0]]),
    M(2, [[1, 0, 1, 0, 1]]),
    M(3, [[1, 0, 0, 1, 1, 0, 0, 1]]),
    M(4, [[0, 1, 1, 0, 0, 1, 1, 0]]),
    M(5, [[2, 2], [1, 1], [0, 0]]),
    M(6, [[0, 0], [1, 1], [2, 2]]),
    M(7, [[1, 0], [1, 0]]),
    M(8, [[1, 0], [1, 0], [1, 0], [1, 0]]),
    M(9, [[0, 1, 0, 1]]),
    M(10, [[0, 1], [0, 1]]),
    M(11, [[0, 1], [0, 1], [0, 1], [0, 1]]),
    M(12, [[0, 2], [1, 2], [1, 2], [1, 2]]),
    M(13, [[2, 0], [2, 1], [2, 1], [2, 1]]),
    M(14, [[0, 1, 2, 3], [0, 1, 2, 3]]),
    M(15, [[0, 1, 2, 3], [1, 2, 3]]),
    M(16, [[0, 1, 2, 3], [2, 3]]),
    M(17, [[3, 2, 1, 0], [3, 2, 1, 0]]),
    M(18, [[3, 2, 1, 0], [3, 2, 1]]),
    M(19, [[3, 2, 1, 0], [3, 2]]),
    M(20, [[0, 2, 1, 2]]),
    M(21, [[0, 1, 2], [0, 1, 2], [0, 1]]),
    M(22, [[2, 1, 0], [2, 1, 0], [2, 1]]),
    M(23, [[0, 2], [2, 1]]),
    M(24, [[2, 0, 1, 0]]),
    M(25, [[2, 0], [0, 1]]),
    M(26, [[0, 0], [1, 1]]),
    M(27, [[1, 1], [0, 0]]),
  ];

  // ------------------------------ RASCATS DE GUITARRA ------------------------
  // Mètrica binària: 8 (o 16) moviments de mà dreta per compàs.
  // D/U = avall/amunt tocant les cordes (fletxa negra); d/u = moviment sense tocar (fletxa grisa).
  // Llegit automàticament de les imatges.
  const G = (n, strum) => ({ id: `rg${n}`, img: `assets/cartes/Rascats/rg${n}.jpg`, strum, text: strum });
  const RASCATS = [
    G(1, "DUDUDUDU"),
    G(2, "DuDUdUDU"),
    G(3, "DuDUdUDU"),
    G(4, "DUDUdUDU"),
    G(5, "dUdUdUdU"),
    G(6, "DuDuDuDu"),
    G(7, "dUDUDUDU"),
    G(8, "DuDUDUDU"),
    G(9, "DUdUDUDU"),
    G(10, "DUDuDUDU"),
    G(11, "DUDUdUDU"),
    G(12, "DUDUDuDU"),
    G(13, "DUDUDUdU"),
    G(14, "DUDUDUDu"),
    G(15, "DuDuDUdU"),
    G(16, "DuDuDUDu"),
    G(17, "DuDuDuDu"),
    G(18, "DuDuDuDUdUDudUDU"),
    G(19, "DudUduDuduDuDUdu"),
    G(20, "duDuDUduDudUduDu"),
    G(21, "duDudUduDudUduDu"),
    G(22, "DuduDudUdUDuDUdu"),
  ];

  // ------------------------------ PROGRESSIONS ------------------------------
  const PROGRESSIONS = [
    { nom: "I – V – vi – IV (pop)", prog: "I V vi IV" },
    { nom: "vi – IV – I – V", prog: "vi IV I V" },
    { nom: "I – vi – IV – V (anys 50)", prog: "I vi IV V" },
    { nom: "I – IV – V – IV", prog: "I IV V IV" },
    { nom: "I – IV – vi – V", prog: "I IV vi V" },
    { nom: "I – bVII – IV – I (rock)", prog: "I bVII IV I" },
    { nom: "ii – V – I – I", prog: "ii V I I" },
    { nom: "i – VI – III – VII", prog: "i VI III VII", minor: true },
    { nom: "i – iv – v – i", prog: "i iv v i", minor: true },
    { nom: "i – VII – VI – V (cadència andalusa)", prog: "i VII VI V", minor: true },
    { nom: "i – iv – VII – III", prog: "i iv VII III", minor: true },
    { nom: "i – VI – VII – i", prog: "i VI VII i", minor: true },
    { nom: "i – iv – V – i (V major)", prog: "i iv V i", minor: true },
    { nom: "I – IV (dos acords)", prog: "I IV" },
    { nom: "Blues de 12 compassos", prog: "I I I I IV IV I I V IV I V" },
  ];

  
  return { BINARI, TERNARI, MELODIC, RASCATS, PROGRESSIONS };
})();

export const { BINARI, TERNARI, MELODIC, RASCATS, PROGRESSIONS } = CARTES;
const ALL = [...BINARI, ...TERNARI, ...MELODIC, ...RASCATS];
export const cardById = (id) => ALL.find((c) => c.id === id) ?? null;
/** Mètrica d'una carta rítmica: '4/4' (binari) o la que diu la carta ternària. */
export const cardMetre = (c) => c?.metre ?? (c?.id?.startsWith('mb') || c?.id?.startsWith('rg') ? '4/4' : null);
/** Les notes d'una carta rítmica en negres des de l'inici del compàs. */
export function cardOnsets(c) {
  const k = c.metre && c.metre.endsWith('/8') ? 1.5 : 1;
  const r = (x) => Math.round(x * 1000) / 1000;
  return c.notes.map(([a, d]) => [r(a * k), r(d * k)]);
}
