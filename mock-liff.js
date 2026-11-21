// LINEの外で動作確認するための、LIFF SDKの簡易な代役。
// config.js の liffId が空か、URLに ?mock=1 があるときだけ使う。
window.createMockLiff = function (config) {
  var FRIEND_KEY = "stampcard:mock:friend";
  var EMAIL_KEY = "stampcard:mock:email";
  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function write(key, v) { try { localStorage.setItem(key, v); } catch (e) {} }

  function pickStore() {
    var dialog = document.getElementById("picker");
    var list = document.getElementById("picker-list");
    list.innerHTML = "";
    return new Promise(function (resolve) {
      config.stores.concat([{ id: "x99", name: "対象外のQRコード", area: "" }]).forEach(function (s) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "btn sub";
        b.textContent = s.name;
        b.addEventListener("click", function () {
          dialog.close("picked");
          resolve({ value: location.origin + location.pathname + "?mock=1&store=" + s.id });
        });
        list.appendChild(b);
      });
      dialog.addEventListener("close", function onClose() {
        dialog.removeEventListener("close", onClose);
        if (dialog.returnValue !== "picked") resolve({ value: null });
      });
      dialog.showModal();
    });
  }

  return {
    isMock: true,
    id: "mock",
    init: function () { return Promise.resolve(); },
    isLoggedIn: function () { return true; },
    login: function () {},
    isInClient: function () { return false; },
    getOS: function () { return "web"; },
    getLineVersion: function () { return null; },
    getContext: function () { return { type: "none" }; },
    isApiAvailable: function () { return true; },
    getProfile: function () {
      return Promise.resolve({ userId: "Udemo0000", displayName: "デモユーザー", pictureUrl: "" });
    },
    getFriendship: function () { return Promise.resolve({ friendFlag: read(FRIEND_KEY) === "1" }); },
    requestFriendship: function () { write(FRIEND_KEY, "1"); return Promise.resolve(); },
    scanCodeV2: pickStore,
    shareTargetPicker: function (messages) {
      console.log("[demo] shareTargetPicker", JSON.stringify(messages, null, 2));
      return Promise.resolve({ status: "success" });
    },
    permanentLink: { createUrlBy: function (url) { return Promise.resolve(url); } },
    getIDToken: function () { return "mock.id.token"; },
    getDecodedIDToken: function () {
      var c = { iss: "https://access.line.me", sub: "Udemo0000000000000000000000000000", aud: "mock", exp: Math.floor(Date.now() / 1000) + 3600, name: "デモユーザー" };
      if (read(EMAIL_KEY) === "1") c.email = "demo@example.com";
      return c;
    },
    permission: {
      query: function (p) { return Promise.resolve({ state: p === "email" && read(EMAIL_KEY) !== "1" ? "prompt" : "granted" }); },
      requestAll: function () { write(EMAIL_KEY, "1"); return Promise.resolve(); }
    },
    closeWindow: function () {}
  };
};
