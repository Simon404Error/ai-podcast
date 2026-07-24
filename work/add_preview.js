const fs = require('fs');
const f = 'C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/docs/index.html';
let c = fs.readFileSync(f, 'utf8');

// 1. Add preview button CSS
c = c.replace('.host-remove:hover{background:rgba(239,68,68,.15);color:var(--rd)}',
  '.host-remove:hover{background:rgba(239,68,68,.15);color:var(--rd)}' +
  '.host-preview{font-size:11px;padding:3px 10px;border:1px solid var(--ac);background:transparent;color:var(--ac);border-radius:4px;cursor:pointer;transition:all .15s;font-family:inherit;margin-top:4px;align-self:flex-start}' +
  '.host-preview:hover{background:var(--acd)}' +
  '.host-preview.playing{background:var(--ac);color:#fff}');

// 2. Add preview button in card template (after voice-browse-link line)
c = c.replace(
  "'<a class=\"voice-browse-link\" data-idx=\"'+i+'\">浏览系统语音...</a>'+",
  "'<a class=\"voice-browse-link\" data-idx=\"'+i+'\">浏览系统语音...</a>'+<button class=\"host-preview\" data-idx=\"'+i+'\">\u{1F50A} 试听</button>'+"
);

// 3. Add preview function before voice modal section
c = c.replace('// ====== VOICE MODAL ======',
  '// ====== VOICE PREVIEW ======\n' +
  'let previewUtt=null;\n' +
  'function previewHost(idx){\n' +
  '  if(previewUtt){speechSynthesis.cancel();previewUtt=null;}\n' +
  '  const h=S.hosts[idx];\n' +
  '  const sample=h.name+\uFF0C\u4F60\u597D\uFF0C\u8FD9\u662F\u4E00\u6BB5\u8BED\u97F3\u6D4B\u8BD5\u3002' +
  '\u6B22\u8FCE\u4F7F\u7528AI\u64AD\u5BA2\u3002' +
  '\u8BED\u901F\u3001\u8BED\u8C03\u3001\u97F3\u91CF\u5747\u53EF\u81EA\u7531\u8C03\u8282\u3002' +
  '\\n' +
  '  const u=new SpeechSynthesisUtterance(sample);\n' +
  '  const vu=getSpeakerVoice(h.name);if(vu)u.voice=vu.raw;\n' +
  '  u.rate=1+(h.speed/100);u.pitch=1+(h.pitch/100);u.volume=1+(h.volume/100);\n' +
  '  u.onstart=()=>{const btn=document.querySelector(\\'.host-preview[data-idx=\"\\'+idx+\\'\"]\\');if(btn)btn.classList.add(\\'playing\\')};\n' +
  '  u.onend=()=>{previewUtt=null;const btn=document.querySelector(\\'.host-preview[data-idx=\"\\'+idx+\\'\"]\\');if(btn)btn.classList.remove(\\'playing\\')};\n' +
  '  u.onerror=()=>{previewUtt=null;const btn=document.querySelector(\\'.host-preview[data-idx=\"\\'+idx+\\'\"]\\');if(btn)btn.classList.remove(\\'playing\\')};\n' +
  '  previewUtt=u;speechSynthesis.speak(u);\n' +
  '}\n\n' +
  '// ====== VOICE MODAL ======');

// 4. Bind preview buttons in bindHostEvents
c = c.replace(
  "$$('.voice-browse-link').forEach(el=>el.addEventListener('click',()=>openVoiceModal(+el.dataset.idx)));",
  "$$('.voice-browse-link').forEach(el=>el.addEventListener('click',()=>openVoiceModal(+el.dataset.idx)));" +
  "$$('.host-preview').forEach(el=>el.addEventListener('click',()=>previewHost(+el.dataset.idx)));"
);

fs.writeFileSync(f, c);
console.log('done');
