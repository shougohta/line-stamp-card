// 公式アカウントから「ミニアプリを開く」ボタン付きのメッセージを送る。
// 使い方:
//   node --env-file=.env send-message.mjs push        … LINE_TO_USER_ID の1人に送る（自分あての試し送信）
//   node --env-file=.env send-message.mjs broadcast   … 友だち全員に送る
//   node send-message.mjs dry-run                     … 送らずにメッセージのJSONだけ表示する
//
// .env に書くもの（このファイルはGitに入れない）:
//   LINE_CHANNEL_ACCESS_TOKEN=Messaging APIチャネルのチャネルアクセストークン
//   LINE_TO_USER_ID=Uから始まる自分のユーザーID（Messaging APIチャネルの「チャネル基本設定」にある）
//   MINIAPP_URL=https://miniapp.line.me/xxxx（省略時は開発用のURL）

const mode = process.argv[2] || "dry-run";
const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const to = process.env.LINE_TO_USER_ID;
const miniappUrl = process.env.MINIAPP_URL || "https://miniapp.line.me/2012129944-BdpcjHUZ";

// MESSAGE_FILE にJSONファイルを指定すると、そのメッセージを送る（文中の {{MINIAPP_URL}} はミニアプリのURLに置き換える）
const fs = await import("node:fs");
const custom = process.env.MESSAGE_FILE
  ? JSON.parse(fs.readFileSync(process.env.MESSAGE_FILE, "utf8").replaceAll("{{MINIAPP_URL}}", miniappUrl))
  : null;

const message = custom || {
  type: "flex",
  altText: "まちスタンプ：お店を回ってスタンプを集めよう",
  contents: {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        { type: "text", text: "まちスタンプ はじまりました", weight: "bold", size: "lg", wrap: true },
        { type: "text", text: "対象の6店舗でQRコードを読み取ると、スタンプが1個たまります。5個集めるとドリンク1杯無料。", size: "sm", color: "#707070", wrap: true }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "button", style: "primary", color: "#4fade8", action: { type: "uri", label: "スタンプカードを開く", uri: miniappUrl } }
      ]
    }
  }
};

if (mode === "dry-run") {
  console.log(JSON.stringify({ messages: [message] }, null, 2));
  process.exit(0);
}
if (!["push", "broadcast"].includes(mode)) {
  console.error(`使い方: node --env-file=.env send-message.mjs push | broadcast | dry-run（指定: ${mode}）`);
  process.exit(1);
}
if (!token) {
  console.error(".env に LINE_CHANNEL_ACCESS_TOKEN がありません");
  process.exit(1);
}
if (mode === "push" && !to) {
  console.error(".env に LINE_TO_USER_ID がありません");
  process.exit(1);
}

const endpoint = mode === "push" ? "push" : "broadcast";
const body = mode === "push" ? { to, messages: [message] } : { messages: [message] };
const res = await fetch(`https://api.line.me/v2/bot/message/${endpoint}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify(body)
});
const text = await res.text();
if (res.ok) {
  console.log(`送信しました（${endpoint}）`);
} else {
  console.error(`送信できませんでした: HTTP ${res.status} ${text}`);
  process.exit(1);
}
