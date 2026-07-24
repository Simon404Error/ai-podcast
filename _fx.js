const fs = require('fs');
let app = fs.readFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js', 'utf8');

// Add button AFTER the browse link line (insert new line between browse link and </div>)
app = app.replace(
  "'浏览更多音色...</a>' +\n        '</div>' +",
  "'浏览更多音色...</a>' +\n        '<button class=\"host-preview\" data-idx=\"' + i + '\">中文试听</button>' +\n        '</div>' +"
);

fs.writeFileSync('C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/app.js', app);
console.log('done');
