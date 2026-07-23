# 🎙️ AI 播客

> 粘贴文稿，自动合成双人播客音频。基于 Microsoft Edge TTS，完全免费。

![theme](https://img.shields.io/badge/themes-4-blue) ![tts](https://img.shields.io/badge/TTS-Edge%20TTS-brightgreen) ![license](https://img.shields.io/badge/license-MIT-green)

## 功能

- **📄 文稿导入** — 粘贴 Markdown 播客脚本，自动解析主持人对话，合成音频
- **🎭 双人音色** — 6 种中文语音（晓晓、晓依、晓辰、云希、云健、云扬），男女自由搭配
- **👥 多主持人** — 不限主持人数，点击「检测」自动识别文稿中所有主持人，也可手动添加/移除
- **🌍 全音色库** — 内置 322 个 Edge TTS 音色，覆盖 142 种语言/地区，搜索、筛选、一键选用
- **🎚️ 声音调节** — 每位主持人独立调节语速（0.5x ~ 2.0x）、语调（-20 ~ +20Hz）、音量（50% ~ 100%）滑块实时预览
- **💾 状态保存** — 文稿、配置自动保存到浏览器本地，刷新不丢失；支持手动保存
- **🎨 四套主题** — 暗黑 / 亮白 / 魅紫 / 岩灰，一键切换，偏好自动记忆
- **📁 文件上传** — 支持 `.md` / `.txt` 文件拖入或上传，自动识别主持人名字
- **🎧 分段播放** — 逐段播放、上下切换、进度拖拽、自动连播，带动态频谱动画
- **📝 文稿预览** — 解析后的对话稿同步展示，主持人区分颜色
- **🔗 音频文稿联动** — 播放音频时，文稿中当前段落自动紫色高亮并滚动到可见区域
- **⛶ 放大模式** — 输出面板一键全屏展开，浏览长文稿更方便
- **🤖 AI 生成**（可选）— 接入 DeepSeek API，输入主题自动生成播客对话稿

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Node.js + Express |
| 语音合成 | Microsoft Edge TTS（免费，通过 `edge-tts` Python 库） |
| AI 文稿 | DeepSeek API（可选，不配置也能用文稿导入模式） |
| 前端 | 原生 HTML/CSS/JS，零框架依赖 |
| 持久化 | localStorage（文稿、配置、主题偏好） |

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/Simon404Error/ai-podcast.git
cd ai-podcast

# 2. 安装 Node.js 依赖
npm install

# 3. 安装 Edge TTS（需要 Python 3.8+）
pip install edge-tts

# 4.（可选）配置 AI 生成功能
cp .env.example .env
# 编辑 .env，填入 DeepSeek API Key

# 5. 启动服务
node server.js
```

浏览器打开 `http://localhost:3000` 即可使用。

## 使用指南

### 方式一：导入文稿（默认，无需 API Key）

1. 将播客脚本粘贴到左侧文本框，或点击「导入」上传 `.md` / `.txt` 文件
2. 在右侧「音色配置」中确认主持人名字（需与文稿中一致）
3. 选择各自的音色，拖动滑块调节语速 / 语调 / 音量
4. 点击「生成音频」
5. 切换到「音频播放」标签页，点击播放收听
6. 点击 ⛶ 可将输出面板全屏展开
7. 播放时切换到「文稿预览」可看到当前段落实时高亮
8. 点击右上角色块切换界面主题，点击 💾 手动保存

文稿和所有配置在修改后自动保存，刷新页面也不会丢失。

### 方式二：AI 生成（需要 DeepSeek API Key）

1. 点击右上角「AI 生成」切换模式
2. 输入文章内容或 URL
3. 配置主持人风格和音色
4. 点击「AI 生成播客」
5. AI 自动生成对话稿并合成音频

### 声音参数说明

| 参数 | 范围 | 默认值 | 说明 |
|---|---|---|---|
| 语速 | 0.50x ~ 2.00x | 1.05x | 修改播放速度 |
| 语调 | -20 ~ +20 Hz | 0 | 音调高低，正值更尖细，负值更低沉 |
| 音量 | 50% ~ 100% | 100% | 输出音量，可单独降低某位主持人 |

## 文稿格式

支持标准的「主持人名：对话内容」格式：

```
小竹：哈喽大家好，欢迎收听今天的播客。
溪溪老师：大家好，我是溪溪老师。
小竹：今天我们来聊聊人工智能对教育的影响。
溪溪老师：这个话题很有意义。
```

也支持带 emoji 前缀（`🎙️`、`🎓`）和 Markdown 元数据行，程序会自动跳过。

## 音色列表

### 中文语音（Edge TTS）

| 代号 | 名称 | 性别 | 风格 |
|---|---|---|---|
| `xiaoxiao` | 晓晓 | 女 | 温柔自然 |
| `xiaoyi` | 晓依 | 女 | 活泼明亮 |
| `xiaochen` | 晓辰 | 女 | 沉稳知性 |
| `yunxi` | 云希 | 男 | 深邃成熟 |
| `yunjian` | 云健 | 男 | 自然亲和 |
| `yunyang` | 云扬 | 男 | 播音风格 |

### 英文语音

| 代号 | 名称 | 性别 |
|---|---|---|
| `female` | Jenny | 女 |
| `male` | Guy | 男 |

## API 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/status` | 服务状态 |
| `GET` | `/api/voices` | 可用音色列表 |
| GET | /api/all-voices | 全音色库 (322 音色, 142 语言) |
| `POST` | `/api/parse-script` | 解析文稿，返回对话分段 |
| `POST` | `/api/parse-and-generate` | 解析文稿并合成音频（支持语速/语调/音量） |
| `POST` | `/api/detect-speakers` | 检测文稿中所有主持人 |
| `POST` | `/api/generate-full` | AI 生成文稿 + 合成音频（需要 API Key） |

## 项目结构

```
ai-podcast/
├── server.js              # Express 后端
├── package.json
├── README.md
├── .env.example           # API Key 配置模板
├── public/
│   ├── index.html         # 前端界面
│   ├── style.css          # 样式（含四套主题变量）
│   ├── app.js             # 前端逻辑 + 音频播放器 + 持久化
│   └── audio/             # 生成的音频文件（gitignore）
└── .gitignore
```

## License

MIT
