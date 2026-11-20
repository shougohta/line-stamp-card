# まちスタンプ（LINEミニアプリ試作）

店頭のQRコードを読み取ってスタンプを集め、5個で特典がもらえるスタンプカード。施策案の「5. 来店スタンプカード」の試作。

## できること

| 機能 | 使っているAPI |
|---|---|
| LINEのプロフィールでカードを表示 | `liff.init` / `liff.getProfile` |
| 店頭QRでスタンプ（アプリ内の読み取りとLINEのカメラの両方） | `liff.scanCodeV2` / URLの `?store=` |
| 友だち追加でスタンプ1個 | `liff.getFriendship` / `liff.requestFriendship` |
| 友だちを誘う（Flexの招待カード） | `liff.shareTargetPicker` / `liff.permanentLink.createUrlBy` |
| 達成後の特典画面と使用済み処理 | なし（画面のみ） |
| 起動環境の表示、閉じるボタン | `liff.getOS` / `getContext` / `isInClient` / `closeWindow` |

## ローカルで動かす（デモモード）

```sh
cd line-stamp-card
python3 -m http.server 8765
```

- アプリ: http://localhost:8765/index.html
- 店頭QR: http://localhost:8765/stores.html

`config.js` の `liffId` が空のあいだは、LINEにつながないデモモードで動く。QR読み取りは店を選ぶ画面で代用する。

## LINEで動かすまで

1. **公開先を用意する**：HTTPSで配信できる場所にこのフォルダを置く（GitHub Pagesなど）。
2. **プロバイダーを作る**：LINE Developersコンソールで作成。認証を受ける段階では、サービス提供元と同じ名前にする必要がある。
3. **LINEミニアプリチャネルを作る**：提供地域は「日本」。後から変更できない。
4. **ウェブアプリ設定**：開発用のエンドポイントURLに公開先の `index.html` のURLを入れる。Scan QR をオン、Scope は `profile` と `openid` を有効にする。
5. **共有を有効にする**：シェアターゲットピッカーをオンにする。
6. **公式アカウントを紐づける**（友だち追加特典を使う場合）：同じプロバイダーの公式アカウントをチャネルに連携する。
7. **`config.js` の `liffId` に開発用のLIFF IDを入れて**、公開先を更新する。
8. **自分のLINEで開く**：`https://miniapp.line.me/{LIFF ID}`。開発用チャネルは管理者とテスターだけが開ける。
9. **店頭QRを刷る**：`stores.html` がLINE用のQRに切り替わる。

## 試作としての割り切り

- スタンプの記録は端末内（localStorage）に保存している。機種変更で消え、改ざんもできる。本番ではIDトークンをサーバーで検証して記録する。
- 店頭QRの中身は店のIDだけなので、写真を撮れば複製できる。本番では日替わりの署名付きコードにする。
- 招待カードのフッターは公式のデザイン規定に沿って組んだが、細部は未照合。
- LINE実機では未検証。
