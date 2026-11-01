/* U1: the main IC on its breakout module, one pin per core skill */
(function(){
'use strict';
var P = window.PVN, svg = document.getElementById('u1'), cap = document.getElementById('u1Probe');
if (!P || !svg) return;
var S = P.s, C = 280, K = 2.2, POS = [210, 238, 266, 294, 322, 350];
/* package order: left side top to bottom, bottom side left to right,
   right side bottom to top, top side right to left */
var PINS = [
  ['L','sv'],['L','verilog'],['L','uvm'],['L','sva'],['L','crv'],['L','cov'],
  ['B','fpga'],['B','stm32'],['B','esp32'],['B','arduino'],['B','rpi'],['B','rtos'],
  ['R','ts'],['R','js'],['R','matlab'],['R','python'],['R','emc'],['R','c'],
  ['T','pd'],['T','dft'],['T','asic'],['T','sta'],['T','cdc'],['T','amba']
];
var DEFAULT = 'U1 · PVN-G · 24 pins. Hover or tap a pin to probe its net.';
var pins = [], hover = -1, kbd = 0, visible = true;

function route(side, p){
  var e = C + (p - C) * K, d = Math.abs(e - p);
  if (side === 'L') return [[140,p],[118,p],[118-d,e],[8,e]];
  if (side === 'R') return [[420,p],[442,p],[442+d,e],[552,e]];
  if (side === 'T') return [[p,140],[p,118],[e,118-d],[e,8]];
  return [[p,420],[p,442],[e,442+d],[e,552]];
}
function d(pts){ return 'M' + pts.map(function(q){ return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' L'); }

var defs = S('defs', null, svg);
var cp = S('clipPath', { id: 'u1clip' }, defs);
S('rect', { x: 8, y: 8, width: 544, height: 544, rx: 22 }, cp);
S('rect', { class: 'm-board', x: 8, y: 8, width: 544, height: 544, rx: 22 }, svg);
var gT = S('g', null, svg), gC = S('g', { 'clip-path': 'url(#u1clip)' }, svg);
[[40,40],[520,40],[40,520],[520,520]].forEach(function(m){ S('circle', { class: 'm-mount', cx: m[0], cy: m[1], r: 11 }, svg); });

function part(x, y, rot, kind, label, lx, ly, anchor){
  var g = S('g', { transform: 'translate(' + x + ' ' + y + ') rotate(' + rot + ')' }, svg);
  if (kind === 'xtal') {
    S('rect', { class: 'm-cpad', x: -19, y: -6, width: 7, height: 12, rx: 1 }, g);
    S('rect', { class: 'm-cpad', x: 12, y: -6, width: 7, height: 12, rx: 1 }, g);
    S('rect', { class: 'm-comp', x: -14, y: -7, width: 28, height: 14, rx: 7 }, g);
  } else {
    S('rect', { class: 'm-cpad', x: -15, y: -5.5, width: 7, height: 11, rx: 1 }, g);
    S('rect', { class: 'm-cpad', x: 8, y: -5.5, width: 7, height: 11, rx: 1 }, g);
    S('rect', { class: 'm-comp', x: -9, y: -5, width: 18, height: 10, rx: 1.5 }, g);
  }
  S('text', { class: 'm-silk', x: lx, y: ly, 'text-anchor': anchor }, svg).textContent = label;
}
part(92, 92, 45, 'cap', 'C1', 112, 82, 'start');
part(468, 92, -45, 'cap', 'C2', 448, 82, 'end');
part(92, 468, -45, 'res', 'R1', 112, 488, 'start');
part(468, 468, 45, 'xtal', 'Y1', 448, 488, 'end');
S('text', { class: 'm-silk', x: 152, y: 152, 'text-anchor': 'end' }, svg).textContent = 'U1';

S('rect', { class: 'm-body', x: 160, y: 160, width: 240, height: 240, rx: 10 }, svg);
S('circle', { class: 'm-dot', cx: 195, cy: 195, r: 6 }, svg);
var mk = S('text', { class: 'm-mark', x: 280, y: 288, 'text-anchor': 'middle' }, svg); mk.textContent = 'PVN-G';
S('text', { class: 'm-sub', x: 280, y: 310, 'text-anchor': 'middle' }, svg).textContent = 'RTL · FPGA · WEB';
S('text', { class: 'm-sub', x: 280, y: 328, 'text-anchor': 'middle' }, svg).textContent = 'RVCE 2327 BLR';

var gPulse = S('g', null, svg), gHit = S('g', null, svg);

PINS.forEach(function(pin, i){
  var side = pin[0], net = pin[1], k = i % 6;
  var p = (side === 'L' || side === 'B') ? POS[k] : POS[5 - k];
  var pts = route(side, p), poly = P.poly(pts), end = pts[3];
  var tr = S('path', { class: 'm-trace', d: d(pts) }, gT);
  S('circle', { class: 'm-cast', cx: end[0], cy: end[1], r: 8 }, gC);
  S('circle', { class: 'm-hole', cx: end[0], cy: end[1], r: 3.5 }, gC);
  var r = side === 'L' ? [140, p-6, 20, 12] : side === 'R' ? [400, p-6, 20, 12] : side === 'T' ? [p-6, 140, 12, 20] : [p-6, 400, 12, 20];
  var pr = S('rect', { class: 'm-pin', x: r[0], y: r[1], width: r[2], height: r[3], rx: 1.5 }, svg);
  var t;
  if (side === 'L') t = S('text', { class: 'm-lbl', x: 170, y: p + 4 }, svg);
  else if (side === 'R') t = S('text', { class: 'm-lbl', x: 390, y: p + 4, 'text-anchor': 'end' }, svg);
  else if (side === 'T') t = S('text', { class: 'm-lbl', x: p - 4, y: 170, transform: 'rotate(90 ' + (p - 4) + ' 170)' }, svg);
  else t = S('text', { class: 'm-lbl', x: p + 4, y: 390, transform: 'rotate(-90 ' + (p + 4) + ' 390)' }, svg);
  t.textContent = P.NETS[net].short;
  var hb = side === 'L' ? [136, p-13, 70, 26] : side === 'R' ? [354, p-13, 70, 26] : side === 'T' ? [p-13, 136, 26, 70] : [p-13, 354, 26, 70];
  var hit = S('rect', { class: 'm-hit', x: hb[0], y: hb[1], width: hb[2], height: hb[3], rx: 4 }, gHit);
  var halo = S('circle', { class: 'm-glow', r: 8, cx: -50, cy: -50 }, gPulse);
  var dot = S('circle', { class: 'm-pulse', r: 3.6, cx: -50, cy: -50 }, gPulse);
  pins.push({ net: net, tr: tr, pin: pr, lbl: t, poly: poly, dot: dot, halo: halo, s: Math.random() * poly.len, hot: false });
  hit.addEventListener('pointerenter', function(){ hover = i; update(); });
  hit.addEventListener('pointerleave', function(){ if (hover === i) { hover = -1; update(); } });
  hit.addEventListener('click', function(){ select(i); });
});

function pad2(n){ return (n < 10 ? '0' : '') + n; }
function loads(net){
  var u = P.usersOf(net);
  return u.length ? 'drives ' + u.map(function(p){ return p.name; }).join(', ') : 'listed skill';
}
function say(i){
  if (!cap) return;
  if (i < 0) {
    var f = P.focus;
    if (f && f.type === 'net' && P.NETS[f.id]) {
      cap.innerHTML = 'NET <b>' + P.NETS[f.id].name + '</b> energized. <a href="#projects">Trace it on the schematic ↓</a>';
    } else cap.textContent = DEFAULT;
    return;
  }
  var n = P.NETS[pins[i].net];
  cap.innerHTML = 'PIN ' + pad2(i + 1) + ' · ' + n.short + ' → <b>' + n.name + '</b> · ' + loads(pins[i].net);
}
function update(){
  var f = P.focus, fp = f && f.type === 'project' ? P.project(f.id) : null;
  pins.forEach(function(q, i){
    var hot = i === hover || (f && f.type === 'net' && f.id === q.net);
    var lt = !hot && fp && fp.nets.indexOf(q.net) > -1;
    q.hot = hot;
    q.tr.classList.toggle('hot', hot); q.pin.classList.toggle('hot', hot); q.lbl.classList.toggle('hot', hot);
    q.tr.classList.toggle('lit', !!lt); q.pin.classList.toggle('lit', !!lt);
  });
  say(hover);
}
function select(i){
  var net = pins[i].net;
  var f = P.focus;
  if (f && f.type === 'net' && f.id === net) P.setFocus(null, 'u1');
  else P.setFocus({ type: 'net', id: net }, 'u1');
}

svg.setAttribute('tabindex', '0');
svg.addEventListener('focus', function(){ hover = kbd; update(); });
svg.addEventListener('blur', function(){ hover = -1; update(); });
svg.addEventListener('keydown', function(e){
  var k = e.key;
  if (k === 'ArrowRight' || k === 'ArrowDown') kbd = (kbd + 1) % 24;
  else if (k === 'ArrowLeft' || k === 'ArrowUp') kbd = (kbd + 23) % 24;
  else if (k === 'Enter' || k === ' ') { select(kbd); }
  else return;
  e.preventDefault(); hover = kbd; update();
});

P.on('focus', update);
if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ visible = es[0].isIntersecting; }).observe(svg);

function hidePulses(){ pins.forEach(function(q){ q.dot.setAttribute('cx', -50); q.halo.setAttribute('cx', -50); }); }
P.addTicker({
  tick: function(t, dt){
    if (!visible) return;
    pins.forEach(function(q){
      q.s += dt * (q.hot ? 150 : 46);
      if (q.s > q.poly.len) q.s = -Math.random() * 140;
      if (q.s < 0) { q.dot.setAttribute('cx', -50); q.halo.setAttribute('cx', -50); return; }
      var a = P.at(q.poly, q.s);
      q.dot.setAttribute('cx', a[0].toFixed(1)); q.dot.setAttribute('cy', a[1].toFixed(1));
      q.halo.setAttribute('cx', a[0].toFixed(1)); q.halo.setAttribute('cy', a[1].toFixed(1));
    });
  },
  still: hidePulses
});

/* power-on moment: pins light up in package order */
if (P.motion) {
  pins.forEach(function(q, i){
    setTimeout(function(){
      q.tr.classList.add('boot'); q.pin.classList.add('hot');
      setTimeout(function(){ q.tr.classList.remove('boot'); if (!q.hot) q.pin.classList.remove('hot'); }, 520);
    }, 350 + i * 42);
  });
}
update();
})();
