const fs = require('fs');
const f = 'C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/index.html';
let c = fs.readFileSync(f, 'utf8');

// Add preview button in host card template (after voice-select and before voice-browse-link)
c = c.replace(
  "'<a class=\"voice-browse-link\" data-idx=\"' + i + '\">浏览更多音色...</a>' +",
  "'<a class=\"voice-browse-link\" data-idx=\"' + i + '\">浏览更多音色...</a>' +\n          '<button class=\"host-preview\" data-idx=\"' + i + '\">\u{1F50A} 试听</button>' +"
);

fs.writeFileSync(f, c);
console.log('done');
