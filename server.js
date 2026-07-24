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
// Prefer uv venv Python if available
const uvPython = path.join(__dirname, '.venv', 'Scripts', 'python.exe');
const PY = fs.existsSync(uvPython) ? uvPython : (fs.existsSync(pythonExe) ? pythonExe : 'python');
const PY_ENV = { ...process.env, PYTHONIOENCODING: 'utf-8' };

const audioDir = path.join(__dirname, 'public', 'audio');
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

const EDGE_VOICES = {
  xiaoxiao: 'zh-CN-XiaoxiaoNeural', xiaoyi: 'zh-CN-XiaoyiNeural', xiaochen: 'zh-CN-XiaochenNeural',
  yunxi: 'zh-CN-YunxiNeural', yunjian: 'zh-CN-YunjianNeural', yunyang: 'zh-CN-YunyangNeural',
};
const EDGE_VOICES_EN = { female: 'en-US-JennyNeural', male: 'en-US-GuyNeural' };

function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === 'sk-your-api-key-here') return null;
  return new OpenAI({ apiKey: key, baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com' });
}

function resolveVoice(key) {
  if (!key) return 'zh-CN-XiaoxiaoNeural';
  if (key.includes('-') && key.endsWith('Neural')) return key;
  if (EDGE_VOICES[key]) return EDGE_VOICES[key];
  if (EDGE_VOICES_EN[key]) return EDGE_VOICES_EN[key];
  return 'zh-CN-XiaoxiaoNeural';
}

const META_KEYS = /^(角色|使用说明|生成音频建议|可用工具|建议|提示|注意|说明|注|全文完)[：:]/;
const MD_STRUCT = /^(#{1,6}\s|>\s*$|---|\*\*\*|[\s]*$)/;

function parsePreWrittenScript(rawText) {
  const lines = rawText.split('\n');
  const segments = [];
  const speakers = new Set();
  for (const line of lines) {
    const t = line.trim();
    if (!t || MD_STRUCT.test(t)) continue;
    if (META_KEYS.test(t.replace(/^>\s*/, ''))) continue;
    if (!/[：:]/.test(t)) continue;
    let c = t.replace(/^>\s*/, '').replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\u{FE0F}?\s*/u, '').replace(/^[\u{FE0F}\u{200D}]+\s*/u, '').trim();
    if (!c) continue;
    const m = c.match(/^(.+?)\s*[：:]\s*(.+)/);
    if (!m) continue;
    const speaker = m[1].trim(), text = m[2].trim();
    if (!text || text.length < 2 || META_KEYS.test(speaker + '：')) continue;
    speakers.add(speaker);
    segments.push({ speaker, text });
  }
  return { segments, speakers: [...speakers] };
}

function ttsEdge(text, voiceName, outputPath, rate, pitch, volume) {
  return new Promise((resolve, reject) => {
    const py = [
      'import asyncio, edge_tts, sys',
      'async def main():',
      '    try:',
      '        c = edge_tts.Communicate(text=sys.argv[1], voice=sys.argv[2], rate=sys.argv[3], pitch=sys.argv[4], volume=sys.argv[5])',
      '        await c.save(sys.argv[6])',
      '        print("OK")',
      '    except Exception as e:',
      '        print("ERROR", e, file=sys.stderr); sys.exit(1)',
      'asyncio.run(main())',
    ].join('\n');
    const tmp = outputPath + '.py';
    fs.writeFileSync(tmp, py, 'utf8');
    const proc = spawn(PY, [tmp, text, voiceName, rate || '+0%', pitch || '+0Hz', volume || '+0%', outputPath], { stdio: ['ignore', 'pipe', 'pipe'], env: PY_ENV });
    let e = '';
    proc.stderr.on('data', d => e += d.toString());
    proc.on('close', code => {
      try { fs.unlinkSync(tmp); } catch {}
      if (code === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) resolve(outputPath);
      else reject(new Error(e.trim() || 'TTS exit ' + code));
    });
    proc.on('error', err => { try { fs.unlinkSync(tmp); } catch {} reject(err); });
  });
}

function buildVoiceMap(body, speakers) {
  const defs = ['xiaoxiao', 'yunxi', 'xiaoyi', 'yunjian'];
  const map = {};
  if (body.voiceMap && typeof body.voiceMap === 'object') {
    speakers.forEach((name, i) => {
      const cfg = body.voiceMap[name] || {};
      map[name] = {
        voice: resolveVoice(cfg.voice) || resolveVoice(defs[i % defs.length]),
        rate: cfg.speed != null ? (cfg.speed >= 0 ? '+' : '') + cfg.speed + '%' : '+5%',
        pitch: cfg.pitch != null ? (cfg.pitch >= 0 ? '+' : '') + cfg.pitch + 'Hz' : '+0Hz',
        volume: cfg.volume != null ? (cfg.volume >= 0 ? '+' : '') + cfg.volume + '%' : '+0%',
      };
    });
  } else {
    const nA = body.hostAName || speakers[0] || 'A', nB = body.hostBName || speakers[1] || 'B';
    speakers.forEach((name, i) => {
      const isA = name === nA || name.includes(nA);
      map[name] = {
        voice: resolveVoice(isA ? (body.voiceA || defs[0]) : (body.voiceB || defs[1])),
        rate: (isA ? body.voiceASpeed : body.voiceBSpeed) != null ? ((isA ? body.voiceASpeed : body.voiceBSpeed) >= 0 ? '+' : '') + (isA ? body.voiceASpeed : body.voiceBSpeed) + '%' : '+5%',
        pitch: (isA ? body.voiceAPitch : body.voiceBPitch) != null ? ((isA ? body.voiceAPitch : body.voiceBPitch) >= 0 ? '+' : '') + (isA ? body.voiceAPitch : body.voiceBPitch) + 'Hz' : '+0Hz',
        volume: (isA ? body.voiceAVolume : body.voiceBVolume) != null ? ((isA ? body.voiceAVolume : body.voiceBVolume) >= 0 ? '+' : '') + (isA ? body.voiceAVolume : body.voiceBVolume) + '%' : '+0%',
      };
    });
  }
  return map;
}

async function genAudio(segments, voiceMap) {
  const def = { voice: 'zh-CN-XiaoxiaoNeural', rate: '+5%', pitch: '+0Hz', volume: '+0%' };
  const files = [];
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i], cfg = voiceMap[s.speaker] || def;
    const fn = 'seg_' + i + '_' + crypto.randomBytes(4).toString('hex') + '.mp3';
    const fp = path.join(audioDir, fn);
    try {
      await ttsEdge(s.text, cfg.voice, fp, cfg.rate, cfg.pitch, cfg.volume);
      files.push({ speaker: s.speaker, text: s.text, audioUrl: '/audio/' + fn, index: i });
    } catch (e) {
      console.error('TTS ' + i + ':', e.message);
      files.push({ speaker: s.speaker, text: s.text, audioUrl: null, error: e.message, index: i });
    }
  }
  return files;
}

// === Full voice catalog ===
let voicesCache = null, voicesPromise = null;
function loadAllVoices() {
  if (voicesCache) return Promise.resolve(voicesCache);
  if (voicesPromise) return voicesPromise;
  voicesPromise = new Promise((resolve, reject) => {
    const py = [
      'import asyncio, edge_tts, json, sys',
      'async def main():',
      '    voices = await edge_tts.list_voices()',
      '    result = []',
      '    for v in voices:',
      '        result.append({',
      '            "ShortName": v["ShortName"],',
      '            "Locale": v["Locale"],',
      '            "Gender": v.get("Gender",""),',
      '            "FriendlyName": v.get("FriendlyName","")',
      '        })',
      '    json.dump(result, sys.stdout, ensure_ascii=False)',
      'asyncio.run(main())',
    ].join('\n');
    const tmp = path.join(audioDir, 'lv_' + Date.now() + '.py');
    fs.writeFileSync(tmp, py, 'utf8');
    const proc = spawn(PY, [tmp], { stdio: ['ignore', 'pipe', 'pipe'], env: PY_ENV });
    let out = '', err = '';
    proc.stdout.on('data', d => out += d.toString());
    proc.stderr.on('data', d => err += d.toString());
    proc.on('close', code => {
      try { fs.unlinkSync(tmp); } catch {}
      if (code === 0) {
        try { voicesCache = JSON.parse(out.trim()); resolve(voicesCache); }
        catch(e) { reject(new Error('Parse: ' + e.message.substring(0, 80))); }
      } else reject(new Error(err.trim() || out.trim() || 'exit ' + code));
    });
    proc.on('error', e => { try { fs.unlinkSync(tmp); } catch {} reject(e); });
  });
  voicesPromise.finally(() => { voicesPromise = null; });
  return voicesPromise;
}

// === Routes ===

app.get('/api/status', (req, res) => {
  res.json({ ready: true, tts: 'Edge TTS (free)', ai: !!getClient() ? 'DeepSeek available' : 'AI gen unavailable' });
});
app.get('/api/voices', (req, res) => res.json({ zh: EDGE_VOICES, en: EDGE_VOICES_EN }));

// Preview a voice with a short sample
app.post('/api/preview-voice', async (req, res) => {
  const isEn = req.body.lang === 'en';
  const { voice, speed, pitch, volume } = req.body;
  const vk = resolveVoice(voice || 'xiaoxiao');
  const rate = speed != null ? (speed >= 0 ? '+' : '') + speed + '%' : '+5%';
  const pt = pitch != null ? (pitch >= 0 ? '+' : '') + pitch + 'Hz' : '+0Hz';
  const vol = volume != null ? (volume >= 0 ? '+' : '') + volume + '%' : '+0%';
  const sample = isEn ? 'How are you? I am fine thanks, and you? I am fine too!' : '衬衫的价格为九磅十五便士，所以答案选C，并标记在答题卡上';
  const fn = 'preview_' + crypto.randomBytes(4).toString('hex') + '.mp3';
  const fp = path.join(audioDir, fn);
  try {
    await ttsEdge(sample, vk, fp, '+20%', pt, vol);
    res.json({ audioUrl: '/audio/' + fn });
  } catch (err) {
    console.error('Preview error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/all-voices', async (req, res) => {
  try {
    const voices = await loadAllVoices();
    const q = (req.query.q || '').toLowerCase();
    const loc = req.query.locale || '';
    let f = voices;
    if (loc) f = f.filter(v => v.Locale.startsWith(loc));
    if (q) f = f.filter(v => v.ShortName.toLowerCase().includes(q) || v.FriendlyName.toLowerCase().includes(q) || v.Locale.toLowerCase().includes(q));
    const g = {};
    f.forEach(v => { if (!g[v.Locale]) g[v.Locale] = []; g[v.Locale].push(v); });
    res.json({ voices: f, grouped: g, total: f.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/detect-speakers', (req, res) => {
  const s = req.body.script; if (!s) return res.status(400).json({ error: 'No script' });
  const r = parsePreWrittenScript(s);
  res.json({ speakers: r.speakers, segmentCount: r.segments.length });
});

app.post('/api/parse-script', (req, res) => {
  const s = req.body.script; if (!s) return res.status(400).json({ error: 'No script' });
  const r = parsePreWrittenScript(s);
  res.json({ segments: r.segments, speakers: r.speakers, totalSegments: r.segments.length });
});

app.post('/api/parse-and-generate', async (req, res) => {
  const s = req.body.script; if (!s) return res.status(400).json({ error: 'No script' });
  try {
    const r = parsePreWrittenScript(s);
    if (!r.segments.length) return res.status(400).json({ error: 'No dialogue lines.' });
    const vm = buildVoiceMap(req.body, r.speakers);
    const af = await genAudio(r.segments, vm);
    res.json({ segments: r.segments, speakers: r.speakers, audioFiles: af, totalSegments: r.segments.length });
  } catch (err) { console.error(err.message); res.status(500).json({ error: err.message }); }
});

app.post('/api/generate-full', async (req, res) => {
  const client = getClient();
  if (!client) return res.status(400).json({ error: 'DeepSeek not configured.' });
  const { text, url, hostAName, hostBName, hostAStyle, hostBStyle, language } = req.body;
  if (!text && !url) return res.status(400).json({ error: 'Provide text or URL' });
  const isEn = language === 'en', nA = hostAName || 'Host A', nB = hostBName || 'Host B';
  const prompt = isEn
    ? 'You are a podcast script writer. Write a natural dialogue between ' + nA + ' and ' + nB + '. Each line: "' + nA + ': " or "' + nB + ': ". 12-20 exchanges. Output ONLY the dialogue.'
    : '\u4f60\u662f\u64ad\u5ba2\u5199\u624b\u3002' + nA + '\u548c' + nB + '\u8ba8\u8bba\u4ee5\u4e0b\u5185\u5bb9\u3002\u6bcf\u884c\u683c\u5f0f\uff1a\u201c' + nA + '\uff1a\u5bf9\u8bdd\u201d\u6216\u201c' + nB + '\uff1a\u5bf9\u8bdd\u201d\u300212-20\u8f6e\u3002\u53ea\u8f93\u51fa\u5bf9\u8bdd\u3002';
  try {
    const resp = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: prompt }, { role: 'user', content: (isEn ? 'Topic: ' : '\u4e3b\u9898\uff1a') + (url ? 'URL: ' + url + '\n\n' + (text || '') : text) }],
      temperature: 0.8, max_tokens: 4096,
    });
    const raw = resp.choices[0].message.content.trim();
    const r = parsePreWrittenScript(raw);
    const af = await genAudio(r.segments, buildVoiceMap(req.body, r.speakers));
    res.json({ script: raw, segments: r.segments, speakers: r.speakers, audioFiles: af, totalSegments: r.segments.length });
  } catch (err) { console.error(err.message); res.status(500).json({ error: err.message }); }
});

setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  fs.readdir(audioDir, (err, files) => {
    if (err) return;
    files.forEach(f => { const fp = path.join(audioDir, f); fs.stat(fp, (se, st) => { if (!se && st.mtimeMs < cutoff) fs.unlink(fp, () => {}); }); });
  });
}, 15 * 60 * 1000);

app.listen(PORT, () => console.log('http://localhost:' + PORT));
