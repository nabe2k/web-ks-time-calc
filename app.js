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

// ── Participant table ─────────────────────────────────────

const tbody = document.getElementById('participantRows');

function addRow(name = '', march = '') {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" class="p-name" placeholder="名前" value="${name}"></td>
    <td><input type="number" class="p-march" placeholder="秒" min="1" value="${march}"></td>
    <td><button class="btn-delete" title="削除">✕</button></td>
  `;
  tr.querySelector('.btn-delete').addEventListener('click', () => tr.remove());
  tbody.appendChild(tr);
}

// 初期行
addRow('', '');
addRow('', '');
addRow('', '');

document.getElementById('addRow').addEventListener('click', () => addRow());

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
  // 出兵時刻 = T - 自分の行軍時間（空は対象外）
  const rows1 = participants.map(p => ({
    name: p.name,
    march: p.march,
    departure: p.march !== null ? formatSeconds(T - p.march) : null,
  }));

  // ── パターン2: 出発時刻合わせ 最大基準 ──
  // 出兵時刻 = T + (max_march - 自分の行軍時間)
  // 行軍時間が空の場合は 0 として扱う（T + max_march）
  const rows2 = participants.map(p => {
    const m = p.march !== null ? p.march : 0;
    return {
      name: p.name,
      march: p.march,
      departure: formatSeconds(T + (maxMarch - m)),
    };
  });

  // ── パターン3: 出発時刻合わせ 最小基準 ──
  // 出兵時刻 = T - (自分の行軍時間 - min_march)（空は対象外）
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
  const targetStr = formatSeconds(T);

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
      // フォールバック: テキストエリアを一時的に表示してコピー
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
