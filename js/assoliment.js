// Nivell d'assoliment: En procés / A prop / Ja ho tens!, què t'ha faltat i què pots fer.
// Els valors desats continuen sent 'no' | 'gairebe' | 'ok' (compatibles amb el progrés que ja hi havia).

export const NIVELLS = { no: 'En procés', gairebe: 'A prop', ok: 'Ja ho tens!' };
const RANK = { no: 0, gairebe: 1, ok: 2 };

/** Un pas compta com a fet a partir d'«A prop». */
export const reached = (s) => RANK[s?.best] >= 1;

const escH = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const pill = (status, extra = '') => (status && NIVELLS[status] ? `<span class="lvl-pill lvl-${status}${extra ? ` ${extra}` : ''}">${escH(NIVELLS[status])}</span>` : '<span class="lvl-pill lvl-none">Per fer</span>');

/**
 * Les coses que poden haver fallat. `base`: el pas (per instrument) que treballa aquella habilitat.
 * Els consells reaprofiten els que ja surten als passos.
 */
export const GAPS = {
  notes: {
    t: 'Trobar les posicions (els números)',
    tips: ['Abans de tocar, repassa els números de la pista amb el diagrama: els dits primer, l\'aire després.', 'Les posicions són acumulatives: 1 = Si, 1+2 = La, 1+2+3 = Sol… cada número suma un dit.'],
    base: { alt: 's1a', tenor: 's1a' },
  },
  octava: {
    t: 'La clau d\'octava (l\'apòstrof)',
    tips: ['Els números amb apòstrof (\') porten el polze a la clau d\'octava: mira si la nota que surt és massa greu o massa aguda.', 'Practica el pas de l\'octava al nivell 5 (0 i 6\').'],
    base: { alt: 's5a', tenor: 's5a' },
  },
  canvi: {
    t: 'Canviar de nota a temps',
    tips: ['Prepara els dits just abans del canvi: la pantalla t\'ensenya el número que ve.', 'Practica només el canvi entre dues notes, sense ritme, fins que els dits hi vagin sols (nivell 5).'],
    base: { alt: 's5a', tenor: 's5a' },
  },
  ritme: {
    t: 'Mantenir el ritme de la carta',
    tips: ['Digues el ritme en veu alta abans de tocar-lo («tu, tu, silenci, tu…»).', 'Mira la carta i la pista alhora: cada símbol és una bufada; on no n\'hi ha, l\'aire para.'],
    base: { alt: 's2a', tenor: 's2a' },
  },
  pols: {
    t: 'Mantenir el pols',
    tips: ['Encén el metrònom i compta els temps per dins.', 'Escolta el bombo de la bateria: és el teu punt de referència.'],
    base: { alt: 's1b', tenor: 's1b' },
  },
  banda: {
    t: 'Seguir la banda sense perdre\'m',
    tips: ['Si et perds, no t\'aturis: espera el primer temps del compàs següent i torna a entrar.', 'Escolta primer la banda sense tocar i fixa\'t en la bateria.'],
    base: { alt: 's1a', tenor: 's1a' },
  },
  aire: {
    t: 'L\'aire i el so (notes que es tallen o es repeteixen)',
    tips: ['Agafa aire pel costat de la boca sense treure el broquet, als silencis o entre frases.', 'Una bufada llarga i constant: si l\'aire tremola, la nota es talla i el TravelSax la repeteix.'],
    base: { alt: 's1a', tenor: 's1a' },
  },
  llengua: {
    t: 'La llengua (articulació)',
    tips: ['La llengua toca la punta de la canya dient «tu» i se\'n va de seguida; l\'aire no s\'atura mai.', 'Fes-ho primer amb una sola nota, a negres, molt lent (nivell 6).'],
    base: { alt: 's6a', tenor: 's6a' },
  },
  dinamica: {
    t: 'La dinàmica (fort i fluix)',
    tips: ['Fort: més aire i la gola oberta, no més força als llavis.', 'Fluix: menys aire però sostingut; la nota no ha de caure.'],
    base: { alt: 's3a', tenor: 's3a' },
  },
  on: {
    t: 'Saber on som de la cançó',
    tips: ['Mira l\'estructura de la cançó a la pantalla d\'inici: quantes vegades es repeteix cada part.', 'Compta els compassos de cada part en veu alta mentre escoltes.'],
  },
  veu: {
    t: 'Cantar la melodia',
    tips: ['Escolta la demostració unes quantes vegades abans de cantar.', 'Canta primer només els números («cinc, cinc, quatre-i-mig…») seguint la pista.'],
    base: { alt: 's4a', tenor: 's4a' },
  },
  afinar: {
    t: 'Sentir si va alt o baix',
    tips: ['Escolta el batec entre les dues notes: com més ràpid, més lluny de l\'afinació.', 'Alt = treu el broquet; baix = posa\'l més endins.'],
    base: { alt: 's7a', tenor: 's7a' },
  },
  encaixa: {
    t: 'Trobar notes que encaixin',
    tips: ['Torna a les notes de l\'acord: els números marcats sempre encaixen.', 'Comença i acaba les frases a la fonamental.'],
    base: { alt: 's10a', tenor: 's10a' },
  },
  espai: {
    t: 'Deixar espais (frases i silencis)',
    tips: ['Poques notes i ben col·locades valen més que moltes.', 'Toca dos compassos i calla dos: la banda omple l\'espai.'],
  },
  resposta: {
    t: 'Respondre a la pregunta',
    tips: ['La resposta pot repetir el ritme de la pregunta amb altres notes.', 'Escolta la pregunta sencera abans de començar a respondre.'],
    base: { alt: 's10c', tenor: 's10c' },
  },
};

/** Què pot haver fallat, segons el tipus de pas. */
export function gapsFor(step, instId) {
  const kind = step.kind ?? 'play';
  const t = step.part?.type;
  const out = [];
  if (kind === 'improv') {
    out.push('encaixa', 'espai');
    if (step.mode === 'qa') out.push('resposta');
    out.push('banda', 'pols');
    if (step.mode === 'free') out.push('on');
    return out;
  }
  if (kind === 'tune') return ['afinar'];
  if (kind === 'sing') { out.push('veu', 'pols', 'banda'); if (step.usesSong) out.push('on'); return out; }
  const chords = new Set(String(step.prog ?? '').replace(/\[[^\]]*\]/g, ' ').split(/[|\s]+/).filter(Boolean)).size;
  const card = step.carta ?? step.part?.card;
  out.push('notes');
  if (t === 'melodia' || t === 'segona' || t === 'canvi' || step.nivell >= 5) out.push('octava');
  if (chords > 1 || t === 'canvi' || t === 'melodia' || t === 'segona') out.push('canvi');
  if (step.voice) out.push('veu');
  out.push(card || kind === 'compose' ? 'ritme' : 'pols');
  if (step.part?.dyn) out.push('dinamica');
  if (step.nivell === 6 || step.part?.rhythm === 'E' || step.part?.rhythm === 'S') out.push('llengua');
  out.push('aire', 'banda');
  if (step.usesSong) out.push('on');
  return out;
}

/** Els consells, a partir del que ha fallat (màxim dos per cosa, sense repetir). */
export function tipsFor(gaps) {
  const seen = new Set();
  const out = [];
  for (const g of gaps) for (const tip of (GAPS[g]?.tips ?? []).slice(0, gaps.length > 2 ? 1 : 2)) if (!seen.has(tip)) { seen.add(tip); out.push(tip); }
  return out;
}

export const gapText = (g) => GAPS[g]?.t ?? g;
