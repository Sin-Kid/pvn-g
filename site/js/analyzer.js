/* logic analyzer: each role/school is a digital channel, high while active */
(function(){
'use strict';
var P = window.PVN, plot = document.getElementById('laPlot'), labels = document.getElementById('laLabels'),
    read = document.getElementById('laRead'), roles = document.getElementById('roles');
if (!P || !plot || !labels) return;
var S = P.s, CH = P.CHANNELS, Y0 = 2021, M = 84, ROW = 52, AX = 32, PADL = 10, PADR = 14;
var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var now = new Date();
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function mi(ym){ return (ym[0] - Y0) * 12 + (ym[1] - 1); }
var nowM = clamp((now.getFullYear() - Y0) * 12 + now.getMonth(), 0, M - 1);
var dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
var nowF = nowM + (now.getDate() - 1) / dim;
var cur = nowM, W = 0, span = 1, rows = {}, cursor = null, dragging = false;
function X(m){ return PADL + span * m / M; }
function name(m){ return MON[((m % 12) + 12) % 12] + ' ' + (Y0 + Math.floor(m / 12)); }
function lastM(c){ return c.end ? mi(c.end) : nowM; }
function active(c, m){ return m >= mi(c.start) && m <= lastM(c); }
function detail(c, m){
  var k = m - mi(c.start);
  if (c.id === 'rvce') return 'year ' + (Math.floor(k / 12) + 1) + ' of 4';
  if (c.id === 'puc') return k < 12 ? 'Class XI' : 'Class XII';
  if (c.id === 'sslc') return 'school';
  if (c.id === 'malgudi') return 'month ' + (k + 1) + ' of 3';
  return 'month ' + (k + 1);
}

CH.forEach(function(c){
  var li = P.h('li', { 'data-ch': c.id, style: '--c:var(' + c.c + ')' },
    '<span class="ch">' + c.ch + ' · ' + c.role + '</span><span class="nm">' + c.name + '</span>');
  labels.appendChild(li);
});

function render(){
  var w = plot.clientWidth;
  if (!w) return;
  W = w; span = W - PADL - PADR;
  while (plot.firstChild) plot.removeChild(plot.firstChild);
  var hh = CH.length * ROW, h = hh + AX;
  var svg = S('svg', { width: W, height: h, viewBox: '0 0 ' + W + ' ' + h, 'aria-hidden': 'true' }, plot);
  for (var y = 0; y <= 7; y++) {
    var x = X(y * 12);
    S('line', { class: 'la-gl', x1: x, y1: 0, x2: x, y2: hh + 6 }, svg);
    if (y < 7) S('text', { class: 'la-tk', x: x + 4, y: hh + 21 }, svg).textContent = W < 420 ? '’' + String(Y0 + y).slice(2) : String(Y0 + y);
  }
  for (var q = 3; q < M; q += 3) if (q % 12) S('line', { class: 'la-gl', x1: X(q), y1: hh, x2: X(q), y2: hh + 4 }, svg);
  CH.forEach(function(c, i){ S('line', { class: 'la-gl', x1: 0, y1: (i + 1) * ROW - 0.5, x2: W, y2: (i + 1) * ROW - 0.5 }, svg); });

  CH.forEach(function(c, i){
    var g = S('g', { class: 'la-row' }, svg); rows[c.id] = g;
    var col = 'var(' + c.c + ')', lo = i * ROW + 38, hi = i * ROW + 14;
    var s = mi(c.start), e = c.end ? mi(c.end) : null;
    var xs = X(Math.max(s, 0)), past = e !== null && e < nowM, xr = past ? X(e + 1) : X(nowF);
    S('rect', { class: 'la-fill', x: xs, y: hi, width: Math.max(0, xr - xs), height: lo - hi, fill: col }, g);
    var d = 'M' + X(0) + ' ' + (s <= 0 ? hi : lo);
    if (s > 0) d += ' H' + (xs - 1.5) + ' L' + (xs + 1.5) + ' ' + hi;
    d += ' H' + (past ? xr - 1.5 : xr);
    if (past) d += ' L' + (xr + 1.5) + ' ' + lo + ' H' + X(M);
    S('path', { class: 'la-wave', d: d, stroke: col }, g);
    if (!past) {
      var dp = 'M' + xr + ' ' + hi;
      if (e === null) dp += ' H' + X(M);
      else { var xe = X(Math.min(e + 1, M)); dp += ' H' + (xe - 1.5) + ' L' + (xe + 1.5) + ' ' + lo + ' H' + X(M); }
      S('path', { class: 'la-wave la-plan', d: dp, stroke: col }, g);
    }
    if (s < 0) S('text', { class: 'la-tk', x: X(0) + 6, y: hi - 3 }, g).textContent = '← ' + c.start[0];
  });

  var nx = X(nowF);
  S('line', { class: 'la-now', x1: nx, y1: 0, x2: nx, y2: hh }, svg);
  S('text', { class: 'la-now-t', x: nx + 5, y: 10 }, svg).textContent = 'NOW';

  cursor = S('g', { class: 'la-cursor' }, svg);
  S('line', { class: 'la-cur', x1: 0, y1: 0, x2: 0, y2: hh }, cursor);
  S('rect', { class: 'la-cur-h', x: -27, y: hh + 6, width: 54, height: 19, rx: 4 }, cursor);
  S('text', { class: 'la-cur-t', x: 0, y: hh + 19, 'text-anchor': 'middle' }, cursor);
  place();
}
function place(){
  if (!cursor) return;
  var x = clamp(X(cur + 0.5), PADL + 27, W - 27);
  cursor.setAttribute('transform', 'translate(' + x.toFixed(1) + ' 0)');
  cursor.querySelector('line').setAttribute('x1', (X(cur + 0.5) - x).toFixed(1));
  cursor.querySelector('line').setAttribute('x2', (X(cur + 0.5) - x).toFixed(1));
  cursor.querySelector('text').textContent = MON[cur % 12] + ' ’' + String(Y0 + Math.floor(cur / 12)).slice(2);
  var on = CH.filter(function(c){ return active(c, cur); });
  CH.forEach(function(c){
    var a = on.indexOf(c) > -1;
    if (rows[c.id]) rows[c.id].classList.toggle('hl', a);
    var li = labels.querySelector('[data-ch="' + c.id + '"]'); if (li) li.classList.toggle('hl', a);
  });
  if (roles) roles.querySelectorAll('.role[data-ch]').forEach(function(r){
    var ids = r.getAttribute('data-ch').split(' ');
    r.classList.toggle('hl', on.some(function(c){ return ids.indexOf(c.id) > -1; }));
  });
  var txt = on.length ? on.map(function(c){ return c.ch + ' ' + c.name + ' (' + detail(c, cur) + ')'; }).join(' · ') : 'all channels low';
  if (read) read.innerHTML = 'T = <b>' + name(cur) + '</b>' + (cur > nowM ? ' scheduled' : '') + ' · ' + txt;
  plot.setAttribute('aria-valuemin', 0); plot.setAttribute('aria-valuemax', M - 1); plot.setAttribute('aria-valuenow', cur);
  plot.setAttribute('aria-valuetext', name(cur) + ': ' + (on.length ? on.map(function(c){ return c.name; }).join(', ') : 'nothing active'));
}
function setCur(m){ m = clamp(m, 0, M - 1); if (m !== cur) { cur = m; place(); } }
function fromEvent(e){ var r = plot.getBoundingClientRect(); return Math.floor((e.clientX - r.left - PADL) / span * M); }
plot.addEventListener('pointerdown', function(e){
  dragging = true; try { plot.setPointerCapture(e.pointerId); } catch(err){}
  setCur(fromEvent(e));
});
plot.addEventListener('pointermove', function(e){ if (dragging) setCur(fromEvent(e)); });
plot.addEventListener('pointerup', function(){ dragging = false; });
plot.addEventListener('pointercancel', function(){ dragging = false; });
plot.addEventListener('keydown', function(e){
  var k = e.key, m = cur;
  if (k === 'ArrowRight' || k === 'ArrowUp') m++;
  else if (k === 'ArrowLeft' || k === 'ArrowDown') m--;
  else if (k === 'PageUp') m += 12; else if (k === 'PageDown') m -= 12;
  else if (k === 'Home') m = 0; else if (k === 'End') m = M - 1;
  else return;
  e.preventDefault(); setCur(m);
});
if (roles) roles.querySelectorAll('.role[data-ch]').forEach(function(r){
  var ids = r.getAttribute('data-ch').split(' ');
  r.addEventListener('pointerenter', function(){ ids.forEach(function(id){ if (rows[id]) rows[id].classList.add('hl'); }); });
  r.addEventListener('pointerleave', function(){ place(); });
});
P.timelineAt = function(m){ setCur(m); };
P.TL = { mi: mi, nowM: nowM, name: name };
var lastW = 0;
if ('ResizeObserver' in window) new ResizeObserver(function(){ if (plot.clientWidth !== lastW) { lastW = plot.clientWidth; render(); } }).observe(plot);
else window.addEventListener('resize', render);
render();
})();
