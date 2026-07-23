require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const pythonExe = path.join(process.env.USERPROFILE || 'C:\\Users\\lenovo', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'python', 'python.exe');
const PY = fs.existsSync(pythonExe) ? pythonExe : 'python';

const audioDir = path.join(__dirname, 'public', 'audio');
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

const EDGE_VOICES = {
  xiaoxiao: 'zh-CN-XiaoxiaoNeural', xiaoyi: 'zh-CN-XiaoyiNeural', xiaochen: 'zh-CN-XiaochenNeural',
  yunxi: 'zh-CN-YunxiNeural', yunjian: 'zh-CN-YunjianNeural', yunyang: 'zh-CN-YunyangNeural',
};
const EDGE_VOICES_EN = { female: 'en-US-JennyNeural', male: 'en-US-GuyNeural' };

const META_KEYS = /^(角色|使用说明|生成音频建议|可用工具|建议|提示|注意|说明|注|全文完)[：:]/;
const MD_STRUCT = /^(#{1,6}\s|>\s*$|---|\*\*\*|[\s]*$)/;

function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === 'sk-your-api-key-here') return null;
  return new OpenAI({ apiKey: key, baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com' });
}

function parsePreWrittenScript(rawText, nameA, nameB) {
  const lines = rawText.split('\n');
  const segments = [];
  let alt = 'hostA';

  for (const line of lines) {
    const t = line.trim();
    if (!t || MD_STRUCT.test(t)) continue;
    if (META_KEYS.test(t.replace(/^>\s*/, ''))) continue;
    if (!/[：:]/.test(t)) continue;

    let cleaned = t
      .replace(/^>\s*/, '')
      .replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\u{FE0F}?\s*/u, '')
      .replace(/^[\u{FE0F}\u{200D}]+\s*/u, '')
      .trim();
    if (!cleaned) continue;

    const m = cleaned.match(/^(.+?)\s*[：:]\s*(.+)/);
    if (!m) continue;
    const speaker = m[1].trim();
    const text = m[2].trim();
    if (!text || text.length < 2 || META_KEYS.test(speaker + '：')) continue;

    let voice;
    if (speaker === nameA || speaker.includes(nameA)) voice = 'hostA';
    else if (speaker === nameB || speaker.includes(nameB)) voice = 'hostB';
    else { voice = alt; alt = alt === 'hostA' ? 'hostB' : 'hostA'; }

    segments.push({ speaker, text, voice });
  }
  return segments;
}

function ttsEdge(text, voiceName, outputPath, rate, pitch, volume) {
  return new Promise((resolve, reject) => {
    const rateArg = rate || '+0%';
    const pitchArg = pitch || '+0Hz';
    const py = '\nimport asyncio, edge_tts, sys\nasync def main():\n    try:\n        communicate = edge_tts.Communicate(text=sys.argv[1], voice=sys.argv[2], rate=sys.argv[3], pitch=sys.argv[4], volume=sys.argv[5])\n        await communicate.save(sys.argv[6])\n        print("OK")\n    except Exception as e:\n        print("ERROR", e, file=sys.stderr); sys.exit(1)\nasyncio.run(main())';
    const tmp = outputPath + '.py';
    fs.writeFileSync(tmp, py);
    const proc = spawn(PY, [tmp, text, voiceName, rateArg, pitchArg, volume || '+0%', outputPath], { stdio: ['ignore', 'pipe', 'pipe'] });
    let errOut = '';
    proc.stderr.on('data', d => errOut += d.toString());
    proc.on('close', code => {
      try { fs.unlinkSync(tmp); } catch {}
      if (code === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) resolve(outputPath);
      else reject(new Error(errOut.trim() || 'TTS exit ' + code));
    });
    proc.on('error', e => { try { fs.unlinkSync(tmp); } catch {} reject(e); });
  });
}

async function genAudio(segments, voiceSettings) {
  const isEn = voiceSettings.language === 'en';
  const vmap = isEn ? EDGE_VOICES_EN : EDGE_VOICES;
  const audioFiles = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const vs = seg.voice === 'hostA' ? voiceSettings.hostA : voiceSettings.hostB;
    const ttsVoice = vmap[vs.voice] || (seg.voice === 'hostA' ? vmap['xiaoxiao'] : vmap['yunxi']);
    const fn = 'seg_' + i + '_' + crypto.randomBytes(4).toString('hex') + '.mp3';
    const fp = path.join(audioDir, fn);
    try {
      await ttsEdge(seg.text, ttsVoice, fp, vs.rate, vs.pitch, vs.volume);
      audioFiles.push({ speaker: seg.speaker, text: seg.text, voice: seg.voice, audioUrl: '/audio/' + fn, index: i });
    } catch (e) {
      console.error('TTS seg ' + i + ':', e.message);
      audioFiles.push({ speaker: seg.speaker, text: seg.text, voice: seg.voice, audioUrl: null, error: e.message, index: i });
    }
  }
  return audioFiles;
}

// === Routes ===

app.get('/api/status', (req, res) => {
  res.json({ ready: true, tts: 'Edge TTS (free)', ai: !!getClient() ? 'DeepSeek available' : 'AI gen unavailable' });
});

app.get('/api/voices', (req, res) => res.json({ zh: EDGE_VOICES, en: EDGE_VOICES_EN }));

app.post('/api/parse-script', (req, res) => {
  const { script, hostAName, hostBName } = req.body;
  if (!script) return res.status(400).json({ error: 'No script provided' });
  const segments = parsePreWrittenScript(script, hostAName || 'Host A', hostBName || 'Host B');
  res.json({ segments, totalSegments: segments.length });
});

app.post('/api/parse-and-generate', async (req, res) => {
  const { script, hostAName, hostBName, voiceA, voiceB, voiceASpeed, voiceAPitch, voiceAVolume, voiceBSpeed, voiceBPitch, voiceBVolume, language } = req.body;
  if (!script) return res.status(400).json({ error: 'No script provided' });

  const voiceSettings = {
    language: language || 'zh',
    hostA: {
      voice: voiceA || 'xiaoxiao',
      rate: voiceASpeed != null ? (voiceASpeed >= 0 ? '+' : '') + voiceASpeed + '%' : '+5%',
      pitch: voiceAPitch != null ? (voiceAPitch >= 0 ? '+' : '') + voiceAPitch + 'Hz' : '+0Hz',
      volume: voiceAVolume != null ? (voiceAVolume >= 0 ? '+' : '') + voiceAVolume + '%' : '+0%',
    },
    hostB: {
      voice: voiceB || 'yunxi',
      rate: voiceBSpeed != null ? (voiceBSpeed >= 0 ? '+' : '') + voiceBSpeed + '%' : '+5%',
      pitch: voiceBPitch != null ? (voiceBPitch >= 0 ? '+' : '') + voiceBPitch + 'Hz' : '+0Hz',
      volume: voiceBVolume != null ? (voiceBVolume >= 0 ? '+' : '') + voiceBVolume + '%' : '+0%',
    },
  };

  try {
    const segments = parsePreWrittenScript(script, hostAName || 'Host A', hostBName || 'Host B');
    if (!segments.length) return res.status(400).json({ error: 'No dialogue lines found.' });
    const audioFiles = await genAudio(segments, voiceSettings);
    res.json({ segments, audioFiles, totalSegments: segments.length });
  } catch (err) {
    console.error('Parse+generate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate-full', async (req, res) => {
  const client = getClient();
  if (!client) return res.status(400).json({ error: 'DeepSeek API key not configured.' });

  const { text, url, hostAName, hostBName, hostAStyle, hostBStyle, voiceA, voiceB, voiceASpeed, voiceAPitch, voiceAVolume, voiceBSpeed, voiceBPitch, voiceBVolume, language } = req.body;
  if (!text && !url) return res.status(400).json({ error: 'Provide text or URL' });

  const isEn = language === 'en';
  const nameA = hostAName || 'Host A';
  const nameB = hostBName || 'Host B';

  const sysPrompt = isEn
    ? 'You are a podcast script writer. Write a natural dialogue between ' + nameA + ' (' + (hostAStyle || 'curious') + ') and ' + nameB + ' (' + (hostBStyle || 'analytical') + '). Each line MUST start with "' + nameA + ': " or "' + nameB + ': ". 12-20 exchanges. Output ONLY the dialogue.'
    : '\u4f60\u662f\u64ad\u5ba2\u5199\u624b\u3002' + nameA + '\uff08' + (hostAStyle || '\u70ed\u60c5\u597d\u5947') + '\uff09\u548c' + nameB + '\uff08' + (hostBStyle || '\u7406\u6027\u5206\u6790') + '\uff09\u8ba8\u8bba\u4ee5\u4e0b\u5185\u5bb9\u3002\u8f93\u51fa\u683c\u5f0f\uff1a\u6bcf\u4e00\u884c\u5fc5\u987b\u662f\u201c' + nameA + '\uff1a\u5bf9\u8bdd\u5185\u5bb9\u201d\u6216\u201c' + nameB + '\uff1a\u5bf9\u8bdd\u5185\u5bb9\u201d\u3002' + '12-20\u8f6e\u5bf9\u8bdd\uff0c\u81ea\u7136\u6d41\u7545\u3002\u53ea\u8f93\u51fa\u5bf9\u8bdd\u3002';

  const src = url ? ('URL: ' + url + '\n\n' + (text || 'Discuss this topic')) : text;

  const voiceSettings = {
    language: language || 'zh',
    hostA: { voice: voiceA || 'xiaoxiao', rate: voiceASpeed != null ? (voiceASpeed >= 0 ? '+' : '') + voiceASpeed + '%' : '+5%', pitch: voiceAPitch != null ? (voiceAPitch >= 0 ? '+' : '') + voiceAPitch + 'Hz' : '+0Hz', volume: voiceAVolume != null ? (voiceAVolume >= 0 ? '+' : '') + voiceAVolume + '%' : '+0%' },
    hostB: { voice: voiceB || 'yunxi', rate: voiceBSpeed != null ? (voiceBSpeed >= 0 ? '+' : '') + voiceBSpeed + '%' : '+5%', pitch: voiceBPitch != null ? (voiceBPitch >= 0 ? '+' : '') + voiceBPitch + 'Hz' : '+0Hz', volume: voiceBVolume != null ? (voiceBVolume >= 0 ? '+' : '') + voiceBVolume + '%' : '+0%' },
  };

  try {
    const resp = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: isEn ? 'Topic:\n' + src : '\u4e3b\u9898\uff1a\n' + src }],
      temperature: 0.8, max_tokens: 4096,
    });
    const raw = resp.choices[0].message.content.trim();
    const segments = parsePreWrittenScript(raw, nameA, nameB);
    const audioFiles = await genAudio(segments, voiceSettings);
    res.json({ script: raw, segments, audioFiles, totalSegments: segments.length });
  } catch (err) {
    console.error('AI gen error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  fs.readdir(audioDir, (err, files) => {
    if (err) return;
    files.forEach(f => {
      const fp = path.join(audioDir, f);
      fs.stat(fp, (se, st) => { if (!se && st.mtimeMs < cutoff) fs.unlink(fp, () => {}); });
    });
  });
}, 15 * 60 * 1000);

app.listen(PORT, () => console.log('AI Podcast running at http://localhost:' + PORT));
