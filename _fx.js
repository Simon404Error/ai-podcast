const fs = require('fs');

// 1. Wrap buttons in a row container in app.js
let app = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js', 'utf8');

app = app.replace(
  "'<button class=\"host-preview\" data-idx=\"' + i + '\" data-lang=\"zh\">中文试听</button>' +\n          '<button class=\"host-preview host-preview-en\" data-idx=\"' + i + '\" data-lang=\"en\">英文试听</button>' +",
  "'<span class=\"host-preview-row\"><button class=\"host-preview\" data-idx=\"' + i + '\" data-lang=\"zh\">中文试听</button>' +\n          '<button class=\"host-preview host-preview-en\" data-idx=\"' + i + '\" data-lang=\"en\">英文试听</button></span>' +"
);

fs.writeFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js', app);

// 2. Add row CSS and adjust button margins
let css = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/voice-modal.css', 'utf8');
if (!css.includes('host-preview-row')) {
  css = css.replace(
    '.host-preview{font-size:11px;',
    '.host-preview-row{display:inline-flex;gap:4px;margin-top:6px}.host-preview{font-size:11px;'
  );
}
fs.writeFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/voice-modal.css', css);

console.log('done');
