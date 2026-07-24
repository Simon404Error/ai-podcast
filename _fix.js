const fs = require('fs');

// Fix index.html - add preview button next to host name
const htmlFile = 'C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/index.html';
let html = fs.readFileSync(htmlFile, 'utf8');

// Add preview button after name-input, before voice-select in the card template
html = html.replace(
  "'<input type=\"text\" class=\"name-input host-name\" value=\"' + esc(host.name) + '\" data-idx=\"' + i + '\" placeholder=\"主持人名\" />' +",
  "'<input type=\"text\" class=\"name-input host-name\" value=\"' + esc(host.name) + '\" data-idx=\"' + i + '\" placeholder=\"主持人名\" />' +\n          '<button class=\"host-preview\" data-idx=\"' + i + '\">\u{1F50A} 试听</button>' +"
);

fs.writeFileSync(htmlFile, html);

// Fix server.js - update preview sample text
const serverFile = 'C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/server.js';
let server = fs.readFileSync(serverFile, 'utf8');
server = server.replace(
  "const sample = '\u4F60\u597D\uFF0C\u8FD9\u662F\u4E00\u6BB5\u8BED\u97F3\u8BD5\u542C\u3002\u6B22\u8FCE\u4F7F\u7528AI\u64AD\u5BA2\u3002';",
  "const sample = '\u60A8\u597D\uFF0C\u8BF7\u95EE\u6709\u4EC0\u4E48\u9700\u8981\u5E2E\u52A9\u7684\u5417\uFF1F';"
);

fs.writeFileSync(serverFile, server);

// Update app.js - move preview binding to bindHostEvents
const jsFile = 'C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');

// Check if preview binding already exists
if (!js.includes("$$('.host-preview').forEach")) {
  // Add after voice browse links in bindHostEvents
  js = js.replace(
    "    link.addEventListener('click', () => openVoiceModal(parseInt(link.dataset.idx)));\n  });\n  // Name changes",
    "    link.addEventListener('click', () => openVoiceModal(parseInt(link.dataset.idx)));\n  });\n  // Voice preview\n  let previewAudio = null;\n  $$('.host-preview').forEach(btn => {\n    btn.addEventListener('click', async () => {\n      if (previewAudio) { previewAudio.pause(); previewAudio = null; }\n      const idx = parseInt(btn.dataset.idx);\n      const h = state.hosts[idx];\n      $$('.host-preview').forEach(b => b.classList.remove('playing'));\n      btn.classList.add('playing');\n      try {\n        const res = await fetch('/api/preview-voice', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ voice: h.voice || h._customVoice, speed: h.speed, pitch: h.pitch, volume: h.volume }),\n        });\n        const data = await res.json();\n        if (data.audioUrl) {\n          const a = new Audio(data.audioUrl);\n          previewAudio = a;\n          a.onended = () => { previewAudio = null; btn.classList.remove('playing'); };\n          a.onerror = () => { previewAudio = null; btn.classList.remove('playing'); };\n          a.play();\n        }\n      } catch(e) { btn.classList.remove('playing'); }\n    });\n  });\n  // Name changes"
  );
}

fs.writeFileSync(jsFile, js);

// Update CSS - add preview button style
const cssFile = 'C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/style.css';
let css = fs.readFileSync(cssFile, 'utf8');
if (!css.includes('.host-preview')) {
  css = css.replace(
    '.voice-browse-link:hover{text-decoration:underline}',
    '.voice-browse-link:hover{text-decoration:underline}.host-preview{font-size:11px;padding:2px 8px;border:1px solid var(--ac);background:transparent;color:var(--ac);border-radius:4px;cursor:pointer;transition:all .15s;font-family:inherit;white-space:nowrap}.host-preview:hover{background:var(--acd)}.host-preview.playing{background:var(--ac);color:#fff}'
  );
  fs.writeFileSync(cssFile, css);
}

console.log('all done');
