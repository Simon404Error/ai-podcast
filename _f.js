const fs = require('fs');
let c = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/server.js', 'utf8');

// Shorten samples and use faster base rate
c = c.replace(
  "const sample = isEn ? 'How are you? I am fine thanks, and you? I am fine too!' : '\u886C\u886B\u7684\u4EF7\u683C\u4E3A\u4E5D\u78C5\u5341\u4E94\u4FBF\u58EB\uFF0C\u6240\u4EE5\u7B54\u6848\u9009C\uFF0C\u5E76\u6807\u8BB0\u5728\u7B54\u9898\u5361\u4E0A';",
  "const sample = isEn ? 'How are you? I am fine, thanks.' : '\u60A8\u597D\uFF0C\u8FD9\u662F\u4E00\u6BB5\u4E2D\u6587\u8BD5\u542C\u6D4B\u8BD5\u3002';"
);

// Always use +30% rate for previews to cut latency
c = c.replace(
  "await ttsEdge(sample, vk, fp, rate, pt, vol);",
  "const previewRate = '+30%'; await ttsEdge(sample, vk, fp, previewRate, pt, vol);"
);

fs.writeFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/server.js', c);
console.log('done');
