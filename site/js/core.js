/* core: event bus, animation loop, mask + data shared by every module */
(function(){
'use strict';
var root = document.documentElement;
var reduce = matchMedia('(prefers-reduced-motion: reduce)');
var bus = {};
var PVN = window.PVN = {
  motion: !reduce.matches,
  signals: !reduce.matches,
  focus: null,
  tickers: [],
  on: function(ev, fn){ (bus[ev] = bus[ev] || []).push(fn); },
  emit: function(ev, data){ (bus[ev] || []).forEach(function(fn){ try { fn(data); } catch(e){ console.error(e); } }); }
};

/* storage that never throws */
PVN.store = {
  get: function(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
  set: function(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
};

/* DOM helpers (only ever fed this file's own data, never visitor input) */
var SVGNS = 'http://www.w3.org/2000/svg';
PVN.s = function(tag, attrs, parent){
  var n = document.createElementNS(SVGNS, tag);
  if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};
PVN.h = function(tag, attrs, html){
  var n = document.createElement(tag);
  if (attrs) for (var k in attrs) { if (k === 'class') n.className = attrs[k]; else n.setAttribute(k, attrs[k]); }
  if (html != null) n.innerHTML = html;
  return n;
};
PVN.css = function(name){ return getComputedStyle(root).getPropertyValue(name).trim(); };

/* polylines: length table + point at distance */
PVN.poly = function(pts){
  var seg = [], len = 0;
  for (var i = 1; i < pts.length; i++) {
    var l = Math.hypot(pts[i][0] - pts[i-1][0], pts[i][1] - pts[i-1][1]);
    seg.push(l); len += l;
  }
  return { pts: pts, seg: seg, len: len };
};
PVN.at = function(p, s){
  if (s <= 0) return p.pts[0];
  for (var i = 0; i < p.seg.length; i++) {
    if (s <= p.seg[i]) {
      var a = p.pts[i], b = p.pts[i+1], t = s / p.seg[i];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    s -= p.seg[i];
  }
  return p.pts[p.pts.length - 1];
};

/* one shared animation loop; modules register tickers */
var raf = 0, last = 0;
function frame(t){
  var dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
  for (var i = 0; i < PVN.tickers.length; i++) {
    var tk = PVN.tickers[i];
    try { if (tk.tick) tk.tick(t / 1000, dt); } catch(e){ console.error(e); }
  }
  raf = requestAnimationFrame(frame);
}
PVN.refreshLoop = function(){
  var run = PVN.signals && PVN.motion && !document.hidden;
  if (run) { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } return; }
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
  PVN.tickers.forEach(function(tk){ try { if (tk.still) tk.still(); } catch(e){ console.error(e); } });
};
PVN.running = function(){ return !!raf; };
PVN.addTicker = function(tk){ PVN.tickers.push(tk); };
PVN.setSignals = function(on){
  PVN.signals = !!on;
  root.classList.toggle('signals', PVN.signals && PVN.motion);
  PVN.emit('signals', PVN.signals);
  PVN.refreshLoop();
};
document.addEventListener('visibilitychange', PVN.refreshLoop);
reduce.addEventListener && reduce.addEventListener('change', function(){
  PVN.motion = !reduce.matches; PVN.setSignals(PVN.motion);
});

/* solder mask */
PVN.MASKS = ['green', 'black', 'blue', 'white'];
PVN.lightPref = function(){
  var t = root.getAttribute('data-theme');
  if (t === 'light') return true;
  if (t === 'dark') return false;
  return matchMedia('(prefers-color-scheme: light)').matches;
};
PVN.mask = function(){ return root.getAttribute('data-mask') || (PVN.lightPref() ? 'white' : 'green'); };
PVN.setMask = function(m){
  if (PVN.MASKS.indexOf(m) < 0) return false;
  root.setAttribute('data-mask', m);
  PVN.store.set('pvn-mask', m);
  PVN.emit('mask', m);
  return true;
};
var lightMq = matchMedia('(prefers-color-scheme: light)');
var themeChanged = function(){ if (!root.hasAttribute('data-mask')) PVN.emit('mask', PVN.mask()); };
lightMq.addEventListener && lightMq.addEventListener('change', themeChanged);
new MutationObserver(themeChanged).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

/* focus: what the probe is on, shared by U1, the schematic and the serial monitor */
PVN.setFocus = function(f, src){ PVN.focus = f; PVN.emit('focus', { focus: f, src: src || '' }); };

/* ---------- data ---------- */
PVN.GROUPS = [
  { id: 'lang',  des: 'J1', name: 'Languages' },
  { id: 'web',   des: 'J2', name: 'Web & apps' },
  { id: 'ai',    des: 'J3', name: 'AI / ML' },
  { id: 'data',  des: 'J4', name: 'Data & cloud' },
  { id: 'sys',   des: 'J5', name: 'Systems & IoT' },
  { id: 'tools', des: 'J6', name: 'Fundamentals' }
];
function N(name, short, group, alias, also){ return { name: name, short: short, group: group, alias: alias || [], also: also || '' }; }
var TK = 'Also used day to day at Thinkads.co.';
PVN.NETS = {
  c:         N('C', 'C', 'lang', [], 'Programming in C certificate, Infosys Springboard.'),
  cpp:       N('C++', 'C++', 'lang', ['cplusplus']),
  python:    N('Python', 'PY', 'lang', ['py']),
  js:        N('JavaScript', 'JS', 'lang', ['javascript'], TK),
  ts:        N('TypeScript', 'TS', 'lang', ['typescript']),
  sql:       N('SQL', 'SQL', 'lang', [], TK),
  react:     N('React', 'RCT', 'web', ['reactjs'], 'Also part of the MERN stack at Thinkads.co.'),
  next:      N('Next.js', 'NEXT', 'web', ['nextjs']),
  rn:        N('React Native', 'RN', 'web', ['reactnative']),
  node:      N('Node.js', 'NODE', 'web', ['nodejs'], 'Also part of the MERN stack at Thinkads.co.'),
  fastapi:   N('FastAPI', 'FAPI', 'web', []),
  tailwind:  N('Tailwind CSS', 'TW', 'web', ['tailwindcss']),
  llm:       N('LLMs (Llama, Ollama)', 'LLM', 'ai', ['llms', 'llama', 'ollama']),
  bedrock:   N('Amazon Bedrock', 'BDRK', 'ai', ['amazonbedrock']),
  rag:       N('RAG pipelines', 'RAG', 'ai', ['retrieval']),
  mediapipe: N('MediaPipe Pose', 'POSE', 'ai', ['pose', 'mediapipepose']),
  whisper:   N('Whisper STT', 'STT', 'ai', ['stt', 'whisperstt']),
  fastpitch: N('FastPitch TTS', 'TTS', 'ai', ['tts', 'hifigan']),
  postgres:  N('PostgreSQL', 'PG', 'data', ['postgresql', 'pg']),
  supabase:  N('Supabase', 'SUPA', 'data', []),
  firebase:  N('Firebase', 'FIRE', 'data', []),
  sqlite:    N('SQLite', 'SQLT', 'data', []),
  aws:       N('AWS Lambda + DynamoDB', 'AWS', 'data', ['lambda', 'dynamodb', 'awslambda']),
  netlify:   N('Netlify', 'NTLY', 'data', []),
  esp32:     N('ESP32', 'ESP', 'sys', ['esp']),
  gps:       N('GPS / GSM', 'GPS', 'sys', ['gsm', 'gpsgsm']),
  rfid:      N('RFID', 'RFID', 'sys', []),
  embedded:  N('Embedded systems', 'EMB', 'sys', ['embeddedsystems', 'firmware']),
  ws:        N('WebSockets', 'WS', 'sys', ['websocket', 'websockets']),
  rest:      N('REST APIs', 'REST', 'sys', ['restapi', 'restapis', 'api'], 'Also integrated across client projects at Thinkads.co.'),
  git:       N('Git', 'GIT', 'tools', ['github']),
  linux:     N('Linux / CLI', 'LNX', 'tools', ['cli', 'linuxcli', 'raspberrypi'], 'Raspberry Pi and AI-agent work on Linux at Malgudi Technolabs.'),
  dsa:       N('Data structures & algorithms', 'DSA', 'tools', ['algorithms', 'datastructures', 'leetcode'], 'Coursework and LeetCode practice.'),
  networks:  N('Computer networks', 'NET', 'tools', ['networking', 'computernetworks'], 'Network configuration and mesh networking at Malgudi Technolabs.')
};

var GH = 'https://github.com/Sin-Kid';
PVN.PROJECTS = [
  { id: 'firefit', des: 'U2', name: 'Fire-Fit', tag: 'Amazon hackathon',
    sum: 'An AI personal trainer for Fire TV. Your phone becomes the TV’s camera and microphone, and a pose model counts your reps.',
    body: [
      'A React Native TV app for Vega OS, built solo for the Amazon Developer Hackathon. Amazon Bedrock generates each workout through tool calling against a JSON schema, served by a Node.js backend on AWS Lambda with DynamoDB.',
      'Scan a QR code and your phone pairs with the TV as its camera and mic, streaming reps, form cues and voice commands back to the screen.',
      'The rep counter covers 19 exercise families using 3D joint angles, a One Euro filter and hysteresis state machines.'
    ],
    meas: [['±1-rep accuracy', '78→92', '%'], ['False reps', '0', ''], ['Exercise families', '19', ''], ['Benchmark', '246', 'sequences']],
    nets: ['rn', 'js', 'node', 'bedrock', 'llm', 'aws', 'mediapipe'] },
  { id: 'telebot', des: 'U3', name: 'TeleBot AI', tag: 'Voice · LLM',
    sum: 'A voice assistant that resolves internet-provider complaints in English, Hindi, Kannada and Telugu.',
    body: [
      'Speech comes in through Whisper, Llama 3.2 answers locally through Ollama, and Indic FastPitch with HiFi-GAN speaks the reply. A FastAPI backend ties the pipeline together.',
      'Every answer is grounded in live SQLite subscriber, billing and balance data, so the model only states what it can look up for that customer.'
    ],
    meas: [['Languages', '4', 'EN HI KN TE'], ['Model', 'Llama 3.2', 'local'], ['Grounding', 'live', 'SQLite']],
    nets: ['python', 'fastapi', 'llm', 'whisper', 'fastpitch', 'rag', 'sqlite', 'sql'] },
  { id: 'smartbus', des: 'U4', name: 'Smart Bus', tag: 'IoT · real time',
    sum: 'Real-time fleet and passenger management, from ESP32 hardware on the bus to live dashboards.',
    body: [
      'ESP32 units send GPS and RFID telemetry into Supabase and PostgreSQL every 2 seconds. React and React Native front ends sit on top, and device behavior was validated against emulated devices.',
      'RFID tap-ins are protected against duplicate transactions, and occupancy is tracked live, keeping a digital twin of each bus’s position and passengers.'
    ],
    meas: [['Telemetry interval', '2', 's'], ['Duplicate taps', 'blocked', ''], ['Digital twin', 'live', 'bus + riders']],
    nets: ['esp32', 'gps', 'rfid', 'embedded', 'supabase', 'postgres', 'sql', 'react', 'rn', 'js'] },
  { id: 'pos', des: 'U5', name: 'Portfolio OS', tag: 'Web desktop',
    sum: 'A macOS-style desktop that runs in the browser, with live trading apps and Spotify built in.',
    body: [
      'A multi-window desktop in Next.js and TypeScript. Several apps run side by side with decoupled state, and Spotify plays through the official API.',
      'Stock-P streams live stock prices. P-Trade draws real-time Binance candlestick charts with SMA and Bollinger Bands, a demo wallet and timed trades from 15 seconds to 5 minutes.'
    ],
    meas: [['Windows', 'multi', 'concurrent'], ['Indicators', 'SMA · BB', ''], ['Trade timers', '15s–5', 'min']],
    nets: ['next', 'ts', 'react', 'ws', 'rest'] }
];
PVN.PROJECTS.forEach(function(p){ p.link = GH; });

PVN.CHANNELS = [
  { id: 'thinkads', ch: 'D1', name: 'Thinkads.co', role: 'Freelance engineer', start: [2025, 12], end: null, c: '--c1' },
  { id: 'malgudi',  ch: 'D2', name: 'Malgudi Technolabs', role: 'Engineering intern', start: [2024, 6], end: [2024, 8], c: '--c2' },
  { id: 'rvce',     ch: 'D3', name: 'RV College of Engineering', role: 'B.E. ECE', start: [2023, 9], end: [2027, 8], c: '--c3' },
  { id: 'puc',      ch: 'D4', name: 'Pre-University College', role: 'PCMC', start: [2021, 10], end: [2023, 4], c: '--c4' },
  { id: 'sslc',     ch: 'D5', name: 'SSLC', role: 'Class X', start: [2011, 6], end: [2021, 5], c: '--c5' }
];

/* lookups */
function norm(s){ return String(s || '').toLowerCase().replace(/[^a-z0-9+]/g, ''); }
PVN.norm = norm;
PVN.findNet = function(q){
  q = norm(q); if (!q) return null;
  if (PVN.NETS[q]) return q;
  for (var id in PVN.NETS) {
    var n = PVN.NETS[id];
    if (norm(n.name) === q || norm(n.short) === q || n.alias.indexOf(q) > -1) return id;
  }
  for (var id2 in PVN.NETS) if (norm(PVN.NETS[id2].name).indexOf(q) === 0) return id2;
  return null;
};
PVN.findProject = function(q){
  q = norm(q); if (!q) return null;
  for (var i = 0; i < PVN.PROJECTS.length; i++) {
    var p = PVN.PROJECTS[i];
    if (p.id === q || norm(p.des) === q || norm(p.name) === q || norm(p.name).indexOf(q) === 0) return p.id;
  }
  return null;
};
PVN.project = function(id){ for (var i = 0; i < PVN.PROJECTS.length; i++) if (PVN.PROJECTS[i].id === id) return PVN.PROJECTS[i]; return null; };
PVN.usersOf = function(netId){ return PVN.PROJECTS.filter(function(p){ return p.nets.indexOf(netId) > -1; }); };
})();
