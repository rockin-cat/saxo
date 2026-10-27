// L'animació del saxo: el diagrama de claus (el mateix del Generador de diagrames), el número que toca ara,
// el que ve després i, a la improvisació, les notes que encaixen.

import { SAXO } from './saxo-core.js';
import { writtenName, realName, numOf } from './instruments.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DYN = { p: 'fluix', mf: 'mig', f: 'fort' };

export function createSaxView(host, inst) {
  host.innerHTML = `
    <div class="saxview" style="--accent:${inst.color}">
      <div class="sv-main">
        <div class="sv-diagram" data-sv="diagram"></div>
        <div class="sv-now">
          <small data-sv="label">ARA</small>
          <b class="sv-num" data-sv="num">—</b>
          <span class="sv-name" data-sv="name"></span>
          <span class="sv-dyn" data-sv="dyn" hidden></span>
          <span class="sv-you" data-sv="you" hidden></span>
        </div>
        <div class="sv-next" data-sv="next" hidden>
          <small>ARA VE</small>
          <div class="sv-mini" data-sv="nextdiag"></div>
          <b data-sv="nextnum"></b>
        </div>
      </div>
      <div class="sv-scale" data-sv="scale" hidden></div>
      <div class="sv-caption" data-sv="caption"></div>
    </div>`;
  const $ = (k) => host.querySelector(`[data-sv="${k}"]`);
  const el = { diagram: $('diagram'), num: $('num'), name: $('name'), dyn: $('dyn'), you: $('you'), next: $('next'), nextdiag: $('nextdiag'), nextnum: $('nextnum'), scale: $('scale'), caption: $('caption'), label: $('label') };
  let drawn = null; // número dibuixat al diagrama gran
  let drawnNext = null;
  let scaleKey = null;
  let youTimer = 0;

  function bigDiagram(num) {
    if (drawn === num) return;
    drawn = num;
    el.diagram.innerHTML = num == null ? SAXO.svgDiagrama('0', { ample: 150 }).replace('class="saxo-diagrama"', 'class="saxo-diagrama empty"') : SAXO.svgDiagrama(num, { ample: 150 });
  }

  const api = {
    /** { mode: 'note', cur, next, showNext, label } · { mode: 'scale', notes: [{ num, midi, role, cls }], label, key } · { mode: 'idle' } */
    show(view) {
      if (view.mode === 'scale') {
        el.scale.hidden = false;
        host.querySelector('.saxview').classList.add('scale-mode');
        if (scaleKey !== view.key) {
          scaleKey = view.key;
          el.scale.innerHTML = view.notes.map((n) => `<div class="sv-chip ${n.cls ?? ''}" data-num="${esc(n.num)}"><div class="sv-mini">${SAXO.svgDiagrama(n.num, { ample: 54 })}</div><b>${esc(n.num)}</b><small>${esc(n.role ?? '')}</small></div>`).join('');
        }
        el.caption.textContent = view.label ?? '';
        el.label.textContent = 'TRIA UNA';
        el.num.textContent = '';
        el.name.textContent = '';
        el.next.hidden = true;
        el.dyn.hidden = true;
        return;
      }
      el.scale.hidden = true;
      host.querySelector('.saxview').classList.remove('scale-mode');
      scaleKey = null;
      const cur = view.cur;
      el.label.textContent = view.tag ?? 'ARA';
      if (cur && cur.num != null) {
        bigDiagram(cur.num);
        el.num.textContent = cur.num;
        el.num.classList.toggle('long', String(cur.num).length > 3);
        el.name.textContent = `${writtenName(inst, cur.midi)}${cur.role ? ` · ${cur.role}` : ''}`;
        el.dyn.hidden = !cur.dyn;
        if (cur.dyn) { el.dyn.textContent = cur.dyn; el.dyn.dataset.d = cur.dyn; el.dyn.title = DYN[cur.dyn] ?? ''; }
      } else {
        bigDiagram(null);
        el.num.textContent = cur?.label ?? '—';
        el.name.textContent = cur?.midi != null ? `${realName(cur.midi)} (fora del rang)` : '';
        el.dyn.hidden = true;
      }
      const nx = view.showNext ? view.next : null;
      if (nx && nx.num != null && nx.num !== cur?.num) {
        el.next.hidden = false;
        if (drawnNext !== nx.num) { drawnNext = nx.num; el.nextdiag.innerHTML = SAXO.svgDiagrama(nx.num, { ample: 60 }); }
        el.nextnum.textContent = nx.num;
      } else el.next.hidden = true;
      el.caption.textContent = view.label ?? '';
    },
    /** El que ha tocat l'alumnat (nota real MIDI): surt al costat del número, de color segons el veredicte. */
    played(midi, cls = '') {
      const num = numOf(inst, midi);
      el.you.hidden = false;
      el.you.textContent = num ?? realName(midi);
      el.you.className = `sv-you ${cls}`;
      clearTimeout(youTimer);
      youTimer = setTimeout(() => { el.you.hidden = true; }, 1200);
      for (const c of el.scale.querySelectorAll('.sv-chip')) c.classList.toggle('lit', c.dataset.num === num);
    },
    released() { for (const c of el.scale.querySelectorAll('.sv-chip')) c.classList.remove('lit'); },
    clear() { bigDiagram(null); el.num.textContent = '—'; el.name.textContent = ''; el.next.hidden = true; el.dyn.hidden = true; el.caption.textContent = ''; },
    animate() { /* res a animar per fotograma: el diagrama es redibuixa quan canvia la nota */ },
  };
  api.clear();
  return api;
}
