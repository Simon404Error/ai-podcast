// ====== State ======
const state = {
  mode: 'import', // 'import' | 'ai'
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
  $('#modeToggle').textContent = isAI ? '导入文稿' : 'AI生成';
  $('#panelTitle').textContent = isAI ? 'AI 生成' : '导入文稿';
  $('#btnLabel').textContent = isAI ? '生成播客' : '生成音频';
  $('#modeHint').textContent = isAI
    ? '输入文本或链接，AI自动生成播客对话并合成音频。'
    : '粘贴文稿，自动解析并合成播客音频。支持 .md / .txt 文件导入。';
  $('#generateBtn').disabled = false;
}

// ====== Input Monitoring ======
$('#scriptInput').addEventListener('input', () => {
  const val = $('#scriptInput').value;
  $('#scriptCharCount').textContent = val.length;
  // Count dialogue lines
  const lines = val.split('\n').filter(l => l.match(/[：:]/));
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
  };
  reader.readAsText(file);
  // Try to detect host names from filename or content
  setTimeout(() => detectHostNames(), 100);
});

// Try to auto-detect host names from the script
function detectHostNames() {
  const text = $('#scriptInput').value;
  if (!text) return;
  // Look for patterns like "Name：" or "🎙️ Name：" 
  const matches = text.match(/^[🎙🎓🔊🎤🎧\s*>\-#|]*([^\s🎙🎓🔊🎤🎧：:]+)[：:]/gm);
  if (!matches || matches.length < 2) return;
  const names = [...new Set(matches.map(m => m.replace(/^[^🎙🎓🔊🎤🎧\w\u4e00-\u9fff]+/, '').replace(/[：:]$/, '').trim()).filter(n => n.length >= 1))];
  if (names.length >= 2) {
    // Find "主持人" or role indicators
    const roleLine = text.match(/角色[：:]\s*(.+)/);
    if (roleLine) {
      const parts = roleLine[1].split(/[|｜、，,]/);
      parts.forEach(p => {
        const m = p.match(/[🎙🎓🔊🎤🎧]?\s*([^\s（(]+)[（(]([^）)]+)[）)]/);
        if (m) {
          const n = m[1].trim();
          const role = m[2].trim();
          if (role.includes('主持') || role.includes('主')) {
            $('#hostAName').value = n;
          } else {
            $('#hostBName').value = n;
          }
        }
      });
    }
    // Fallback: use first two unique names
    if (!$('#hostAName').value || $('#hostAName').value === '小竹') {
      $('#hostAName').value = names[0] || '小竹';
    }
    if (!$('#hostBName').value || $('#hostBName').value === '溪溪老师') {
      $('#hostBName').value = names[1] || '溪溪老师';
    }
  }
}

$('#scriptInput').addEventListener('paste', () => {
  setTimeout(() => detectHostNames(), 200);
});

// ====== Generate ======
$('#generateBtn').addEventListener('click', () => {
  if (state.generating) return;
  if (state.mode === 'import') generateFromScript();
  else generateFromAI();
});

async function generateFromScript() {
  const script = $('#scriptInput').value.trim();
  if (!script) { showError('请粘贴播客文稿'); return; }

  state.generating = true;
  $('#generateBtn').disabled = true;
  $('#generateBtn').innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0"></div> 解析中...';

  hideAllOutputs();
  $('#loadingState').classList.remove('hidden');
  $('#loadingText').textContent = '正在解析文稿...';
  $('#stepParse').classList.add('active');
  $('#stepParse').classList.remove('completed');
  $('#stepAudio').classList.remove('active', 'completed');

  const hostAName = $('#hostAName').value || '小竹';
  const hostBName = $('#hostBName').value || '溪溪老师';
  const voiceA = $('#voiceA').value;
  const voiceB = $('#voiceB').value;

  try {
    const res = await fetch('/api/parse-and-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script, hostAName, hostBName, voiceA, voiceB, language: 'zh' }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '生成失败');
    }

    const data = await res.json();

    if (!data.segments || !data.segments.length) {
      throw new Error('未识别到对话内容。请检查主持人名字是否与文稿中一致。');
    }

    state.segments = data.segments;
    state.audioFiles = data.audioFiles || [];
    state.currentSegment = -1;
    state.playedDurations = {};

    $('#stepParse').classList.remove('active');
    $('#stepParse').classList.add('completed');

    if (state.audioFiles.length > 0) {
      $('#stepAudio').classList.add('completed');
    } else {
      $('#stepAudio').classList.add('completed');
    }

    $('#loadingText').textContent = `解析完成！识别 ${data.totalSegments} 段对话`;

    setTimeout(() => {
      $('#loadingState').classList.add('hidden');
      renderScript();
      if (state.audioFiles.length > 0) {
        renderAudioUI();
      }
      $$('.output-tabs .tab').forEach(t => t.classList.remove('active'));
      $('.output-tabs .tab[data-output="script"]').classList.add('active');
      $$('.output-content').forEach(c => c.classList.add('hidden'));
      $('#output-script').classList.remove('hidden');
    }, 600);

  } catch (err) {
    showError(err.message);
    $('#loadingState').classList.add('hidden');
  } finally {
    state.generating = false;
    $('#generateBtn').disabled = false;
    $('#generateBtn').innerHTML = '<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> <span id="btnLabel">生成音频</span>';
  }
}

async function generateFromAI() {
  const text = $('#aiTextInput').value.trim();
  if (!text) { showError('请输入文本内容'); return; }

  state.generating = true;
  $('#generateBtn').disabled = true;
  $('#generateBtn').innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0"></div> 生成中...';

  hideAllOutputs();
  $('#loadingState').classList.remove('hidden');
  $('#loadingText').textContent = 'AI 正在生成播客文稿...';
  $('#stepParse').classList.add('active');
  $('#stepParse').classList.remove('completed');
  $('#stepAudio').classList.remove('active', 'completed');

  const hostAName = $('#hostAName').value || '小雅';
  const hostBName = $('#hostBName').value || '老张';
  const hostAStyle = $('#hostAStyle').value;
  const hostBStyle = $('#hostBStyle').value;
  const voiceA = $('#voiceA').value;
  const voiceB = $('#voiceB').value;
  const language = $('#aiLanguage').value;

  try {
    const res = await fetch('/api/generate-full', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, hostAName, hostBName, hostAStyle, hostBStyle, voiceA, voiceB, language }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '生成失败');
    }

    const data = await res.json();
    state.segments = data.segments;
    state.audioFiles = data.audioFiles || [];
    state.currentSegment = -1;
    state.playedDurations = {};

    $('#stepParse').classList.remove('active');
    $('#stepParse').classList.add('completed');
    if (state.audioFiles.length > 0) $('#stepAudio').classList.add('completed');

    $('#loadingText').textContent = '生成完成！';

    setTimeout(() => {
      $('#loadingState').classList.add('hidden');
      renderScript();
      if (state.audioFiles.length > 0) renderAudioUI();
      $$('.output-tabs .tab').forEach(t => t.classList.remove('active'));
      $('.output-tabs .tab[data-output="script"]').classList.add('active');
      $$('.output-content').forEach(c => c.classList.add('hidden'));
      $('#output-script').classList.remove('hidden');
    }, 600);

  } catch (err) {
    showError(err.message);
    $('#loadingState').classList.add('hidden');
  } finally {
    state.generating = false;
    $('#generateBtn').disabled = false;
    $('#generateBtn').innerHTML = '<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> <span id="btnLabel">生成播客</span>';
  }
}

// ====== Output Tabs ======
$$('.output-tabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.output-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.output;
    $$('.output-content').forEach(c => c.classList.add('hidden'));
    $(`#output-${target}`).classList.remove('hidden');
    if (target === 'script' && state.segments.length) renderScript();
    if (target === 'audio' && state.audioFiles.length) renderAudioUI();
  });
});

function hideAllOutputs() {
  $$('.output-content').forEach(c => c.classList.add('hidden'));
  $('#scriptPlaceholder') && $('#scriptPlaceholder').classList.add('hidden');
  $('#audioPlaceholder') && $('#audioPlaceholder').classList.add('hidden');
}

function showError(msg) {
  const existing = $('.error-banner');
  if (existing) existing.remove();
  const banner = document.createElement('div');
  banner.className = 'error-banner';
  banner.textContent = msg;
  const output = $('#output-script');
  if (output) output.prepend(banner);
  setTimeout(() => banner.remove(), 8000);
}

// ====== Render Script ======
function renderScript() {
  const container = $('#scriptContent');
  const placeholder = $('#scriptPlaceholder');
  container.innerHTML = '';
  placeholder.classList.add('hidden');
  container.classList.remove('hidden');

  if (!state.segments.length) return;

  // Group segments by section (detect "##" headings in original text, or just show all)
  state.segments.forEach((seg, i) => {
    const div = document.createElement('div');
    div.className = `script-segment ${seg.voice === 'hostA' ? 'host-a' : 'host-b'}`;
    div.innerHTML = `
      <div class="seg-avatar ${seg.voice === 'hostA' ? 'host-a' : 'host-b'}">${escapeHtml(seg.speaker.charAt(0))}</div>
      <div class="seg-body">
        <div class="seg-speaker ${seg.voice === 'hostA' ? 'host-a' : 'host-b'}">${escapeHtml(seg.speaker)}</div>
        <div class="seg-text">${escapeHtml(seg.text)}</div>
      </div>
    `;
    container.appendChild(div);
  });
}

// ====== Render Audio UI ======
function renderAudioUI() {
  const audioContent = $('#audioContent');
  const audioPlaceholder = $('#audioPlaceholder');
  audioPlaceholder.classList.add('hidden');
  audioContent.classList.remove('hidden');

  renderSegmentList();
  loadSegment(0);
}

function renderSegmentList() {
  const list = $('#segmentList');
  list.innerHTML = '';

  state.audioFiles.forEach((file, i) => {
    const div = document.createElement('div');
    div.className = 'seg-item';
    div.dataset.index = i;
    div.innerHTML = `
      <span class="seg-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="seg-speaker-mini ${file.voice === 'hostA' ? 'host-a' : 'host-b'}">${escapeHtml(file.speaker.charAt(0))}</span>
      <span class="seg-text-mini">${escapeHtml(file.text.substring(0, 50))}${file.text.length > 50 ? '...' : ''}</span>
      <span class="seg-duration">--:--</span>
    `;
    div.addEventListener('click', () => loadSegment(i));
    list.appendChild(div);
  });
}

function loadSegment(index) {
  if (index < 0 || index >= state.audioFiles.length) return;

  if (state.audio) {
    state.audio.pause();
    state.audio = null;
  }

  state.currentSegment = index;
  const file = state.audioFiles[index];

  if (!file.audioUrl) {
    updateNowPlaying(file);
    highlightSegment(index);
    return;
  }

  updateNowPlaying(file);
  highlightSegment(index);
  updateProgress();

  const audio = new Audio(file.audioUrl);
  state.audio = audio;

  audio.addEventListener('loadedmetadata', () => {
    updateSegmentDuration(index, audio.duration);
    updateTotalTime();
  });

  audio.addEventListener('timeupdate', () => {
    updateProgress();
    if (audio.duration) state.playedDurations[index] = audio.currentTime;
  });

  audio.addEventListener('ended', () => {
    state.playedDurations[index] = audio.duration || 0;
    state.isPlaying = false;
    updatePlayButton();
    stopPlayingAnimation();
    markSegmentPlayed(index);
    if (index < state.audioFiles.length - 1) {
      setTimeout(() => loadSegment(index + 1), 500);
    }
  });

  audio.play().then(() => {
    state.isPlaying = true;
    updatePlayButton();
    startPlayingAnimation();
  }).catch(err => {
    console.error('Play error:', err);
    state.isPlaying = false;
    updatePlayButton();
  });
}

function updateNowPlaying(file) {
  const speaker = $('#currentSpeaker');
  speaker.textContent = file.speaker;
  speaker.className = `current-speaker ${file.voice === 'hostA' ? 'host-a' : 'host-b'}`;
  $('#currentText').textContent = file.text;
}

function highlightSegment(index) {
  $$('.seg-item').forEach(item => {
    item.classList.remove('active');
    if (parseInt(item.dataset.index) === index) {
      item.classList.add('active');
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
}

function markSegmentPlayed(index) {
  $$('.seg-item').forEach(item => {
    if (parseInt(item.dataset.index) <= index) item.classList.add('played');
  });
}

function updateProgress() {
  if (!state.audio || !state.audio.duration) {
    $('#progressFill').style.width = '0%';
    $('#currentTime').textContent = '00:00';
    return;
  }
  const pct = (state.audio.currentTime / state.audio.duration) * 100;
  $('#progressFill').style.width = pct + '%';
  $('#currentTime').textContent = formatTime(state.audio.currentTime);
}

function updateTotalTime() {
  if (state.audio && state.audio.duration) {
    $('#totalTime').textContent = formatTime(state.audio.duration);
  }
}

function updateSegmentDuration(index, duration) {
  $$('.seg-item').forEach(item => {
    if (parseInt(item.dataset.index) === index) {
      const durEl = item.querySelector('.seg-duration');
      if (durEl) durEl.textContent = formatTime(duration);
    }
  });
}

// ====== Playback Controls ======
$('#playBtn').addEventListener('click', () => {
  if (!state.audio && state.audioFiles.length > 0) {
    loadSegment(state.currentSegment >= 0 ? state.currentSegment : 0);
    return;
  }
  if (!state.audio) return;

  if (state.isPlaying) {
    state.audio.pause();
    state.isPlaying = false;
    stopPlayingAnimation();
  } else {
    state.audio.play().then(() => {
      state.isPlaying = true;
      startPlayingAnimation();
    }).catch(() => {});
  }
  updatePlayButton();
});

$('#prevBtn').addEventListener('click', () => {
  if (state.currentSegment > 0) loadSegment(state.currentSegment - 1);
});

$('#nextBtn').addEventListener('click', () => {
  if (state.currentSegment < state.audioFiles.length - 1) loadSegment(state.currentSegment + 1);
});

$('#progressBar').addEventListener('click', (e) => {
  if (!state.audio || !state.audio.duration) return;
  const rect = e.target.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  state.audio.currentTime = pct * state.audio.duration;
});

function updatePlayButton() {
  const btn = $('#playBtn');
  if (state.isPlaying) {
    btn.classList.add('playing');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  } else {
    btn.classList.remove('playing');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  }
}

function startPlayingAnimation() { $('.playing-animation').classList.add('active'); }
function stopPlayingAnimation() { $('.playing-animation').classList.remove('active'); }

// ====== Utility ======
function formatTime(seconds) {
  if (!isFinite(seconds)) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ====== Keyboard ======
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  if (e.code === 'Space' && state.audioFiles.length > 0) {
    e.preventDefault();
    $('#playBtn').click();
  }
});

// ====== Init ======
updateModeUI();
// Try to load the demo script
fetch('/api/status').then(r => r.json()).then(d => {
  $('#apiStatus').textContent = d.tts || 'Edge TTS 就绪';
  $('#apiStatus').className = 'status-badge ready';
}).catch(() => {
  $('#apiStatus').textContent = '服务器未连接';
  $('#apiStatus').className = 'status-badge error';
});
