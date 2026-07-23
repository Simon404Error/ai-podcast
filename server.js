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

// Resolve a voice key to actual Edge TTS short name
function resolveVoice(key) {
  if (!key) return 'zh-CN-XiaoxiaoNeural';
  if (key.includes('-') && key.endsWith('Neural')) return key;
  if (EDGE_VOICES[key]) return EDGE_VOICES[key];
  if (EDGE_VOICES_EN[key]) return EDGE_VOICES_EN[key];
  return 'zh-CN-XiaoxiaoNeural';
}

function parsePreWrittenScript(rawText) {
  const lines = rawText.split('\n');
  const segments = [];
  const detectedSpeakers = new Set();

  for (const line of lines) {
    const t = line.trim();
    if (!t || MD_STRUCT.test(t)) continue;
    if (META_KEYS.test(t.replace(/^>\s*/, ''))) continue;
    if (!/[：:]/.test(t)) continue;

    let cleaned = t.replace(/^>\s*/, '')
      .replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\u{FE0F}?\s*/u, '')
      .replace(/^[\u{FE0F}\u{200D}]+\s*/u, '').trim();
    if (!cleaned) continue;

    const m = cleaned.match(/^(.+?)\s*[：:]\s*(.+)/);
    if (!m) continue;
    const speaker = m[1].trim(), text = m[2].trim();
    if (!text || text.length < 2 || META_KEYS.test(speaker + '：')) continue;

    detectedSpeakers.add(speaker);
    segments.push({ speaker, text });
  }
  return { segments, speakers: [...detectedSpeakers] };
}

function ttsEdge(text, voiceName, outputPath, rate, pitch, volume) {
  return new Promise((resolve, reject) => {
    const py = '\nimport asyncio, edge_tts, sys\nasync def main():\n    try:\n        communicate = edge_tts.Communicate(text=sys.argv[1], voice=sys.argv[2], rate=sys.argv[3], pitch=sys.argv[4], volume=sys.argv[5])\n        await communicate.save(sys.argv[6])\n        print("OK")\n    except Exception as e:\n        print("ERROR", e, file=sys.stderr); sys.exit(1)\nasyncio.run(main())';
    const tmp = outputPath + '.py';
    fs.writeFileSync(tmp, py);
    const proc = spawn(PY, [tmp, text, voiceName, rate || '+0%', pitch || '+0Hz', volume || '+0%', outputPath], { stdio: ['ignore', 'pipe', 'pipe'] });
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

function buildVoiceMap(body, speakers) {
  const defaults = ['xiaoxiao', 'yunxi', 'xiaoyi', 'yunjian'];
  const map = {};

  if (body.voiceMap && typeof body.voiceMap === 'object') {
    speakers.forEach((name, i) => {
      const cfg = body.voiceMap[name] || {};
      map[name] = {
        voice: resolveVoice(cfg.voice) || resolveVoice(defaults[i % defaults.length]),
        rate: cfg.speed != null ? (cfg.speed >= 0 ? '+' : '') + cfg.speed + '%' : '+5%',
        pitch: cfg.pitch != null ? (cfg.pitch >= 0 ? '+' : '') + cfg.pitch + 'Hz' : '+0Hz',
        volume: cfg.volume != null ? (cfg.volume >= 0 ? '+' : '') + cfg.volume + '%' : '+0%',
      };
    });
    return map;
  }

  // Backward compat
  const nameA = body.hostAName || speakers[0] || 'Host A';
  const nameB = body.hostBName || speakers[1] || 'Host B';
  speakers.forEach((name, i) => {
    const isA = name === nameA || name.includes(nameA);
    const vk = isA ? (body.voiceA || defaults[0]) : (body.voiceB || defaults[1]);
    map[name] = {
      voice: resolveVoice(vk),
      rate: (isA ? body.voiceASpeed : body.voiceBSpeed) != null ? ((isA ? body.voiceASpeed : body.voiceBSpeed) >= 0 ? '+' : '') + (isA ? body.voiceASpeed : body.voiceBSpeed) + '%' : '+5%',
      pitch: (isA ? body.voiceAPitch : body.voiceBPitch) != null ? ((isA ? body.voiceAPitch : body.voiceBPitch) >= 0 ? '+' : '') + (isA ? body.voiceAPitch : body.voiceBPitch) + 'Hz' : '+0Hz',
      volume: (isA ? body.voiceAVolume : body.voiceBVolume) != null ? ((isA ? body.voiceAVolume : body.voiceBVolume) >= 0 ? '+' : '') + (isA ? body.voiceAVolume : body.voiceBVolume) + '%' : '+0%',
    };
  });
  return map;
}

async function genAudio(segments, voiceMap) {
  const audioFiles = [];
  const vdef = { voice: 'zh-CN-XiaoxiaoNeural', rate: '+5%', pitch: '+0Hz', volume: '+0%' };
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i], cfg = voiceMap[seg.speaker] || vdef;
    const fn = 'seg_' + i + '_' + crypto.randomBytes(4).toString('hex') + '.mp3';
    const fp = path.join(audioDir, fn);
    try {
      await ttsEdge(seg.text, cfg.voice, fp, cfg.rate, cfg.pitch, cfg.volume);
      audioFiles.push({ speaker: seg.speaker, text: seg.text, audioUrl: '/audio/' + fn, index: i });
    } catch (e) {
      console.error('TTS seg ' + i + ':', e.message);
      audioFiles.push({ speaker: seg.speaker, text: seg.text, audioUrl: null, error: e.message, index: i });
    }
  }
  return audioFiles;
}

// === Full voice catalog ===
let allVoicesCache = null, allVoicesPromise = null;
function loadAllVoices() {
  if (allVoicesCache) return Promise.resolve(allVoicesCache);
  if (allVoicesPromise) return allVoicesPromise;
  allVoicesPromise = new Promise((resolve, reject) => {
    const py = '\nimport asyncio, edge_tts, json, sys\nasync def main():\n    voices = await edge_tts.list_voices()\n    result = []\n    for v in voices:\n        result.append({"ShortName": v["ShortName"], "Locale": v["Locale"], "Gender": v.get("Gender",""), "FriendlyName": v.get("FriendlyName","")})\n    print(json.dumps(result, ensure_ascii=False))\nasyncio.run(main())';
    const tmp = path.join(audioDir, 'lv_' + Date.now() + '.py');
    fs.writeFileSync(tmp, py);
    const proc = spawn(PY, [tmp], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    proc.stdout.on('data', d => out += d.toString());
    proc.stderr.on('data', d => err += d.toString());
    proc.on('close', code => {
      try { fs.unlinkSync(tmp); } catch {}
      if (code === 0) { try { allVoicesCache = JSON.parse(out.trim()); resolve(allVoicesCache); } catch(e) { reject(new Error('Parse: ' + e.message)); } }
      else reject(new Error(err.trim() || 'Exit ' + code));
    });
    proc.on('error', e => { try { fs.unlinkSync(tmp); } catch {} reject(e); });
  });
  allVoicesPromise.finally(() => { allVoicesPromise = null; });
  return allVoicesPromise;
}

// === Routes ===

app.get('/api/status', (req, res) => {
  res.json({ ready: true, tts: 'Edge TTS (free)', ai: !!getClient() ? 'DeepSeek available' : 'AI gen unavailable' });
});

app.get('/api/voices', (req, res) => res.json({ zh: EDGE_VOICES, en: EDGE_VOICES_EN }));

app.get('/api/all-voices', async (req, res) => {
  try {
    const voices = await loadAllVoices();
    const search = (req.query.q || '').toLowerCase();
    const locale = req.query.locale || '';
    let filtered = voices;
    if (locale) filtered = filtered.filter(v => v.Locale.startsWith(locale));
    if (search) filtered = filtered.filter(v => v.ShortName.toLowerCase().includes(search) || v.FriendlyName.toLowerCase().includes(search) || v.Locale.toLowerCase().includes(search));
    const grouped = {};
    filtered.forEach(v => { if (!grouped[v.Locale]) grouped[v.Locale] = []; grouped[v.Locale].push(v); });
    res.json({ voices: filtered, grouped, total: filtered.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/detect-speakers', (req, res) => {
  const { script } = req.body;
  if (!script) return res.status(400).json({ error: 'No script' });
  const { speakers, segments } = parsePreWrittenScript(script);
  res.json({ speakers, segmentCount: segments.length });
});

app.post('/api/parse-script', (req, res) => {
  const { script } = req.body;
  if (!script) return res.status(400).json({ error: 'No script' });
  const { segments, speakers } = parsePreWrittenScript(script);
  res.json({ segments, speakers, totalSegments: segments.length });
});

app.post('/api/parse-and-generate', async (req, res) => {
  const { script } = req.body;
  if (!script) return res.status(400).json({ error: 'No script' });
  try {
    const { segments, speakers } = parsePreWrittenScript(script);
    if (!segments.length) return res.status(400).json({ error: 'No dialogue lines found.' });
    const voiceMap = buildVoiceMap(req.body, speakers);
    const audioFiles = await genAudio(segments, voiceMap);
    res.json({ segments, speakers, audioFiles, totalSegments: segments.length });
  } catch (err) {
    console.error('Parse+generate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate-full', async (req, res) => {
  const client = getClient();
  if (!client) return res.status(400).json({ error: 'DeepSeek API key not configured.' });
  const { text, url, hostAName, hostBName, hostAStyle, hostBStyle, language } = req.body;
  if (!text && !url) return res.status(400).json({ error: 'Provide text or URL' });
  const isEn = language === 'en';
  const nameA = hostAName || 'Host A', nameB = hostBName || 'Host B';
  const sysPrompt = isEn
    ? 'You are a podcast script writer. Write a natural dialogue between ' + nameA + ' (' + (hostAStyle || 'curious') + ') and ' + nameB + ' (' + (hostBStyle || 'analytical') + '). Each line MUST start with "' + nameA + ': " or "' + nameB + ': ". 12-20 exchanges. Output ONLY the dialogue.'
    : '\u4f60\u662f\u64ad\u5ba2\u5199\u624b\u3002' + nameA + '\uff08' + (hostAStyle || '\u70ed\u60c5\u597d\u5947') + '\uff09\u548c' + nameB + '\uff08' + (hostBStyle || '\u7406\u6027\u5206\u6790') + '\uff09\u8ba8\u8bba\u4ee5\u4e0b\u5185\u5bb9\u3002\u8f93\u51fa\u683c\u5f0f\uff1a\u6bcf\u4e00\u884c\u5fc5\u987b\u662f\u201c' + nameA + '\uff1a\u5bf9\u8bdd\u5185\u5bb9\u201d\u6216\u201c' + nameB + '\uff1a\u5bf9\u8bdd\u5185\u5bb9\u201d\u3002' + '12-20\u8f6e\u5bf9\u8bdd\uff0c\u81ea\u7136\u6d41\u7545\u3002\u53ea\u8f93\u51fa\u5bf9\u8bdd\u3002';
  const src = url ? ('URL: ' + url + '\n\n' + (text || 'Discuss this topic')) : text;
  try {
    const resp = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: isEn ? 'Topic:\n' + src : '\u4e3b\u9898\uff1a\n' + src }],
      temperature: 0.8, max_tokens: 4096,
    });
    const raw = resp.choices[0].message.content.trim();
    const { segments, speakers } = parsePreWrittenScript(raw);
    const voiceMap = buildVoiceMap(req.body, speakers);
    const audioFiles = await genAudio(segments, voiceMap);
    res.json({ script: raw, segments, speakers, audioFiles, totalSegments: segments.length });
  } catch (err) { console.error('AI gen error:', err.message); res.status(500).json({ error: err.message }); }
});

setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  fs.readdir(audioDir, (err, files) => {
    if (err) return;
    files.forEach(f => { const fp = path.join(audioDir, f); fs.stat(fp, (se, st) => { if (!se && st.mtimeMs < cutoff) fs.unlink(fp, () => {}); }); });
  });
}, 15 * 60 * 1000);

app.listen(PORT, () => console.log('AI Podcast running at http://localhost:' + PORT));
