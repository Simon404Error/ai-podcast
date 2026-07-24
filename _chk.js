const fs = require('fs');
const c = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js', 'utf8');

console.log('=== 中文试听 in file:', c.includes('中文试听'));
console.log('=== 试听 in file:', c.includes('试听'));
console.log('=== host-preview in file:', c.includes('host-preview'));

// Show button context
const idx = c.indexOf('host-preview');
if (idx > 0) {
  console.log('\n=== Button context ===');
  console.log(c.substring(idx - 60, idx + 100));
}

// Check CSS
const css = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/style.css', 'utf8');
console.log('\n=== CSS host-preview:', css.includes('host-preview'));

// Check server preview speed
const server = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/server.js', 'utf8');
console.log('=== Server +20% rate:', server.includes("'+20%'"));
