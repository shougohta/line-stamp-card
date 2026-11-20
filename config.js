// アプリの設定。LINE Developers でチャネルを作ったら liffId を書き換える。
// liffId が空のときは、LINEなしで動くデモモードになる。
window.APP_CONFIG = {
  liffId: "",
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
