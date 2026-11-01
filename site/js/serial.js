/* serial monitor */
(function(){
'use strict';
var P = window.PVN, out = document.getElementById('termOut'), form = document.getElementById('termForm'),
    input = document.getElementById('termIn'), quick = document.getElementById('termQuick'),
    tx = document.getElementById('tx'), rx = document.getElementById('rx');
if (!P || !out || !form || !input) return;
var hist = [], hp = 0, q = [], busy = false;
var MAIL = 'pavang1052005@gmail.com', GH = 'https://github.com/Sin-Kid', LI = 'https://www.linkedin.com/in/pavan-g-062a59292';
function a(href, t){ return '<a href="' + href + '" target="_blank" rel="noopener">' + t + '</a>'; }
function blink(el){ if (!el) return; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(function(){ el.classList.remove('on'); }, 110); }
function pad(s, n){ s = String(s); while (s.length < n) s += ' '; return s; }
function print(items){ items.forEach(function(it){ q.push(it); }); if (!busy) pump(); }
function pump(){
  while (q.length) {
    var it = q.shift(), d = document.createElement('div');
    d.className = 'ln' + (it[1] ? ' ' + it[1] : '');
    if (it[2]) d.innerHTML = it[0]; else d.textContent = it[0];
    out.appendChild(d); blink(rx);
    while (out.children.length > 400) out.removeChild(out.firstChild);
    out.scrollTop = out.scrollHeight;
    if (P.motion && q.length) { busy = true; setTimeout(pump, 16); return; }
  }
  busy = false;
}
var SECTIONS = { top: 'top', home: 'top', about: 'about', projects: 'projects', schematic: 'projects', timeline: 'timeline',
  experience: 'timeline', serial: 'serial', contact: 'contact', connect: 'contact' };
var C = {
  help: function(){ return [
    ['commands', 'hi'],
    ['  whoami            who this board belongs to'],
    ['  about             the short version'],
    ['  projects          list the project chips'],
    ['  open <chip>       energize a chip, e.g. open telebot'],
    ['  skills            every net, by connector'],
    ['  net <name>        probe a net, e.g. net esp32'],
    ['  timeline          roles and schools, newest first'],
    ['  contact           ways to reach Pavan'],
    ['  mask <color>      green, black, blue or white'],
    ['  signals on|off    start or stop the animated signals'],
    ['  goto <section>    about, projects, timeline, contact'],
    ['  uptime  date  ping  history  clear', 'dim']
  ]; },
  whoami: function(){ return [['pavan-g · final-year ECE at RV College of Engineering, Bengaluru', 'ok'], ['freelance technical support engineer at Thinkads.co', 'ok']]; },
  about: function(){ return [
    ['Builds systems end to end: ESP32 telemetry, local and cloud LLM pipelines,'],
    ['and the web and TV apps on top. Usually solo, always benchmarked.'],
    ['Off the clock: photography, robotics, markets, badminton, fitness.', 'dim']
  ]; },
  projects: function(){
    var r = [['4 chips on /schematic', 'hi']];
    P.PROJECTS.forEach(function(p){ r.push([p.des + '  ' + pad(p.name, 13) + p.sum]); });
    r.push(['open one with: open <name>', 'dim']);
    return r;
  },
  open: function(arg){
    if (!arg) return [['usage: open <chip>   e.g. open smartbus', 'err']];
    var id = P.findProject(arg);
    if (!id) return [['no chip matches "' + arg + '". try: ' + P.PROJECTS.map(function(p){ return p.id; }).join(', '), 'err']];
    var p = P.project(id);
    P.setFocus({ type: 'project', id: id }, 'serial');
    return [[p.des + ' ' + p.name + ' energized', 'ok'], [p.sum], ['nets: ' + p.nets.map(function(n){ return P.NETS[n].name; }).join(', '), 'dim'], ['see it with: goto projects', 'dim']];
  },
  skills: function(){
    var r = [];
    P.GROUPS.forEach(function(g){
      var ids = Object.keys(P.NETS).filter(function(id){ return P.NETS[id].group === g.id; });
      r.push([g.des + ' ' + g.name, 'hi']);
      r.push(['   ' + ids.map(function(id){ return P.NETS[id].name; }).join(' · ')]);
    });
    return r;
  },
  net: function(arg){
    if (!arg) return [['usage: net <name>   e.g. net python', 'err']];
    var id = P.findNet(arg);
    if (!id) return [['no net called "' + arg + '". type skills for the list.', 'err']];
    var n = P.NETS[id], u = P.usersOf(id);
    P.setFocus({ type: 'net', id: id }, 'serial');
    var r = [['NET ' + n.name + ': ' + (u.length ? u.length + ' load' + (u.length > 1 ? 's' : '') + ' → ' + u.map(function(p){ return p.des + ' ' + p.name; }).join(', ') : 'NC, no featured project'), 'ok']];
    if (n.also) r.push([n.also, 'dim']);
    return r;
  },
  timeline: function(){
    return P.CHANNELS.map(function(c){
      var s = c.start, e = c.end;
      var t = (s[1] < 10 ? '0' : '') + s[1] + '/' + s[0] + ' → ' + (e ? (e[1] < 10 ? '0' : '') + e[1] + '/' + e[0] : 'now    ');
      return [c.ch + '  ' + t + '  ' + c.name + ' · ' + c.role];
    });
  },
  contact: function(){ return [
    ['mail      ' + MAIL, 'hi'],
    ['code      ' + a(GH, 'github.com/Sin-Kid'), '', true],
    ['work      ' + a(LI, 'linkedin.com/in/pavan-g-062a59292'), '', true],
    ['base      Bengaluru, India · UTC+5:30', 'dim']
  ]; },
  mask: function(arg){
    var m = (arg || '').toLowerCase();
    if (!m) return [['current mask: ' + P.mask() + '. options: green, black, blue, white']];
    return P.setMask(m) ? [] : [['unknown mask "' + arg + '". options: green, black, blue, white', 'err']];
  },
  signals: function(arg){
    var v = (arg || '').toLowerCase();
    if (v !== 'on' && v !== 'off') return [['signals are ' + (P.signals ? 'on' : 'off') + '. usage: signals on|off']];
    if (v === 'on') P.motion = true;
    P.setSignals(v === 'on');
    return [];
  },
  goto: function(arg){
    var id = SECTIONS[(arg || '').toLowerCase()];
    if (!id) return [['usage: goto about|projects|timeline|serial|contact', 'err']];
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: P.motion ? 'smooth' : 'auto', block: 'start' });
    return [['jumping to ' + id, 'dim']];
  },
  uptime: function(){
    var d = new Date(), m = (d.getFullYear() - 2023) * 12 + d.getMonth() - 8, y = Math.floor(m / 12), r = m % 12;
    return [['up ' + y + ' year' + (y === 1 ? '' : 's') + ', ' + r + ' month' + (r === 1 ? '' : 's') + ' since boot (Sep 2023, first day at RVCE)']];
  },
  date: function(){
    var s;
    try { s = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }); } catch(e){ s = new Date().toString(); }
    return [['board time, Bengaluru: ' + s + ' IST']];
  },
  ping: function(){ return [['PONG from PVN-G · ' + (0.2 + Math.random() * 0.5).toFixed(2) + ' ms · board is listening', 'ok']]; },
  history: function(){ return hist.length ? hist.map(function(h, i){ return [pad(i + 1, 4) + h]; }) : [['no history yet', 'dim']]; },
  clear: function(){ out.innerHTML = ''; return []; },
  sudo: function(arg){
    if (/hire/i.test(arg)) return C.hire();
    return [['sudo: reserved for recruiters. try: sudo hire pavan', 'err']];
  },
  hire: function(){ return [['[sudo] password for recruiter: ********', 'dim'], ['access granted.', 'ok'], ['next step: write to ' + MAIL, 'hi']]; },
  rm: function(){ return [['rm: board is write-protected', 'err']]; },
  echo: function(arg){ return [[arg || '']]; },
  hello: function(){ return [['hello. type help to see what this board can do.']]; },
  exit: function(){ return [['there is no exit. only more projects.']]; },
  resume: function(){ return [['for the latest resume, write to ' + MAIL, 'hi']]; },
  github: function(){ return [[a(GH, 'github.com/Sin-Kid'), '', true]]; },
  linkedin: function(){ return [[a(LI, 'linkedin.com/in/pavan-g-062a59292'), '', true]]; }
};
var ALIAS = { ls: 'projects', project: 'open', chip: 'open', probe: 'net', skill: 'net', nets: 'skills', exp: 'timeline',
  experience: 'timeline', mail: 'contact', email: 'contact', power: 'signals', sig: 'signals', cd: 'goto', hi: 'hello',
  cls: 'clear', cv: 'resume', '?': 'help', man: 'help', time: 'date', cat: 'about' };
function run(raw){
  var s = String(raw || '').trim();
  if (!s) return;
  hist.push(s); if (hist.length > 50) hist.shift(); hp = hist.length;
  blink(tx);
  print([[s, 'cmd']]);
  var parts = s.split(/\s+/), cmd = parts[0].toLowerCase(), arg = parts.slice(1).join(' ');
  var fn = C[cmd] || C[ALIAS[cmd]], res;
  try { res = fn ? fn(arg) : [[cmd + ': command not found. type help for the list.', 'err']]; }
  catch(e){ res = [['error: ' + e.message, 'err']]; }
  if (res && res.length) print(res);
}
P.serial = run;
form.addEventListener('submit', function(e){ e.preventDefault(); var v = input.value; input.value = ''; run(v); });
input.addEventListener('keydown', function(e){
  if (e.key === 'ArrowUp') { if (hp > 0) { hp--; input.value = hist[hp]; } e.preventDefault(); }
  else if (e.key === 'ArrowDown') { if (hp < hist.length) { hp++; input.value = hist[hp] || ''; } e.preventDefault(); }
  else if (e.key === 'Tab' && input.value && input.value.indexOf(' ') < 0) {
    var v = input.value.toLowerCase(), m = Object.keys(C).filter(function(k){ return k.indexOf(v) === 0; });
    if (m.length === 1) { input.value = m[0] + ' '; e.preventDefault(); }
    else if (m.length > 1) { print([[m.join('  '), 'dim']]); e.preventDefault(); }
  }
});
if (quick) quick.addEventListener('click', function(e){ var b = e.target.closest('button[data-cmd]'); if (b) run(b.getAttribute('data-cmd')); });
P.on('focus', function(e){
  if (['u1', 'chip', 'net'].indexOf(e.src) < 0 || !e.focus) return;
  var f = e.focus, t = f.type === 'net' ? 'net ' + P.NETS[f.id].name : P.project(f.id).des + ' ' + P.project(f.id).name;
  print([['[probe] ' + t + ' energized', 'dim']]);
});
P.on('mask', function(m){ print([['[mask] solder mask set to ' + m, 'dim']]); });
P.on('signals', function(on){ print([['[sig] animated signals ' + (on ? 'on' : 'off'), 'dim']]); });
})();
