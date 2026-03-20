const HELP_CONTENT = `
  <section class="help-section">
    <h3>ターゲット時刻</h3>
    <ul>
      <li>UTC時刻を hhmmss 形式で入力（例: <code>133645</code> → 13:36:45）</li>
      <li>mmss の4桁を入力後に <strong>SET</strong> ボタンを押すと、現在のUTC時を先頭に自動補完</li>
    </ul>
  </section>

  <section class="help-section">
    <h3>参加者リスト</h3>
    <ul>
      <li>名前と行軍時間（秒）を入力</li>
      <li>行軍時間が空の場合、弾着合わせ・最小基準では対象外になる</li>
      <li><strong>＋ 参加者を追加</strong> で行を追加、<strong>✕</strong> で削除</li>
    </ul>
  </section>

  <section class="help-section">
    <h3>計算パターン</h3>
    <ul>
      <li><span class="tag green">弾着合わせ</span> 全員が同じ時刻 T に着弾。出兵時刻 = T − 行軍時間</li>
      <li><span class="tag blue">最大基準</span> 最長行軍者が T に出発し、全員同時着弾</li>
      <li><span class="tag yellow">最小基準</span> 最短行軍者が T に出発し、全員同時着弾</li>
    </ul>
  </section>

  <section class="help-section">
    <h3>Memory スロット</h3>
    <ul>
      <li>1〜5のスロットで独立したデータを管理・自動保存</li>
      <li>複数タブで異なるスロットを使うと並行して計算できる</li>
    </ul>
  </section>

  <section class="help-section">
    <h3>データ管理</h3>
    <ul>
      <li><strong>リセット</strong>: 現在のスロットを初期化</li>
      <li><strong>書き出し</strong>: 全スロットをJSONファイルでダウンロード</li>
      <li><strong>読み込み</strong>: JSONファイルからデータを復元</li>
      <li><strong>全消去</strong>: 全スロットのデータを一括削除</li>
    </ul>
  </section>
`;
