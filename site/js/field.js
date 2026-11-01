/* background copper field: random PCB routing, pulses, and a pointer "probe" that lights traces */
(function(){
'use strict';
var P = window.PVN, cv = document.getElementById('field');
if (!P || !cv || !cv.getContext) return;
var ctx = cv.getContext('2d');
var dim = document.createElement('canvas'), lit = document.createElement('canvas'), tmp = document.createElement('canvas');
var W = 0, H = 0, dpr = 1, R = 150, traces = [], labels = [], pulses = [], col = {};
var probe = { x: -9999, y: -9999, on: false }, pending = 0;
var DIRS = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
function rnd(n){ return Math.floor(Math.random() * n); }
function colors(){
  col = { trace: P.css('--trace'), line: P.css('--line'), pad: P.css('--pad'), silk: P.css('--silk-dim'),
          signal: P.css('--signal'), board: P.css('--board') };
}
function generate(){
  var cell = W < 640 ? 22 : 26, cols = Math.ceil(W / cell) + 2, rows = Math.ceil(H / cell) + 2;
  var occ = new Uint8Array(cols * rows);
  function used(x, y){ return x < 0 || y < 0 || x >= cols || y >= rows || occ[y * cols + x] === 1; }
  traces = []; labels = [];
  var want = Math.round(cols * rows / 21), tries = want * 8;
  while (traces.length < want && tries-- > 0) {
    var x = rnd(cols), y = rnd(rows);
    if (used(x, y)) continue;
    var d = rnd(4) * 2, pts = [[x, y]], since = 0, len = 5 + rnd(17);
    occ[y * cols + x] = 1;
    for (var s = 0; s < len; s++) {
      var turn = (d % 2) ? (since >= 2 ? 0.55 : 0) : (since >= 3 ? 0.16 : 0);
      if (Math.random() < turn) { d = (d + (Math.random() < 0.5 ? 1 : 7)) % 8; since = 0; }
      var dx = DIRS[d][0], dy = DIRS[d][1], nx = x + dx, ny = y + dy;
      if (used(nx, ny)) break;
      if (d % 2 && (used(x + dx, y) || used(x, y + dy))) break;
      x = nx; y = ny; occ[y * cols + x] = 1; pts.push([x, y]); since++;
    }
    if (pts.length < 3) continue;
    var px = [];
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (i > 0 && i < pts.length - 1) {
        var a = pts[i-1], b = pts[i+1];
        if (p[0] - a[0] === b[0] - p[0] && p[1] - a[1] === b[1] - p[1]) continue;
      }
      px.push([p[0] * cell - cell / 2, p[1] * cell - cell / 2]);
    }
    var t = P.poly(px);
    t.ea = Math.random() < 0.78 ? 'via' : 'pad';
    t.eb = Math.random() < 0.85 ? 'via' : 'pad';
    traces.push(t);
    if (Math.random() < 0.07) {
      var q = px[0], kinds = ['R', 'C', 'C', 'U', 'L', 'D', 'Q', 'TP'];
      labels.push({ x: q[0] + 9, y: q[1] - 9, t: kinds[rnd(kinds.length)] + (1 + rnd(48)) });
    }
  }
  var cand = traces.filter(function(t){ return t.len > 120; });
  var n = Math.min(26, Math.round(cand.length / 5));
  pulses = [];
  for (var k = 0; k < n; k++) pulses.push(spawn({}, cand, true));
}
function spawn(p, cand, first){
  cand = cand || traces.filter(function(t){ return t.len > 120; });
  if (!cand.length) return p;
  p.t = cand[rnd(cand.length)];
  p.s = first ? Math.random() * p.t.len : -Math.random() * 260;
  p.v = 55 + Math.random() * 95;
  p.rev = Math.random() < 0.5;
  return p;
}
function paint(c, trace, via, pad, silk){
  var g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 2.4; g.strokeStyle = trace;
  g.beginPath();
  traces.forEach(function(t){ t.pts.forEach(function(p, i){ if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); });
  g.stroke();
  traces.forEach(function(t){
    [[t.pts[0], t.ea], [t.pts[t.pts.length - 1], t.eb]].forEach(function(e){
      var p = e[0];
      if (e[1] === 'via') {
        g.beginPath(); g.arc(p[0], p[1], 4.3, 0, Math.PI * 2);
        g.fillStyle = col.board; g.fill(); g.lineWidth = 2.2; g.strokeStyle = via; g.stroke();
      } else {
        g.globalAlpha = pad.a; g.fillStyle = pad.c;
        g.beginPath();
        if (g.roundRect) g.roundRect(p[0] - 4.5, p[1] - 4.5, 9, 9, 1.5); else g.rect(p[0] - 4.5, p[1] - 4.5, 9, 9);
        g.fill(); g.globalAlpha = 1;
      }
    });
  });
  g.globalAlpha = silk.a; g.fillStyle = silk.c;
  g.font = '11px "Share Tech Mono", ui-monospace, monospace';
  labels.forEach(function(l){ g.fillText(l.t, l.x, l.y); });
  g.globalAlpha = 1;
}
function layers(){
  paint(dim, col.trace, col.line, { c: col.pad, a: 0.38 }, { c: col.silk, a: 0.32 });
  paint(lit, col.signal, col.signal, { c: col.signal, a: 0.95 }, { c: col.signal, a: 0.9 });
}
function draw(){
  pending = 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(dim, 0, 0);
  if (probe.on) {
    var r = R * dpr, mx = probe.x * dpr, my = probe.y * dpr;
    var sx = Math.max(0, mx - r), sy = Math.max(0, my - r), ex = Math.min(cv.width, mx + r), ey = Math.min(cv.height, my + r);
    if (ex > sx && ey > sy) {
      var tg = tmp.getContext('2d');
      tg.globalCompositeOperation = 'source-over';
      tg.clearRect(0, 0, tmp.width, tmp.height);
      tg.drawImage(lit, sx, sy, ex - sx, ey - sy, sx - (mx - r), sy - (my - r), ex - sx, ey - sy);
      tg.globalCompositeOperation = 'destination-in';
      var gr = tg.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.5, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      tg.fillStyle = gr; tg.fillRect(0, 0, tmp.width, tmp.height);
      ctx.drawImage(tmp, mx - r, my - r);
    }
  }
  if (P.running()) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.signal;
    pulses.forEach(function(p){
      var t = p.t; if (!t || p.s < 0) return;
      for (var k = 7; k >= 0; k--) {
        var s = p.s - k * 5; if (s < 0 || s > t.len) continue;
        var q = P.at(t, p.rev ? t.len - s : s);
        ctx.globalAlpha = (1 - k / 8) * 0.85;
        ctx.beginPath(); ctx.arc(q[0], q[1], 2.5 * (1 - k / 11), 0, Math.PI * 2); ctx.fill();
      }
      if (p.s <= t.len) {
        var h = P.at(t, p.rev ? t.len - p.s : p.s);
        ctx.globalAlpha = 0.18; ctx.beginPath(); ctx.arc(h[0], h[1], 8, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }
}
function later(){ if (!pending && !P.running()) pending = requestAnimationFrame(draw); }
function resize(force){
  var w = window.innerWidth, h = window.innerHeight;
  if (!force && w === W && h <= H) return;
  W = w; H = h + 160; dpr = Math.min(2, window.devicePixelRatio || 1);
  [cv, dim, lit].forEach(function(c){ c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  tmp.width = tmp.height = Math.ceil(2 * R * dpr);
  generate(); layers(); draw();
}
var rt = 0;
window.addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(function(){ resize(false); }, 180); });
window.addEventListener('pointermove', function(e){
  if (e.pointerType === 'touch') return;
  probe.x = e.clientX; probe.y = e.clientY; probe.on = true; later();
}, { passive: true });
document.addEventListener('pointerleave', function(){ probe.on = false; later(); });
window.addEventListener('blur', function(){ probe.on = false; later(); });
P.on('mask', function(){ colors(); layers(); later(); });
P.addTicker({
  tick: function(t, dt){
    pulses.forEach(function(p){ p.s += p.v * dt; if (!p.t || p.s > p.t.len + 50) spawn(p); });
    draw();
  },
  still: function(){ draw(); }
});
colors(); resize(true);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ layers(); later(); });
})();
