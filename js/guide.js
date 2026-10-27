// «Aprèn a llegir la pantalla»: per a qui comença de zero. Cada pantalla ensenya una part del que es veu
// al joc (el diagrama de claus, els números, l'apòstrof i el +, la pista, el marcador, el TravelSax).

import { SAXO } from './saxo-core.js';
import { INSTRUMENTS, realOfNum, writtenName } from './instruments.js';
import { saxTone, resumeAudio } from './audio.js';
import { KEY_HELP } from './midi.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

let cleanup = [];
export function closeGuide() { for (const f of cleanup) f(); cleanup = []; }

function play(inst, num) {
  const m = realOfNum(inst, num);
  if (m == null) return;
  resumeAudio().then(() => saxTone(m, 0, 1.2, { gain: 0.55, dest: 'me', vel: 0.75 }));
}

export function renderGuide(host, instId, { onDone } = {}) {
  closeGuide();
  const inst = INSTRUMENTS[instId];
  let page = 0;

  const PAGES = [
    { t: 'El diagrama de claus', build: pageDiagram },
    { t: 'Els números: sumar dits', build: pageNumbers },
    { t: 'L\'apòstrof i el més', build: pageOctave },
    { t: 'La pista i el marcador', build: pageLane },
    { t: 'El TravelSax i el joc', build: pageMidi },
  ];

  function render() {
    closeGuide();
    host.innerHTML = '';
    const p = PAGES[page];
    const root = h(`<div class="guide">
      <div class="view-head">
        <div class="vh-text"><small class="muted">Aprèn a llegir la pantalla · ${page + 1} de ${PAGES.length}</small><h2>${esc(p.t)}</h2></div>
        <div class="guide-tabs">${PAGES.map((x, i) => `<button type="button" class="gtab${i === page ? ' on' : ''}${i < page ? ' seen' : ''}" data-gp="${i}" title="${esc(x.t)}">${i + 1}</button>`).join('')}</div></div>
      <div class="guide-body"></div>
      <div class="row guide-nav">
        ${page > 0 ? '<button type="button" class="btn btn-ghost" data-gnav="-1">← Enrere</button>' : ''}
        ${page < PAGES.length - 1 ? '<button type="button" class="btn btn-primary" data-gnav="1">Següent →</button>' : '<button type="button" class="btn btn-primary btn-big" data-gdone="1">Ja ho sé llegir! Som-hi →</button>'}
      </div></div>`);
    host.append(root);
    p.build(root.querySelector('.guide-body'));
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-gp],[data-gnav],[data-gdone]');
      if (!b) return;
      if (b.dataset.gp) page = Number(b.dataset.gp);
      else if (b.dataset.gnav) page += Number(b.dataset.gnav);
      else { closeGuide(); onDone?.(); return; }
      render();
      host.scrollTop = 0;
    });
  }

  const box = (title, html) => `<div class="gbox"><h3>${esc(title)}</h3>${html}</div>`;
  const tryIt = (html) => `<div class="gtry"><b>🎷 Prova-ho al saxo</b>${html}</div>`;
  const fig = (num, cap = '') => `<figure class="gfig"><div class="sv-mini">${SAXO.svgDiagrama(num, { ample: 96 })}</div><figcaption><b>${esc(num)}</b> ${esc(cap)}</figcaption></figure>`;

  function pageDiagram(el) {
    el.innerHTML = `<div class="gcols"><div>
      <p class="glead">El dibuix és el saxo vist de cara: el tub amb les claus que premen els dits. Les que estan <b>fosques</b> són les que es premen; les altres, en color clar, es deixen anar.</p>
      ${box('Les claus', `<ul><li><b>1, 2, 3</b> (blaves, a dalt): els tres dits de la mà esquerra. <b>4, 5, 6</b> (a baix): els de la mà dreta.</li><li><b>OC</b> (lila, a l'esquerra, a dalt): la clau d'octava, amb el polze esquerre.</li><li><b>G#, B, C#, Bb</b> (vermelles, a la dreta): el dit petit esquerre. <b>Eb, C</b> (vermelles, a baix a l'esquerra): el dit petit dret.</li><li>Les taronges i verdes (laterals i trins) no es fan servir a les primeres notes.</li></ul>`)}
      ${tryIt('<p>Agafa el saxo i posa els dits sobre les claus 1, 2, 3 (esquerra) i 4, 5, 6 (dreta) sense prémer. El polze esquerre descansa sota la clau d\'octava. Ara mira el dibuix: és la mateixa posició.</p>')}
      </div><div class="gside"><div class="gfigs">${fig('3', '= Sol: 1, 2 i 3 premudes')}${fig('5', '= Mi: 1, 2, 3, 4 i 5')}</div><p class="muted small">Clica un dibuix per sentir la nota.</p></div></div>`;
    el.querySelectorAll('.gfig').forEach((f) => f.addEventListener('click', () => play(inst, f.querySelector('b').textContent)));
  }

  function pageNumbers(el) {
    const nums = ['1', '2', '3', '4', '5', '6'];
    el.innerHTML = `<div class="gcols"><div>
      <p class="glead">El saxo és <b>acumulatiu</b>: cada número vol dir «tots els dits fins a aquest». <b>1</b> és només el primer dit (Si); <b>2</b> és 1 i 2 (La); <b>3</b> és 1, 2 i 3 (Sol)… fins al <b>6</b>, amb els sis dits (Re). Com més dits, més greu.</p>
      ${box('Dues excepcions', `<ul><li><b>0</b>: cap dit (Do#).</li><li><b>2,5</b>: només el dit 2, sense l'1 (Do).</li></ul>`)}
      ${tryIt('<p>Toca 1, 2, 3, 4, 5, 6 seguits: a cada número afegeixes un dit i la nota baixa. Després torna cap amunt traient dits d\'un en un.</p>')}
      </div><div class="gside"><div class="gfigs small">${nums.map((n) => fig(n, writtenName(inst, realOfNum(inst, n)))).join('')}${fig('0', 'Do#')}${fig('2,5', 'Do')}</div></div></div>`;
    el.querySelectorAll('.gfig').forEach((f) => f.addEventListener('click', () => play(inst, f.querySelector('b').textContent)));
  }

  function pageOctave(el) {
    el.innerHTML = `<div class="gcols"><div>
      <p class="glead">Un número amb <b>apòstrof (')</b> és la mateixa posició amb la <b>clau d'octava</b> (el polze esquerre): la nota sona una octava més aguda. <b>6'</b> és el Re agut; <b>5'</b>, el Mi agut.</p>
      ${box('El més (+)', `<p>Un <b>+</b> vol dir que s'hi afegeix una clau: <b>1+</b> és el Si♭ (l'1 i la petita clau del costat), <b>3+</b> el Sol♯ (el 3 i la clau G♯ del dit petit), <b>6+</b> el Mi♭ (el 6 i la clau E♭). I <b>4,5</b> és el Fa♯: 1, 2, 3 i el 5 (saltant-se el 4).</p>`)}
      ${tryIt('<p>Toca un 6 i, sense moure cap dit, prem la clau d\'octava amb el polze: ara és un 6\'. El pas més difícil del saxo és del 0 (cap dit) al 6\' (tots els dits i el polze alhora): el treballaràs al nivell 5.</p>')}
      </div><div class="gside"><div class="gfigs">${fig("6'", 'Re agut: 6 + octava')}${fig("5'", 'Mi agut')}${fig('1+', 'Si♭')}${fig('3+', 'Sol♯')}${fig('4,5', 'Fa♯')}${fig('6+', 'Mi♭')}</div></div></div>`;
    el.querySelectorAll('.gfig').forEach((f) => f.addEventListener('click', () => play(inst, f.querySelector('b').textContent)));
  }

  function pageLane(el) {
    el.innerHTML = `<div class="gcols"><div>
      <p class="glead">A sota del diagrama hi ha la <b>pista</b>: el que ve, de dreta a esquerra, fins a la línia groga d'«ara». Cada bombolla és una nota amb el seu número; la seva llargada diu quant dura. El nom de l'acord surt a dalt a cada canvi.</p>
      ${box('El marcador', `<ul><li><b>COMPTE</b>: un compàs de compte abans de començar.</li><li><b>ESCOLTA</b>: sona la banda i el saxo del joc toca la teva part.</li><li><b>ARA TU</b>: la banda continua i toques tu. El diagrama t'ensenya la nota d'ara i, una mica abans del canvi, la que ve («ARA VE»).</li><li><b>CANTA</b> (nivell 4): la cantes amb la veu.</li></ul>`)}
      ${box('Les lletres f i p', '<p>Al nivell 3, sobre les bombolles surten <b>f</b> (fort) i <b>p</b> (fluix): la dinàmica.</p>')}
      ${box('Com t\'ha anat?', '<p>Quan acabes, marques <b>En procés</b>, <b>A prop</b> o <b>Ja ho tens!</b>, dius què t\'ha faltat i tries què vols fer ara. Si el TravelSax està connectat, el joc t\'ho marca i tu ho pots canviar.</p>')}
      </div></div>`;
  }

  function pageMidi(el) {
    el.innerHTML = `<div class="gcols"><div>
      <p class="glead">Si connectes el <b>TravelSax</b> (per USB-C o Bluetooth), el joc sent cada nota que toques: et diu si era la bona, si anava aviat o tard, si era l'altra octava i (al nivell 3) si bufaves prou fort o fluix.</p>
      ${box('Com es connecta', `<ol><li>Endolla el TravelSax a l'ordinador amb el cable USB-C (o aparella'l per Bluetooth MIDI).</li><li>Clica <b>🎷 Connecta el TravelSax</b> a dalt i dona permís al navegador (Chrome o Edge).</li><li>Clica <b>Calibra</b> i toca un <b>1 (Si)</b>: així el joc sap quina nota envia el TravelSax.</li><li>Posa't els auriculars al TravelSax, o marca «Sentir el saxo per l'ordinador».</li></ol>`)}
      ${box('Sense TravelSax', `<p>També pots tocar amb el saxo de veritat i marcar tu com ha anat. I per provar el joc hi ha un teclat de prova: ${esc(KEY_HELP)}</p>`)}
      </div></div>`;
  }

  render();
}
