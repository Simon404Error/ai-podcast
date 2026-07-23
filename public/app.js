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
};

// ====== DOM helpers ======
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ====== Mode Switching ======
$('#modeToggle').addEventListener('click', () => {
  state.mode = state.mode === 'import' ? 'ai' : 'import';
  updateModeUI();
});

function updateModeUI() {
  const isAI = state.mode === 'ai';
  $('#mode-import').classList.toggle('hidden', isAI);
  $('#mode-ai').classList.toggle('hidden', !isAI);
  $$('.ai-only').forEach(el => el.style.display = isAI ? '' : 'none');
  $('#modeToggle').textContent = isAI ? '导入文稿' : 'AI 生成';
  $('#btnLabel').textContent = isAI ? 'AI 生成播客' : '生成音频';
  $('.mode-desc').textContent = isAI
    ? '输入主题或文章，AI 自动生成双人播客对话并合成音频。需要 DeepSeek API Key。'
    : '粘贴播客文稿，自动识别对话并合成音频。支持 Markdown 和 emoji 前缀格式。';
}

// ====== Input Monitoring ======
$('#scriptInput').addEventListener('input', () => {
  const v = $('#scriptInput').value;
  $('#scriptCharCount').textContent = v.length;
  const lines = v.split('\n').filter(l => /[：:]/.test(l));
  $('#scriptLineCount').textContent = lines.length;
});
$('#aiTextInput').addEventListener('input', () => {
  $('#aiCharCount').textContent = $('#aiTextInput').value.length;
});

// ====== File Import ======
$('#fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    $('#scriptInput').value = ev.target.result;
    $('#scriptInput').dispatchEvent(new Event('input'));
    setTimeout(detectHostNames, 100);
  };
  reader.readAsText(file);
});

$('#scriptInput').addEventListener('paste', () => setTimeout(detectHostNames, 200));

function detectHostNames() {
  const text = $('#scriptInput').value;
  if (!text) return;
  const roleLine = text.match(/角色[：:]\s*(.+)/);
  if (roleLine) {
    const parts = roleLine[1].split(/[|｜、，,]/);
    parts.forEach(p => {
      const m = p.match(/[🎙🎓🔊🎤🎧]?\s*([^\s（(]+)[（(]([^）)]+)[）)]/);
      if (m) {
        const n = m[1].trim(), r = m[2].trim();
        if (r.includes('主持') || r.includes('主')) $('#hostAName').value = n;
        else $('#hostBName').value = n;
      }
    });
  }
  // Fallback: use first two unique speakers
  const matches = [...text.matchAll(/^[^\n]*?([^\s🎙🎓🔊🎤🎧：:]{1,6})[：:]/gm)];
  const names = [...new Set(matches.map(m => m[1].trim()).filter(n => n.length >= 1 && !/^(角色|建议|说明|提示|注|使用|生成|可用|全文完)/.test(n)))];
  if (names.length >= 2 && (!$('#hostAName').value || $('#hostAName').value === '小竹')) {
    $('#hostAName').value = names[0];
    $('#hostBName').value = names[1];
  }
}

// ====== Slider value displays ======
function bindSlider(id, displayId, format) {
  const slider = $('#' + id);
  const display = $('#' + displayId);
  if (!slider || !display) return;
  const update = () => { display.textContent = format(slider.value); };
  slider.addEventListener('input', update);
  update();
}

bindSlider('voiceASpeed', 'speedAVal', v => {
  const pct = parseInt(v);
  const mult = 1 + pct / 100;
  return mult.toFixed(2) + 'x';
});
bindSlider('voiceAPitch', 'pitchAVal', v => (parseInt(v) >= 0 ? '+' : '') + v);
bindSlider('voiceAVolume', 'volumeAVal', v => (100 + parseInt(v)) + '%');
bindSlider('voiceBSpeed', 'speedBVal', v => {
  const pct = parseInt(v);
  const mult = 1 + pct / 100;
  return mult.toFixed(2) + 'x';
});
bindSlider('voiceBPitch', 'pitchBVal', v => (parseInt(v) >= 0 ? '+' : '') + v);
bindSlider('voiceBVolume', 'volumeBVal', v => (100 + parseInt(v)) + '%');

// ====== Generate ======
$('#generateBtn').addEventListener('click', () => {
  if (state.generating) return;
  if (state.mode === 'import') generateFromScript();
  else generateFromAI();
});

function getVoiceSettings() {
  return {
    voiceASpeed: parseInt($('#voiceASpeed').value),
    voiceAPitch: parseInt($('#voiceAPitch').value),
    voiceAVolume: parseInt($('#voiceAVolume').value),
    voiceBSpeed: parseInt($('#voiceBSpeed').value),
    voiceBPitch: parseInt($('#voiceBPitch').value),
    voiceBVolume: parseInt($('#voiceBVolume').value),
  };
}

async function generateFromScript() {
  const script = $('#scriptInput').value.trim();
  if (!script) { showError('请粘贴播客文稿'); return; }

  startGen('正在解析文稿...');

  const hostAName = $('#hostAName').value || '小竹';
  const hostBName = $('#hostBName').value || '溪溪老师';
  const body = {
    script, hostAName, hostBName,
    voiceA: $('#voiceA').value,
    voiceB: $('#voiceB').value,
    language: 'zh',
    ...getVoiceSettings(),
  };

  try {
    const res = await fetch('/api/parse-and-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || '生成失败'); }
    const data = await res.json();
    if (!data.segments || !data.segments.length) throw new Error('未识别到对话内容。请检查主持人名字与文稿一致。');
    finishGen(data);
  } catch (err) {
    endGen(err.message);
  }
}

async function generateFromAI() {
  const text = $('#aiTextInput').value.trim();
  if (!text) { showError('请输入文本内容'); return; }

  startGen('AI 正在生成播客文稿...');

  const body = {
    text,
    hostAName: $('#hostAName').value || '小雅',
    hostBName: $('#hostBName').value || '老张',
    hostAStyle: $('#hostAStyle').value,
    hostBStyle: $('#hostBStyle').value,
    voiceA: $('#voiceA').value,
    voiceB: $('#voiceB').value,
    language: $('#aiLanguage').value,
    ...getVoiceSettings(),
  };

  try {
    const res = await fetch('/api/generate-full', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || '生成失败'); }
    const data = await res.json();
    finishGen(data);
  } catch (err) {
    endGen(err.message);
  }
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
  if (errMsg) {
    $('#loadingState').classList.add('hidden');
    showError(errMsg);
  }
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
    const name = tab.dataset.output;
    switchTab(name);
    if (name === 'script' && state.segments.length) renderScript();
    if (name === 'audio' && state.audioFiles.length) renderAudioUI();
  });
});

function hideAllOutputs() {
  $$('.output-content').forEach(c => c.classList.add('hidden'));
  $('#scriptPlaceholder') && $('#scriptPlaceholder').classList.add('hidden');
  $('#audioPlaceholder') && $('#audioPlaceholder').classList.add('hidden');
}

function showError(msg) {
  const ex = $('.error-banner'); if (ex) ex.remove();
  const b = document.createElement('div'); b.className = 'error-banner'; b.textContent = msg;
  $('#output-script').prepend(b);
  setTimeout(() => b.remove(), 8000);
}

// ====== Render Script ======
function renderScript() {
  const ctr = $('#scriptContent');
  const ph = $('#scriptPlaceholder');
  ctr.innerHTML = '';
  ph.classList.add('hidden');
  ctr.classList.remove('hidden');
  if (!state.segments.length) return;

  state.segments.forEach((seg, i) => { seg._idx = i;
    const d = document.createElement('div');
    const isA = seg.voice === 'hostA';
    d.className = 'script-segment ' + (isA ? 'host-a' : 'host-b');
    d.innerHTML =
      '<div class="seg-spkr ' + (isA ? 'ha' : 'hb') + '">' + esc(seg.speaker.charAt(0)) + '</div>' +
      '<div class="seg-body">' +
        '<div class="seg-name ' + (isA ? 'ha' : 'hb') + '">' + esc(seg.speaker) + '</div>' +
        '<div class="seg-txt">' + esc(seg.text) + '</div>' +
      '</div>';
    ctr.appendChild(d);
  });
}

// ====== Render Audio UI ======
function renderAudioUI() {
  $('#audioPlaceholder').classList.add('hidden');
  $('#audioContent').classList.remove('hidden');
  renderSegmentList();
  loadSegment(0);
}

function renderSegmentList() {
  const list = $('#segmentList');
  list.innerHTML = '';
  state.audioFiles.forEach((f, i) => {
    const d = document.createElement('div');
    d.className = 'seg-item'; d.dataset.index = i;
    const isA = f.voice === 'hostA';
    d.innerHTML =
      '<span class="snum">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<span class="sname ' + (isA ? 'ha' : 'hb') + '">' + esc(f.speaker.charAt(0)) + '</span>' +
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

  updateNowPlaying(f);
  highlightSeg(index);
  updateProgress();

  if (!f.audioUrl) return;

  const a = new Audio(f.audioUrl);
  state.audio = a;
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
  const sp = $('#currentSpeaker');
  sp.textContent = f.speaker;
  sp.className = 'player-speaker ' + (f.voice === 'hostA' ? 'ha' : 'hb');
  $('#currentText').textContent = f.text;
  // Sync highlight in script view
  $('.script-segment').forEach(el => el.classList.remove('playing'));
  const sel = document.querySelector('.script-segment[data-index=\"' + state.currentSegment + '\"]');
  const segEls = $$('.script-segment');
  if (sel) sel.classList.add('playing');
  // Auto-scroll script view to keep current segment visible
  if (segEls[state.currentSegment]) {
    segEls[state.currentSegment].scrollIntoView({block:'nearest',behavior:'smooth'});
  }
}
function highlightSeg(i) {
  $$('.seg-item').forEach(el => {
    el.classList.remove('active');
    if (parseInt(el.dataset.index) === i) { el.classList.add('active'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  });
}
function markPlayed(i) {
  $$('.seg-item').forEach(el => { if (parseInt(el.dataset.index) <= i) el.classList.add('played'); });
}
function updateSegDur(i, d) {
  $$('.seg-item').forEach(el => { if (parseInt(el.dataset.index) === i) { const de = el.querySelector('.sdur'); if (de) de.textContent = fmt(d); } });
}

function updateProgress() {
  if (!state.audio || !state.audio.duration) { $('#progressFill').style.width = '0%'; $('#currentTime').textContent = '00:00'; return; }
  $('#progressFill').style.width = (state.audio.currentTime / state.audio.duration * 100) + '%';
  $('#currentTime').textContent = fmt(state.audio.currentTime);
}
function updateTotalTime() {
  if (state.audio && state.audio.duration) $('#totalTime').textContent = fmt(state.audio.duration);
}

// ====== Playback Controls ======
// Expand/collapse output panel
$('#expandBtn').addEventListener('click', () => {
  const panel = $('.output-panel');
  panel.classList.toggle('expanded');
  const icon = $('#expandBtn svg');
  if (panel.classList.contains('expanded')) {
    icon.innerHTML = '<polyline points="4 8 10 14 16 8"/>';
    panel.scrollIntoView({behavior:'smooth'});
  } else {
    icon.innerHTML = '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>';
  }
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
  const r = e.target.getBoundingClientRect();
  state.audio.currentTime = ((e.clientX - r.left) / r.width) * state.audio.duration;
});

function updatePlayBtn() {
  const b = $('#playBtn');
  if (state.isPlaying) {
    b.classList.add('playing');
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  } else {
    b.classList.remove('playing');
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  }
}
function startBars() { $('#artBars').classList.add('active'); }
function stopBars() { $('#artBars').classList.remove('active'); }

// ====== Utils ======
function fmt(s) { if (!isFinite(s)) return '--:--'; const m = Math.floor(s / 60), sec = Math.floor(s % 60); return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0'); }
function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

// ====== Keyboard ======
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  if (e.code === 'Space' && state.audioFiles.length) { e.preventDefault(); $('#playBtn').click(); }
});

// ====== Init ======
// ====== Save / Restore ======
function collectState() {
  return {
    script: $('#scriptInput').value,
    aiText: $('#aiTextInput').value,
    hostAName: $('#hostAName').value,
    hostBName: $('#hostBName').value,
    voiceA: $('#voiceA').value,
    voiceB: $('#voiceB').value,
    voiceASpeed: $('#voiceASpeed').value,
    voiceAPitch: $('#voiceAPitch').value,
    voiceAVolume: $('#voiceAVolume').value,
    voiceBSpeed: $('#voiceBSpeed').value,
    voiceBPitch: $('#voiceBPitch').value,
    voiceBVolume: $('#voiceBVolume').value,
    mode: state.mode,
    aiLanguage: $('#aiLanguage').value,
  };
}

function saveState() {
  const data = collectState();
  localStorage.setItem('ai-podcast-state', JSON.stringify(data));
  // Brief feedback
  const btn = $('#saveBtn');
  btn.classList.add('saved');
  setTimeout(() => btn.classList.remove('saved'), 1200);
  showToast('已保存');
}

function restoreState() {
  try {
    const raw = localStorage.getItem('ai-podcast-state');
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d.script) $('#scriptInput').value = d.script; $('#scriptInput').dispatchEvent(new Event('input'));
    if (d.aiText) $('#aiTextInput').value = d.aiText; $('#aiTextInput').dispatchEvent(new Event('input'));
    if (d.hostAName) $('#hostAName').value = d.hostAName;
    if (d.hostBName) $('#hostBName').value = d.hostBName;
    if (d.voiceA) $('#voiceA').value = d.voiceA;
    if (d.voiceB) $('#voiceB').value = d.voiceB;
    if (d.voiceASpeed != null) { $('#voiceASpeed').value = d.voiceASpeed; $('#voiceASpeed').dispatchEvent(new Event('input')); }
    if (d.voiceAPitch != null) { $('#voiceAPitch').value = d.voiceAPitch; $('#voiceAPitch').dispatchEvent(new Event('input')); }
    if (d.voiceAVolume != null) { $('#voiceAVolume').value = d.voiceAVolume; $('#voiceAVolume').dispatchEvent(new Event('input')); }
    if (d.voiceBSpeed != null) { $('#voiceBSpeed').value = d.voiceBSpeed; $('#voiceBSpeed').dispatchEvent(new Event('input')); }
    if (d.voiceBPitch != null) { $('#voiceBPitch').value = d.voiceBPitch; $('#voiceBPitch').dispatchEvent(new Event('input')); }
    if (d.voiceBVolume != null) { $('#voiceBVolume').value = d.voiceBVolume; $('#voiceBVolume').dispatchEvent(new Event('input')); }
    if (d.mode && d.mode !== state.mode) { state.mode = d.mode; updateModeUI(); }
    if (d.aiLanguage) $('#aiLanguage').value = d.aiLanguage;
  } catch(e) { /* ignore corrupt state */ }
}

function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._tid); t._tid = setTimeout(() => t.classList.remove('show'), 1500);
}

// Manual save button
$('#saveBtn').addEventListener('click', saveState);

// Auto-save (debounced) on any input change
let autoSaveTimer;
document.addEventListener('input', e => {
  if (!e.target.closest('#scriptInput, #aiTextInput, #hostAName, #hostBName, #voiceA, #voiceB, #voiceASpeed, #voiceAPitch, #voiceAVolume, #voiceBSpeed, #voiceBPitch, #voiceBVolume, #aiLanguage')) return;
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(saveState, 2000);
});

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

updateModeUI();
restoreState();
