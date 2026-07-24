const fs = require('fs');
const f = 'C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/public/index.html';
let c = fs.readFileSync(f, 'utf8');

// Remove modeToggle from header
c = c.replace('        <button id="modeToggle" class="mode-toggle">AI 生成</button>\n', '');

// Add modeToggle to editor panel header-actions, next to the import button
c = c.replace(
  '<div class="header-actions">\n              <label class="action-btn" title="从文件导入">',
  '<div class="header-actions">\n              <button id="modeToggle" class="action-btn">AI 生成</button>\n              <label class="action-btn" title="从文件导入">'
);

fs.writeFileSync(f, c);
console.log('done');
