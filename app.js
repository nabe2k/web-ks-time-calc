'use strict';

// ── Utility ──────────────────────────────────────────────

/** "mmss" 文字列 → 秒（数値）。不正な場合は null を返す */
function parseMMSS(str) {
  const s = str.trim();
  if (!/^\d{4}$/.test(s)) return null;
  const m = parseInt(s.slice(0, 2), 10);
  const sec = parseInt(s.slice(2, 4), 10);
  if (sec > 59) return null;
  return m * 60 + sec;
}

/** 秒数を "MM:SS" 形式に変換 */
function formatMMSS(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** "hhmmss" 文字列 → 秒（数値）。不正な場合は null を返す */
function parseHHMMSS(str) {
  const s = str.trim();
  if (!/^\d{6}$/.test(s)) return null;
  const h = parseInt(s.slice(0, 2), 10);
  const m = parseInt(s.slice(2, 4), 10);
  const sec = parseInt(s.slice(4, 6), 10);
  if (h > 23 || m > 59 || sec > 59) return null;
  return h * 3600 + m * 60 + sec;
}

/** 秒（数値）→ "HH:MM:SS" 文字列。24時間制で折り返す */
function formatSeconds(totalSec) {
  const wrapped = ((totalSec % 86400) + 86400) % 86400;
  const h = Math.floor(wrapped / 3600);
  const m = Math.floor((wrapped % 3600) / 60);
  const s = wrapped % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

// ── UI helpers ────────────────────────────────────────────

/** mmss 入力欄にリアルタイムプレビューをバインドする */
function bindMmssPreview(input, previewId) {
  const preview = document.getElementById(previewId);
  input.addEventListener('input', () => {
    const val = input.value.replace(/\D/g, '');
    input.value = val;
    const sec = val.length === 4 ? parseMMSS(val) : null;
    preview.textContent = sec !== null ? formatMMSS(sec) : '—';
  });
}

/** hhmmss 入力欄にリアルタイムプレビューと SET ボタンをバインドする */
function bindUtcInput(inputId, previewId, setBtnId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  input.addEventListener('input', () => {
    const val = input.value.replace(/\D/g, '');
    input.value = val;
    const sec = val.length === 6 ? parseHHMMSS(val) : null;
    preview.textContent = sec !== null ? formatSeconds(sec) : '—';
  });
  document.getElementById(setBtnId).addEventListener('click', () => {
    const val = input.value.replace(/\D/g, '');
    if (val.length !== 4) return;
    const utcHour = String(new Date().getUTCHours()).padStart(2, '0');
    input.value = utcHour + val;
    input.dispatchEvent(new Event('input'));
    input.focus();
  });
}

// ── localStorage ─────────────────────────────────────────

const SLOT_KEY = 'ks-time-calc-slot';
const getStorageKey = (slot) => `ks-time-calc-${slot}`;

let currentSlot = parseInt(localStorage.getItem(SLOT_KEY) || '1', 10);

function saveState() {
  const participants = Array.from(tbody.querySelectorAll('tr')).map(tr => ({
    name: tr.querySelector('.p-name').value,
    march: tr.querySelector('.p-march').value,
  }));
  localStorage.setItem(getStorageKey(currentSlot), JSON.stringify({
    targetTime: targetInput.value,
    participants,
  }));
}

function loadState(slot) {
  try {
    return JSON.parse(localStorage.getItem(getStorageKey(slot)));
  } catch {
    return null;
  }
}

// ── Participant table ─────────────────────────────────────

const tbody = document.getElementById('participantRows');

function addRow(name = '', march = '') {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" class="p-name" placeholder="名前" value="${name}"></td>
    <td><input type="number" class="p-march" placeholder="秒" min="1" value="${march}"></td>
    <td><button class="btn-delete" title="削除">✕</button></td>
  `;
  tr.querySelector('.btn-delete').addEventListener('click', () => { tr.remove(); saveState(); });
  tr.querySelector('.p-name').addEventListener('input', saveState);
  tr.querySelector('.p-march').addEventListener('input', saveState);
  tbody.appendChild(tr);
}

document.getElementById('addRow').addEventListener('click', () => { addRow(); saveState(); });

// ── Target time preview ───────────────────────────────────

const targetInput = document.getElementById('targetTime');

bindUtcInput('targetTime', 'targetPreview', 'setUtcHour');
// saveState を追加でバインド
targetInput.addEventListener('input', saveState);

// ── Memory slot ───────────────────────────────────────────

/** 指定スロットのデータで画面を復元する */
function restoreState(slot) {
  tbody.innerHTML = '';
  document.getElementById('results').classList.add('hidden');

  const saved = loadState(slot);
  if (saved?.participants?.length > 0) {
    saved.participants.forEach(p => addRow(p.name, p.march));
  } else {
    addRow('', '');
    addRow('', '');
    addRow('', '');
  }

  targetInput.value = saved?.targetTime ?? '';
  targetInput.dispatchEvent(new Event('input'));
}

/** スロットボタンのアクティブ状態を更新する */
function updateSlotButtons(slot) {
  document.querySelectorAll('.slot-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.slot, 10) === slot);
  });
}

document.getElementById('slotButtons').addEventListener('click', (e) => {
  const btn = e.target.closest('.slot-btn');
  if (!btn) return;
  const newSlot = parseInt(btn.dataset.slot, 10);
  if (newSlot === currentSlot) return;
  saveState();
  currentSlot = newSlot;
  localStorage.setItem(SLOT_KEY, currentSlot);
  updateSlotButtons(currentSlot);
  restoreState(currentSlot);
});

// 初期ロード
updateSlotButtons(currentSlot);
restoreState(currentSlot);

// ── Memory アクション ─────────────────────────────────────

const SLOT_COUNT = 5;

/** 個別リセット: 現在のスロットを消去して初期化 */
document.getElementById('resetSlot').addEventListener('click', () => {
  if (!confirm(`Memory ${currentSlot} をリセットしますか？`)) return;
  localStorage.removeItem(getStorageKey(currentSlot));
  restoreState(currentSlot);
});

/** 全体リセット: 全スロットを消去 */
document.getElementById('resetAll').addEventListener('click', () => {
  if (!confirm('全てのMemoryデータを消去しますか？\nこの操作は元に戻せません。')) return;
  for (let i = 1; i <= SLOT_COUNT; i++) {
    localStorage.removeItem(getStorageKey(i));
  }
  restoreState(currentSlot);
});

/** エクスポート: 全スロットをJSONファイルとしてダウンロード */
document.getElementById('exportData').addEventListener('click', () => {
  const slots = {};
  for (let i = 1; i <= SLOT_COUNT; i++) {
    slots[i] = loadState(i);
  }
  const json = JSON.stringify({ version: 1, slots }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ks-time-calc-memory-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

/** インポート: JSONファイルを読み込んで全スロットを復元 */
document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.version !== 1 || typeof data.slots !== 'object') {
        alert('対応していないファイル形式です。');
        return;
      }
      if (!confirm('現在の全Memoryデータを上書きしますか？')) return;
      for (let i = 1; i <= SLOT_COUNT; i++) {
        if (data.slots[i]) {
          localStorage.setItem(getStorageKey(i), JSON.stringify(data.slots[i]));
        } else {
          localStorage.removeItem(getStorageKey(i));
        }
      }
      restoreState(currentSlot);
    } catch {
      alert('ファイルの読み込みに失敗しました。');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ── Calculation ───────────────────────────────────────────

/** 参加者データを読み取る */
function getParticipants() {
  return Array.from(tbody.querySelectorAll('tr')).map(tr => {
    const name = tr.querySelector('.p-name').value.trim();
    const marchRaw = tr.querySelector('.p-march').value.trim();
    const march = marchRaw === '' ? null : parseInt(marchRaw, 10);
    return { name: name || '（名前なし）', march };
  });
}

/** 結果テーブルに行を挿入する */
function fillTable(tbodyEl, rows) {
  tbodyEl.innerHTML = '';
  rows.forEach(({ name, march, departure }) => {
    const tr = document.createElement('tr');
    const marchCell = march === null ? '—' : march;
    const depCell = departure === null
      ? `<td class="na">—</td>`
      : `<td class="departure">${departure}</td>`;
    tr.innerHTML = `<td>${name}</td><td>${marchCell}</td>${depCell}`;
    tbodyEl.appendChild(tr);
  });
}

document.getElementById('calculate').addEventListener('click', () => {
  // 1. ターゲット時刻
  const T = parseHHMMSS(targetInput.value.padStart(6, '0'));
  if (T === null || targetInput.value.length !== 6) {
    alert('ターゲット時刻を正しく入力してください（例: 133645）');
    return;
  }

  const participants = getParticipants();

  if (participants.length === 0) {
    alert('参加者を1人以上入力してください。');
    return;
  }

  // max / min 行軍時間（行軍時間が設定されている参加者のみ）
  const marchTimes = participants.map(p => p.march).filter(m => m !== null);
  const maxMarch = marchTimes.length > 0 ? Math.max(...marchTimes) : 0;
  const minMarch = marchTimes.length > 0 ? Math.min(...marchTimes) : 0;

  // ── パターン1: 弾着時刻合わせ ──
  const rows1 = participants.map(p => ({
    name: p.name,
    march: p.march,
    departure: p.march !== null ? formatSeconds(T - p.march) : null,
  }));

  // ── パターン2: 出発時刻合わせ 最大基準 ──
  const rows2 = participants.map(p => {
    const m = p.march !== null ? p.march : 0;
    return {
      name: p.name,
      march: p.march,
      departure: formatSeconds(T + (maxMarch - m)),
    };
  });

  // ── パターン3: 出発時刻合わせ 最小基準 ──
  const rows3 = participants.map(p => ({
    name: p.name,
    march: p.march,
    departure: p.march !== null ? formatSeconds(T - (p.march - minMarch)) : null,
  }));

  // ── 着弾時刻 ──
  const arrivalTime1 = formatSeconds(T);
  const arrivalTime2 = marchTimes.length > 0 ? formatSeconds(T + maxMarch) : '—';
  const arrivalTime3 = marchTimes.length > 0 ? formatSeconds(T + minMarch) : '—';

  // ── DOM 更新 ──
  document.getElementById('arrival1').textContent = arrivalTime1;
  document.getElementById('arrival2').textContent = arrivalTime2;
  document.getElementById('arrival3').textContent = arrivalTime3;

  fillTable(document.getElementById('tbody1'), rows1);
  fillTable(document.getElementById('tbody2'), rows2);
  fillTable(document.getElementById('tbody3'), rows3);

  // ── コピー用テキスト生成 ──
  const copyText1 = [
    `【弾着合わせ】着弾: ${arrivalTime1}`,
    ...rows1.map(r => `${r.name}: ${r.departure ?? '—'}`),
  ].join('\n');

  const copyText2 = [
    `【最大基準】着弾: ${arrivalTime2}`,
    ...rows2.map(r => `${r.name}: ${r.departure ?? '—'}`),
  ].join('\n');

  const copyText3 = [
    `【最小基準】着弾: ${arrivalTime3}`,
    ...rows3.filter(r => r.departure !== null).map(r => `${r.name}: ${r.departure}`),
  ].join('\n');

  document.getElementById('copy1').value = copyText1;
  document.getElementById('copy2').value = copyText2;
  document.getElementById('copy3').value = copyText3;

  const results = document.getElementById('results');
  results.classList.remove('hidden');
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ── ヘルプモーダル ────────────────────────────────────────

const helpModal = document.getElementById('helpModal');
document.getElementById('helpBody').innerHTML = HELP_CONTENT;

document.getElementById('helpBtn').addEventListener('click', () => {
  helpModal.classList.remove('hidden');
});
document.getElementById('helpClose').addEventListener('click', () => {
  helpModal.classList.add('hidden');
});
helpModal.addEventListener('click', (e) => {
  if (e.target === helpModal) helpModal.classList.add('hidden');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') helpModal.classList.add('hidden');
});

// ── 相手着弾計算 ───────────────────────────────────────────

const enemyBaseInput = document.getElementById('enemyBaseTime');
const enemyRallyInput = document.getElementById('enemyRallyTime');
const enemyMarchInput = document.getElementById('enemyMarchTime');

bindUtcInput('enemyBaseTime', 'enemyBasePreview', 'enemySetUtc');
bindMmssPreview(enemyRallyInput, 'enemyRallyPreview');
bindMmssPreview(enemyMarchInput, 'enemyMarchPreview');

document.getElementById('enemyCalculate').addEventListener('click', () => {
  const baseVal = enemyBaseInput.value.replace(/\D/g, '');
  const T = baseVal.length === 6 ? parseHHMMSS(baseVal) : null;
  if (T === null) {
    alert('計算元UTCを正しく入力してください（例: 133645）');
    return;
  }

  const rallyVal = enemyRallyInput.value.replace(/\D/g, '');
  const rally = rallyVal.length === 4 ? parseMMSS(rallyVal) : null;
  if (rally === null) {
    alert('集結時間を正しく入力してください（例: 3000）');
    return;
  }

  const marchVal = enemyMarchInput.value.replace(/\D/g, '');
  const march = marchVal.length === 4 ? parseMMSS(marchVal) : null;
  if (march === null) {
    alert('行軍時間を正しく入力してください（例: 1545）');
    return;
  }

  const landing = formatSeconds(T + rally + march);
  document.getElementById('enemyResultTime').textContent = landing;
  const resultEl = document.getElementById('enemyResult');
  resultEl.classList.remove('hidden');
});

document.getElementById('enemyCopyToTarget').addEventListener('click', () => {
  const time = document.getElementById('enemyResultTime').textContent;
  // "HH:MM:SS" → "HHMMSS"
  targetInput.value = time.replace(/:/g, '');
  targetInput.dispatchEvent(new Event('input'));
  targetInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  targetInput.focus();
});

// ── 相手行軍時間算出 ──────────────────────────────────────

bindUtcInput('marchStep1Utc', 'marchStep1UtcPreview', 'marchStep1SetUtc');
bindUtcInput('marchStep2Utc', 'marchStep2UtcPreview', 'marchStep2SetUtc');
bindMmssPreview(document.getElementById('marchStep1Rally'), 'marchStep1RallyPreview');
bindMmssPreview(document.getElementById('marchStep2March'), 'marchStep2MarchPreview');

document.getElementById('enemyMarchCalculate').addEventListener('click', () => {
  const utc1Val = document.getElementById('marchStep1Utc').value.replace(/\D/g, '');
  const T1 = utc1Val.length === 6 ? parseHHMMSS(utc1Val) : null;
  if (T1 === null) {
    alert('①のUTC（集結時間取得時刻）を正しく入力してください（例: 133645）');
    return;
  }

  const rallyVal = document.getElementById('marchStep1Rally').value.replace(/\D/g, '');
  const rally = rallyVal.length === 4 ? parseMMSS(rallyVal) : null;
  if (rally === null) {
    alert('①の集結時間を正しく入力してください（例: 3000）');
    return;
  }

  const utc2Val = document.getElementById('marchStep2Utc').value.replace(/\D/g, '');
  const T2 = utc2Val.length === 6 ? parseHHMMSS(utc2Val) : null;
  if (T2 === null) {
    alert('②のUTC（行軍時間取得時刻）を正しく入力してください（例: 140000）');
    return;
  }

  const marchVal = document.getElementById('marchStep2March').value.replace(/\D/g, '');
  const march = marchVal.length === 4 ? parseMMSS(marchVal) : null;
  if (march === null) {
    alert('②の行軍時間（ゲーム表示）を正しく入力してください（例: 1545）');
    return;
  }

  const marchStartSec = (T1 + rally) % 86400;
  const arrivalSec = (T2 + march) % 86400;
  const marchTimeSec = ((arrivalSec - marchStartSec) + 86400) % 86400;

  document.getElementById('marchStartTime').textContent = formatSeconds(marchStartSec);
  document.getElementById('marchArrivalTime').textContent = formatSeconds(arrivalSec);
  document.getElementById('enemyMarchResultTime').textContent = formatMMSS(marchTimeSec);

  document.getElementById('enemyMarchResult').classList.remove('hidden');
});

document.getElementById('marchCopyToEnemy').addEventListener('click', () => {
  const time = document.getElementById('enemyMarchResultTime').textContent;
  // "MM:SS" → "MMSS"
  const input = document.getElementById('enemyMarchTime');
  input.value = time.replace(':', '');
  input.dispatchEvent(new Event('input'));
  document.getElementById('enemyCalcSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  input.focus();
});

// ── Copy to clipboard ─────────────────────────────────────

document.querySelectorAll('.btn-copy').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const text = document.getElementById(targetId).value;
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = 'コピー完了!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'コピー';
        btn.classList.remove('copied');
      }, 2000);
    }).catch(() => {
      const ta = document.getElementById(targetId);
      ta.style.display = 'block';
      ta.select();
      document.execCommand('copy');
      ta.style.display = 'none';
      btn.textContent = 'コピー完了!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'コピー';
        btn.classList.remove('copied');
      }, 2000);
    });
  });
});
