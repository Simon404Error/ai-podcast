const fs = require('fs');

// Fix app.js - rewrite the host card template area
let app = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js', 'utf8');

// 1. Remove old button from name-input area
app = app.replace(
  "'<button class=\"host-preview\" data-idx=\"' + i + '\">🔊 试听</button>' +\n          (host._customVoice",
  "(host._customVoice"
);

// 2. Add new button after voice-browse-link, before closing </div>
app = app.replace(
  "'<a class=\"voice-browse-link\" data-idx=\"' + i + '\">浏览更多音色...</a>' +\n          '</div>' +",
  "'<a class=\"voice-browse-link\" data-idx=\"' + i + '\">浏览更多音色...</a>' +\n          '<button class=\"host-preview\" data-idx=\"' + i + '\">中文试听</button>' +\n          '</div>' +"
);

fs.writeFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js', app);

// Fix CSS - add host-preview style
let css = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/style.css', 'utf8');
if (!css.includes('host-preview')) {
  css = css.replace(
    '.voice-browse-link:hover{text-decoration:underline}',
    '.voice-browse-link:hover{text-decoration:underline}.host-preview{font-size:10px;padding:1px 6px;border:1px solid var(--ac);background:transparent;color:var(--ac);border-radius:3px;cursor:pointer;transition:all .15s;font-family:inherit;white-space:nowrap;line-height:1.4;margin-top:4px}.host-preview:hover{background:var(--acd)}.host-preview.playing{background:var(--ac);color:#fff}'
  );
  fs.writeFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/style.css', css);
}

console.log('done');
