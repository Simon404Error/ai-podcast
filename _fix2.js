const fs = require('fs');
const f = 'C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js';
let c = fs.readFileSync(f, 'utf8');

// Insert preview button right after the name-input line in the card template
c = c.replace(
  '" placeholder="主持人名" />\' +\n          (host._customVoice',
  '" placeholder="主持人名" />\' +\n          \'<button class="host-preview" data-idx="\' + i + \'">\u{1F50A} 试听</button>\' +\n          (host._customVoice'
);

fs.writeFileSync(f, c);
console.log('done');
