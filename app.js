'use strict';

// ── Utility ──────────────────────────────────────────────

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
const targetPreview = document.getElementById('targetPreview');

targetInput.addEventListener('input', () => {
  const val = targetInput.value.replace(/\D/g, '');
  targetInput.value = val;
  const sec = parseHHMMSS(val.padStart(6, '0'));
  if (sec !== null && val.length === 6) {
    targetPreview.textContent = formatSeconds(sec);
  } else {
    targetPreview.textContent = '—';
  }
  saveState();
});

/** SETボタン: 4桁入力時に現在のUTC時(hh)を先頭に補完 */
document.getElementById('setUtcHour').addEventListener('click', () => {
  const val = targetInput.value.replace(/\D/g, '');
  if (val.length !== 4) return;
  const utcHour = String(new Date().getUTCHours()).padStart(2, '0');
  targetInput.value = utcHour + val;
  targetInput.dispatchEvent(new Event('input'));
});

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
