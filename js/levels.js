// El full de ruta del saxo (10 nivells). Cada nivell té passos: escoltes, toques amb la banda i marques com ha anat.
//
// Camps d'un pas:
//   id, titol, text (què aprens), com: [consells], prog ('C | G | Am | F'), metre, tempo, estil,
//   part (vegeu parts.js), voice, carta (id de carta ROCKIN), kind: 'play' (per defecte) | 'sing' | 'cards' | 'tune' | 'compose' | 'improv'
//   grup: nom del grup de passos · needsLine: només surt si la cançó porta melodia de saxo del Generador
//   metres: només surt en aquests compassos
//
// Dos camins que es troben: la MELODIA de la cançó (la que el professorat escriu al Generador de diagrames, amb els
// números de digitació) i el CONTORN sobre les notes dels acords (la fonamental, després la nota més propera…).
// El mateix full de ruta serveix per al saxo alt i el tenor.

const SAXO = [
  {
    n: 1, titol: 'Notes de la cançó', sub: 'Coneixes totes les posicions?', icona: '♫',
    passos: [
      { id: 's1m1', grup: 'La melodia de la cançó', needsLine: true, titol: 'La melodia, a poc a poc', text: 'La melodia que el professorat ha escrit al Generador, amb els números de digitació a la pista i el diagrama de claus. Primer lenta.', com: ['Mira el número i el diagrama abans de bufar: els dits primer, l\'aire després.', 'L\'apòstrof (\') és la clau d\'octava: el polze.', 'Si una posició no et surt, atura\'t i busca-la amb calma; el joc t\'espera a la volta següent.'], tempo: 60, estil: 'balada', part: { type: 'melodia' } },
      { id: 's1m2', grup: 'La melodia de la cançó', needsLine: true, titol: 'La melodia al tempo', text: 'La mateixa melodia, al tempo de la cançó.', com: ['Si es descontrola, torna al pas anterior.'], tempo: 100, estil: 'pop', part: { type: 'melodia' } },
      { id: 's1a', grup: 'Les notes dels acords', titol: 'La fonamental, una per compàs', text: 'Cada acord té una nota que li dona nom: la fonamental. Una per compàs, llarga, com fa el baix.', com: ['Mira a quin número cau cada acord.', 'Bufa tot el compàs sense deixar que la nota baixi.'], prog: 'G | D | Em | C', tempo: 70, estil: 'balada', part: { type: 'arrels', rhythm: 'W' } },
      { id: 's1b', grup: 'Les notes dels acords', titol: 'Fonamentals a negres', text: 'La fonamental a cada temps: la llengua fa «tu» a cada nota i l\'aire no s\'atura.', com: ['La pista t\'avisa del número següent amb temps.'], prog: 'G | D | Em | C', tempo: 80, estil: 'pop', part: { type: 'arrels', rhythm: 'Q' } },
      { id: 's1c', grup: 'Les notes dels acords', titol: 'La nota més propera', text: 'Cada acord té tres notes (1, 3 i 5). Quan canvia l\'acord, no saltis: ves a la nota de l\'acord nou que tens més a prop, o queda\'t si ja hi és. Surt una línia que gairebé no es mou.', com: ['El número petit al costat de la nota diu quina nota de l\'acord és: 1, 3 o 5.', 'Això és el que fa un saxo dins d\'una banda: una segona veu que acompanya.'], prog: 'G | D | Em | C', tempo: 70, estil: 'balada', part: { type: 'propera', rhythm: 'W', tones: 3 } },
      { id: 's1d', grup: 'Les notes dels acords', titol: 'Nota propera a negres', text: 'La mateixa línia, una nota per temps.', com: ['Quan et surti, prova-ho amb una altra cançó: la regla és la mateixa.'], prog: 'G | D | Em | C', tempo: 80, estil: 'pop', part: { type: 'propera', rhythm: 'Q', tones: 3 } },
    ],
  },
  {
    n: 2, titol: 'Patrons rítmics', sub: 'Toca la melodia amb patrons rítmics diferents', icona: '⎍',
    passos: [
      { id: 's2m1', needsLine: true, titol: 'La melodia amb una carta: negra, negra, silenci, negra', text: 'Les notes són les de la melodia; el ritme el diu la carta. Al silenci, deixes de bufar.', com: ['A cada rodona de la carta, la nota de la melodia que sona en aquell moment.'], tempo: 80, estil: 'pop', part: { type: 'melodia', card: 'mb2' }, carta: 'mb2' },
      { id: 's2m2', needsLine: true, titol: 'La melodia a corxeres', text: 'Dues notes per temps: la llengua va ràpida i l\'aire continua.', com: ['Comença lent: la llengua ha d\'anar lleugera.'], tempo: 75, estil: 'pop', part: { type: 'melodia', card: 'mb13' }, carta: 'mb13' },
      { id: 's2a', titol: 'Carta rítmica: negra, negra, silenci, negra', text: 'Cada rodona de la carta és una nota (la fonamental). On no hi ha rodona, no bufes.', com: ['El silenci també es compta: para l\'aire, no els dits.'], prog: 'G | C | G | D', tempo: 80, estil: 'pop', part: { type: 'arrels', card: 'mb2' }, carta: 'mb2' },
      { id: 's2b', titol: 'Carta amb una blanca', text: 'La blanca dura dos temps: una sola bufada llarga, amb la nota propera.', com: ['Compta la blanca per dins i no tornis a atacar.'], prog: 'Am | F | C | G', tempo: 80, estil: 'balada', part: { type: 'propera', card: 'mb6', tones: 3 }, carta: 'mb6' },
      { id: 's2c', titol: 'Corxeres', text: 'Dues notes a cada temps, amb la llengua: «tu-tu, tu-tu».', com: ['La llengua toca la canya lleugera, com dient «tu».'], prog: 'Em | C | G | D', tempo: 75, estil: 'pop', part: { type: 'arrels', card: 'mb13' }, carta: 'mb13' },
      { id: 's2d', titol: 'Contratemps', text: 'Les notes cauen a la «i», entre temps i temps.', com: ['Compta els temps per dins i bufa a la «i».'], prog: 'Am | Am | G | G', tempo: 75, estil: 'reggae', part: { type: 'propera', card: 'mb12', tones: 3 }, carta: 'mb12' },
      { id: 's2e', titol: 'En tres temps: un vals', text: 'Les cartes ternàries de 3/4.', com: ['U-dos-tres: el primer pesa més.'], prog: 'C | G | G | C', metre: '3/4', tempo: 90, estil: 'vals', part: { type: 'arrels', card: 'mt1' }, carta: 'mt1' },
      { id: 's2f', titol: 'En 6/8: dues pulsacions de tres', text: 'Sents dues pulsacions per compàs, cadascuna en tres.', com: ['U-dos-tres, quatre-cinc-sis.'], prog: 'D | Bm | G | A', metre: '6/8', tempo: 60, estil: 'balada68', part: { type: 'arrels', card: 'mt34' }, carta: 'mt34' },
      { id: 's2e2', titol: 'En 3/4: blanca i negra', text: 'Una nota llarga de dos temps i una de curta.', com: ['Deixa sonar la blanca.'], tempo: 90, estil: 'vals', part: { type: 'propera', card: 'mt8', tones: 3 }, carta: 'mt8' },
      { id: 's2e3', titol: 'En 3/4: corxeres', text: 'Dues notes a cada temps.', com: ['La llengua no s\'atura.'], tempo: 85, estil: 'vals', part: { type: 'arrels', card: 'mt11' }, carta: 'mt11' },
      { id: 's2f2', titol: 'En 6/8: dues pulsacions', text: 'Una nota a cada pulsació.', com: ['Compta u-dos-tres, quatre-cinc-sis.'], tempo: 60, estil: 'balada68', part: { type: 'propera', card: 'mt33', tones: 3 }, carta: 'mt33' },
      { id: 's2f3', titol: 'En 6/8: llarga i curta', text: 'Dins de cada pulsació, una nota llarga i una de curta.', com: ['Sona com un galop lent.'], tempo: 60, estil: 'balada68', part: { type: 'arrels', card: 'mt36' }, carta: 'mt36' },
      { id: 's2h1', titol: 'En 12/8: tres per pulsació', text: 'Quatre pulsacions, cadascuna en tres.', com: ['Tu-tu-tu a cada pulsació.'], tempo: 55, estil: 'balada68', part: { type: 'arrels', card: 'mt26' }, carta: 'mt26' },
      { id: 's2g', kind: 'cards', deck: 'ritme', titol: 'Totes les cartes rítmiques', text: 'Tria qualsevol carta rítmica i practica-la amb la teva cançó (amb la nota propera).', prog: 'C | G | Am | F', tempo: 80, estil: 'pop' },
    ],
  },
  {
    n: 3, titol: 'Dinàmica', sub: 'Toca a diferents volums', icona: '🔊',
    passos: [
      { id: 's3a', titol: 'Fort i fluix, per compassos', text: 'Dos compassos forts (f) i dos de fluixos (p), amb la nota propera. El joc sent la pressió de l\'aire del TravelSax.', com: ['Fort no vol dir forçar: més aire i la gola oberta.', 'Fluix: menys aire, però sense deixar de sostenir la nota.'], prog: 'G | D | Em | C', tempo: 75, estil: 'balada', part: { type: 'propera', rhythm: 'Q', tones: 3, dyn: ['f', 'f', 'p', 'p'] } },
      { id: 's3b', titol: 'Crescendo', text: 'Dins de cada compàs, de fluix a fort.', com: ['Comença molt fluix: si ja comences fort, no pots pujar.'], prog: 'Am | F | C | G', tempo: 70, estil: 'balada', part: { type: 'arrels', rhythm: 'Q', dyn: 'cresc' } },
      { id: 's3c', titol: 'Diminuendo', text: 'De fort a fluix, dins de cada compàs.', com: ['L\'últim temps, quasi un xiuxiueig, però que soni.'], prog: 'Am | F | C | G', tempo: 70, estil: 'balada', part: { type: 'arrels', rhythm: 'Q', dyn: 'dim' } },
      { id: 's3m', needsLine: true, titol: 'La melodia amb dinàmica', text: 'La melodia de la cançó: dos compassos forts i dos de fluixos.', com: ['Les lletres a la pista (f, p) diuen el volum.'], tempo: 85, estil: 'pop', part: { type: 'melodia', dyn: ['f', 'f', 'p', 'p'] } },
    ],
  },
  {
    n: 4, titol: 'Cantar la melodia', sub: 'Escolta com ha de sonar i canta-la', icona: '🎤',
    passos: [
      { id: 's4m1', kind: 'sing', needsLine: true, titol: 'Escolta la melodia i canta-la', text: 'Sona la banda i el saxo del joc toca la melodia. Tu la cantes amb «la». Qui pot cantar una melodia, la pot tocar.', com: ['Canta-la a l\'altura que et vagi bé: la mateixa nota més greu o més aguda també val.', 'Fixa\'t en els números que passen: són les notes que cantes.'], tempo: 80, estil: 'balada', part: { type: 'melodia' }, voice: 'part' },
      { id: 's4m2', kind: 'sing', needsLine: true, titol: 'Canta-la sense la guia', text: 'Ara el saxo del joc calla: només la banda i tu.', com: ['Si et perds, espera el principi del compàs següent.'], tempo: 80, estil: 'balada', part: { type: 'melodia' }, voice: 'part', noGuide: true },
      { id: 's4m3', needsLine: true, titol: 'Canta dos compassos, toca\'n dos', text: 'Alternes: dos compassos cantats i dos tocats amb el saxo. La veu prepara els dits.', com: ['Quan cantes, pensa els números; quan toques, pensa la melodia.'], tempo: 80, estil: 'balada', part: { type: 'melodia' }, voice: 'part', alternate: true },
      { id: 's4a', kind: 'sing', titol: 'Canta les fonamentals', text: 'El saxo del joc toca la fonamental de cada acord i tu la cantes amb «uuu».', com: ['Tanca la boca i fes «uuu»: és més fàcil trobar la nota.'], prog: 'C | G | Am | F', tempo: 70, estil: 'balada', part: { type: 'arrels', rhythm: 'W' }, voice: 'part' },
      { id: 's4b', kind: 'sing', titol: 'Canta la nota propera', text: 'La línia de nota propera, cantada.', com: ['Escolta-la unes quantes vegades abans de cantar.'], prog: 'C | G | Am | F', tempo: 75, estil: 'balada', part: { type: 'propera', rhythm: 'W', tones: 3 }, voice: 'part' },
      { id: 's4c', titol: 'Canta-la i després toca-la', text: 'Dos compassos cantats i dos tocats, amb la nota propera.', com: ['Si pots cantar-la, pots tocar-la.'], prog: 'C | G | Am | F', tempo: 75, estil: 'pop', part: { type: 'propera', rhythm: 'Q', tones: 3 }, voice: 'part', alternate: true },
    ],
  },
  {
    n: 5, titol: 'Digitació entre notes', sub: 'Practica els canvis de notes amb digitacions difícils', icona: '🖐',
    passos: [
      { id: 's5a', titol: 'El pas de l\'octava: 0 i 6\'', text: 'Del Do# (cap clau) al Re agut (totes les claus i l\'octava): tots els dits alhora. És el canvi més difícil del saxo.', com: ['Prepara els dits sobre les claus sense prémer: només han de caure.', 'Que el polze premi l\'octava en el mateix instant que els altres dits.'], prog: 'A | A | A | A', tempo: 60, estil: 'balada', part: { type: 'canvi', a: '0', b: '6\'', rhythm: 'Q' }, canco: false },
      { id: 's5b', titol: 'Do i Re: 2,5 i 6\'', text: 'Del Do (només el dit 2) al Re agut: canvien totes les claus.', com: ['Mira el diagrama: el dit 2 és l\'únic que no es mou.'], prog: 'G | G | G | G', tempo: 60, estil: 'balada', part: { type: 'canvi', a: '2,5', b: '6\'', rhythm: 'Q' }, canco: false },
      { id: 's5c', titol: 'Si i Do: 1 i 2,5', text: 'Dues notes veïnes, però els dits es creuen: deixes anar l\'1 i poses el 2.', com: ['Un dit baixa quan l\'altre puja: com un balancí.'], prog: 'G | G | G | G', tempo: 70, estil: 'pop', part: { type: 'canvi', a: '1', b: '2,5', rhythm: 'Q' }, canco: false },
      { id: 's5d', titol: 'Sol# i La: 3+ i 2', text: 'La clau del Sol# amb el dit petit, i després fora.', com: ['El dit petit treballa sol: la resta de la mà no es mou.'], prog: 'E | E | E | E', tempo: 70, estil: 'pop', part: { type: 'canvi', a: '3+', b: '2', rhythm: 'Q' }, canco: false },
      { id: 's5e', titol: 'Fa# i Sol: 4,5 i 3', text: 'El Fa# es fa amb el dit 5 (i no el 4): un dit que puja i un altre que baixa.', com: ['Lent primer: el canvi ha de ser net, sense nota intermèdia.'], prog: 'D | D | D | D', tempo: 70, estil: 'pop', part: { type: 'canvi', a: '4,5', b: '3', rhythm: 'Q' }, canco: false },
      { id: 's5m', needsLine: true, titol: 'Els canvis difícils de la melodia', text: 'El joc busca a la melodia els dos canvis de digitació on es mouen més dits, i te\'ls fa repetir.', com: ['Quan els tinguis, torna a la melodia sencera (nivell 1).'], tempo: 65, estil: 'balada', part: { type: 'canvi', fromLine: true, rhythm: 'Q' } },
    ],
  },
  {
    n: 6, titol: 'Articulació', sub: 'Fes ritmes amb la llengua sense deixar de bufar', icona: '👅',
    passos: [
      { id: 's6a', titol: 'Una nota, quatre vegades', text: 'La mateixa nota a cada temps. L\'aire no s\'atura mai: és la llengua que talla el so, dient «tu».', com: ['Si l\'aire s\'atura entre nota i nota, se sent un forat. Que no n\'hi hagi.', 'El TravelSax envia una nota nova a cada cop de llengua: el joc els compta.'], prog: 'G | D | Em | C', tempo: 70, estil: 'balada', part: { type: 'arrels', rhythm: 'Q' } },
      { id: 's6b', titol: 'Corxeres amb la llengua', text: 'Vuit per compàs: «tu-tu-tu-tu…», lleuger.', com: ['La llengua toca la punta de la canya i se\'n va de seguida.'], prog: 'G | D | Em | C', tempo: 70, estil: 'pop', part: { type: 'arrels', rhythm: 'E' } },
      { id: 's6c', titol: 'Llarga i curtes', text: 'Una carta amb notes de durades diferents: la llengua fa el ritme, l\'aire sosté.', com: ['Les notes llargues, plenes fins al final; les curtes, netes.'], prog: 'Am | F | C | G', tempo: 75, estil: 'pop', part: { type: 'propera', card: 'mb11', tones: 3 }, carta: 'mb11' },
      { id: 's6d', titol: 'Semicorxeres', text: 'Quatre per temps, a poc a poc: la llengua ha d\'anar molt lleugera.', com: ['Si s\'embussa, baixa el tempo.'], prog: 'Em | Em | D | D', tempo: 55, estil: 'funk', part: { type: 'arrels', rhythm: 'S' } },
      { id: 's6m', needsLine: true, titol: 'La melodia, ben picada', text: 'La melodia de la cançó a corxeres: cada nota, un cop de llengua.', com: ['Les notes repetides són les que diuen si la llengua funciona.'], tempo: 80, estil: 'pop', part: { type: 'melodia', card: 'mb13' }, carta: 'mb13' },
    ],
  },
  {
    n: 7, titol: 'Afinar el saxo', sub: 'Posa o treu el broquet segons l\'afinació', icona: '🎚',
    passos: [
      { id: 's7a', kind: 'tune', cents: [25, 45], titol: 'Més alt o més baix?', text: 'Sona una nota de referència i després el saxo. Decideix si el saxo va alt (cal treure una mica el broquet), baix (cal posar-lo més endins) o afinat.', com: ['Alt = més agut = el tub és massa curt: treu el broquet.', 'Baix = més greu = el tub és massa llarg: posa el broquet més endins.', 'Escolta el «batec» entre les dues notes: com més ràpid, més desafinat.'] },
      { id: 's7b', kind: 'tune', cents: [12, 25], titol: 'Afinació fina', text: 'El mateix, amb diferències més petites: les que de debò passen a l\'assaig.', com: ['Si dubtes, torna a escoltar: cada vegada que ho sents, s\'afina l\'orella.'] },
    ],
  },
  {
    n: 8, titol: 'Segona veu', sub: 'Comença la melodia des d\'una altra nota i escolta com sona', icona: '♬',
    passos: [
      { id: 's8m1', needsLine: true, titol: 'La melodia una tercera per sobre', text: 'La mateixa melodia, començant dues notes més amunt dins de la tonalitat. Sona com una segona veu que acompanya la primera.', com: ['Escolta-la amb la melodia original al cap: han d\'anar juntes.'], tempo: 80, estil: 'balada', part: { type: 'segona', interval: 2 } },
      { id: 's8m2', needsLine: true, titol: 'La melodia una tercera per sota', text: 'Ara dues notes més avall.', com: ['A la banda, un saxo fa la melodia i l\'altre la segona veu.'], tempo: 80, estil: 'balada', part: { type: 'segona', interval: -2 } },
      { id: 's8a', titol: 'Comença des de la tercera', text: 'La línia de nota propera, però començant per la tercera de l\'acord: una segona veu per sobre.', com: ['El número petit diu si fas la 1, la 3 o la 5.'], prog: 'G | D | Em | C', tempo: 75, estil: 'balada', part: { type: 'propera', rhythm: 'Q', tones: 3, start: 3 } },
      { id: 's8b', titol: 'Comença des de la quinta', text: 'Ara començant per la quinta.', com: ['Tres saxos poden fer aquestes tres línies alhora: és un acord que es mou.'], prog: 'G | D | Em | C', tempo: 75, estil: 'balada', part: { type: 'propera', rhythm: 'Q', tones: 3, start: 5 } },
    ],
  },
  {
    n: 9, titol: 'Composició', sub: 'Inventa\'t una melodia nova', icona: '✒',
    passos: [
      { id: 's9a', kind: 'compose', titol: 'Una introducció amb cartes', text: 'Tria una carta rítmica i una de melòdica per a cada compàs. El joc les converteix en notes de l\'acord i te les ensenya amb els números.', com: ['Comença amb «Sorprèn-me» i canvia el que no t\'agradi.', 'Les introduccions solen repetir una idea dues vegades.'], prog: 'C | G | Am | F', metre: '4/4', tempo: 80, estil: 'pop' },
      { id: 's9b', kind: 'compose', titol: 'Un solo de quatre compassos', text: 'El mateix, amb ritmes més moguts.', com: ['Acaba el solo a la fonamental (1).'], prog: 'Am | F | C | G', metre: '4/4', tempo: 90, estil: 'rock' },
    ],
  },
  {
    n: 10, titol: 'Improvisació', sub: 'Improvisa dins d\'una roda d\'acords', icona: '✎',
    passos: [
      { id: 's10a', kind: 'improv', mode: 'chord', titol: 'Notes de l\'acord', text: 'La pantalla t\'ensenya els números de les notes de l\'acord que sona. Tria\'n qualsevol: sempre encaixa.', com: ['Quan canvia l\'acord, canvien els números.', 'Poques notes i ben col·locades valen més que moltes.'], prog: 'Am | F | C | G', metre: '4/4', tempo: 80, estil: 'pop' },
      { id: 's10b', kind: 'improv', mode: 'penta', titol: 'La pentatònica', text: 'Cinc notes que funcionen sobre tota la roda. Les marcades en fort són les de l\'acord que sona.', com: ['Comença i acaba les frases a la nota de casa.'], prog: 'Am | F | C | G', metre: '4/4', tempo: 85, estil: 'rock' },
      { id: 's10c', kind: 'improv', mode: 'qa', titol: 'Pregunta i resposta', text: 'El saxo del joc fa una pregunta de dos compassos; tu hi respons els dos següents.', com: ['La resposta pot repetir el ritme de la pregunta amb altres notes.'], prog: 'Am | F | C | G', metre: '4/4', tempo: 80, estil: 'pop' },
      { id: 's10d', kind: 'improv', mode: 'free', titol: 'Lliure, amb reptes', text: 'La banda no s\'atura. Cada quatre compassos surt un repte nou.', com: ['Prou quan vulguis: botó Atura.'], prog: 'Em | C | G | D', metre: '4/4', tempo: 90, estil: 'rock' },
    ],
  },
];

export const LEVELS = { alt: SAXO, tenor: SAXO };

export const allSteps = (inst) => LEVELS[inst].flatMap((l) => l.passos.map((p) => ({ ...p, nivell: l.n })));
export const stepById = (inst, id) => allSteps(inst).find((s) => s.id === id) ?? null;

/** Reptes de la improvisació lliure. */
export const REPTES = [
  'Només tres notes',
  'Frases curtes amb silencis',
  'Acaba cada frase a la fonamental',
  'Toca només als contratemps',
  'Repeteix una idea i canvia-li el final',
  'Notes llargues: deixa-les sonar',
  'Només a la zona greu',
  'Imita el ritme de la bateria',
  'Una frase fort, una frase fluix',
];

/** Un pas surt si quadra amb el compàs de la cançó (les cartes tenen compàs propi) i, si demana melodia, la cançó en té. */
export function stepFits(step, metreId = '4/4', cardMetreOf = () => null, hasLine = false) {
  if (step.needsLine && !hasLine) return false;
  if (step.metres) return step.metres.includes(metreId);
  const card = step.carta ?? step.part?.card;
  const cm = card ? cardMetreOf(card) : null;
  if (!cm) return true;
  return cm === metreId || (cm === '4/4' && metreId === '2/4');
}
