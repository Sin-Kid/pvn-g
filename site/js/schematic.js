/* schematic: project ICs wired to skill nets */
(function(){
'use strict';
var P = window.PVN, schem = document.getElementById('schem'), chipsEl = document.getElementById('chips'),
    netsEl = document.getElementById('nets'), wires = document.getElementById('wires'), bar = document.getElementById('probebar');
if (!P || !schem || !chipsEl || !netsEl || !wires) return;
var S = P.s, H = P.h, chipNodes = {}, netNodes = {}, expanded = null, wireList = [], visible = true, queued = 0, animNext = false;

/* chips */
P.PROJECTS.forEach(function(p){
  var a = H('article', { class: 'ic', id: 'ic-' + p.id });
  var head = H('button', { class: 'ic-head', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'icb-' + p.id });
  head.innerHTML = '<span class="ic-des">' + p.des + '</span><span class="ic-name">' + p.name + '</span>' +
    '<span class="ic-tag">' + p.tag + '</span><span class="ic-chev" aria-hidden="true">+</span>';
  var sum = H('p', { class: 'ic-sum' }, p.sum);
  var links = null;
  if (p.links && p.links.length) {
    links = H('div', { class: 'ic-links' }, p.links.map(function(l){
      return '<a class="ic-link" href="' + l[1] + '" target="_blank" rel="noopener">' + l[0] + ' <span aria-hidden="true">\u2197</span></a>';
    }).join(''));
  }
  var body = H('div', { class: 'ic-body', id: 'icb-' + p.id });
  body.hidden = true;
  var pv = p.preview, img = '';
  if (pv) {
    var tag = '<img src="' + pv.src + '" alt="' + pv.alt + '" width="1280" height="720" loading="lazy" decoding="async">';
    img = '<figure class="ic-prev">' + (pv.href ? '<a href="' + pv.href + '" target="_blank" rel="noopener">' + tag + '</a>' : tag) +
      '<figcaption><b>' + pv.kind + '</b> \u00b7 ' + p.name +
      (pv.href ? ' \u00b7 opens ' + pv.href.replace(/^https?:\/\//, '').replace(/\/$/, '') : '') + '</figcaption></figure>';
  }
  body.innerHTML = img + p.body.map(function(t){ return '<p>' + t + '</p>'; }).join('') +
    '<dl class="ic-meas">' + p.meas.map(function(m){
      return '<div><dt>' + m[0] + '</dt><dd>' + m[1] + (m[2] ? '<small>' + m[2] + '</small>' : '') + '</dd></div>';
    }).join('') + '</dl>' +
    '<p class="ic-drives">Drives ' + p.nets.length + ' nets on the schematic</p>';
  a.appendChild(head); a.appendChild(sum); if (links) a.appendChild(links); a.appendChild(body);
  chipsEl.appendChild(a);
  chipNodes[p.id] = { el: a, head: head, body: body };
  head.addEventListener('click', function(){
    if (expanded === p.id) { setExpanded(null); P.setFocus(null, 'chip'); }
    else { setExpanded(p.id); P.setFocus({ type: 'project', id: p.id }, 'chip'); }
  });
});

/* nets, grouped into connectors J1..J6 */
P.GROUPS.forEach(function(g){
  var ids = Object.keys(P.NETS).filter(function(id){ return P.NETS[id].group === g.id; });
  var box = H('div', { class: 'conn' });
  box.appendChild(H('h3', { class: 'conn-h' }, '<b>' + g.des + '</b>' + g.name + '<span>' + ids.length + ' pins</span>'));
  var ul = H('ul');
  ids.forEach(function(id){
    var n = P.NETS[id], u = P.usersOf(id).length;
    var li = H('li'), b = H('button', { class: 'net', type: 'button', 'aria-pressed': 'false' });
    b.innerHTML = '<span class="net-pad" aria-hidden="true"></span><span class="net-name">' + n.name + '</span>' +
      '<span class="net-load" title="' + (u ? 'Used by ' + u + ' project' + (u > 1 ? 's' : '') : 'Listed skill, not tied to a featured project') + '">' + (u ? '×' + u : '–') + '</span>';
    li.appendChild(b); ul.appendChild(li); netNodes[id] = b;
    b.addEventListener('click', function(){
      var f = P.focus;
      if (f && f.type === 'net' && f.id === id) P.setFocus(expanded ? { type: 'project', id: expanded } : null, 'net');
      else P.setFocus({ type: 'net', id: id }, 'net');
    });
  });
  box.appendChild(ul); netsEl.appendChild(box);
});

function setExpanded(id){
  expanded = id;
  for (var k in chipNodes) {
    var c = chipNodes[k], on = k === id;
    c.body.hidden = !on;
    c.head.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
}

function report(f){
  if (!bar) return;
  if (!f) { bar.innerHTML = 'Probe idle. <span>Open a chip or pick a net.</span>'; return; }
  if (f.type === 'project') {
    var p = P.project(f.id);
    bar.innerHTML = '<b>' + p.des + ' ' + p.name.toUpperCase() + '</b> drives ' + p.nets.length + ' nets <span>' +
      p.nets.map(function(n){ return P.NETS[n].name; }).join(' · ') + '</span>';
    return;
  }
  var n = P.NETS[f.id], u = P.usersOf(f.id);
  bar.innerHTML = 'NET <b>' + n.name.toUpperCase() + '</b> ' +
    (u.length ? u.length + ' load' + (u.length > 1 ? 's' : '') + ' <span>' + u.map(function(p){ return p.des + ' ' + p.name; }).join(' · ') + '</span>'
              : '<span>Listed skill, not tied to a featured project.</span>') +
    (n.also ? ' <span>' + n.also + '</span>' : '');
}

P.on('focus', function(e){
  var f = e.focus;
  if (f && f.type === 'project' && expanded !== f.id) setExpanded(f.id);
  var users = f && f.type === 'net' ? P.usersOf(f.id).map(function(p){ return p.id; }) : null;
  for (var k in chipNodes) {
    var el = chipNodes[k].el;
    el.classList.toggle('focus', !!f && ((f.type === 'project' && f.id === k) || (!!users && users.indexOf(k) > -1)));
    el.classList.toggle('dim', !!users && users.indexOf(k) < 0);
  }
  var drv = f && f.type === 'project' ? P.project(f.id).nets : null;
  for (var id in netNodes) {
    var b = netNodes[id], on = drv ? drv.indexOf(id) > -1 : !!(f && f.type === 'net' && f.id === id);
    b.classList.toggle('on', on);
    b.classList.toggle('dim', !!f && !on);
    b.setAttribute('aria-pressed', f && f.type === 'net' && f.id === id ? 'true' : 'false');
  }
  report(f);
  queue(true);
});

/* wires */
function queue(anim){
  if (anim) animNext = true;
  if (!queued) queued = requestAnimationFrame(function(){ queued = 0; draw(); });
}
function chamfer(pts, c){
  var out = [pts[0]];
  for (var i = 1; i < pts.length - 1; i++) {
    var a = pts[i-1], p = pts[i], b = pts[i+1];
    var l1 = Math.hypot(p[0] - a[0], p[1] - a[1]), l2 = Math.hypot(b[0] - p[0], b[1] - p[1]);
    var cc = Math.min(c, l1 / 2, l2 / 2);
    if (cc < 0.5) { if (l1 > 0.5 && l2 > 0.5) out.push(p); continue; }
    out.push([p[0] - (p[0] - a[0]) / l1 * cc, p[1] - (p[1] - a[1]) / l1 * cc]);
    out.push([p[0] + (b[0] - p[0]) / l2 * cc, p[1] + (b[1] - p[1]) / l2 * cc]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function draw(){
  var anim = animNext; animNext = false;
  while (wires.firstChild) wires.removeChild(wires.firstChild);
  wireList = [];
  if (getComputedStyle(wires).display === 'none') return;
  var sr = schem.getBoundingClientRect();
  wires.setAttribute('width', sr.width); wires.setAttribute('height', sr.height);
  wires.setAttribute('viewBox', '0 0 ' + sr.width.toFixed(1) + ' ' + sr.height.toFixed(1));
  var f = P.focus; if (!f) return;
  var cr = chipsEl.getBoundingClientRect(), nr = netsEl.getBoundingClientRect();
  var x0 = cr.right - sr.left, x1 = nr.left - sr.left, pairs = [];
  function chipTop(id){ var r = chipNodes[id].el.getBoundingClientRect(); return { top: r.top - sr.top, h: r.height }; }
  function padY(id){ var r = netNodes[id].querySelector('.net-pad').getBoundingClientRect(); return r.top - sr.top + r.height / 2; }
  if (f.type === 'project') {
    var p = P.project(f.id), c = chipTop(p.id);
    var ts = p.nets.map(function(n){ return padY(n); }).sort(function(a, b){ return a - b; });
    var k = ts.length, step = Math.min(18, (c.h - 64) / Math.max(1, k - 1));
    ts.forEach(function(ty, i){ pairs.push({ sy: c.top + 36 + i * step, ty: ty }); });
  } else {
    var users = P.usersOf(f.id); if (!users.length) return;
    var y = padY(f.id);
    users.forEach(function(u){ var c2 = chipTop(u.id); pairs.push({ sy: c2.top + 42, ty: y }); });
    pairs.sort(function(a, b){ return a.sy - b.sy; });
  }
  var n = pairs.length, L0 = x0 + 16, L1 = x1 - 16;
  function lane(i){ return n === 1 ? (L0 + L1) / 2 : L0 + (L1 - L0) * i / (n - 1); }
  var up = pairs.filter(function(q){ return q.ty < q.sy; }), down = pairs.filter(function(q){ return q.ty >= q.sy; });
  up.forEach(function(q, i){ q.lane = lane(i); });
  down.forEach(function(q, i){ q.lane = lane(n - 1 - i); });
  var maxLane = Math.max.apply(null, pairs.map(function(q){ return q.lane; }));
  pairs.forEach(function(q, i){
    var pts = chamfer([[x0, q.sy], [q.lane, q.sy], [q.lane, q.ty], [x1, q.ty]], 10);
    var dstr = 'M' + pts.map(function(pt){ return pt[0].toFixed(1) + ' ' + pt[1].toFixed(1); }).join(' L');
    S('path', { class: 'w-glow', d: dstr }, wires);
    var w = S('path', { class: 'w', d: dstr }, wires), poly = P.poly(pts);
    if (anim && P.motion) {
      var L = Math.ceil(poly.len);
      w.style.setProperty('--len', L); w.style.strokeDasharray = L; w.style.animationDelay = (i * 45) + 'ms';
      w.classList.add('draw');
    }
    S('rect', { class: 'w-stub', x: x0 - 2, y: q.sy - 3, width: 10, height: 6, rx: 1 }, wires);
    if (f.type === 'net' && n > 1 && q.lane < maxLane) S('circle', { class: 'w-joint', cx: q.lane, cy: q.ty, r: 3.6 }, wires);
    S('circle', { class: 'w-joint', cx: x1, cy: q.ty, r: 3.6 }, wires);
    var halo = S('circle', { class: 'w-halo', r: 7, cx: -50, cy: -50 }, wires);
    var dot = S('circle', { class: 'w-pulse', r: 3, cx: -50, cy: -50 }, wires);
    wireList.push({ poly: poly, dot: dot, halo: halo, s: -i * 50 - 200, rev: f.type === 'net' });
  });
}
function hide(w){ w.dot.setAttribute('cx', -50); w.halo.setAttribute('cx', -50); }
P.addTicker({
  tick: function(t, dt){
    if (!visible) return;
    wireList.forEach(function(w){
      var L = w.poly.len;
      w.s += dt * 190;
      if (w.s > L + 70) w.s = -Math.random() * 90;
      if (w.s < 0 || w.s > L) { hide(w); return; }
      var a = P.at(w.poly, w.rev ? L - w.s : w.s);
      w.dot.setAttribute('cx', a[0].toFixed(1)); w.dot.setAttribute('cy', a[1].toFixed(1));
      w.halo.setAttribute('cx', a[0].toFixed(1)); w.halo.setAttribute('cy', a[1].toFixed(1));
    });
  },
  still: function(){ wireList.forEach(hide); }
});
if ('ResizeObserver' in window) new ResizeObserver(function(){ queue(false); }).observe(schem);
window.addEventListener('resize', function(){ queue(false); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ queue(false); });
if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ visible = es[0].isIntersecting; }).observe(schem);

P.setFocus({ type: 'project', id: P.PROJECTS[0].id }, 'init');
})();
