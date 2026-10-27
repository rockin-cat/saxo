// La pista: el que ve, de dreta a esquerra, fins a la línia de «ara».
// Fletxes per als rascats (grises si la mà passa sense tocar), bombolles per a les notes,
// el nom de l'acord a cada canvi i la línia de veu quan s'ha de cantar.

const MODE_TEXT = { count: 'COMPTE', demo: 'ESCOLTA', play: 'ARA TU', question: 'PREGUNTA', answer: 'RESPON TU', sing: 'CANTA' };

export function createLane(canvas, { color = '#f97316' } = {}) {
  const ctx2 = canvas.getContext('2d');
  let dpr = 1;
  let w = 0;
  let h = 0;
  let last = null; // l'últim fotograma, per tornar-lo a dibuixar si canvia la mida
  function fit() {
    dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    w = Math.max(200, r.width);
    h = Math.max(100, r.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    if (last) draw(...last);
  }
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(canvas);

  function draw(pos, opts = {}) {
    last = [pos, opts];
    const { voice = false, marks = null, labels = true } = opts;
    const c = ctx2;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#141b2b';
    c.fillRect(0, 0, w, h);
    if (!pos) return;
    const { M } = pos.song;
    const B = M.beats;
    const ppb = w / (B * 2.4); // píxels per negra: hi caben 2,4 compassos
    const nowX = Math.round(w * 0.2);
    const X = (abs) => nowX + (abs - pos.abs) * ppb;
    const rowChord = 20;
    const rowEv = voice ? h * 0.5 : h * 0.6;
    const rowVoice = h - 20;

    const first = Math.max(0, pos.i - 1);
    for (let i = first; i <= pos.i + 3; i++) {
      const bar = pos.bars[i];
      const x0 = X(i * B);
      if (x0 > w + 10) break;
      // fons del compàs segons el moment
      const mode = bar?.seg?.mode;
      c.fillStyle = mode === 'play' || mode === 'answer' ? 'rgba(255,255,255,0.035)' : mode === 'sing' ? 'rgba(154,209,255,0.06)' : mode === 'count' ? 'rgba(253,190,16,0.06)' : 'rgba(0,0,0,0)';
      c.fillRect(x0, 0, B * ppb, h);
      // línies de pulsació i subdivisió
      for (let b = 0; b < B; b += M.pulseLen / M.sub) {
        const x = X(i * B + b);
        const strong = Math.abs(b % M.pulseLen) < 1e-6;
        c.strokeStyle = b === 0 ? 'rgba(255,255,255,0.45)' : strong ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)';
        c.lineWidth = b === 0 ? 2 : 1;
        c.beginPath(); c.moveTo(x, 30); c.lineTo(x, h); c.stroke();
        if (strong) {
          c.fillStyle = 'rgba(255,255,255,0.28)';
          c.font = '600 11px Ubuntu, sans-serif';
          c.fillText(String(Math.round(b / M.pulseLen) + 1), x + 3, 42);
        }
      }
      if (!bar) continue;
      if (mode && MODE_TEXT[mode]) {
        c.fillStyle = mode === 'play' || mode === 'answer' ? color : 'rgba(255,255,255,0.45)';
        c.font = '700 10px Ubuntu, sans-serif';
        c.fillText(MODE_TEXT[mode], x0 + 4, h - 6 - (voice ? 26 : 0));
      }
      const content = bar.content;
      if (!content) {
        // compte enrere
        c.fillStyle = 'rgba(253,190,16,0.8)';
        c.font = '700 22px Ubuntu, sans-serif';
        for (let p = 0; p < M.pulses; p++) c.fillText(String(p + 1), X(i * B + p * M.pulseLen) + 6, rowEv + 8);
        continue;
      }
      // nom de la part (estructura de la cançó)
      if (content.bar.part) {
        c.fillStyle = '#fdbe10';
        c.font = '700 11px Ubuntu, sans-serif';
        const tw = c.measureText(content.bar.part.toUpperCase()).width;
        c.fillRect(x0 + 2, 2, tw + 10, 15);
        c.fillStyle = '#111';
        c.fillText(content.bar.part.toUpperCase(), x0 + 7, 13);
      }
      // acords
      for (const seg of content.bar) {
        const x = X(i * B + seg.start * B);
        c.fillStyle = '#fff';
        c.font = '700 16px Ubuntu, sans-serif';
        c.fillText(seg.chord.symbol, x + 6, content.bar.part && seg.start === 0 ? rowChord + 10 : rowChord);
      }
      // esdeveniments de la part
      const showPart = mode !== 'answer' || false;
      if (showPart) {
        for (const e of content.part) {
          const x = X(i * B + e.beat);
          const len = Math.max(6, e.dur * ppb - 4);
          const past = i * B + e.beat + e.dur < pos.abs;
          c.globalAlpha = past ? 0.35 : 1;
          if (e.kind === 'strum') arrow(c, x, rowEv, e.dir, e.ghost, color, len);
          else if (e.tied) tie(c, x, rowEv, len);
          else bubble(c, x, rowEv, labels ? e.label : '', color, len, labels ? e.role : '');
          if (e.dyn && !e.tied) { c.fillStyle = '#fdbe10'; c.font = 'italic 700 14px Georgia, serif'; c.fillText(e.dyn, x + 8, rowEv - 24); }
          c.globalAlpha = 1;
        }
      }
      if (voice) {
        for (const v of content.voice) {
          const x = X(i * B + v.beat);
          c.fillStyle = v.speak ? '#fdbe10' : '#9ad1ff';
          c.font = `${v.speak ? 700 : 600} 15px Ubuntu, sans-serif`;
          c.fillText(v.text, x + 2, rowVoice);
          if (v.sing) { c.fillStyle = 'rgba(154,209,255,0.25)'; c.fillRect(x, rowVoice + 5, Math.max(4, v.dur * ppb - 4), 3); }
        }
      }
    }
    // el que ha sentit el joc: un anell de color al cop que tocava i un punt on has tocat tu
    if (marks?.length) {
      const COL = { ok: '#44d17a', mid: '#ffb347', bad: '#ff5a5a' };
      for (const m of marks) {
        const x = X(m.abs);
        if (x < -20 || x > w + 20) continue;
        c.strokeStyle = c.fillStyle = COL[m.cls] ?? '#fff';
        if (m.ring) {
          c.lineWidth = 3;
          c.beginPath(); c.arc(x + 8, rowEv, 21, 0, Math.PI * 2); c.stroke();
        } else {
          c.beginPath(); c.arc(x, rowEv + 30, 5, 0, Math.PI * 2); c.fill();
          c.lineWidth = 2;
          c.beginPath(); c.moveTo(x, rowEv + 22); c.lineTo(x, rowEv + 38); c.stroke();
        }
      }
    }
    // la línia d'ara
    c.strokeStyle = '#fdbe10';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(nowX, 26); c.lineTo(nowX, h); c.stroke();
    c.fillStyle = '#fdbe10';
    c.beginPath(); c.moveTo(nowX - 7, 26); c.lineTo(nowX + 7, 26); c.lineTo(nowX, 34); c.fill();
  }

  return { draw, fit, destroy: () => ro.disconnect() };
}

function arrow(c, x, y, dir, ghost, color, len) {
  const hgt = 34;
  c.strokeStyle = ghost ? 'rgba(255,255,255,0.28)' : color;
  c.fillStyle = c.strokeStyle;
  c.lineWidth = ghost ? 2 : 4;
  const a = dir === 'D' ? y - hgt / 2 : y + hgt / 2;
  const b = dir === 'D' ? y + hgt / 2 : y - hgt / 2;
  c.beginPath(); c.moveTo(x + 8, a); c.lineTo(x + 8, b); c.stroke();
  const s = dir === 'D' ? 1 : -1;
  c.beginPath(); c.moveTo(x + 1, b - 9 * s); c.lineTo(x + 15, b - 9 * s); c.lineTo(x + 8, b + 2 * s); c.fill();
  if (!ghost && len > 24) {
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.fillRect(x + 16, y - 3, len - 16, 6);
  }
}

function bubble(c, x, y, label, color, len, role) {
  const r = 16;
  c.fillStyle = 'rgba(255,255,255,0.1)';
  c.fillRect(x + r, y - 4, Math.max(0, len - r), 8);
  c.fillStyle = color;
  c.beginPath(); c.arc(x + r, y, r, 0, Math.PI * 2); c.fill();
  const s = String(label ?? '');
  if (s) {
    c.fillStyle = '#111';
    c.font = `700 ${s.length > 3 ? 10 : s.length > 2 ? 12 : 15}px Ubuntu, sans-serif`;
    c.textAlign = 'center';
    c.fillText(s, x + r, y + 5);
    c.textAlign = 'left';
  }
  if (role) { c.fillStyle = 'rgba(255,255,255,0.55)'; c.font = '600 10px Ubuntu, sans-serif'; c.fillText(role, x + r + 12, y + 22); }
}
/** La continuació d'una nota que ve del compàs anterior (no es torna a atacar). */
function tie(c, x, y, len) {
  c.fillStyle = 'rgba(255,255,255,0.1)';
  c.fillRect(x, y - 4, Math.max(4, len), 8);
}
