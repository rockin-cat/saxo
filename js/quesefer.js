// «Què sé fer»: les pestanyes «Com vas» i «Historial» (les mateixes a guitarra i baix i a saxo).
// «Com vas» comença per com t'estudies: per a cada estratègia que tries després de tocar,
// com t'ha anat l'intent següent (avaluació formadora). No mira si coincideix amb el que proposava l'eina.

import { CHOICE, choices, decided, observations, lastDecisions, MIN_DECISIONS } from './autoregulacio.js';
import { NIVELLS, GAPS } from './assoliment.js';

const esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NIV = [NIVELLS.no, NIVELLS.gairebe, NIVELLS.ok];
const NIV_CLS = ['no', 'gairebe', 'ok'];
const TABS = [['banda', 'A la banda'], ['com', 'Com vas'], ['hist', 'Historial']];

/** Els botons de les pestanyes (clic: `data-qtab`). */
export function tabsHtml(tab) {
  return `<div class="qsf-tabs" role="tablist">${TABS.map(([id, t]) => `<button type="button" class="qsf-tab" role="tab" aria-selected="${id === tab}" data-qtab="${id}">${t}</button>`).join('')}</div>`;
}

const results = () => choices().filter((c) => c.step);
const dia = (t) => new Date(t).toISOString().slice(0, 10);

/** «Com vas». `title(id)` dona el nom d'un pas; `next` és { id, text } del pas que toca; `instId` per als passos de base. */
export function comVasHtml({ title, next, instId, total, fets }) {
  const R = results();
  const D = decided();
  const dies = new Set(R.map((c) => dia(c.t))).size;
  const kpis = `<div class="qsf-kpis">
    <div class="qsf-kpi"><b>${fets}/${total}</b><span>passos a «${esc(NIVELLS.ok)}»</span></div>
    <div class="qsf-kpi"><b>${R.length}</b><span>vegades que has tocat un pas</span></div>
    <div class="qsf-kpi"><b>${dies}</b><span>${dies === 1 ? 'dia' : 'dies'} que has practicat</span></div></div>`;

  // Com t'estudies
  const intro = `<h3>Com t’estudies</h3><p class="muted small">Quan acabes de tocar, tries com continuar: baixar el tempo, posar la guia, practicar la part que falla… Aquí veus quines d’aquestes estratègies t’ajuden a millorar. El que compta és com et va l’intent següent.</p>`;
  let estrat;
  if (D.length < MIN_DECISIONS) {
    estrat = `${intro}<p class="qsf-buit">Has triat ${D.length} ${D.length === 1 ? 'vegada' : 'vegades'}. A partir de ${MIN_DECISIONS} tries, aquí veuràs què et funciona.</p>`;
  } else {
    const rows = Object.keys(CHOICE).filter((id) => id !== 'done').map((id) => {
      const mine = D.filter((c) => c.choice === id);
      if (!mine.length) return null;
      const r = mine.filter((c) => c.nextLevel != null);
      const g = r.filter((c) => c.nextLevel > c.level).length;
      const w = r.filter((c) => c.nextLevel < c.level).length;
      return { id, n: mine.length, r: r.length, g, s: r.length - g - w, w };
    }).filter(Boolean).sort((a, b) => b.n - a.n);
    const pc = (x, r) => (r ? (x / r) * 100 : 0);
    const last = lastDecisions(title);
    estrat = `${intro}
      <ul class="qsf-ins">${observations().map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <h4>Cada estratègia, i com t’ha anat després</h4>
      <div class="qsf-taula">${rows.map((x) => `<div class="qsf-row"><span class="nm">${esc(CHOICE[x.id])}</span><span class="n">${x.n}×</span>
        <span class="qsf-bar" title="Després: millor ${x.g} · igual ${x.s} · pitjor ${x.w}">${x.r ? `<i class="g" style="width:${pc(x.g, x.r)}%"></i><i class="s" style="width:${pc(x.s, x.r)}%"></i><i class="w" style="width:${pc(x.w, x.r)}%"></i>` : ''}</span>
        <b>${x.r ? `${x.g} de ${x.r}` : '—'}</b></div>`).join('')}</div>
      <p class="qsf-llegenda"><span><i class="g"></i>t’ha anat millor</span><span><i class="s"></i>igual</span><span><i class="w"></i>pitjor</span><span>«3 de 5»: millor 3 de les 5 vegades que hem pogut veure l’intent següent</span></p>
      ${last.length ? `<details class="cami-last"><summary>Les teves últimes decisions</summary><ul>${last.map((x) => `<li>${x.html}</li>`).join('')}</ul></details>` : ''}`;
  }

  // Què et convé practicar: el pas que toca i el que més et falta (dels últims intents)
  const recs = [];
  if (next) recs.push(`<li><p>El següent pas del full de ruta: <b>${esc(next.text)}</b>.</p><button type="button" class="btn btn-primary btn-small" data-step="${esc(next.id)}">▶ Continua</button></li>`);
  const cnt = {};
  for (const c of R.slice(-20)) for (const g of c.gaps ?? []) if (GAPS[g]) cnt[g] = (cnt[g] ?? 0) + 1;
  for (const [g, n] of Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 2)) {
    const base = GAPS[g].base?.[instId];
    recs.push(`<li><p><b>${esc(GAPS[g].t)}</b> és el que més t’ha faltat últimament (${n} ${n === 1 ? 'vegada' : 'vegades'}). ${esc(GAPS[g].tips?.[0] ?? '')}</p>${base ? `<button type="button" class="btn btn-ghost btn-small" data-step="${esc(base)}">Practica «${esc(title(base))}»</button>` : ''}</li>`);
  }

  return `<div class="qsf-com">
    <div class="panel qsf-estrat">${estrat}</div>
    <div class="qsf-dreta">${kpis}
      <div class="panel"><h3>Què et convé practicar</h3>${R.length ? `<ul class="qsf-recs">${recs.join('')}</ul>` : '<p class="muted">Quan hagis tocat algun pas, aquí veuràs què et convé practicar.</p>'}</div></div>
  </div>`;
}

/** «Historial»: els últims passos que has tocat, com t'han anat i què vas decidir després. */
export function historialHtml({ title }) {
  const R = results().slice(-60).reverse();
  if (!R.length) return '<div class="panel"><p class="muted">Encara no has tocat cap pas. Quan en toquis, aquí sortiran.</p></div>';
  const fmt = (t) => new Date(t).toLocaleString('ca', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const fx = (c) => (c.nextLevel == null ? '' : c.nextLevel > c.level ? ' <span class="qsf-fx g" title="Després t’ha anat millor">↑</span>' : c.nextLevel < c.level ? ' <span class="qsf-fx w" title="Després t’ha anat pitjor">↓</span>' : ' <span class="qsf-fx s" title="Després igual">=</span>');
  return `<div class="panel qsf-hist"><h3>Les últimes vegades que has tocat</h3><table><thead><tr><th>Quan</th><th>Pas</th><th>On eres</th><th>Què et va faltar</th><th>Què vas triar</th></tr></thead><tbody>
    ${R.map((c) => `<tr><td>${fmt(c.t)}</td><td>${esc(title(c.step))}</td><td><span class="qsf-niv ${NIV_CLS[c.level] ?? ''}">${esc(NIV[c.level] ?? '')}</span></td>
      <td>${(c.gaps ?? []).filter((g) => GAPS[g]).map((g) => esc(GAPS[g].t)).join(' · ') || '<span class="muted">—</span>'}</td>
      <td>${c.choice ? `${esc(CHOICE[c.choice] ?? c.choice)}${fx(c)}` : '<span class="muted">—</span>'}</td></tr>`).join('')}
  </tbody></table></div>`;
}
