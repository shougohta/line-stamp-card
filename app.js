(function () {
  var cfg = window.APP_CONFIG;
  var params = new URLSearchParams(location.search);
  var MOCK = !cfg.liffId || params.has("mock");
  var L = MOCK ? window.createMockLiff(cfg) : window.liff;
  var app = document.getElementById("app");
  var profile, state, isFriend = null, justStamped = null, confirmUse = false;

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
        return checkFriend();
      }).then(function () {
        render();
        var storeParam = new URLSearchParams(location.search).get("store");
        if (storeParam) {
          stamp(storeParam);
          try { history.replaceState(null, "", location.pathname + (MOCK && params.has("mock") ? "?mock=1" : "")); } catch (e) {}
        }
      });
    })
    .catch(function (e) { fail("起動できませんでした（" + (e.code || e.message) + "）"); });
})();
