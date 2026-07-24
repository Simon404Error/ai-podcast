const fs = require('fs');
let c = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/server.js', 'utf8');
c = c.replace("await ttsEdge(sample, vk, fp, '+20%', pt, vol);", 'await ttsEdge(sample, vk, fp, rate, pt, vol);');
fs.writeFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/server.js', c);
console.log('done');
