const fs = require('fs');
const f = 'C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/docs/index.html';
let c = fs.readFileSync(f, 'utf8');

// Direct replacement using the exact substring
// Broken pattern: </a>'+<button class="host-preview"
// Fixed pattern:  </a>'+'<button class="host-preview"
c = c.replace(
  "</a>'+<button class=\"host-preview\"",
  "</a>'+'<button class=\"host-preview\""
);

fs.writeFileSync(f, c);
console.log('done');
