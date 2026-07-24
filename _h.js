const fs = require('fs');
let app = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js', 'utf8');

app = app.replace(
  "'<button class=\"host-preview host-preview-en\" data-idx=\"' + i + '\" data-lang=\"en\">英文试听</button></span>' +",
  "'<button class=\"host-preview host-preview-en\" data-idx=\"' + i + '\" data-lang=\"en\">英文试听</button>' +\n          '<span class=\"preview-hint\">可能有几秒延迟，随后播放试听音频</span></span>' +"
);

fs.writeFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js', app);

// Add CSS
let css = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/voice-modal.css', 'utf8');
if (!css.includes('preview-hint')) {
  css = css.replace(
    '.host-preview-row{display:inline-flex;gap:4px;margin-top:6px}',
    '.host-preview-row{display:inline-flex;gap:4px;margin-top:6px;align-items:center}.preview-hint{font-size:11px;color:var(--tx3);white-space:nowrap}'
  );
}
fs.writeFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/voice-modal.css', css);

console.log('done');
