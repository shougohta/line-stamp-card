// アプリの設定。LINE Developers でチャネルを作ったら liffId を書き換える。
// liffId が空のときは、LINEなしで動くデモモードになる。
window.APP_CONFIG = {
  liffId: "2012129944-BdpcjHUZ",
  appName: "まちスタンプ",
  goal: 5,
  reward: "ドリンク1杯無料",
  friendBonus: 1,
  stores: [
    { id: "s01", name: "ベーカリー こむぎ", area: "駅前通り" },
    { id: "s02", name: "珈琲 しずく", area: "駅前通り" },
    { id: "s03", name: "八百屋 みどり", area: "中央商店街" },
    { id: "s04", name: "花と雑貨 つむぎ", area: "中央商店街" },
    { id: "s05", name: "和菓子 さくら堂", area: "川沿い" },
    { id: "s06", name: "古本 ひだまり", area: "川沿い" }
  ]
};

// 本番用のミニアプリURL（https://miniapp.line.me/{本番用LIFF ID}?env=prod）から開いたときは、本番用のLIFF IDで初期化する。
// LIFF IDは開発用・本番用で違う。初回はLINEが ?liff.state=%3Fenv%3Dprod のように包んで渡すので、その中も見る。
(function () {
  var LIFF_IDS = { dev: "2012129944-BdpcjHUZ", prod: "2012129946-cljXwAwh" };
  var q = location.search;
  try {
    var st = new URLSearchParams(q).get("liff.state");
    if (st) q += "&" + st.replace(/^[^?]*\?/, "");
  } catch (e) {}
  var env = /(?:^|[?&])env=prod(?:&|$)/.test(q) ? "prod" : "dev";
  window.APP_CONFIG.env = env;
  window.APP_CONFIG.liffId = LIFF_IDS[env];
})();
