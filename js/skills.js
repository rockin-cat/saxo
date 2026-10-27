// «Què sé fer»: el que s'ha desbloquejat al joc i què vol dir per a la banda.

import { LEVELS, stepFits } from './levels.js';
import { cardById, cardMetre } from './data/cartes.js';
import * as store from './store.js';
import { reached } from './assoliment.js';

/** Què pots fer a la banda quan tens un nivell (per instrument). */
export const BANDA = {
  1: 'Pots tocar amb la banda: la melodia de la cançó o una línia que acompanya amb les notes dels acords.',
  2: 'Pots canviar el ritme del que toques segons la part de la cançó: una estrofa més tranquil·la, una tornada més moguda.',
  3: 'Pots tocar fort i fluix: el saxo pot sortir al davant o quedar-se darrere de la veu.',
  4: 'Pots cantar la melodia abans de tocar-la: aprens les cançons d\'oïda i les fas teves.',
  5: 'Els canvis difícils de digitació ja no t\'aturen: pots tocar melodies amb salts i amb el pas de l\'octava.',
  6: 'Pots articular amb la llengua: el ritme del saxo es nota, net i clar, sense talls d\'aire.',
  7: 'Pots afinar el saxo sense ajuda abans d\'assajar: la banda sona afinada.',
  8: 'Pots fer una segona veu: dos saxos (o un saxo i la veu) que van junts.',
  9: 'Pots proposar una introducció o un solo per a la cançó del grup.',
  10: 'Pots fer un solo: la banda et deixa un espai i hi improvises.',
};
const BANDA_BY = { alt: BANDA, tenor: BANDA };

/** Resum de tot el que ha desbloquejat qui toca, nivell a nivell. */
export function summary(instId) {
  const ws = store.workSong();
  const metre = ws?.metre ?? '4/4';
  const levels = LEVELS[instId].map((l) => {
    const steps = l.passos.filter((p) => stepFits(p, metre, (id) => cardMetre(cardById(id)), !!(ws?.saxo?.length)));
    const ok = steps.filter((p) => store.stepState(p.id)?.best === 'ok');
    const almost = steps.filter((p) => store.stepState(p.id)?.best === 'gairebe');
    // cartes que surten (passos «Totes les cartes» i cartes dels passos)
    const cards = [];
    for (const p of steps) {
      if (store.stepState(p.id)?.best === 'ok' && p.carta) cards.push(p.carta);
      if (p.kind === 'cards') for (const [k, v] of Object.entries(store.player()?.steps ?? {})) if (k.startsWith(`${p.id}:`) && reached(v)) cards.push(k.split(':')[1]);
    }
    const banda = BANDA_BY[instId][l.n] ?? '';
    // un pas compta com a fet a partir d'«A prop»; els de «Totes les cartes», quan alguna carta ho és
    const doneSteps = steps.filter((p) => reached(store.stepState(p.id)) || (p.kind === 'cards' && Object.entries(store.player()?.steps ?? {}).some(([k, v]) => k.startsWith(`${p.id}:`) && reached(v))));
    return { level: l, steps, ok, almost, cards: [...new Set(cards)], banda, unlocked: ok.length + almost.length > 0, doneCount: doneSteps.length, done: steps.length && doneSteps.length === steps.length };
  });
  return { levels, song: ws };
}
