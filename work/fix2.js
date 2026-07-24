const fs = require('fs');
const f = 'C:/Users/lenovo/Documents/Codex/2026-07-24/dou/work/ai-podcast/README.md';
let c = fs.readFileSync(f, 'utf8');

c = c.replace('\r\n## 项目结构\r\n\r\n```',
  '\r\n## 部署\r\n\r\n' +
  '### GitHub Pages（在线版）\r\n\r\n' +
  '`docs/index.html` 是纯静态版本，使用浏览器 Web Speech API，无需后端。\r\n' +
  '在仓库 Settings → Pages 中设置 Source 为 `main` 分支的 `/docs` 文件夹即可部署。\r\n\r\n' +
  '### 本地服务\r\n\r\n' +
  '```bash\r\n' +
  'node server.js  # 启动 Express 后端 + Edge TTS\r\n' +
  '```\r\n\r\n' +
  '## 项目结构\r\n\r\n```');

fs.writeFileSync(f, c);
console.log('done');
