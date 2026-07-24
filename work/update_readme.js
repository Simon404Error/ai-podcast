const fs = require('fs');
const f = 'C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/README.md';
let c = fs.readFileSync(f, 'utf8');

// Add online badge
c = c.replace('基于 Microsoft Edge TTS，完全免费。',
  '基于 Microsoft Edge TTS，完全免费。\n\n' +
  '[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-%E5%9C%A8%E7%BA%BF%E7%89%88-8b5cf6?logo=github)](https://simon404error.github.io/ai-podcast/)\n\n' +
  '> \u{1F310} **在线版**：https://simon404error.github.io/ai-podcast/ \u2014 无需安装，浏览器打开即用\n' +
  '> \u{1F5A5}\uFE0F **本地版**：`node server.js` \u2014 高质量 Edge TTS，322 种音色');

// Split quick start
c = c.replace('## 快速开始',
  '### \u{1F310} 在线版（推荐）\n\n' +
  '打开 [simon404error.github.io/ai-podcast](https://simon404error.github.io/ai-podcast/) 直接使用，无需安装。\n' +
  '使用浏览器内置 Web Speech API 进行语音合成，支持 Windows / macOS / Linux / 手机。\n\n' +
  '### \u{1F5A5}\uFE0F 本地版（高质量 TTS）\n\n' +
  '## 快速开始');

// Add deployment section
c = c.replace('## 项目结构\n\n```',
  '## 部署\n\n' +
  '### GitHub Pages（在线版）\n\n' +
  '`docs/index.html` 是纯静态版本，使用浏览器 Web Speech API，无需后端。\n' +
  '在仓库 Settings \u2192 Pages 中设置 Source 为 `main` 分支的 `/docs` 文件夹即可部署。\n\n' +
  '### 本地服务\n\n' +
  '```bash\n' +
  'node server.js  # 启动 Express 后端 + Edge TTS\n' +
  '```\n\n' +
  '## 项目结构\n\n```');

// Add docs to structure
c = c.replace('\u2514\u2500\u2500 .gitignore',
  '\u251C\u2500\u2500 docs/\n' +
  '\u2502   \u2514\u2500\u2500 index.html      # 静态版（GitHub Pages 在线版）\n' +
  '\u2514\u2500\u2500 .gitignore');

fs.writeFileSync(f, c);
console.log('done');
