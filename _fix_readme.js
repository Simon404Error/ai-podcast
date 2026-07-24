const fs = require('fs');
const f = 'C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/README.md';
let c = fs.readFileSync(f, 'utf8');

// Remove GitHub Pages badge line
c = c.replace(/\[!\[GitHub Pages\].*\)\n\n/, '');
// Remove the two online/local hint lines
c = c.replace(/> [^\n]*在线版[^\n]*\n> [^\n]*本地版[^\n]*\n/, '');
// Remove the online version section (from "### 🌐 在线版" to just before "## 快速开始")
c = c.replace(/### [^\n]*在线版[\s\S]*?## 快速开始/, '## 快速开始');
// Remove deployment section (from "## 部署" to just before "## 项目结构")  
c = c.replace(/## 部署[\s\S]*?## 项目结构/, '## 项目结构');
// Remove docs/ from project structure
c = c.replace(/├── docs\/\n│   └── index\.html[^\n]*\n/, '');

fs.writeFileSync(f, c);
console.log('done');
