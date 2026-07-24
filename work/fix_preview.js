const fs = require('fs');
const f = 'C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/docs/index.html';
let c = fs.readFileSync(f, 'utf8');

// Fix: wrap the raw <button> in string quotes
// Broken:  ...</a>'+<button class=...
// Fixed:   ...</a>'+'<button class=...
c = c.replace(
  "'\u6d4f\u89c8\u7cfb\u7edf\u8bed\u97f3...</a>'+<button",
  "'\u6d4f\u89c8\u7cfb\u7edf\u8bed\u97f3...</a>'+'<button"
);

fs.writeFileSync(f, c);
console.log('done');
