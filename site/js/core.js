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
/* Hardware first: these groups and projects follow the electronics resume. */
PVN.GROUPS = [
  { id: 'rtl',  des: 'J1', name: 'RTL & verification' },
  { id: 'vlsi', des: 'J2', name: 'Digital & VLSI' },
  { id: 'hw',   des: 'J3', name: 'Boards & IoT' },
  { id: 'eda',  des: 'J4', name: 'EDA & tools' },
  { id: 'sys',  des: 'J5', name: 'Systems' },
  { id: 'lang', des: 'J6', name: 'Languages' },
  { id: 'web',  des: 'J7', name: 'Web, data & cloud' },
  { id: 'ai',   des: 'J8', name: 'AI / ML' }
];
function N(name, short, group, alias, also){ return { name: name, short: short, group: group, alias: alias || [], also: also || '' }; }
var TK = 'Also used day to day at Thinkads.co.', MG = 'Malgudi Technolabs';
PVN.NETS = {
  sv:        N('SystemVerilog', 'SV', 'rtl', ['systemverilog']),
  verilog:   N('Verilog', 'VLOG', 'rtl', []),
  uvm:       N('UVM', 'UVM', 'rtl', []),
  crv:       N('Constrained-random stimulus', 'CRV', 'rtl', ['constrainedrandom', 'random']),
  sva:       N('SystemVerilog Assertions', 'SVA', 'rtl', ['assertions']),
  cov:       N('Code & functional coverage', 'COV', 'rtl', ['coverage', 'functionalcoverage']),
  amba:      N('AMBA: AXI, AHB, APB', 'AXI', 'vlsi', ['axi', 'ahb', 'apb']),
  cdc:       N('CDC & metastability', 'CDC', 'vlsi', ['metastability', 'clockdomaincrossing']),
  sta:       N('Static timing analysis', 'STA', 'vlsi', ['timing', 'statictiminganalysis']),
  asic:      N('ASIC design flow', 'ASIC', 'vlsi', ['asicflow']),
  dft:       N('Design for test', 'DFT', 'vlsi', ['designfortest', 'scan']),
  pd:        N('Physical design', 'PD', 'vlsi', ['physicaldesign', 'layout']),
  fpga:      N('Basys-3 (Artix-7 FPGA)', 'FPGA', 'hw', ['basys3', 'artix7', 'basys', 'artix']),
  stm32:     N('STM32 Blue Pill', 'STM', 'hw', ['stm', 'bluepill']),
  esp32:     N('ESP32', 'ESP', 'hw', ['esp']),
  arduino:   N('Arduino', 'ARD', 'hw', []),
  rpi:       N('Raspberry Pi', 'RPI', 'hw', ['raspberrypi', 'pi'], 'Raspberry Pi projects at ' + MG + '.'),
  gps:       N('GPS / GSM', 'GPS', 'hw', ['gsm', 'gpsgsm']),
  rfid:      N('RFID', 'RFID', 'hw', []),
  vivado:    N('Xilinx Vivado', 'VIV', 'eda', ['xilinx']),
  xsim:      N('Vivado Simulator (XSIM)', 'XSIM', 'eda', ['simulator', 'vivadosimulator']),
  wave:      N('Waveform debugging', 'WAVE', 'eda', ['waveform', 'waveforms']),
  cad:       N('CAD', 'CAD', 'eda', []),
  git:       N('Git & GitHub', 'GIT', 'eda', ['github']),
  arch:      N('Computer architecture', 'ARCH', 'sys', ['architecture']),
  rtos:      N('Linux & RTOS', 'RTOS', 'sys', ['linux', 'os', 'operatingsystems', 'freertos'], 'Linux on Raspberry Pi and AI-agent prototypes at ' + MG + '.'),
  dma:       N('DMA', 'DMA', 'sys', ['directmemoryaccess']),
  networks:  N('Computer networks', 'NET', 'sys', ['networking', 'computernetworks', 'mesh'], 'Network configuration and mesh networking at ' + MG + '.'),
  dsa:       N('Data structures & algorithms', 'DSA', 'sys', ['algorithms', 'datastructures', 'leetcode'], 'Coursework and LeetCode practice.'),
  c:         N('C', 'C', 'lang', [], 'Programming in C certificate, Infosys Springboard.'),
  cpp:       N('C++', 'C++', 'lang', ['cplusplus']),
  emc:       N('Embedded C', 'EMBC', 'lang', ['embeddedc', 'embedded']),
  python:    N('Python', 'PY', 'lang', ['py']),
  matlab:    N('MATLAB', 'MAT', 'lang', []),
  js:        N('JavaScript', 'JS', 'lang', ['javascript'], TK),
  ts:        N('TypeScript', 'TS', 'lang', ['typescript']),
  sql:       N('SQL', 'SQL', 'lang', [], TK),
  react:     N('React', 'RCT', 'web', ['reactjs'], 'Also part of the MERN stack at Thinkads.co.'),
  next:      N('Next.js', 'NEXT', 'web', ['nextjs']),
  rn:        N('React Native', 'RN', 'web', ['reactnative']),
  node:      N('Node.js', 'NODE', 'web', ['nodejs'], 'Also part of the MERN stack at Thinkads.co.'),
  fastapi:   N('FastAPI', 'FAPI', 'web', []),
  postgres:  N('Supabase + PostgreSQL', 'PG', 'web', ['postgresql', 'pg', 'supabase']),
  sqlite:    N('SQLite', 'SQLT', 'web', []),
  aws:       N('AWS Lambda + DynamoDB', 'AWS', 'web', ['lambda', 'dynamodb', 'awslambda']),
  ws:        N('WebSockets', 'WS', 'web', ['websocket', 'websockets']),
  rest:      N('REST APIs', 'REST', 'web', ['restapi', 'restapis', 'api'], 'Also integrated across client projects at Thinkads.co.'),
  llm:       N('LLMs (Llama, Ollama)', 'LLM', 'ai', ['llms', 'llama', 'ollama']),
  bedrock:   N('Amazon Bedrock', 'BDRK', 'ai', ['amazonbedrock']),
  rag:       N('RAG pipelines', 'RAG', 'ai', ['retrieval']),
  mediapipe: N('MediaPipe Pose', 'POSE', 'ai', ['pose', 'mediapipepose']),
  whisper:   N('Whisper STT', 'STT', 'ai', ['stt', 'whisperstt']),
  fastpitch: N('FastPitch TTS', 'TTS', 'ai', ['tts', 'hifigan'])
};

var GH = 'https://github.com/Sin-Kid/';
PVN.LINKS = {
  mail: 'pavang1052005@gmail.com',
  github: 'https://github.com/Sin-Kid',
  linkedin: 'https://www.linkedin.com/in/pavan-g-062a59292',
  leetcode: 'https://leetcode.com/u/0ZYfHENg4s/'
};
PVN.PROJECTS = [
  { id: 'parking', des: 'U2', name: 'Smart Parking', tag: 'FPGA · RTL',
    sum: 'A real-time parking controller written in SystemVerilog and running on a Basys-3 FPGA, with automatic slot allocation and an emergency override.',
    body: [
      'SystemVerilog RTL on a Basys-3 (Artix-7) board: automated slot allocation, occupancy tracking and FSM-driven emergency priority logic.',
      'Verified with SystemVerilog Assertions and a coverage-driven testbench, reaching 100% functional coverage in the Vivado simulator (XSIM).',
      'Validated end to end on the physical board, driving LEDs and seven-segment displays for live occupancy feedback.'
    ],
    meas: [['Functional coverage', '100', '%'], ['Board', 'Basys-3', 'Artix-7'], ['Checks', 'SVA', '+ coverage'], ['Feedback', '7-seg', '+ LEDs']],
    nets: ['sv', 'sva', 'cov', 'fpga', 'vivado', 'xsim'],
    links: [],
    preview: { src: '/img/smart-parking.svg', kind: 'Illustration', alt: 'Illustration of the Smart Parking design: a seven-segment display showing five free slots, occupancy LEDs, an emergency switch and the path from inputs through slot allocation and the priority FSM to the outputs.' } },
  { id: 'smartbus', des: 'U3', name: 'Smart Bus', tag: 'IoT · real time',
    sum: 'Real-time fleet and passenger management, from ESP32 hardware on the bus to live dashboards.',
    body: [
      'ESP32 units send GPS and RFID telemetry into Supabase and PostgreSQL every 2 seconds. React and React Native front ends sit on top, and device behavior was validated against emulated devices.',
      'RFID tap-ins are protected against duplicate transactions, and occupancy is tracked live, keeping a digital twin of each bus’s position and passengers.'
    ],
    meas: [['Telemetry interval', '2', 's'], ['Duplicate taps', 'blocked', ''], ['Digital twin', 'live', 'bus + riders']],
    nets: ['esp32', 'gps', 'rfid', 'postgres', 'sql', 'react', 'rn', 'js'],
    links: [['Code', GH + 'smart-bus-app'], ['Demo video', 'https://drive.google.com/drive/folders/1-6QwSIBd1sO_FEfgYHaz-M9BqnWz_YpU']],
    preview: { src: '/img/smart-bus.svg', kind: 'Architecture', alt: 'Architecture sketch of Smart Bus: an ESP32 with GPS and RFID on the bus sends telemetry every 2 seconds to Supabase and PostgreSQL, which feed a React fleet dashboard and a React Native passenger app.' } },
  { id: 'telebot', des: 'U4', name: 'TeleBot AI', tag: 'Voice · LLM',
    sum: 'A voice assistant that resolves internet-provider complaints in English, Hindi, Kannada and Telugu.',
    body: [
      'Speech comes in through Whisper, Llama 3.2 answers locally through Ollama, and Indic FastPitch with HiFi-GAN speaks the reply. A FastAPI backend ties the pipeline together.',
      'Every answer is grounded in live SQLite subscriber, billing and balance data, so the model only states what it can look up for that customer.'
    ],
    meas: [['Languages', '4', 'EN HI KN TE'], ['Model', 'Llama 3.2', 'local'], ['Grounding', 'live', 'SQLite']],
    nets: ['python', 'fastapi', 'llm', 'whisper', 'fastpitch', 'rag', 'sqlite', 'sql'],
    links: [['Code', GH + 'telecom-ai-bot']],
    preview: { src: '/img/telebot.svg', kind: 'Pipeline', alt: 'Pipeline sketch of TeleBot AI: caller speech goes through Whisper, then Llama 3.2 running locally with SQLite customer data, then FastPitch and HiFi-GAN speak the reply.' } },
  { id: 'firefit', des: 'U5', name: 'Fire-Fit', tag: 'Amazon hackathon',
    sum: 'An AI personal trainer for Fire TV. Your phone becomes the TV’s camera and microphone, and a pose model counts your reps.',
    body: [
      'A React Native TV app for Vega OS, built solo for the Amazon Developer Hackathon. Amazon Bedrock generates each workout through tool calling against a JSON schema, served by a Node.js backend on AWS Lambda with DynamoDB.',
      'Scan a QR code and your phone pairs with the TV as its camera and mic, streaming reps, form cues and voice commands back to the screen.',
      'The rep counter covers 19 exercise families using 3D joint angles, a One Euro filter and hysteresis state machines.'
    ],
    meas: [['±1-rep accuracy', '78→92', '%'], ['False reps', '0', ''], ['Exercise families', '19', ''], ['Benchmark', '246', 'sequences']],
    nets: ['rn', 'js', 'node', 'bedrock', 'llm', 'aws', 'mediapipe'],
    links: [['Code', GH + 'fire-fit-tv'], ['Demo video', 'https://youtu.be/du_oGdhgtNg'], ['Try it in a browser', 'https://fire-fit-tv.netlify.app']],
    preview: { src: '/img/fire-fit.webp', kind: 'Screenshot', href: 'https://youtu.be/du_oGdhgtNg', alt: 'Fire-Fit on the Vega virtual device: a 10-minute fat-burn workout preview with its move list and a QR code for pairing a phone.' } },
  { id: 'pos', des: 'U6', name: 'Portfolio OS', tag: 'Web desktop',
    sum: 'A macOS-style desktop that runs in the browser, with live trading apps and Spotify built in.',
    body: [
      'A multi-window desktop in Next.js and TypeScript. Several apps run side by side with decoupled state, and Spotify plays through the official API.',
      'Stock-P streams live stock prices. P-Trade draws real-time Binance candlestick charts with SMA and Bollinger Bands, a demo wallet and timed trades from 15 seconds to 5 minutes.'
    ],
    meas: [['Windows', 'multi', 'concurrent'], ['Indicators', 'SMA · BB', ''], ['Trade timers', '15s–5', 'min']],
    nets: ['next', 'ts', 'react', 'ws', 'rest'],
    links: [['Live demo', 'https://panna-g.netlify.app']],
    preview: { src: '/img/portfolio-os.webp', kind: 'Screenshot', href: 'https://panna-g.netlify.app', alt: 'Portfolio OS in the browser: a macOS-style desktop with calendar and clock widgets and the P-Trade trading window open.' } }
];

PVN.CERTS = [
  { name: 'Database Management Systems', by: 'IIT Kharagpur · NPTEL', url: 'https://drive.google.com/file/d/1_DYNXCOH5dYN1XJirf1S8IyEOlQyh9iE/view?usp=sharing' },
  { name: 'Data Science for Engineers', by: 'IIT Madras · NPTEL', url: 'https://drive.google.com/file/d/1yN74YkgKTWbcs18IjesGX3fXZqNzMVS9/view?usp=sharing' },
  { name: 'Programming in C', by: 'Infosys Springboard', url: 'https://drive.google.com/file/d/1aczmtpKOwls12Zvs68pvx5QIBQ6tPjYH/view?usp=sharing' }
];

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
