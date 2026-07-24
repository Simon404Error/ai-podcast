const fs = require('fs');
const f = 'C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/README.md';
let c = fs.readFileSync(f, 'utf8');

// Insert deployment section before project structure
c = c.replace('\n## 项目结构\n\n```',
  '\n## 部署\n\n' +
  '### GitHub Pages（在线版）\n\n' +
  '`docs/index.html` 是纯静态版本，使用浏览器 Web Speech API，无需后端。\n' +
  '在仓库 Settings → Pages 中设置 Source 为 `main` 分支的 `/docs` 文件夹即可部署。\n\n' +
  '### 本地服务\n\n' +
  '```bash\n' +
  'node server.js  # 启动 Express 后端 + Edge TTS\n' +
  '```\n\n' +
  '## 项目结构\n\n```');

fs.writeFileSync(f, c);
console.log('done');
