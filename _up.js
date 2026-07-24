const fs = require('fs');

// 1. Update server.js - support lang param for preview
let server = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/server.js', 'utf8');
server = server.replace(
  "app.post('/api/preview-voice', async (req, res) => {",
  "app.post('/api/preview-voice', async (req, res) => {\n  const isEn = req.body.lang === 'en';"
);
server = server.replace(
  "const sample = '\u60A8\u597D\uFF0C\u8BF7\u95EE\u6709\u4EC0\u4E48\u9700\u8981\u5E2E\u52A9\u7684\u5417';",
  "const sample = isEn ? 'How are you? I am fine thanks, and you? I am fine too!' : '\u886C\u886B\u7684\u4EF7\u683C\u4E3A\u4E5D\u78C5\u5341\u4E94\u4FBF\u58EB\uFF0C\u6240\u4EE5\u7B54\u6848\u9009C\uFF0C\u5E76\u6807\u8BB0\u5728\u7B54\u9898\u5361\u4E0A';"
);
fs.writeFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/server.js', server);

// 2. Update app.js - add English preview button
let app = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js', 'utf8');

// Replace single button with two buttons
app = app.replace(
  "'<button class=\"host-preview\" data-idx=\"' + i + '\">中文试听</button>' +",
  "'<button class=\"host-preview\" data-idx=\"' + i + '\" data-lang=\"zh\">中文试听</button>' +\n          '<button class=\"host-preview host-preview-en\" data-idx=\"' + i + '\" data-lang=\"en\">英文试听</button>' +"
);

fs.writeFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js', app);

// 3. Update preview binding to pass lang
let js = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js', 'utf8');
js = js.replace(
  "body: JSON.stringify({ voice: h.voice || h._customVoice, speed: h.speed, pitch: h.pitch, volume: h.volume }),",
  "body: JSON.stringify({ voice: h.voice || h._customVoice, speed: h.speed, pitch: h.pitch, volume: h.volume, lang: btn.dataset.lang }),"
);
fs.writeFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js', js);

// 4. Update CSS - add en button style
let css = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/voice-modal.css', 'utf8');
css = css.replace(
  '.host-preview.playing{background:var(--ac);color:#fff}',
  '.host-preview.playing{background:var(--ac);color:#fff}.host-preview-en{border-color:var(--hb);color:var(--hb)}.host-preview-en:hover{background:rgba(52,211,153,.15)}.host-preview-en.playing{background:var(--hb);color:#fff}'
);
fs.writeFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/voice-modal.css', css);

console.log('done');
