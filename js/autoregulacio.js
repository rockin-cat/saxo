// Autoregulació: després de cada resultat l'alumne tria com vol continuar practicar.
// Es desa cada tria (i la que hauria proposat l'eina, que només surt a «Què sé fer») i, al següent intent
// relacionat, el nivell que ha marcat. A «Com tries el teu camí» es mira si les tries li han funcionat.

import * as store from './store.js';
import { NIVELLS } from './assoliment.js';

const MAX = 300;
const LEVEL = { no: 0, gairebe: 1, ok: 2 };
const LEVEL_NAME = [NIVELLS.no, NIVELLS.gairebe, NIVELLS.ok];
export const levelOf = (r) => LEVEL[r] ?? 0;

/** Què vol dir cada tria (el text del botó i el del registre). */
export const CHOICE = {
  slower: 'Baixar el tempo',
  faster: 'Pujar el tempo',
  'guide-on': 'Posar la guia sonora',
  'guide-off': 'Treure la guia sonora',
  strings: 'Comprovar l\'acord corda a corda',
  hand: 'Practicar només la mà dreta',
  back: 'Tornar a un pas anterior',
  repeat: 'Repetir igual',
  next: 'Passar al pas següent',
  done: 'Ja no cal: ho porto al grup',
};
const AUTONOMY = new Set(['guide-off', 'faster']);
const STAYS = new Set(['slower', 'faster', 'guide-on', 'guide-off', 'strings', 'hand', 'repeat']);

export function choices() {
  const p = store.player();
  if (!p) return [];
  p.choices ??= [];
  return p.choices;
}

/** El pas on porta una tria (el que s'ha de mirar al següent intent). */
const targetOf = (c) => (STAYS.has(c.choice) ? c.step : c.choice === 'back' || c.choice === 'next' ? c.to : null);

/**
 * Hi ha un resultat nou d'un pas: l'última tria pendent que portava aquí rep el nivell (és l'«efecte»).
 * Cal cridar-ho abans de desar el registre nou.
 */
export function fillEffect(stepId, r) {
  const list = choices();
  for (let i = list.length - 1; i >= 0; i--) {
    const c = list[i];
    if (c.nextLevel != null || !c.choice) continue;
    if (targetOf(c) === stepId) { c.nextLevel = levelOf(r); break; }
  }
  store.save();
}

/** Un registre nou per a aquest resultat (encara sense tria). */
export function record({ step, r, gaps, suggested, suggestedTo, wasOk }) {
  const list = choices();
  const rec = { t: Date.now(), step, level: levelOf(r), gaps: [...(gaps ?? [])], choice: null, suggested, nextLevel: null };
  if (suggestedTo) rec.suggestedTo = suggestedTo;
  if (wasOk) rec.wasOk = true;
  list.push(rec);
  if (list.length > MAX) list.splice(0, list.length - MAX);
  store.save();
  return rec;
}

export function choose(rec, choice, extra = {}) {
  if (!rec) return;
  rec.choice = choice;
  delete rec.to; delete rec.toOk;
  Object.assign(rec, extra);
  store.save();
}

export function updateRecord(rec, fields) { if (!rec) return; Object.assign(rec, fields); store.save(); }

// ---- «Com tries el teu camí» -------------------------------------------------------------------------------------

const effect = (c) => (c.nextLevel == null ? null : Math.sign(c.nextLevel - c.level)); // 1 millora, 0 igual, -1 empitjora
const esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const inf = (choice) => ({ slower: 'baixar el tempo', faster: 'pujar el tempo', 'guide-on': 'posar la guia sonora', 'guide-off': 'treure la guia sonora', strings: 'comprovar l\'acord corda a corda', hand: 'practicar només la mà dreta', back: 'tornar a un pas anterior', repeat: 'repetir igual', next: 'passar al pas següent', done: 'portar-ho al grup' }[choice] ?? lower(CHOICE[choice] ?? choice));

/** Les tries fetes (amb decisió). */
export const decided = (list = choices()) => list.filter((c) => c.choice);
export const MIN_DECISIONS = 5;

/** 2–4 frases a partir del registre: si les tries t'han funcionat (no si coincideixen amb l'eina). */
export function observations(list = choices()) {
  const d = decided(list);
  const out = [];
  // la tria que més fas quan et costa, i com et va
  const hard = d.filter((c) => c.level < 2 && c.choice !== 'done');
  const by = new Map();
  for (const c of hard) { const e = effect(c); if (!by.has(c.choice)) by.set(c.choice, { n: 0, ev: 0, up: 0 }); const x = by.get(c.choice); x.n++; if (e != null) { x.ev++; if (e > 0) x.up++; } }
  const top = [...by.entries()].sort((a, b) => b[1].n - a[1].n)[0];
  if (top && top[1].n >= 2) {
    const [ch, x] = top;
    if (x.ev >= 2) out.push(x.up * 2 >= x.ev
      ? `Quan et costa, sols ${inf(ch)}, i et funciona: has millorat ${x.up} de ${x.ev} vegades.`
      : `Quan et costa, sols ${inf(ch)}, però no sempre et funciona: has millorat ${x.up} de ${x.ev} vegades. De tant en tant, prova una altra cosa.`);
    else out.push(`Quan et costa, la tria que més fas és ${inf(ch)}.`);
  }
  // la tria amb millor resultat (si no és la mateixa)
  const best = [...by.entries()].filter(([, x]) => x.ev >= 2 && x.up > 0).sort((a, b) => b[1].up / b[1].ev - a[1].up / a[1].ev || b[1].ev - a[1].ev)[0];
  if (best && best[0] !== top?.[0]) out.push(`El que més t'ha funcionat és ${inf(best[0])}: has millorat ${best[1].up} de ${best[1].ev} vegades.`);
  // repetir igual en cadena sense millorar
  let run = 0; let chain = false;
  for (const c of d) {
    if (c.choice === 'repeat' && c.level < 2 && (effect(c) ?? 0) <= 0) { run++; if (run >= 3) chain = true; } else run = 0;
  }
  if (chain) out.push('Repeteixes igual moltes vegades seguides sense canviar res. Quan no surt, prova de canviar alguna cosa (el tempo, la guia sonora o practicar la part que falla).');
  // avançar des d'«En procés»
  const early = d.filter((c) => c.choice === 'next' && c.level === 0);
  if (early.length >= 2) {
    const ev = early.filter((c) => c.nextLevel != null);
    const hardAfter = ev.filter((c) => c.nextLevel === 0).length;
    if (ev.length && hardAfter * 2 > ev.length) out.push(`Sovint passes al següent abans d'arribar a «A prop». Quan ho has fet, el pas següent t'ha costat més (${hardAfter} de ${ev.length} vegades hi has quedat «En procés»).`);
    else if (ev.length) out.push(`A vegades passes al següent des d'«En procés», i t'ha anat bé: ${ev.length - hardAfter} de ${ev.length} vegades has arribat a «A prop» o més.`);
    else out.push('Sovint passes al següent abans d\'arribar a «A prop». Fixa\'t com et va el pas següent.');
  }
  // autonomia: treure l'ajuda o pujar el tempo quan ja surt
  const auto = d.filter((c) => AUTONOMY.has(c.choice) && c.level >= 1);
  if (auto.length) {
    const g = auto.some((c) => c.choice === 'guide-off');
    out.push(g ? 'Treus l\'ajuda quan ja estàs a prop: bona decisió, és el camí per deixar l\'eina.' : 'Puges el tempo quan ja et surt: és el camí per deixar l\'eina.');
  }
  // tornar enrere o repetir quan ja ho tens
  const backOk = d.filter((c) => (c.choice === 'back' && c.toOk) || (c.choice === 'repeat' && c.level === 2 && c.wasOk));
  if (backOk.length >= 2) out.push('Tornes a passos que ja tens a «Ja ho tens!»: quan ja ho tens, pots avançar o portar-ho al grup.');
  // quan ja no cal
  const done = d.filter((c) => c.choice === 'done').length;
  if (done && out.length < 4) out.push(`Ja has portat al grup ${done === 1 ? 'una cosa' : `${done} coses`} que ja tenies: d'això es tracta.`);
  if (!out.length) out.push('Encara no hi ha cap patró clar. Continua triant i fixa\'t què et passa al següent intent.');
  return out.slice(0, 4);
}

/** «Les teves últimes decisions» (màx. 8, de la més nova a la més antiga). `title(id)` dona el nom del pas. */
export function lastDecisions(title, list = choices(), n = 8) {
  const label = (ch, to) => esc(ch === 'back' && to ? `Tornar a «${title(to)}»` : CHOICE[ch] ?? ch);
  return decided(list).slice(-n).reverse().map((c) => {
    const after = c.choice === 'done' ? '' : c.nextLevel != null ? ` → després <i>${esc(LEVEL_NAME[c.nextLevel])}</i>` : ' → encara no hi has tornat';
    const other = c.suggested && (c.suggested !== c.choice || (c.suggested === 'back' && c.suggestedTo !== c.to)) ? ` Una altra opció era <i>${label(c.suggested, c.suggestedTo)}</i>.` : '';
    return { html: `Al pas «${esc(title(c.step))}» estaves <i>${esc(LEVEL_NAME[c.level])}</i>: vas triar <b>${label(c.choice, c.to)}</b>${after}.${other}`, rec: c };
  });
}
