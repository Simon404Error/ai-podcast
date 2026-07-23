// ====== State ======
const state = {
  mode: 'import',
  generating: false,
  segments: [],
  audioFiles: [],
  currentSegment: -1,
  isPlaying: false,
  audio: null,
  playedDurations: {},
  hosts: [], // [{ name, voice, speed, pitch, volume }]
};

const VOICE_OPTIONS = [
  { v:'xiaoxiao', label:'晓晓 · 温柔女声' }, { v:'xiaoyi', label:'晓依 · 活泼女声' },
  { v:'xiaochen', label:'晓辰 · 沉稳女声' }, { v:'yunxi', label:'云希 · 深邃男声' },
  { v:'yunjian', label:'云健 · 自然男声' }, { v:'yunyang', label:'云扬 · 播音男声' },
];

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ====== Host Card Rendering ======
function renderHostCards() {
  const container = $('#hostCardsContainer');
  container.innerHTML = '';

  state.hosts.forEach((host, i) => {
    const card = document.createElement('div');
    card.className = 'voice-card';
    const colors = ['var(--ha)', 'var(--hb)', '#fbbf24', '#f472b6', '#60a5fa', '#a3e635'];
    const color = colors[i % colors.length];

    card.innerHTML =
      '<div class="voice-card-top">' +
        '<div class="voice-avatar" style="background:' + color + ';color:var(--bg2)">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7" fill="none" stroke="currentColor" stroke-width="2"/></svg>' +
        '</div>' +
        '<div class="voice-card-info">' +
          '<input type="text" class="name-input host-name" value="' + esc(host.name) + '" data-idx="' + i + '" placeholder="主持人名" />' +
          (host._customVoice ? '<div class="custom-voice-badge">🎤 ' + esc(host._customVoiceLabel || host._customVoice) + '</div>' : '') +
          '<select class="voice-select host-voice" data-idx="' + i + '">' +
            VOICE_OPTIONS.map(o => '<option value="' + o.v + '"' + (host.voice === o.v ? ' selected' : '') + '>' + o.label + '</option>').join('') +
          '</select>' +
          '<a class="voice-browse-link" data-idx="' + i + '">浏览更多音色...</a>' +
        '</div>' +
        (state.hosts.length > 2
          ? '<button class="host-remove" data-idx="' + i + '" title="移除">×</button>'
          : '') +
      '</div>' +
      '<div class="voice-sliders">' +
        '<div class="slider-group">' +
          '<div class="slider-label"><span>语速</span><span class="slider-val host-speed-val" data-idx="' + i + '">' + speedLabel(host.speed) + '</span></div>' +
          '<input type="range" class="slider host-speed" data-idx="' + i + '" min="-50" max="100" value="' + host.speed + '" step="5" />' +
        '</div>' +
        '<div class="slider-group">' +
          '<div class="slider-label"><span>语调</span><span class="slider-val host-pitch-val" data-idx="' + i + '">' + (host.pitch >= 0 ? '+' : '') + host.pitch + '</span></div>' +
          '<input type="range" class="slider host-pitch" data-idx="' + i + '" min="-20" max="20" value="' + host.pitch + '" step="1" />' +
        '</div>' +
        '<div class="slider-group">' +
          '<div class="slider-label"><span>音量</span><span class="slider-val host-volume-val" data-idx="' + i + '">' + (100 + host.volume) + '%</span></div>' +
          '<input type="range" class="slider host-volume" data-idx="' + i + '" min="-50" max="0" value="' + host.volume + '" step="5" />' +
        '</div>' +
      '</div>';
    container.appendChild(card);
  });

  bindHostEvents();
}

// Bind browse links after render
$$('.voice-browse-link').forEach(link => {
  link.addEventListener('click', () => openVoiceModal(parseInt(link.dataset.idx)));
});

// ====== Voice Browser Modal ======
let allVoicesData = null;
let voiceModalTargetIdx = 0;

async function openVoiceModal(hostIdx) {
  voiceModalTargetIdx = hostIdx;
  $('#voiceModal').classList.remove('hidden');
  $('#voiceSearch').value = '';
  $('#voiceLocaleFilter').value = '';
  if (!allVoicesData) {
    $('#voiceList').innerHTML = '<div class="voice-loading"><div class="spinner"></div>加载 322 个音色...</div>';
    try {
      const res = await fetch('/api/all-voices');
      const data = await res.json();
      allVoicesData = data;
    } catch(e) {
      $('#voiceList').innerHTML = '<div class="voice-loading">加载失败: ' + e.message + '</div>';
      return;
    }
  }
  renderVoiceList();
}

function renderVoiceList() {
  if (!allVoicesData) return;
  const search = ($('#voiceSearch').value || '').toLowerCase();
  const locale = $('#voiceLocaleFilter').value;
  let voices = allVoicesData.voices;
  if (locale) voices = voices.filter(v => v.Locale.startsWith(locale));
  if (search) voices = voices.filter(v => v.ShortName.toLowerCase().includes(search) || v.FriendlyName.toLowerCase().includes(search) || v.Locale.toLowerCase().includes(search));

  if (!voices.length) { $('#voiceList').innerHTML = '<div class="voice-loading">无匹配音色</div>'; return; }

  // Group by locale
  const groups = {};
  voices.forEach(v => { if (!groups[v.Locale]) groups[v.Locale] = []; groups[v.Locale].push(v); });

  let html = '';
  for (const [loc, list] of Object.entries(groups).sort()) {
    const localeLabel = getLocaleLabel(loc);
    html += '<div class="voice-group"><div class="voice-group-title">' + localeLabel + ' (' + list.length + ')</div>';
    list.forEach(v => {
      const genderIcon = v.Gender === 'Female' ? '♀' : v.Gender === 'Male' ? '♂' : '';
      html += '<div class="voice-item" data-shortname="' + esc(v.ShortName) + '" data-friendly="' + esc(v.FriendlyName) + '">' +
        '<span class="voice-item-name">' + esc(v.FriendlyName || v.ShortName) + '</span>' +
        '<span class="voice-item-gender">' + genderIcon + '</span>' +
        '<span class="voice-item-id">' + esc(v.ShortName) + '</span>' +
      '</div>';
    });
    html += '</div>';
  }
  $('#voiceList').innerHTML = html;

  // Click to select
  $$('.voice-item').forEach(item => {
    item.addEventListener('click', () => {
      const shortName = item.dataset.shortname;
      const friendlyName = item.dataset.friendly;
      // Add as custom voice option and select it
      const host = state.hosts[voiceModalTargetIdx];
      host.voice = shortName;
      host._customVoice = shortName;
      host._customVoiceLabel = friendlyName;
      renderHostCards();
      closeVoiceModal();
    });
  });
}

function getLocaleLabel(loc) {
  const map = {
    'zh-CN':'中文普通话','zh-CN-liaoning':'中文辽宁','zh-CN-shaanxi':'中文陕西',
    'zh-HK':'粤语','zh-TW':'中文台湾',
    'en-US':'英语(美)','en-GB':'英语(英)','en-AU':'英语(澳)','en-CA':'英语(加)',
    'en-IN':'英语(印)','ja-JP':'日语','ko-KR':'韩语','fr-FR':'法语',
    'de-DE':'德语','es-ES':'西班牙语','it-IT':'意大利语','pt-BR':'葡萄牙语',
    'ru-RU':'俄语','ar-SA':'阿拉伯语','th-TH':'泰语','vi-VN':'越南语',
    'id-ID':'印尼语','ms-MY':'马来语','hi-IN':'印地语','tr-TR':'土耳其语',
  };
  return map[loc] || loc;
}

function closeVoiceModal() { $('#voiceModal').classList.add('hidden'); }

$('#voiceModalClose').addEventListener('click', closeVoiceModal);
$('#voiceModal .voice-modal-bg').addEventListener('click', closeVoiceModal);
$('#voiceSearch').addEventListener('input', renderVoiceList);
$('#voiceLocaleFilter').addEventListener('change', renderVoiceList);

function bindHostEvents() {
  // Name changes
  $$('.host-name').forEach(inp => {
    inp.addEventListener('input', () => {
      state.hosts[parseInt(inp.dataset.idx)].name = inp.value;
    });
  });
  // Voice changes
  $$('.host-voice').forEach(sel => {
    sel.addEventListener('change', () => {
      state.hosts[parseInt(sel.dataset.idx)].voice = sel.value;
    });
  });
  // Remove buttons
  $$('.host-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      state.hosts.splice(idx, 1);
      renderHostCards();
    });
  });
  // Sliders
  [['.host-speed', 'speed', '.host-speed-val', speedLabel],
   ['.host-pitch', 'pitch', '.host-pitch-val', v => (v >= 0 ? '+' : '') + v],
   ['.host-volume', 'volume', '.host-volume-val', v => (100 + v) + '%']].forEach(([sel, key, disp, fmt]) => {
    $$(sel).forEach(sl => {
      const update = () => {
        const v = parseInt(sl.value);
        state.hosts[parseInt(sl.dataset.idx)][key] = v;
        const d = document.querySelector(disp + '[data-idx="' + sl.dataset.idx + '"]');
        if (d) d.textContent = fmt(v);
      };
      sl.addEventListener('input', update);
      update();
    });
  });
}

function speedLabel(v) { const m = 1 + v / 100; return m.toFixed(2) + 'x'; }

// ====== Host Management ======
function addHost(name, voice, speed, pitch, volume) {
  state.hosts.push({
    name: name || ('主持人' + (state.hosts.length + 1)),
    voice: voice || (state.hosts.length % 2 === 0 ? 'xiaoxiao' : 'yunxi'),
    speed: speed != null ? speed : 5,
    pitch: pitch != null ? pitch : 0,
    volume: volume != null ? volume : 0,
  });
  renderHostCards();
}

$('#addHostBtn').addEventListener('click', () => addHost());

$('#detectHostsBtn').addEventListener('click', async () => {
  const script = $('#scriptInput').value.trim();
  if (!script) { showError('请先粘贴文稿'); return; }
  try {
    const res = await fetch('/api/detect-speakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script }),
    });
    const data = await res.json();
    if (!data.speakers || !data.speakers.length) { showError('未检测到主持人'); return; }
    // Merge: keep existing hosts if their names match, replace others
    const oldMap = {};
    state.hosts.forEach(h => oldMap[h.name] = h);
    state.hosts = data.speakers.map((name, i) => oldMap[name] || {
      name,
      voice: i % 2 === 0 ? 'xiaoxiao' : 'yunxi',
      speed: 5, pitch: 0, volume: 0,
    });
    renderHostCards();
  } catch (e) {
    // Fallback: parse locally
    const text = $('#scriptInput').value;
    const names = [...new Set([...text.matchAll(/^[^\n]*?([^\s🎙🎓🔊🎤🎧：:]{1,8})[：:]/gm)].map(m => m[1].trim()).filter(n => n && !/^(角色|建议|说明|提示|注|使用|生成|可用|全文完)/.test(n)))];
    if (names.length) {
      const oldMap = {};
      state.hosts.forEach(h => oldMap[h.name] = h);
      state.hosts = names.map((name, i) => oldMap[name] || { name, voice: i % 2 === 0 ? 'xiaoxiao' : 'yunxi', speed: 5, pitch: 0, volume: 0 });
      renderHostCards();
    } else {
      showError('未检测到主持人，请手动添加');
    }
  }
});

// ====== Mode Switching ======
$('#modeToggle').addEventListener('click', () => {
  state.mode = state.mode === 'import' ? 'ai' : 'import';
  updateModeUI();
});

function updateModeUI() {
  const isAI = state.mode === 'ai';
  $('#mode-import').classList.toggle('hidden', isAI);
  $('#mode-ai').classList.toggle('hidden', !isAI);
  $('#modeToggle').textContent = isAI ? '导入文稿' : 'AI 生成';
  $('#btnLabel').textContent = isAI ? 'AI 生成播客' : '生成音频';
  $('.mode-desc').textContent = isAI
    ? '输入主题或文章，AI 自动生成双人播客对话并合成音频。需要 DeepSeek API Key。'
    : '粘贴播客文稿，自动识别对话并合成音频。支持多个主持人。';
}

// ====== Input Monitoring ======
$('#scriptInput').addEventListener('input', () => {
  const v = $('#scriptInput').value;
  $('#scriptCharCount').textContent = v.length;
  $('#scriptLineCount').textContent = v.split('\n').filter(l => /[：:]/.test(l)).length;
});
$('#aiTextInput').addEventListener('input', () => {
  $('#aiCharCount').textContent = $('#aiTextInput').value.length;
});

// ====== File Import ======
$('#fileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    $('#scriptInput').value = ev.target.result;
    $('#scriptInput').dispatchEvent(new Event('input'));
    setTimeout(() => $('#detectHostsBtn').click(), 200);
  };
  reader.readAsText(file);
});
$('#scriptInput').addEventListener('paste', () => setTimeout(() => $('#detectHostsBtn').click(), 300));

// ====== Generate ======
$('#generateBtn').addEventListener('click', () => {
  if (state.generating) return;
  if (state.mode === 'import') generateFromScript();
  else generateFromAI();
});

function buildVoiceMap() {
  const map = {};
  state.hosts.forEach(h => {
    map[h.name] = { voice: h.voice, speed: h.speed, pitch: h.pitch, volume: h.volume };
  });
  return map;
}

async function generateFromScript() {
  const script = $('#scriptInput').value.trim();
  if (!script) { showError('请粘贴播客文稿'); return; }
  if (!state.hosts.length) { showError('请先添加或检测主持人'); return; }

  startGen('正在解析文稿...');

  try {
    const res = await fetch('/api/parse-and-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script, voiceMap: buildVoiceMap(), language: 'zh' }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || '生成失败'); }
    const data = await res.json();
    if (!data.segments || !data.segments.length) throw new Error('未识别到对话内容。');
    finishGen(data);
  } catch (err) { endGen(err.message); }
}

async function generateFromAI() {
  const text = $('#aiTextInput').value.trim();
  if (!text) { showError('请输入文本内容'); return; }
  if (!state.hosts.length) { showError('请先添加主持人'); return; }

  startGen('AI 正在生成播客文稿...');

  const h0 = state.hosts[0] || {};
  const h1 = state.hosts[1] || {};

  try {
    const res = await fetch('/api/generate-full', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        hostAName: h0.name, hostBName: h1.name,
        hostAStyle: '热情好奇', hostBStyle: '理性分析',
        voiceMap: buildVoiceMap(),
        language: $('#aiLanguage').value,
      }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || '生成失败'); }
    const data = await res.json();
    finishGen(data);
  } catch (err) { endGen(err.message); }
}

function startGen(msg) {
  state.generating = true;
  $('#generateBtn').disabled = true;
  $('#generateBtn').innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;margin:0"></div> 处理中...';
  hideAllOutputs();
  $('#loadingState').classList.remove('hidden');
  $('#loadingText').textContent = msg;
  $('#genProgress').style.width = '0%';
}
function finishGen(data) {
  state.segments = data.segments;
  state.audioFiles = data.audioFiles || [];
  state.currentSegment = -1;
  state.playedDurations = {};
  $('#genProgress').style.width = '100%';
  $('#loadingText').textContent = '完成！共 ' + data.totalSegments + ' 段对话';
  setTimeout(() => {
    $('#loadingState').classList.add('hidden');
    $('#genProgress').style.width = '0%';
    renderScript();
    if (state.audioFiles.length) renderAudioUI();
    switchTab('script');
  }, 500);
  endGen();
}
function endGen(errMsg) {
  state.generating = false;
  $('#generateBtn').disabled = false;
  $('#generateBtn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polygon points="5 3 19 12 5 21 5 3"/></svg> <span id="btnLabel">' + (state.mode === 'import' ? '生成音频' : 'AI 生成播客') + '</span>';
  if (errMsg) { $('#loadingState').classList.add('hidden'); showError(errMsg); }
}

// ====== Output Tabs ======
function switchTab(name) {
  $$('.output-tabs .tab').forEach(t => t.classList.remove('active'));
  const tab = $('.output-tabs .tab[data-output="' + name + '"]');
  if (tab) tab.classList.add('active');
  $$('.output-content').forEach(c => c.classList.add('hidden'));
  $('#output-' + name).classList.remove('hidden');
}
$$('.output-tabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const n = tab.dataset.output; switchTab(n);
    if (n === 'script' && state.segments.length) renderScript();
    if (n === 'audio' && state.audioFiles.length) renderAudioUI();
  });
});
function hideAllOutputs() {
  $$('.output-content').forEach(c => c.classList.add('hidden'));
  $('#scriptPlaceholder') && $('#scriptPlaceholder').classList.add('hidden');
  $('#audioPlaceholder') && $('#audioPlaceholder').classList.add('hidden');
}

// ====== Error/Toast ======
function showError(msg) {
  const ex = $('.error-banner'); if (ex) ex.remove();
  const b = document.createElement('div'); b.className = 'error-banner'; b.textContent = msg;
  $('#output-script').prepend(b); setTimeout(() => b.remove(), 8000);
}
function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._tid); t._tid = setTimeout(() => t.classList.remove('show'), 1500);
}

// ====== Render Script ======
function renderScript() {
  const ctr = $('#scriptContent'), ph = $('#scriptPlaceholder');
  ctr.innerHTML = ''; ph.classList.add('hidden'); ctr.classList.remove('hidden');
  if (!state.segments.length) return;
  // Map speaker names to colors
  const uniqueSpeakers = [...new Set(state.segments.map(s => s.speaker))];
  const colorMap = {};
  uniqueSpeakers.forEach((name, i) => {
    const colors = ['var(--ha)', 'var(--hb)', '#fbbf24', '#f472b6', '#60a5fa', '#a3e635'];
    colorMap[name] = { cl: colors[i % colors.length], init: name.charAt(0) };
  });

  state.segments.forEach((seg, i) => {
    seg._idx = i;
    const c = colorMap[seg.speaker] || { cl: 'var(--ha)', init: seg.speaker.charAt(0) };
    const d = document.createElement('div');
    d.className = 'script-segment'; d.dataset.index = i;
    d.style.borderLeftColor = c.cl;
    d.innerHTML =
      '<div class="seg-spkr" style="background:' + c.cl + ';color:var(--bg2)">' + esc(c.init) + '</div>' +
      '<div class="seg-body">' +
        '<div class="seg-name" style="color:' + c.cl + '">' + esc(seg.speaker) + '</div>' +
        '<div class="seg-txt">' + esc(seg.text) + '</div>' +
      '</div>';
    ctr.appendChild(d);
  });
}

// ====== Render Audio ======
function renderAudioUI() {
  $('#audioPlaceholder').classList.add('hidden'); $('#audioContent').classList.remove('hidden');
  renderSegmentList(); loadSegment(0);
}
function renderSegmentList() {
  const list = $('#segmentList'); list.innerHTML = '';
  state.audioFiles.forEach((f, i) => {
    const d = document.createElement('div');
    d.className = 'seg-item'; d.dataset.index = i;
    d.innerHTML =
      '<span class="snum">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<span class="sname ha">' + esc(f.speaker.charAt(0)) + '</span>' +
      '<span class="stxt">' + esc(f.text.substring(0, 40) + (f.text.length > 40 ? '...' : '')) + '</span>' +
      '<span class="sdur">--:--</span>';
    d.addEventListener('click', () => loadSegment(i));
    list.appendChild(d);
  });
}
function loadSegment(index) {
  if (index < 0 || index >= state.audioFiles.length) return;
  if (state.audio) { state.audio.pause(); state.audio = null; }
  state.currentSegment = index;
  const f = state.audioFiles[index];
  updateNowPlaying(f); highlightSeg(index); updateProgress();
  if (!f.audioUrl) return;
  const a = new Audio(f.audioUrl); state.audio = a;
  a.addEventListener('loadedmetadata', () => { updateSegDur(index, a.duration); updateTotalTime(); });
  a.addEventListener('timeupdate', () => { updateProgress(); if (a.duration) state.playedDurations[index] = a.currentTime; });
  a.addEventListener('ended', () => {
    state.playedDurations[index] = a.duration || 0;
    state.isPlaying = false; updatePlayBtn(); stopBars(); markPlayed(index);
    if (index < state.audioFiles.length - 1) setTimeout(() => loadSegment(index + 1), 400);
  });
  a.play().then(() => { state.isPlaying = true; updatePlayBtn(); startBars(); }).catch(() => {});
}
function updateNowPlaying(f) {
  const sp = $('#currentSpeaker'); sp.textContent = f.speaker;
  sp.className = 'player-speaker ha'; $('#currentText').textContent = f.text;
  // Sync in script view
  $$('.script-segment').forEach(el => el.classList.remove('playing'));
  const sel = document.querySelector('.script-segment[data-index="' + state.currentSegment + '"]');
  if (sel) { sel.classList.add('playing'); sel.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}
function highlightSeg(i) {
  $$('.seg-item').forEach(el => { el.classList.remove('active'); if (parseInt(el.dataset.index) === i) { el.classList.add('active'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } });
}
function markPlayed(i) { $$('.seg-item').forEach(el => { if (parseInt(el.dataset.index) <= i) el.classList.add('played'); }); }
function updateSegDur(i, d) { $$('.seg-item').forEach(el => { if (parseInt(el.dataset.index) === i) { const de = el.querySelector('.sdur'); if (de) de.textContent = fmt(d); } }); }
function updateProgress() {
  if (!state.audio || !state.audio.duration) { $('#progressFill').style.width = '0%'; $('#currentTime').textContent = '00:00'; return; }
  $('#progressFill').style.width = (state.audio.currentTime / state.audio.duration * 100) + '%';
  $('#currentTime').textContent = fmt(state.audio.currentTime);
}
function updateTotalTime() { if (state.audio && state.audio.duration) $('#totalTime').textContent = fmt(state.audio.duration); }

// ====== Playback Controls ======
$('#expandBtn').addEventListener('click', () => {
  const panel = $('.output-panel'); panel.classList.toggle('expanded');
  const icon = $('#expandBtn svg');
  icon.innerHTML = panel.classList.contains('expanded')
    ? '<polyline points="4 8 10 14 16 8"/>'
    : '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>';
  if (panel.classList.contains('expanded')) panel.scrollIntoView({ behavior: 'smooth' });
});
$('#playBtn').addEventListener('click', () => {
  if (!state.audio && state.audioFiles.length) { loadSegment(state.currentSegment >= 0 ? state.currentSegment : 0); return; }
  if (!state.audio) return;
  if (state.isPlaying) { state.audio.pause(); state.isPlaying = false; stopBars(); }
  else { state.audio.play().then(() => { state.isPlaying = true; startBars(); }).catch(() => {}); }
  updatePlayBtn();
});
$('#prevBtn').addEventListener('click', () => { if (state.currentSegment > 0) loadSegment(state.currentSegment - 1); });
$('#nextBtn').addEventListener('click', () => { if (state.currentSegment < state.audioFiles.length - 1) loadSegment(state.currentSegment + 1); });
$('#progressBar').addEventListener('click', e => {
  if (!state.audio || !state.audio.duration) return;
  state.audio.currentTime = ((e.clientX - e.target.getBoundingClientRect().left) / e.target.getBoundingClientRect().width) * state.audio.duration;
});
function updatePlayBtn() {
  const b = $('#playBtn');
  b.classList.toggle('playing', state.isPlaying);
  b.innerHTML = state.isPlaying
    ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="8" y="4" width="4" height="16"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
}
function startBars() { $('#artBars').classList.add('active'); }
function stopBars() { $('#artBars').classList.remove('active'); }

// ====== Utils ======
function fmt(s) { if (!isFinite(s)) return '--:--'; const m = Math.floor(s / 60), sec = Math.floor(s % 60); return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0'); }
function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

// ====== Save / Restore ======
function collectState() {
  return {
    script: $('#scriptInput').value, aiText: $('#aiTextInput').value,
    hosts: state.hosts, mode: state.mode,
    aiLanguage: $('#aiLanguage').value,
  };
}
function saveState() {
  localStorage.setItem('ai-podcast-state', JSON.stringify(collectState()));
  const btn = $('#saveBtn'); btn.classList.add('saved');
  setTimeout(() => btn.classList.remove('saved'), 1200);
  showToast('已保存');
}
function restoreState() {
  try {
    const raw = localStorage.getItem('ai-podcast-state');
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d.script) { $('#scriptInput').value = d.script; $('#scriptInput').dispatchEvent(new Event('input')); }
    if (d.aiText) { $('#aiTextInput').value = d.aiText; $('#aiTextInput').dispatchEvent(new Event('input')); }
    if (d.hosts && d.hosts.length) { state.hosts = d.hosts; renderHostCards(); }
    if (d.mode && d.mode !== state.mode) { state.mode = d.mode; updateModeUI(); }
    if (d.aiLanguage) $('#aiLanguage').value = d.aiLanguage;
  } catch(e) {}
}
$('#saveBtn').addEventListener('click', saveState);
let autoSaveTimer;
document.addEventListener('input', e => {
  if (!e.target.closest('#scriptInput, #aiTextInput, .host-name, .host-voice, .host-speed, .host-pitch, .host-volume, #aiLanguage')) return;
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(saveState, 2000);
});

// ====== Keyboard ======
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  if (e.code === 'Space' && state.audioFiles.length) { e.preventDefault(); $('#playBtn').click(); }
});

// ====== Init ======
if (!state.hosts.length) {
  addHost('小竹', 'xiaoxiao', 5, 0, 0);
  addHost('溪溪老师', 'yunxi', 5, 0, 0);
}
updateModeUI();
restoreState();

// Theme switching
const savedTheme = localStorage.getItem('ai-podcast-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
$$('.theme-dot').forEach(d => {
  d.classList.toggle('active', d.dataset.theme === savedTheme);
  d.addEventListener('click', () => {
    const theme = d.dataset.theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ai-podcast-theme', theme);
    $$('.theme-dot').forEach(x => x.classList.remove('active'));
    d.classList.add('active');
  });
});
