const fs = require('fs');
let app = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js', 'utf8');

// 10 spaces before browse link, 8 spaces before closing div
app = app.replace(
  "          '<a class=\"voice-browse-link\" data-idx=\"' + i + '\">浏览更多音色...</a>' +\n        '</div>' +",
  "          '<a class=\"voice-browse-link\" data-idx=\"' + i + '\">浏览更多音色...</a>' +\n          '<button class=\"host-preview\" data-idx=\"' + i + '\">中文试听</button>' +\n        '</div>' +"
);

fs.writeFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js', app);

// Verify
const c = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js', 'utf8');
console.log('中文试听:', c.includes('中文试听'));
