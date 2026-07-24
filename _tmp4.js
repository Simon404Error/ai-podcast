const fs = require('fs');
const f = 'C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/index.html';
let c = fs.readFileSync(f, 'utf8');

// Add modeToggle to editor header-actions (with CRLF)
c = c.replace(
  '<div class="header-actions">\r\n              <label class="action-btn" title="从文件导入">',
  '<div class="header-actions">\r\n              <button id="modeToggle" class="action-btn">AI 生成</button>\r\n              <label class="action-btn" title="从文件导入">'
);

fs.writeFileSync(f, c);
console.log('done');
