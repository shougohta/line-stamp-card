# まちスタンプ（LINEミニアプリ試作）

店頭のQRコードを読み取ってスタンプを集め、5個で特典がもらえるスタンプカード。施策案の「5. 来店スタンプカード」の試作。公式アカウントからボタン付きのメッセージを配信し、そこからミニアプリを開く流れまで動いている。

## 現在の状態（2026-11-21）

| 項目 | 状態 |
|---|---|
| 公開先 | GitHub Pages：https://shougohta.github.io/line-stamp-card/index.html |
| LINEミニアプリチャネル | 作成済み。未認証。提供地域は日本 |
| 開発用LIFF ID | `2012129944-BdpcjHUZ`（`config.js` に設定済み） |
| ミニアプリのURL | https://miniapp.line.me/2012129944-BdpcjHUZ（開けるのは管理者とテスターだけ） |
| LINE実機での表示 | 確認済み |
| 公式アカウント | 作成済み。ミニアプリと同じプロバイダーでMessaging APIを有効化 |
| 配信からミニアプリを開く | 自分あてのpush送信で確認済み |
| 本番用LIFF ID | 未設定 |
| 公式アカウントとミニアプリの紐づけ | 未設定（友だち追加特典の案内はまだ出ない） |

## できること

| 機能 | 使っているAPI |
|---|---|
| LINEのプロフィールでカードを表示 | `liff.init` / `liff.getProfile` |
| 店頭QRでスタンプ（アプリ内の読み取りとLINEのカメラの両方） | `liff.scanCodeV2` / URLの `?store=` |
| 友だち追加でスタンプ1個 | `liff.getFriendship` / `liff.requestFriendship` |
| 友だちを誘う（Flexの招待カード） | `liff.shareTargetPicker` / `liff.permanentLink.createUrlBy` |
| 達成後の特典画面と使用済み処理 | なし（画面のみ） |
| 起動環境の表示、閉じるボタン | `liff.getOS` / `getContext` / `isInClient` / `closeWindow` |
| 公式アカウントから「スタンプカードを開く」ボタン付きメッセージを送る | Messaging API（`send-message.mjs`） |

## ファイル

| ファイル | 役割 |
|---|---|
| `index.html` / `app.js` / `style.css` | ミニアプリ本体 |
| `config.js` | LIFF ID、対象店舗、達成個数、特典の設定 |
| `mock-liff.js` | LINEの外で動かすためのLIFFの代役（デモモード） |
| `stores.html` | 店頭に置くQRコードの一覧 |
| `send-message.mjs` | 公式アカウントからボタン付きメッセージを送るスクリプト |
| `icon.png` | アプリと招待カードのアイコン |

## ローカルで動かす（デモモード）

```sh
cd line-stamp-card
python3 -m http.server 8765
```

- アプリ: http://localhost:8765/index.html?mock=1
- 店頭QR: http://localhost:8765/stores.html

URLに `?mock=1` を付けるか、`config.js` の `liffId` を空にすると、LINEにつながないデモモードで動く。QR読み取りは店を選ぶ画面で代用する。

## 更新のしかた

`main` にpushすると、1分ほどでGitHub Pagesに反映される。サーバー側の処理は動かせない（静的ファイルの配信のみ）。

## 配信する

公式アカウントから「スタンプカードを開く」ボタン付きのFlexメッセージを送る。

1. LINE Developersで公式アカウントのチャネルを開き、「Messaging API設定」タブでチャネルアクセストークン（長期）を発行する。
2. 「チャネル基本設定」タブの「あなたのユーザーID」（Uから始まる）を控える。
3. このフォルダに `.env` を作る。`.env` はGitに入らない設定にしてある。

   ```
   LINE_CHANNEL_ACCESS_TOKEN=発行したトークン
   LINE_TO_USER_ID=Uから始まるID
   # MINIAPP_URL=https://miniapp.line.me/本番用LIFF ID（省略時は開発用）
   ```

4. 送る。

   ```sh
   node send-message.mjs dry-run                    # 送らずにJSONを表示
   node --env-file=.env send-message.mjs push       # 自分あてに送る
   node --env-file=.env send-message.mjs broadcast  # 友だち全員に送る
   ```

ボタンの開き先が開発用のURLのあいだは、管理者とテスター以外は開けない。友だち全員に配信する前に、本番用に切り替える。

## ここまでに決めたこと

- **公開先を分けた**：親の作業リポジトリは公開設定で、仕事のメモも入っている。アプリはこの別リポジトリに置いた。
- **開発用で進める**：本番用はURLを知っていれば誰でも開ける。認証が必要な機能のテストも、開発用でしかできない。
- **プロバイダーは1つにまとめた**：LINEのユーザーIDはプロバイダーごとに違う。ミニアプリと公式アカウントを同じプロバイダーに置くと、同じ人を同じIDで扱える。友だち追加の連携にも必要。
- **認証はまだ取らない**：今回の機能はすべて未認証で動く。ミニアプリの認証と公式アカウントの認証は別の審査。

## 次にやること

- **本番用に切り替える**：本番用のLIFF IDとエンドポイントURLを設定し、`config.js` と配信のボタン先を切り替える。
- **公式アカウントをミニアプリに紐づける**：友だち追加特典の案内が出るようになる。
- **スタンプをサーバーで記録する**：IDトークンをLINE Login APIで検証し、サーバーに保存する。GitHub Pagesとは別に、サーバーかサーバーレス関数が必要。

## 試作としての割り切り

- スタンプの記録は端末内（localStorage）に保存している。機種変更で消え、改ざんもできる。
- 店頭QRの中身は店のIDだけなので、写真を撮れば複製できる。本番では日替わりの署名付きコードにする。
- 招待カードのフッターは公式のデザイン規定に沿って組んだが、細部は未照合。
