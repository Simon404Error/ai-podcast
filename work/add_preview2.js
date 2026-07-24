const fs = require('fs');
const f = 'C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/docs/index.html';
let c = fs.readFileSync(f, 'utf8');

// 1. Add preview button CSS
c = c.replace('.host-remove:hover{background:rgba(239,68,68,.15);color:var(--rd)}',
  '.host-remove:hover{background:rgba(239,68,68,.15);color:var(--rd)}' +
  '.host-preview{font-size:11px;padding:3px 10px;border:1px solid var(--ac);background:transparent;color:var(--ac);border-radius:4px;cursor:pointer;transition:all .15s;font-family:inherit;margin-top:4px;align-self:flex-start}' +
  '.host-preview:hover{background:var(--acd)}' +
  '.host-preview.playing{background:var(--ac);color:#fff}');

// 2. Add preview button HTML in card template
c = c.replace(
  '浏览系统语音...</a>\'+',
  '浏览系统语音...</a>\'+<button class=\"host-preview\" data-idx=\"\'+i+\'\">\u{1F50A} 试听</button>\'+'
);

// 3. Add preview function + binding before VOICE MODAL
const previewCode = `
// ====== VOICE PREVIEW ======
let previewUtt=null;
function previewHost(idx){
  if(previewUtt){speechSynthesis.cancel();previewUtt=null}
  const h=S.hosts[idx];
  const sample=h.name+'\uFF0C\u4F60\u597D\uFF0C\u8FD9\u662F\u4E00\u6BB5\u8BED\u97F3\u6D4B\u8BD5\u3002\u6B22\u8FCE\u4F7F\u7528AI\u64AD\u5BA2\u3002\u8BED\u901F\u3001\u8BED\u8C03\u3001\u97F3\u91CF\u5747\u53EF\u81EA\u7531\u8C03\u8282\u3002';
  const u=new SpeechSynthesisUtterance(sample);
  const vu=getSpeakerVoice(h.name);if(vu)u.voice=vu.raw;
  u.rate=1+(h.speed/100);u.pitch=1+(h.pitch/100);u.volume=1+(h.volume/100);
  const btns=document.querySelectorAll('.host-preview');const btn=btns[idx];
  u.onstart=()=>{if(btn)btn.classList.add('playing')};
  u.onend=()=>{previewUtt=null;if(btn)btn.classList.remove('playing')};
  u.onerror=()=>{previewUtt=null;if(btn)btn.classList.remove('playing')};
  previewUtt=u;speechSynthesis.speak(u);
}
// ====== VOICE MODAL ======
`;
c = c.replace('// ====== VOICE MODAL ======', previewCode);

// 4. Bind preview buttons in bindHostEvents
c = c.replace(
  "$$('.voice-browse-link').forEach(el=>el.addEventListener('click',()=>openVoiceModal(+el.dataset.idx)));",
  "$$('.voice-browse-link').forEach(el=>el.addEventListener('click',()=>openVoiceModal(+el.dataset.idx)));$$('.host-preview').forEach(el=>el.addEventListener('click',()=>previewHost(+el.dataset.idx)));"
);

fs.writeFileSync(f, c);
console.log('done');
