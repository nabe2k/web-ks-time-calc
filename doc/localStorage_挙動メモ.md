# localStorage の挙動メモ

## localStorage とは

ブラウザに組み込まれているキーバリュー型のストレージ。サーバー不要で、ブラウザ内にデータが永続保存される。

```
ブラウザ
├── タブ・メモリ（ページを閉じると消える）
└── localStorage（永続。明示的に消さない限り残る）
```

---

## このアプリでの使い方

### 保存（`saveState`）

```js
localStorage.setItem('ks-time-calc', JSON.stringify({
  targetTime: '133645',
  participants: [
    { name: 'yoppi', march: '31' },
    { name: 'Niisa', march: '119' },
  ]
}));
```

オブジェクトをそのまま保存できないため `JSON.stringify` で文字列に変換して保存する。

### 読み出し（`loadState`）

```js
JSON.parse(localStorage.getItem('ks-time-calc'));
// → { targetTime: '133645', participants: [...] }
```

`JSON.parse` で文字列をオブジェクトに戻す。

### 保存されるタイミング

| 操作 | 保存 |
|---|---|
| 名前・行軍時間を入力 | ✓ |
| 参加者を追加 | ✓ |
| 参加者を削除 | ✓ |
| ターゲット時刻を入力 | ✓ |

### ブラウザの開発ツールで確認する方法

Chrome の場合: `F12` → **Application** タブ → **Local Storage** → サイトの URL

保存されている JSON がそのまま確認できる。

---

## 複数タブでの挙動

localStorage は**同じオリジン（URL）のタブ間で共有**される。

```
タブA ──┐
        ├── localStorage['ks-time-calc'] ← 同じ領域を読み書き
タブB ──┘
```

### 問題になるケース

**上書き競合**
タブAで入力 → 保存 → タブBで別の値を入力 → 保存
→ タブAの保存内容がタブBに上書きされる。

**表示は更新されない**
タブBで保存されても、タブAの画面はリロードするまで変わらない。
localStorage への書き込みはリアルタイムで他タブの表示に反映されない。

### 対応方法（必要な場合）

`storage` イベントを使うと、他タブの書き込みを検知して画面を再描画できる。

```js
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    // 他タブが保存したので画面を再描画する
  }
});
```

### このアプリの場合

集結計算は1人が使うツールのため、複数タブを同時に使うシーンは少ない。現状のままで実用上は問題なし。必要であれば issue として対応を検討する。
