/* chrome: mask swatches, signal switch, copy, scroll-spy */
(function(){
'use strict';
var P = window.PVN; if (!P) return;
var swatches = document.querySelectorAll('.mask button[data-mask]'), maskName = document.getElementById('maskName');
function showMask(){
  var m = P.mask();
  swatches.forEach(function(b){ b.setAttribute('aria-checked', b.getAttribute('data-mask') === m ? 'true' : 'false'); });
  if (maskName) maskName.textContent = m;
}
swatches.forEach(function(b){ b.addEventListener('click', function(){ P.setMask(b.getAttribute('data-mask')); }); });
P.on('mask', showMask); showMask();

var sw = document.getElementById('sigSwitch');
function showSig(){ if (sw) sw.setAttribute('aria-checked', P.signals && P.motion ? 'true' : 'false'); }
if (sw) sw.addEventListener('click', function(){
  var on = !(P.signals && P.motion);
  if (on) P.motion = true;
  P.setSignals(on);
});
P.on('signals', showSig);

var btn = document.getElementById('copyMail'), mail = document.getElementById('email'), msg = document.getElementById('copied');
if (btn && mail) btn.addEventListener('click', function(){
  var t = mail.textContent.trim();
  function fallback(){
    var r = document.createRange(); r.selectNodeContents(mail);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    if (msg) msg.textContent = 'Address selected. Press Ctrl+C or ⌘C to copy.';
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(function(){ if (msg) msg.textContent = 'Copied to clipboard.'; }, fallback);
  } else fallback();
});

var links = {};
document.querySelectorAll('.tps a').forEach(function(a){ links[a.getAttribute('href').slice(1)] = a; });
if ('IntersectionObserver' in window) {
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if (!e.isIntersecting) return;
      for (var k in links) links[k].classList.toggle('on', k === e.target.id);
    });
  }, { rootMargin: '-42% 0px -52% 0px' });
  ['top', 'about', 'projects', 'timeline', 'serial', 'contact'].forEach(function(id){ var el = document.getElementById(id); if (el) io.observe(el); });
}

P.setSignals(P.signals);
showSig();
})();
