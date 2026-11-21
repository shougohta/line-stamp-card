(function () {
  var cfg = window.APP_CONFIG;
  var params = new URLSearchParams(location.search);
  var MOCK = !cfg.liffId || params.has("mock");
  var L = MOCK ? window.createMockLiff(cfg) : window.liff;
  var app = document.getElementById("app");
  var profile, state, isFriend = null, justStamped = null, confirmUse = false;
  var view = params.get("view") === "email" ? "email" : "card";
  var tokenInfo = { raw: null, claims: null, emailPermission: "不明", error: null };

  // ---------- 保存 ----------
  // 試作のため、記録は端末内(localStorage)に保存する。本番ではサーバーでIDトークンを検証して保存する。
  function key() { return "stampcard:v1:" + profile.userId; }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(key())); if (s && s.stamps) return s; } catch (e) {}
    return { stamps: [], bonus: 0, rewardUsed: false };
  }
  function save() { try { localStorage.setItem(key(), JSON.stringify(state)); } catch (e) {} }
  function count() { return state.stamps.length + state.bonus; }
  function storeById(id) { return cfg.stores.filter(function (s) { return s.id === id; })[0]; }

  // ---------- 表示 ----------
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  var toastTimer;
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function couponCode() {
    var h = 0, s = profile.userId + ":" + cfg.reward;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return ("000000" + (h % 1000000)).slice(-6);
  }

  function render() {
    if (view === "email") { renderEmail(); return; }
    var n = count(), goal = cfg.goal, html = "";
    if (MOCK) html += '<p class="demo">デモモードです。LINEにはつながず、端末内だけで動きます。</p>';

    html += '<header class="who">' +
      (profile.pictureUrl ? '<img class="avatar" src="' + esc(profile.pictureUrl) + '" alt="">' : '<span class="avatar" aria-hidden="true"></span>') +
      '<div><h1>' + esc(cfg.appName) + '</h1><p class="muted">' + esc(profile.displayName) + ' さんのカード</p></div></header>';

    var slots = "";
    var labels = state.stamps.map(function (s) { var st = storeById(s.store); return st ? st.name.split(" ").pop() : ""; });
    for (var b = 0; b < state.bonus; b++) labels.push("友だち特典");
    for (var i = 0; i < goal; i++) {
      var on = i < labels.length;
      var isNew = on && justStamped !== null && i === justStamped;
      slots += '<div class="slot' + (on ? " on" : "") + (isNew ? " new" : "") + '">' + (on ? esc(labels[i]) : i + 1) + '</div>';
    }
    html += '<section class="card" aria-label="スタンプカード"><p class="count"><b>' + Math.min(n, goal) + '</b> / ' + goal + ' 個</p>' +
      '<div class="slots">' + slots + '</div>' +
      '<p class="muted">' + (n >= goal ? "達成しました。特典を受け取れます。" : "あと " + (goal - n) + " 個で「" + esc(cfg.reward) + "」") + '</p></section>';

    if (n >= goal) {
      html += state.rewardUsed
        ? '<section class="reward used"><h2>特典は使用済みです</h2><p class="muted">ご利用ありがとうございました。</p></section>'
        : '<section class="reward"><h2>' + esc(cfg.reward) + '</h2><p class="muted">この画面をお店の人に見せてください</p><p class="code">' + couponCode() + '</p>' +
          '<button class="btn ' + (confirmUse ? "" : "sub") + '" id="use">' + (confirmUse ? "お店の人が押す：使用済みにする" : "特典を使う") + '</button>' +
          (confirmUse ? '<button class="btn ghost" id="use-cancel">やめる</button>' : "") + '</section>';
    }

    html += '<div class="actions"><button class="btn" id="scan">お店のQRコードを読み取る</button>' +
      '<button class="btn sub" id="share">友だちを誘う</button></div>';

    if (isFriend === false && state.bonus < cfg.friendBonus) {
      html += '<section class="bonus"><h2>友だち追加でスタンプ1個プレゼント</h2>' +
        '<p class="muted">公式アカウントを友だち追加すると、すぐに1個押されます。</p>' +
        '<button class="btn sub" id="friend">友だち追加する</button></section>';
    }

    html += '<section><h2>対象のお店</h2><ul class="stores">' + cfg.stores.map(function (s) {
      var done = state.stamps.some(function (x) { return x.store === s.id; });
      return '<li><span>' + esc(s.name) + '<br><span class="muted">' + esc(s.area) + '</span></span>' +
        (done ? '<span class="done">済み</span>' : '<span class="todo">未訪問</span>') + '</li>';
    }).join("") + '</ul></section>';

    html += renderTokenPanel();

    var ctx = L.getContext() || {};
    html += '<p class="env">' + esc([L.getOS(), L.isInClient() ? "LINE内" : "外部ブラウザ", "LINE " + (L.getLineVersion() || "なし"), "起動元 " + (ctx.type || "不明")].join(" / ")) + '</p>';
    if (L.isInClient()) html += '<button class="btn ghost" id="close">閉じる</button>';

    app.innerHTML = html;
    justStamped = null;
    bind();
  }

  function on(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener("click", fn); }
  function bind() {
    on("scan", scan);
    on("share", share);
    on("friend", addFriend);
    on("use", function () {
      if (!confirmUse) { confirmUse = true; render(); return; }
      state.rewardUsed = true; confirmUse = false; save(); render(); toast("特典を使用済みにしました");
    });
    on("use-cancel", function () { confirmUse = false; render(); });
    on("close", function () { L.closeWindow(); });
    on("open-email", function () { go("email"); });
    on("token-copy", copyToken);
    on("token-reload", function () { location.reload(); });
    on("email-agree", requestEmail);
    on("email-back", backToCard);
  }

  // ---------- 画面の切り替え（History APIでクエリを書き換える） ----------
  function urlFor(v) {
    var p = new URLSearchParams(location.search);
    p.delete("store");
    if (v === "card") p.delete("view"); else p.set("view", v);
    var q = p.toString();
    return location.pathname + (q ? "?" + q : "");
  }
  var pushed = 0; // アプリ内で積んだ履歴の数。0なら、戻ると前のアプリやトークへ出てしまう
  function go(v) {
    history.pushState({ view: v }, "", urlFor(v));
    pushed++;
    view = v; render(); window.scrollTo(0, 0);
  }
  function backToCard() {
    if (pushed > 0) { history.back(); return; }
    history.replaceState({ view: "card" }, "", urlFor("card"));
    view = "card"; render();
  }
  window.addEventListener("popstate", function (e) {
    if (pushed > 0) pushed--;
    view = e.state && e.state.view === "email" ? "email" : (new URLSearchParams(location.search).get("view") === "email" ? "email" : "card");
    render();
  });

  // ---------- IDトークン ----------
  // 表示用に中身を読むだけ。本人の特定は、加工前のトークンをサーバーで検証して行う。
  function readToken() {
    tokenInfo.error = null;
    try {
      tokenInfo.raw = L.getIDToken();
      tokenInfo.claims = L.getDecodedIDToken();
    } catch (e) {
      tokenInfo.error = e.code || e.message;
    }
    if (!L.permission || !L.permission.query) { tokenInfo.emailPermission = "確認不可"; return Promise.resolve(); }
    return L.permission.query("email").then(function (r) {
      tokenInfo.emailPermission = { granted: "許可済み", prompt: "未許可", unavailable: "スコープ未設定" }[r.state] || r.state;
    }).catch(function (e) { tokenInfo.emailPermission = "確認失敗（" + (e.code || e.message) + "）"; });
  }
  function mask(s, keep) {
    if (!s) return "";
    return s.length <= keep * 2 ? s : s.slice(0, keep) + "…" + s.slice(-keep);
  }
  function maskEmail(m) {
    var at = m.indexOf("@");
    return at < 0 ? mask(m, 2) : m.slice(0, Math.min(2, at)) + "***" + m.slice(at);
  }
  function renderTokenPanel() {
    var c = tokenInfo.claims, rows = [];
    rows.push(["IDトークン", tokenInfo.raw ? "取得できた" : (tokenInfo.error ? "取得できない（" + tokenInfo.error + "）" : "取得できない")]);
    if (c) {
      rows.push(["ユーザーID（sub）", mask(c.sub, 4)]);
      rows.push(["メールアドレス", c.email ? maskEmail(c.email) : "トークンに入っていない"]);
      rows.push(["チャネルID（aud）", String(c.aud)]);
      rows.push(["有効期限", new Date(c.exp * 1000).toLocaleTimeString("ja-JP")]);
    }
    rows.push(["メールアドレスの許可", tokenInfo.emailPermission]);
    return '<section class="bonus"><h2>LINE連携の状態</h2><dl class="kv">' +
      rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join("") + '</dl>' +
      '<div class="actions"><button class="btn sub" id="open-email">メールアドレスの利用を許可する</button>' +
      (tokenInfo.raw ? '<button class="btn ghost" id="token-copy">IDトークンをコピー（検証用）</button>' : "") +
      '<button class="btn ghost" id="token-reload">再読み込みしてトークンを取り直す</button></div></section>';
  }
  function copyToken() {
    if (!tokenInfo.raw) return;
    try {
      navigator.clipboard.writeText(tokenInfo.raw).then(function () { toast("コピーしました。有効期限は1時間です"); }, function () { toast("コピーできませんでした"); });
    } catch (e) { toast("コピーできませんでした"); }
  }

  // ---------- メールアドレスの利用許可 ----------
  function renderEmail() {
    var html = "";
    if (MOCK) html += '<p class="demo">デモモードです。LINEにはつながず、端末内だけで動きます。</p>';
    html += '<header class="who"><div><h1>メールアドレスの取得と利用について</h1><p class="muted">' + esc(cfg.appName) + '</p></div></header>' +
      '<section class="card consent">' +
      '<p>' + esc(cfg.appName) + 'は、お客さまの同意を得たうえで、LINEに登録されているメールアドレスを取得します。</p>' +
      '<dl class="kv">' +
      '<dt>取得する情報</dt><dd>LINEに登録されているメールアドレス</dd>' +
      '<dt>利用目的</dt><dd>会員情報との照合、特典やキャンペーンに関するご連絡</dd>' +
      '<dt>第三者への提供</dt><dd>法令に基づく場合を除き、行いません</dd>' +
      '<dt>保存期間</dt><dd>サービスの退会または同意の取り消しまで</dd>' +
      '</dl>' +
      '<p class="muted">同意しない場合も、スタンプカードはこれまでどおり利用できます。同意はいつでも取り消せます。</p>' +
      '</section>' +
      '<div class="actions"><button class="btn" id="email-agree">同意してLINEの許可画面へ進む</button>' +
      '<button class="btn ghost" id="email-back">戻る</button></div>' +
      '<p class="env">試作用の説明文です。本番では、提供元の会社名とプライバシーポリシーへのリンクを載せます。</p>';
    app.innerHTML = html;
    bind();
  }
  function requestEmail() {
    if (!L.permission || !L.permission.requestAll) { toast("この環境では許可画面を出せません"); return; }
    L.permission.requestAll().then(afterEmail).catch(function (e) {
      var msg = String(e.message || "");
      if (/already been approved/i.test(msg)) { afterEmail(); return; }
      toast("許可画面を開けませんでした（" + (e.code || "") + " " + msg + "）");
    });
  }
  function afterEmail() {
    readToken().then(function () {
      backToCard();
      var c = tokenInfo.claims;
      toast(c && c.email ? "メールアドレスを取得できました" : "許可を受け付けました。トークンにはまだ入っていません");
    });
  }

  // ---------- スタンプ ----------
  function storeFromText(text) {
    if (!text) return null;
    try { var u = new URL(text); return u.searchParams.get("store"); } catch (e) {}
    var m = /store=([a-z0-9]+)/i.exec(text);
    return m ? m[1] : null;
  }
  function stamp(storeId) {
    var st = storeById(storeId);
    if (!st) { toast("このQRコードはスタンプの対象外です"); return; }
    if (state.stamps.some(function (x) { return x.store === storeId; })) { toast(st.name + " のスタンプは押してあります"); return; }
    var before = count();
    state.stamps.push({ store: storeId, at: new Date().toISOString() });
    save();
    justStamped = before;
    render();
    toast(count() >= cfg.goal && before < cfg.goal ? "達成！特典を受け取れます" : st.name + " のスタンプを押しました");
  }
  function scan() {
    if (!L.isApiAvailable("scanCodeV2")) { toast("この環境ではQRコードを読み取れません"); return; }
    L.scanCodeV2().then(function (r) { if (r && r.value) stamp(storeFromText(r.value)); })
      .catch(function (e) { toast("読み取れませんでした（" + (e.code || e.message) + "）"); });
  }

  // ---------- 友だち追加 ----------
  function checkFriend() {
    return L.getFriendship().then(function (r) { isFriend = !!r.friendFlag; })
      .catch(function () { isFriend = null; }); // 公式アカウント未連携などで取れないときは案内を出さない
  }
  function addFriend() {
    L.requestFriendship().then(checkFriend).then(function () {
      if (isFriend && state.bonus < cfg.friendBonus) {
        var before = count();
        state.bonus = cfg.friendBonus; save(); justStamped = before;
        toast("友だち追加ありがとうございます。1個押しました");
      }
      render();
    }).catch(function (e) { toast("友だち追加を開けませんでした（" + (e.code || e.message) + "）"); });
  }

  // ---------- 共有 ----------
  function inviteMessage(link) {
    var appLink = MOCK ? link : "https://miniapp.line.me/" + cfg.liffId;
    var iconUrl = new URL("icon.png", location.href).href;
    return {
      type: "flex",
      altText: profile.displayName + "さんから" + cfg.appName + "の招待が届きました",
      contents: {
        type: "bubble",
        body: { type: "box", layout: "vertical", spacing: "md", contents: [
          { type: "text", text: "一緒に" + cfg.appName + "を集めよう", weight: "bold", size: "lg", wrap: true, maxLines: 2 },
          { type: "text", text: profile.displayName + "さんは " + Math.min(count(), cfg.goal) + "/" + cfg.goal + " 個集めています", size: "sm", color: "#707070", wrap: true },
          { type: "box", layout: "vertical", spacing: "sm", margin: "lg", contents: [
            row("特典", cfg.reward), row("対象", cfg.stores.length + "店舗"), row("条件", cfg.goal + "個で達成")
          ] }
        ] },
        footer: { type: "box", layout: "vertical", spacing: "md", contents: [
          { type: "button", style: "primary", color: "#4fade8", action: { type: "uri", label: "カードを開く", uri: link } },
          { type: "separator" },
          { type: "box", layout: "horizontal", alignItems: "center", spacing: "sm", contents: [
            { type: "image", url: iconUrl, size: "xxs", flex: 0, aspectMode: "cover" },
            { type: "text", text: cfg.appName, size: "xs", color: "#707070", flex: 1, gravity: "center" },
            { type: "image", url: "https://vos.line-scdn.net/service-notifier/footer_go_btn.png", size: "xxs", flex: 0, aspectRatio: "1:1", action: { type: "uri", uri: appLink } }
          ] }
        ] }
      }
    };
    function row(k, v) {
      return { type: "box", layout: "baseline", spacing: "sm", contents: [
        { type: "text", text: k, size: "sm", color: "#707070", flex: 2 },
        { type: "text", text: v, size: "sm", color: "#444444", flex: 5, wrap: true }
      ] };
    }
  }
  function share() {
    if (!L.isApiAvailable("shareTargetPicker")) { toast("この環境では共有できません"); return; }
    var base = location.origin + location.pathname;
    L.permanentLink.createUrlBy(MOCK ? base + "?mock=1" : base)
      .then(function (link) { return L.shareTargetPicker([inviteMessage(link)], { isMultiple: true }); })
      .then(function (r) { if (r && r.status === "success") toast(MOCK ? "（デモ）招待を送った扱いにしました" : "招待を送りました"); })
      .catch(function (e) { toast("共有できませんでした（" + (e.code || e.message) + "）"); });
  }

  // ---------- 起動 ----------
  function fail(msg) { app.innerHTML = '<p class="loading">' + esc(msg) + '</p>'; }
  L.init({ liffId: cfg.liffId || "mock", withLoginOnExternalBrowser: true })
    .then(function () {
      if (!L.isLoggedIn()) { L.login(); return; }
      return L.getProfile().then(function (p) {
        profile = p;
        state = load();
        return Promise.all([checkFriend(), readToken()]);
      }).then(function () {
        try { history.replaceState({ view: view }, "", urlFor(view)); } catch (e) {}
        render();
        var storeParam = params.get("store");
        if (storeParam) stamp(storeParam);
      });
    })
    .catch(function (e) { fail("起動できませんでした（" + (e.code || e.message) + "）"); });
})();
