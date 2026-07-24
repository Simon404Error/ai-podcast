const fs = require('fs');

// 1. Move preview button after voice-select, change text to 中文试听
let app = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js', 'utf8');

// Remove old button placement (next to name input)
app = app.replace(
  '" placeholder="主持人名" />\'' + '\n          \'<button class="host-preview" data-idx="\' + i + \'">🔊 试听</button>\' +\n          (host._customVoice',
  '" placeholder="主持人名" />\'' + '\n          (host._customVoice'
);

// Add button after voice-select + voice-browse-link
app = app.replace(
  "'浏览更多音色...</a>' +\n          '</div>' +",
  "'浏览更多音色...</a>' +\n          '<button class=\"host-preview\" data-idx=\"' + i + '\">中文试听</button>' +\n          '</div>' +"
);

fs.writeFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js', app);

// 2. Update CSS - make button smaller
let css = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/style.css', 'utf8');
css = css.replace(
  '.host-preview{font-size:11px;padding:2px 8px;border:1px solid var(--ac);background:transparent;color:var(--ac);border-radius:4px;cursor:pointer;transition:all .15s;font-family:inherit;white-space:nowrap}',
  '.host-preview{font-size:10px;padding:1px 6px;border:1px solid var(--ac);background:transparent;color:var(--ac);border-radius:3px;cursor:pointer;transition:all .15s;font-family:inherit;white-space:nowrap;line-height:1.4}'
);
fs.writeFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/style.css', css);

// 3. Speed up preview - shorter text, faster rate
let server = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/server.js', 'utf8');
server = server.replace(
  "const sample = '您好，请问有什么需要帮助的吗？';",
  "const sample = '您好，请问有什么需要帮助的吗';"
);
// Use +20% rate for preview to speed up generation
server = server.replace(
  "await ttsEdge(sample, vk, fp, rate, pt, vol);",
  "await ttsEdge(sample, vk, fp, '+20%', pt, vol);"
);
fs.writeFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/server.js', server);

console.log('done');
