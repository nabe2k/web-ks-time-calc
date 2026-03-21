# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 概要

モバイル戦略ゲームの「多段集結」において、複数プレイヤーが指定時刻に同時着弾するための出兵時刻を計算する静的 Web ツール。

**URL:** https://web-ks-time-calc.vercel.app

## 開発コマンド

ビルド不要。ファイルをブラウザで直接開くだけで動作する。

```bash
# ローカル確認
open index.html

# デプロイ
vercel --prod
```

## アーキテクチャ

フレームワーク・npm 依存なし。HTML + CSS + JavaScript のみ。

| ファイル | 役割 |
|---|---|
| `index.html` | HTML 構造（ヘッダー、メモリスロットバー、入力フォーム、結果表示） |
| `app.js` | 計算ロジック・UI 制御・localStorage 管理 |
| `help.js` | ヘルプモーダルのコンテンツ定数 `HELP_CONTENT` を定義 |
| `style.css` | CSS 変数によるテーマ管理、モバイル対応（breakpoint: 480px） |
| `vercel.json` | Vercel 静的ホスティング設定（ビルドなし、出力ディレクトリ = ルート） |

## 計算パターン

入力: ターゲット時刻 **T**（UTC hhmmss）、参加者ごとの行軍時間（秒）

| パターン | 色 | ロジック |
|---|---|---|
| 弾着時刻合わせ | 緑 | `出兵時刻 = T − 自分の行軍時間` |
| 出発時刻合わせ・最大基準 | 青 | `出兵時刻 = T + (max_march − 自分の行軍時間)`、着弾 = `T + max_march` |
| 出発時刻合わせ・最小基準 | 黄 | `出兵時刻 = T − (自分の行軍時間 − min_march)`、着弾 = `T + min_march` |

## 状態管理

- localStorage にメモリスロット 1〜5 を独立して保存
- スロットキー: `ks_time_calc_slot_{n}` に JSON 保存、アクティブスロットは `ks_time_calc_active_slot` で管理
- 保存内容: ターゲット時刻 + 参加者リスト（名前・行軍時間）
- `app.js` の `saveState()` / `loadState()` が担当
- 複数タブ間の挙動は `doc/localStorage_挙動メモ.md` を参照

## コミット規約

コミットメッセージは日本語で書く。
