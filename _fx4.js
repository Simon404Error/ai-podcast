const fs = require('fs');
let css = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/voice-modal.css', 'utf8');
css = css.replace(
  '.voice-browse-link:hover{text-decoration:underline}',
  '.voice-browse-link:hover{text-decoration:underline}.host-preview{font-size:10px;padding:1px 6px;border:1px solid var(--ac);background:transparent;color:var(--ac);border-radius:3px;cursor:pointer;transition:all .15s;font-family:inherit;white-space:nowrap;line-height:1.4;margin-top:4px}.host-preview:hover{background:var(--acd)}.host-preview.playing{background:var(--ac);color:#fff}'
);
fs.writeFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/voice-modal.css', css);
console.log('CSS has host-preview:', fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/voice-modal.css','utf8').includes('host-preview'));
