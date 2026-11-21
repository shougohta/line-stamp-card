// IDトークンをLINEの検証APIで確かめる（バックエンドで行う処理の手元版）。
// 使い方:
//   pbpaste | node verify-id-token.mjs              … クリップボードのトークンを検証（macOS）
//   node verify-id-token.mjs <IDトークン>
// 秘密の鍵は不要。必要なのはチャネルID（LIFF IDのハイフンより前）だけ。

const CHANNEL_ID = process.env.LINE_CHANNEL_ID || "2012129944";

async function readToken() {
  if (process.argv[2]) return process.argv[2].trim();
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}

const idToken = await readToken();
if (!idToken) {
  console.error("IDトークンがありません。引数か標準入力で渡してください");
  process.exit(1);
}

const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ id_token: idToken, client_id: CHANNEL_ID })
});
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`検証に失敗しました: HTTP ${res.status}`, body);
  process.exit(1);
}
console.log("検証に成功しました");
console.log({
  sub: body.sub,
  email: body.email ?? "（入っていない）",
  name: body.name,
  aud: body.aud,
  expires: new Date(body.exp * 1000).toLocaleString("ja-JP")
});
