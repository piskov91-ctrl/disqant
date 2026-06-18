(function () {
  "use strict";

  // Keep a stable reference for key lookup (document.currentScript becomes null later).
  var WIDGET_SCRIPT_EL = document.currentScript || null;

  var WIDGET_ATTR_KEY = "data-fit-room-key";
  var WIDGET_ATTR_BIND = "data-fit-room-bind";
  var WIDGET_ATTR_BOUND = "data-fit-room-tryon-bound";
  var WIDGET_ATTR_PENDING = "data-fit-room-tryon-pending-load";
  var WIDGET_ATTR_SKIP = "data-fit-room-tryon-skip";

  /** Fit Room API origin — derived from widget script src so embeds on retailer pages POST to fit-room.com, not the host page. */
  function getWidgetApiOrigin() {
    var s = getCurrentScript();
    var src = s && s.getAttribute("src") ? s.getAttribute("src") : "";
    try {
      var u = new URL(src, window.location.href);
      if (u.origin && u.origin !== "null") return u.origin;
    } catch (_e) { }
    return window.location.origin;
  }

  // Matches app route /api/try-on in this repo (same POST handler as /api/tryon).
  var API_ENDPOINT = getWidgetApiOrigin() + "/api/try-on";
  var OPEN_MODAL = null;

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function getCurrentScript() {
    if (WIDGET_SCRIPT_EL) return WIDGET_SCRIPT_EL;
    return document.currentScript || null;
  }

  function getClientKey() {
    var s = getCurrentScript();
    if (!s) return null;

    var attr = s.getAttribute(WIDGET_ATTR_KEY);
    if (attr && attr.trim()) return attr.trim();

    var src = s.getAttribute("src") || "";
    try {
      var u = new URL(src, window.location.href);
      var key = u.searchParams.get("key");
      return key ? key.trim() : null;
    } catch (_e) {
      return null;
    }
  }

  function normalizePagePath() {
    try {
      var path = window.location.pathname || "/";
      path = path.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
      return path.toLowerCase();
    } catch (_e) {
      return "/";
    }
  }

  /** SPA demos may use `#/products/{slug}` on a single static page (e.g. `/store-demo`). */
  function effectivePagePath() {
    var path = normalizePagePath();
    try {
      var hash = (window.location.hash || "").replace(/^#/, "").split("?")[0];
      if (!hash) return path;
      var hashPath = hash.charAt(0) === "/" ? hash : "/" + hash;
      hashPath = hashPath.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
      if (hashPath.indexOf("/products/") === 0) return hashPath.toLowerCase();
    } catch (_e) { }
    return path;
  }

  /** `data-fit-room-bind="all"` on the script tag skips URL checks (test pages, demos). */
  function widgetBindMode() {
    var s = getCurrentScript();
    if (!s) return "auto";
    var mode = (s.getAttribute(WIDGET_ATTR_BIND) || "").trim().toLowerCase();
    return mode === "all" ? "all" : "auto";
  }

  function isListingPagePath(path) {
    if (path === "/collections" || path.indexOf("/collections/") !== -1) return true;
    if (path === "/collection" || path.indexOf("/collection/") !== -1) return true;
    if (path === "/category" || path.indexOf("/category/") !== -1) return true;
    if (path === "/categories" || path.indexOf("/categories/") !== -1) return true;

    if (path === "/shop") return true;
    if (path.indexOf("/shop/") !== 0) return false;

    var afterShop = path.slice("/shop/".length);
    if (!afterShop) return true;

    var segments = afterShop.split("/").filter(function (seg) { return !!seg; });
    if (!segments.length) return true;

    var first = segments[0];
    if (
      first === "category" ||
      first === "categories" ||
      first === "collection" ||
      first === "collections"
    ) {
      return true;
    }

    // /shop/{category} — listing; /shop/{category}/{product-slug} — PDP.
    return segments.length < 2;
  }

  function isProductPagePath(path) {
    if (isListingPagePath(path)) return false;
    if (/^\/products\/[^/]+/.test(path)) return true;
    if (/^\/product\/[^/]+/.test(path)) return true;
    if (/^\/p\/[^/]+/.test(path)) return true;
    if (/^\/item\/[^/]+/.test(path)) return true;
    if (path.indexOf("/shop/") === 0) {
      var segments = path.slice("/shop/".length).split("/").filter(function (seg) { return !!seg; });
      if (segments.length >= 2) return true;
    }
    return false;
  }

  function shouldBindOnThisPage() {
    if (widgetBindMode() === "all") return true;
    return isProductPagePath(effectivePagePath());
  }

  function isVisibleEnough(img) {
    if (!img) return false;
    var rect = img.getBoundingClientRect();
    return rect.width >= 24 && rect.height >= 24 && rect.bottom > 0 && rect.right > 0;
  }

  function isEligibleImage(img) {
    if (!img || img.tagName !== "IMG") return false;
    if (img.getAttribute(WIDGET_ATTR_BOUND) === "1") return false;

    var src = img.currentSrc || img.src || "";
    if (!src) return false;
    if (src.indexOf("data:") === 0) return false;
    if (src.toLowerCase().indexOf(".svg") !== -1) return false;

    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      if (img.naturalWidth < 24 || img.naturalHeight < 24) return false;
    }

    return isVisibleEnough(img);
  }

  function ensureRelative(el) {
    var style = window.getComputedStyle(el);
    if (style.position === "static") el.style.position = "relative";
  }

  function injectStyles() {
    if (qs("#fit-room-widget-style")) return;

    var css = ""
      // Overlay wrapping
      + ".dq-wrap{display:inline-block;position:relative;vertical-align:top;line-height:0;max-width:100%;}"
      + ".dq-wrap>img{display:block;max-width:100%;height:auto;vertical-align:top;}"
      + ".dq-overlay{position:absolute;inset:auto 12px 12px auto;z-index:2147483645;display:flex;align-items:center;pointer-events:auto;}"

      // Wear button
      + ".dq-wear-btn{position:relative;appearance:none;box-sizing:border-box;cursor:pointer;"
      + "display:inline-flex;align-items:center;justify-content:center;"
      + "padding:12px 30px;border-radius:50px;color:#2c241f;text-decoration:none;"
      + "font-family:Georgia,ui-serif,serif;font-weight:700;font-size:14px;line-height:1.25;letter-spacing:2px;"
      + "background:linear-gradient(135deg,#c6a77d 0%,#e2cfb4 50%,#c6a77d 100%);"
      + "border:1px solid rgba(255,255,255,.3);"
      + "box-shadow:0 4px 15px rgba(0,0,0,.3),inset 0 1px 1px rgba(255,255,255,.5);"
      + "transition:all .3s ease;transform:translateY(0);-webkit-font-smoothing:antialiased;}"
      + ".dq-wear-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(198,167,125,.4);filter:brightness(1.1);}"
      + ".dq-wear-btn:active{transform:translateY(-1px);filter:brightness(1.05);}"

      // Backdrop + modal (dark theme — matches DemoClient / wearMeShared DEMO_WEAR_MODAL_CSS)
      + ".dq-backdrop{position:fixed;inset:0;z-index:2147483646;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:14px;opacity:0;transition:opacity .18s ease;}"
      + ".dq-backdrop.dq-open{opacity:1;}"
      + ".dq-backdrop.dq-dismiss-locked{cursor:default;-webkit-user-select:none;user-select:none;}"
      + ".dq-modal{position:relative;width:min(720px,100%);min-height:0;max-height:calc(100vh - 28px);max-height:min(90vh,calc(100dvh - 28px));background:#2c241f;border:1px solid rgba(198,167,125,.22);border-radius:20px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.45);display:flex;flex-direction:column;color:#f5ede4;transform:translateY(10px) scale(.985);opacity:0;transition:transform .18s ease, opacity .18s ease;}"
      + ".dq-backdrop.dq-open .dq-modal{transform:translateY(0) scale(1);opacity:1;}"
      + ".dq-backdrop.dq-closing{opacity:0;}"
      + ".dq-backdrop.dq-closing .dq-modal{transform:translateY(10px) scale(.985);opacity:0;}"
      + ".dq-head{display:flex;align-items:flex-start;justify-content:flex-start;flex-shrink:0;padding:12px;padding-left:max(12px, env(safe-area-inset-left, 0px));padding-right:max(12px, env(safe-area-inset-right, 0px));padding-top:max(12px, env(safe-area-inset-top, 0px));border-bottom:1px solid rgba(198,167,125,.18);background:#2c241f;position:relative;}"
      + ".dq-head-title{font:900 13px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.25px;color:#f5ede4;}"
      + ".dq-head-sub{font-size:11px;font-weight:600;color:#c6a77d;letter-spacing:.2px;line-height:1.35;margin-top:4px;}"
      + ".dq-x{appearance:none;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.14);background:#0f0f14;color:#fff;border-radius:999px;min-width:44px;min-height:44px;padding:0;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.22);transition:transform .16s ease, box-shadow .16s ease, background-color .16s ease;-webkit-tap-highlight-color:transparent;-webkit-font-smoothing:antialiased;}"
      + ".dq-x:hover{background:#2a2633;color:#fff;transform:translateY(-1px);box-shadow:0 14px 32px rgba(0,0,0,.26);}"
      + ".dq-x:active{transform:translateY(0);}"
      + ".dq-x-icon{width:22px;height:22px;display:block;flex-shrink:0;}"
      + ".dq-body{flex:1 1 0%;min-height:0;padding:12px;display:flex;flex-direction:column;gap:12px;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;background:#2c241f;}"
      + ".dq-tips-block{flex-shrink:0;display:flex;flex-direction:column;gap:8px;}"
      + ".dq-tips{padding:12px;border-radius:12px;border-left:3px solid #c6a77d;background:rgba(198,167,125,.08);}"
      + ".dq-tips-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px;}"
      + ".dq-tips-list li{display:flex;align-items:flex-start;gap:8px;font:400 13px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:rgba(245,237,228,.88);letter-spacing:.01em;}"
      + ".dq-tips-mark{flex-shrink:0;color:#c6a77d;font-size:12px;line-height:1.55;font-weight:600;}"
      + ".dq-tips-privacy{margin:0;padding:12px 14px;border-radius:12px;border:1px solid rgba(198,167,125,.5);background:#1a1612;font:500 13px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:rgba(245,237,228,.92);letter-spacing:.02em;box-shadow:inset 0 1px 0 rgba(198,167,125,.08);}"
      + ".dq-stage{position:relative;width:100%;height:min(72vh,560px);border-radius:18px;border:1px solid rgba(198,167,125,.2);background:linear-gradient(180deg,#1a1612,#141210);box-shadow:inset 0 1px 0 rgba(198,167,125,.08);overflow:hidden;}"
      + ".dq-stage img{width:100%;height:100%;display:block;background:#0f0f14;object-fit:contain;object-position:center center;}"
      + ".dq-empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:rgba(245,237,228,.65);text-align:center;padding:18px;}"
      + ".dq-empty strong{color:#f5ede4;font:900 14px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}"
      + ".dq-empty span{font:600 12px/1.3 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}"
      + ".dq-processing{position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:10px;z-index:4;background:rgba(26,22,18,.82);backdrop-filter:blur(8px);}"
      + ".dq-processing.is-on{display:flex;}"
      + ".dq-processing-inner{display:flex;flex-direction:column;align-items:center;gap:14px;min-height:4.5rem;justify-content:center;}"
      + ".dq-spin{width:34px;height:34px;border-radius:999px;border:3px solid rgba(15,15,20,.14);border-top-color:#c6a77d;animation:dqspin 1s linear infinite;}"
      + "@keyframes dqspin{to{transform:rotate(360deg);}}"
      + ".dq-processing-text{font:900 14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#f5ede4;text-align:center;max-width:420px;padding:0 16px;}"
      + ".dq-progress{position:absolute;left:12px;right:12px;bottom:12px;z-index:5;height:10px;border-radius:999px;background:rgba(245,237,228,.12);overflow:hidden;display:none;}"
      + ".dq-progress.is-on{display:block;}"
      + ".dq-progress>span{display:block;height:100%;width:0%;background:linear-gradient(135deg,#a68958,#c6a77d 45%,#e8d4bc 100%);background-size:200% 100%;transition:width .12s ease;position:relative;animation:dq-bar-pulse 1.9s ease-in-out infinite;}"
      + "@keyframes dq-bar-pulse{0%,100%{background-position:0% 50%;filter:brightness(1)}50%{background-position:100% 50%;filter:brightness(1.12)}}"
      + ".dq-wow{display:none;text-align:center;color:#c6a77d;font-family:Georgia,ui-serif,serif;font-weight:700;font-size:16px;letter-spacing:1px;padding:2px 8px;}"
      + ".dq-wow.is-on{display:block;animation:dq-wow-in .6s ease both;}"
      + "@keyframes dq-wow-in{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}"
      + ".dq-dl{position:absolute;right:12px;bottom:12px;z-index:6;width:44px;height:44px;padding:0;border-radius:999px;display:none;align-items:center;justify-content:center;cursor:pointer;border:1px solid rgba(255,255,255,.4);background:linear-gradient(135deg,#c6a77d 0%,#e2cfb4 50%,#c6a77d 100%);color:#2c241f;box-shadow:0 6px 18px rgba(0,0,0,.3),inset 0 1px 1px rgba(255,255,255,.5);transition:transform .16s ease,box-shadow .16s ease,filter .16s ease;-webkit-tap-highlight-color:transparent;}"
      + ".dq-dl.is-on{display:inline-flex;}"
      + ".dq-dl:hover{transform:translateY(-1px);filter:brightness(1.07);box-shadow:0 10px 24px rgba(0,0,0,.34);}"
      + ".dq-dl:active{transform:translateY(0);}"
      + ".dq-dl:disabled{opacity:.6;cursor:not-allowed;transform:none;}"
      + ".dq-dl-icon{width:20px;height:20px;display:block;}"
      + ".dq-fs{position:absolute;top:12px;left:12px;z-index:6;width:40px;height:40px;padding:0;border-radius:999px;display:none;align-items:center;justify-content:center;cursor:pointer;border:1px solid rgba(255,255,255,.35);background:rgba(26,22,18,.82);color:#f5ede4;box-shadow:0 6px 18px rgba(0,0,0,.35);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:transform .16s ease,filter .16s ease;-webkit-tap-highlight-color:transparent;}"
      + ".dq-fs.is-on{display:inline-flex;}"
      + ".dq-fs:hover{transform:translateY(-1px);filter:brightness(1.08);}"
      + ".dq-fs:active{transform:translateY(0);}"
      + ".dq-fs-icon{width:18px;height:18px;display:block;}"
      + ".dq-fs-overlay{position:fixed;inset:0;z-index:2147483648;background:rgba(12,10,8,.94);display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) max(16px,env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));}"
      + ".dq-fs-overlay img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;}"
      + ".dq-fs-close{position:absolute;top:max(16px,env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));appearance:none;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.14);background:#0f0f14;color:#fff;border-radius:999px;min-width:44px;min-height:44px;padding:0;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.22);transition:transform .16s ease,box-shadow .16s ease,background-color .16s ease;z-index:1;-webkit-tap-highlight-color:transparent;}"
      + ".dq-fs-close:hover{background:#2a2633;transform:translateY(-1px);}"
      + ".dq-fs-close:active{transform:translateY(0);}"
      + ".dq-fs-close-icon{width:22px;height:22px;display:block;}"
      + ".dq-row{display:flex;gap:10px;flex-wrap:wrap;}"
      + ".dq-choice{flex:1;min-width:160px;display:flex;align-items:center;gap:10px;justify-content:center;padding:12px 12px;border-radius:16px;border:1px solid rgba(198,167,125,.28);background:#1a1612;color:#f5ede4;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.22);font:900 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;transition:transform .16s ease, box-shadow .16s ease, border-color .16s ease;}"
      + ".dq-choice:hover{transform:translateY(-1px);box-shadow:0 12px 28px rgba(0,0,0,.28);border-color:rgba(198,167,125,.45);}"
      + ".dq-ico{width:18px;height:18px;display:inline-block;opacity:.92;}"
      + ".dq-wear-me{appearance:none;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:100%;padding:14px 32px;border-radius:50px;color:#2c241f;font-family:Georgia,ui-serif,serif;font-weight:700;font-size:15px;line-height:1.25;letter-spacing:2px;background:linear-gradient(135deg,#c6a77d 0%,#e2cfb4 50%,#c6a77d 100%);border:1px solid rgba(255,255,255,.3);box-shadow:0 4px 15px rgba(0,0,0,.3),inset 0 1px 1px rgba(255,255,255,.5);transition:all .3s ease;transform:translateY(0);-webkit-font-smoothing:antialiased;}"
      + ".dq-wear-me:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(198,167,125,.4);filter:brightness(1.08);}"
      + ".dq-wear-me:active{transform:translateY(-1px);filter:brightness(1.04);}"
      + ".dq-wear-me:disabled{opacity:.55;cursor:not-allowed;transform:none;filter:none;}"
      + ".dq-primary{appearance:none;border:0;cursor:pointer;border-radius:10px;padding:14px 28px;background:#1a1612;color:#f5ede4;border:1px solid rgba(198,167,125,.28);font:600 16px/1.25 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.5px;box-shadow:0 8px 22px rgba(0,0,0,.22);transition:background-color .3s ease,color .3s ease,transform .16s ease,border-color .16s ease;}"
      + ".dq-primary:hover{background:#c6a77d;color:#2c241f;border-color:rgba(255,255,255,.25);transform:translateY(-1px);}"
      + ".dq-primary:disabled{opacity:.55;cursor:not-allowed;transform:none;background:#1a1612;color:#f5ede4;}"
      + ".dq-brand{flex-shrink:0;padding:12px 12px;padding-bottom:max(12px, env(safe-area-inset-bottom, 0px));border-top:1px solid rgba(198,167,125,.18);display:flex;align-items:flex-start;justify-content:flex-start;background:#2c241f;}"
      + ".dq-brand-promo{color:#c6a77d;font-size:13px;font-weight:600;letter-spacing:.02em;line-height:1.45;text-decoration:none;transition:color .16s ease;max-width:100%;}"
      + ".dq-brand-promo:hover{color:#e2cfb4;text-decoration:underline;}"

      // Camera view + flip button
      + ".dq-camview{position:relative;width:100%;}"
      + ".dq-camflip{position:absolute;top:10px;right:10px;z-index:6;"
      + "height:38px;display:inline-flex;align-items:center;justify-content:center;gap:6px;"
      + "padding:0 10px;"
      + "border-radius:12px;border:1px solid rgba(15,15,20,.14);"
      + "background:rgba(255,255,255,.82);color:#0f0f14;cursor:pointer;"
      + "font:900 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"
      + "backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);"
      + "box-shadow:0 12px 26px rgba(0,0,0,.12);transition:transform .16s ease, opacity .16s ease;}"
      + ".dq-camflip:hover{transform:translateY(-1px);}"
      + ".dq-camflip:active{transform:translateY(0);opacity:.92;}"
      + ".dq-camflip svg{width:18px;height:18px;display:block;opacity:.92;}"

      // Camera overlay (mobile-first)
      + ".dq-cam-ol{position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.72);"
      + "display:flex;align-items:center;justify-content:center;padding:14px;}"
      + ".dq-cam-sheet{position:relative;width:min(720px,100%);height:min(88vh,720px);"
      + "background:#000;border-radius:18px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.45);}"
      + ".dq-cam-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}"
      + ".dq-cam-top{position:absolute;top:10px;left:10px;right:10px;z-index:2;display:flex;justify-content:space-between;gap:10px;}"
      + ".dq-cam-btn{appearance:none;border:0;cursor:pointer;min-height:48px;min-width:48px;"
      + "padding:0 14px;border-radius:14px;background:rgba(255,255,255,.92);color:#0f0f14;"
      + "font:900 13px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"
      + "box-shadow:0 12px 26px rgba(0,0,0,.20);}"
      + ".dq-cam-btn:active{opacity:.92;}"
      + ".dq-cam-bottom{position:absolute;left:0;right:0;bottom:14px;z-index:2;display:flex;justify-content:center;pointer-events:none;}"
      + ".dq-cam-shot{pointer-events:auto;min-height:54px;min-width:220px;padding:14px 28px;border-radius:10px;"
      + "background:#2c241f;color:#f5ede4;"
      + "font:600 16px/1.25 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"
      + "letter-spacing:.5px;transition:background-color .3s ease,color .3s ease;}"
      + ".dq-cam-shot:hover{background:#c6a77d;color:#2c241f;}"

      // Retail try-on limit (USAGE_LIMIT) — customer-facing
      + ".dq-limit-banner{display:none;align-items:flex-start;gap:14px;padding:16px 18px;border-radius:18px;"
      + "border:1px solid rgba(180,83,9,.28);"
      + "background:linear-gradient(135deg,rgba(255,251,235,.98) 0%,rgba(254,243,199,.92) 50%,rgba(253,230,138,.88) 100%);"
      + "box-shadow:0 10px 28px rgba(180,83,9,.1),inset 0 1px 0 rgba(255,255,255,.65);}"
      + ".dq-limit-icon{flex-shrink:0;width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;"
      + "background:linear-gradient(145deg,rgba(251,191,36,.35),rgba(245,158,11,.22));"
      + "border:1px solid rgba(180,83,9,.2);color:#b45309;}"
      + ".dq-limit-icon svg{display:block;width:24px;height:24px;}"
      + ".dq-limit-copy{margin:0;font:800 14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#78350f;"
      + "letter-spacing:.01em;max-width:36rem;}"

      // Mobile tweaks
      + "@media (max-width:520px){.dq-head{padding-right:max(56px,calc(60px + env(safe-area-inset-right, 0px)));}}"
      + "@media (max-width:420px){.dq-body{padding:10px}.dq-stage{height:min(52vh,380px)}.dq-choice{min-width:100%}}";

    var style = document.createElement("style");
    style.id = "fit-room-widget-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function fileFromBlob(blob, name) {
    var type = blob.type || "image/jpeg";
    try {
      return new File([blob], name, { type: type });
    } catch (_e) {
      blob.name = name;
      return blob;
    }
  }

  /** Match demo `/api/tryon` uploads — keeps multipart bodies under platform limits. */
  async function compressImageToMax1000px(file) {
    try {
      var bitmap = await createImageBitmap(file);
      var maxDim = 1000;
      var scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      var targetW = Math.max(1, Math.round(bitmap.width * scale));
      var targetH = Math.max(1, Math.round(bitmap.height * scale));
      var canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      var ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, targetW, targetH);
      if (bitmap.close) bitmap.close();
      var blob = await new Promise(function (resolve, reject) {
        canvas.toBlob(function (b) {
          if (b) resolve(b);
          else reject(new Error("Image compression failed."));
        }, "image/jpeg", 0.86);
      });
      var nameBase = String(file.name || "image").replace(/\.[^/.]+$/, "");
      return fileFromBlob(blob, (nameBase || "image") + "-1000.jpg");
    } catch (_e) {
      return file;
    }
  }

  async function fetchImageAsFile(url, nameHint) {
    var res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error("Could not fetch product image.");
    var blob = await res.blob();
    return fileFromBlob(blob, nameHint || "garment.jpg");
  }

  function makeIcon(kind) {
    var span = document.createElement("span");
    span.className = "dq-ico";
    if (kind === "gallery") {
      span.innerHTML = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z\" stroke=\"currentColor\" stroke-width=\"1.8\"/><path d=\"M9 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z\" stroke=\"currentColor\" stroke-width=\"1.8\"/><path d=\"m5.5 18 5-5 3.2 3.2 2-2L20 18\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>";
    } else if (kind === "camera") {
      span.innerHTML = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M7 7h2l1.2-2h3.6L15 7h2a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3Z\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linejoin=\"round\"/><path d=\"M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z\" stroke=\"currentColor\" stroke-width=\"1.8\"/></svg>";
    } else if (kind === "flip") {
      span.innerHTML = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M4 7h6\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/><path d=\"M7 4l3 3-3 3\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M20 17h-6\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/><path d=\"M17 14l-3 3 3 3\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M10 7c2.5 0 4.5 2 4.5 4.5S12.5 16 10 16\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/></svg>";
    }
    return span;
  }

  function normalizeText(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function inferCategoryFromImage(img) {
    // Hint for /api/try-on (echoed in JSON): tops | bottoms only (shoe images → "bottoms"). Server calls Fashn Try-On Max.
    var DEFAULT_CATEGORY = "tops";

    var shoeKeywords = [
      "shoe", "shoes", "trainer", "trainers", "sneaker", "sneakers",
      "boot", "boots", "footwear", "nike", "adidas", "jordan", "heel", "heels"
    ];
    var bottomsKeywords = [
      "jeans", "denim", "trousers", "chinos", "dungaree", "joggers", "slacks"
    ];

    var parts = [];
    try {
      parts.push(img.currentSrc || img.src || "");
      parts.push(img.getAttribute("alt") || "");
      parts.push(img.getAttribute("title") || "");
    } catch (_e) { }

    // Include nearby parent text (limited to avoid scanning huge pages).
    var p = img && img.parentElement ? img.parentElement : null;
    var hops = 0;
    while (p && hops < 3) {
      var t = "";
      try { t = p.textContent || ""; } catch (_e2) { }
      if (t) parts.push(t);
      p = p.parentElement;
      hops++;
    }

    var haystack = normalizeText(parts.join(" "));
    for (var si = 0; si < shoeKeywords.length; si++) {
      if (haystack.indexOf(shoeKeywords[si]) !== -1) return "bottoms";
    }
    for (var bi = 0; bi < bottomsKeywords.length; bi++) {
      if (haystack.indexOf(bottomsKeywords[bi]) !== -1) return "bottoms";
    }
    return DEFAULT_CATEGORY;
  }

  function shouldSkipAccessoryImage(img) {
    var keywords = [
      "hat", "cap", "beanie", "scarf", "scarves", "glove", "gloves",
      "accessory", "accessories", "socks", "sunglasses"
    ];

    var parts = [];
    try {
      parts.push(img.getAttribute("alt") || "");
      parts.push(img.getAttribute("title") || "");
    } catch (_e) { }

    var p = img && img.parentElement ? img.parentElement : null;
    var hops = 0;
    while (p && hops < 3) {
      var t = "";
      try { t = p.textContent || ""; } catch (_e2) { }
      if (t) parts.push(t);
      p = p.parentElement;
      hops++;
    }

    var haystack = normalizeText(parts.join(" "));
    for (var i = 0; i < keywords.length; i++) {
      if (haystack.indexOf(keywords[i]) !== -1) return true;
    }
    return false;
  }

  function createModal() {
    injectStyles();

    var backdrop = document.createElement("div");
    backdrop.className = "dq-backdrop";
    backdrop.tabIndex = -1;

    var modal = document.createElement("div");
    modal.className = "dq-modal";

    var head = document.createElement("div");
    head.className = "dq-head";

    var headInner = document.createElement("div");
    headInner.style.display = "flex";
    headInner.style.flexDirection = "column";
    headInner.style.gap = "4px";
    headInner.style.paddingRight = "52px";

    var headTitle = document.createElement("div");
    headTitle.className = "dq-head-title";
    headTitle.textContent = "See yourself in it";

    var headSub = document.createElement("div");
    headSub.className = "dq-head-sub";
    headSub.textContent = "One line of code. Works on any store. Try it on your products today.";

    headInner.appendChild(headTitle);
    headInner.appendChild(headSub);
    head.appendChild(headInner);

    var body = document.createElement("div");
    body.className = "dq-body";

    var brand = document.createElement("div");
    brand.className = "dq-brand";
    var brandPromo = document.createElement("a");
    brandPromo.className = "dq-brand-promo";
    brandPromo.textContent = "Wear Me is available for any fashion store — click to learn more: fit-room.com";
    brandPromo.href = "https://fit-room.com";
    brandPromo.target = "_blank";
    brandPromo.rel = "noopener noreferrer";
    brand.appendChild(brandPromo);

    var close = document.createElement("button");
    close.type = "button";
    close.className = "dq-x dq-modal-close";
    close.setAttribute("aria-label", "Close try-on");
    close.title = "Close";
    close.style.position = "absolute";
    close.style.top = "12px";
    close.style.right = "12px";
    close.style.zIndex = "30";
    close.innerHTML = "<svg class=\"dq-x-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"M18 6 6 18\"/><path d=\"m6 6 12 12\"/></svg>";

    head.appendChild(close);

    modal.appendChild(head);
    modal.appendChild(body);
    modal.appendChild(brand);
    backdrop.appendChild(modal);

    function onKeyDown(e) {
      if (e.key === "Escape") teardown();
    }

    function teardown() {
      backdrop.classList.add("dq-closing");
      backdrop.classList.remove("dq-open");
      window.setTimeout(function () {
        if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      }, 220);
      document.removeEventListener("keydown", onKeyDown);
      if (OPEN_MODAL && OPEN_MODAL.close === teardown) OPEN_MODAL = null;
    }

    close.addEventListener("click", teardown);
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) teardown();
    });
    document.addEventListener("keydown", onKeyDown);

    window.setTimeout(function () { backdrop.classList.add("dq-open"); }, 0);
    return { backdrop: backdrop, body: body, close: teardown };
  }

  function buildTryOnUI(opts) {
    var garmentImgEl = opts.garmentImgEl;
    var garmentFilePromise = opts.garmentFilePromise;
    var clientKey = opts.clientKey;
    var inferredCategory = opts.category || "tops";

    var m = createModal();
    document.body.appendChild(m.backdrop);
    OPEN_MODAL = m;

    var body = m.body;

    var tipsBlock = document.createElement("div");
    tipsBlock.className = "dq-tips-block";

    var tipsBox = document.createElement("div");
    tipsBox.className = "dq-tips";

    var tipsList = document.createElement("ul");
    tipsList.className = "dq-tips-list";

    var tipLines = [
      "Stand in good lighting with your full body visible",
      "Keep 1-2 metres from the camera",
      "Plain backgrounds work best"
    ];

    tipLines.forEach(function (line) {
      var li = document.createElement("li");
      var mark = document.createElement("span");
      mark.className = "dq-tips-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = "✦";
      var text = document.createElement("span");
      text.textContent = line;
      li.appendChild(mark);
      li.appendChild(text);
      tipsList.appendChild(li);
    });

    tipsBox.appendChild(tipsList);
    tipsBlock.appendChild(tipsBox);

    var tipsPrivacy = document.createElement("div");
    tipsPrivacy.className = "dq-tips-privacy";
    tipsPrivacy.textContent = "🔒 Your privacy is protected. Photos are processed instantly and permanently deleted.";
    tipsBlock.appendChild(tipsPrivacy);

    body.appendChild(tipsBlock);

    var limitBanner = document.createElement("div");
    limitBanner.className = "dq-limit-banner";
    limitBanner.setAttribute("role", "alert");
    limitBanner.style.display = "none";
    var limitIcon = document.createElement("div");
    limitIcon.className = "dq-limit-icon";
    limitIcon.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 6v6l4 2\"/></svg>";
    var limitCopy = document.createElement("p");
    limitCopy.className = "dq-limit-copy";
    limitCopy.textContent = "Wear Me is temporarily unavailable. Please try again later.";
    limitBanner.appendChild(limitIcon);
    limitBanner.appendChild(limitCopy);
    body.appendChild(limitBanner);

    var modelFile = null;
    var garmentFile = null;
    var stream = null;
    var camFacingMode = "environment";
    var selectedCategory = inferredCategory === "bottoms" ? "bottoms" : "tops";

    var stage = document.createElement("div");
    stage.className = "dq-stage";

    var stageEmpty = document.createElement("div");
    stageEmpty.className = "dq-empty";
    stageEmpty.innerHTML = "<strong>Upload a full-body photo</strong><span>We’ll keep your full body visible (no cropping).</span>";

    var stageImg = document.createElement("img");
    stageImg.alt = "Preview";
    stageImg.style.display = "none";

    var processing = document.createElement("div");
    processing.className = "dq-processing";
    var processingInner = document.createElement("div");
    processingInner.className = "dq-processing-inner";
    var spin = document.createElement("div");
    spin.className = "dq-spin";
    var processingText = document.createElement("div");
    processingText.className = "dq-processing-text";
    processingText.textContent = "AI is styling your outfit...";
    processingInner.appendChild(spin);
    processingInner.appendChild(processingText);
    processing.appendChild(processingInner);

    var progress = document.createElement("div");
    progress.className = "dq-progress";
    var progressFill = document.createElement("span");
    progress.appendChild(progressFill);

    stage.appendChild(stageEmpty);
    stage.appendChild(stageImg);
    stage.appendChild(processing);
    stage.appendChild(progress);

    var row = document.createElement("div");
    row.className = "dq-row";

    var uploadBtn = document.createElement("button");
    uploadBtn.className = "dq-choice";
    uploadBtn.type = "button";
    uploadBtn.appendChild(makeIcon("gallery"));
    uploadBtn.appendChild(document.createTextNode("Gallery"));

    var cameraBtn = document.createElement("button");
    cameraBtn.className = "dq-choice";
    cameraBtn.type = "button";
    cameraBtn.appendChild(makeIcon("camera"));
    cameraBtn.appendChild(document.createTextNode("Camera"));

    row.appendChild(uploadBtn);
    row.appendChild(cameraBtn);

    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";

    var generateBtn = document.createElement("button");
    generateBtn.className = "dq-wear-me";
    generateBtn.type = "button";
    generateBtn.textContent = "Wear Me";

    var wow = document.createElement("div");
    wow.className = "dq-wow";
    wow.textContent = "Wow, you look amazing! ✨";

    var saveBtn = document.createElement("button");
    saveBtn.className = "dq-dl";
    saveBtn.type = "button";
    saveBtn.setAttribute("aria-label", "Download image");
    saveBtn.title = "Download image";
    saveBtn.innerHTML = '<svg class="dq-dl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';

    var fsBtn = document.createElement("button");
    fsBtn.className = "dq-fs";
    fsBtn.type = "button";
    fsBtn.setAttribute("aria-label", "View fullscreen");
    fsBtn.title = "Fullscreen";
    fsBtn.innerHTML = '<svg class="dq-fs-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';

    var fsOverlay = null;

    body.appendChild(stage);
    body.appendChild(wow);
    body.appendChild(row);
    body.appendChild(fileInput);
    body.appendChild(generateBtn);
    body.appendChild(generateBtn);
    stage.appendChild(saveBtn);
    stage.appendChild(fsBtn);

    function closeFullscreen() {
      if (fsOverlay && fsOverlay.parentNode) fsOverlay.parentNode.removeChild(fsOverlay);
      fsOverlay = null;
      document.removeEventListener("keydown", onFullscreenKeyDown);
    }

    function onFullscreenKeyDown(e) {
      if (e.key === "Escape") closeFullscreen();
    }

    function openFullscreen(src) {
      if (!src) return;
      closeFullscreen();
      fsOverlay = document.createElement("div");
      fsOverlay.className = "dq-fs-overlay";
      fsOverlay.setAttribute("role", "dialog");
      fsOverlay.setAttribute("aria-modal", "true");
      fsOverlay.setAttribute("aria-label", "Try-on result fullscreen");

      var fsClose = document.createElement("button");
      fsClose.type = "button";
      fsClose.className = "dq-fs-close";
      fsClose.setAttribute("aria-label", "Close fullscreen");
      fsClose.title = "Close";
      fsClose.innerHTML = '<svg class="dq-fs-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
      fsClose.addEventListener("click", closeFullscreen);

      var fsImg = document.createElement("img");
      fsImg.src = src;
      fsImg.alt = "Try-on result";

      fsOverlay.appendChild(fsClose);
      fsOverlay.appendChild(fsImg);
      fsOverlay.addEventListener("click", function (e) {
        if (e.target === fsOverlay) closeFullscreen();
      });

      document.body.appendChild(fsOverlay);
      document.addEventListener("keydown", onFullscreenKeyDown);
    }

    fsBtn.addEventListener("click", function () {
      var src = stageImg && stageImg.src ? stageImg.src : "";
      openFullscreen(src);
    });

    function hideDownload() {
      saveBtn.classList.remove("is-on");
      fsBtn.classList.remove("is-on");
    }

    function showDownload() {
      saveBtn.classList.add("is-on");
      fsBtn.classList.add("is-on");
    }

    function setStageImage(url, alt) {
      if (!url) return;
      stageImg.alt = alt || "Preview";
      stageImg.src = url;
      stageImg.style.display = "block";
      stageEmpty.style.display = "none";
      wow.classList.remove("is-on");
      hideDownload();
    }

    function stopStream() {
      if (stream) {
        try {
          stream.getTracks().forEach(function (t) { t.stop(); });
        } catch (_e) { }
      }
      stream = null;
    }

    function dataUrlToBlob(dataUrl) {
      var parts = String(dataUrl || "").split(",");
      if (parts.length < 2) return null;
      var meta = parts[0] || "";
      var b64 = parts[1] || "";
      var m = /data:([^;]+);base64/.exec(meta);
      var mime = m && m[1] ? m[1] : "image/jpeg";
      try {
        var bin = atob(b64);
        var len = bin.length;
        var arr = new Uint8Array(len);
        for (var i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
        return new Blob([arr], { type: mime });
      } catch (_e) {
        return null;
      }
    }

    function openCameraOverlay() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

      var ol = document.createElement("div");
      ol.className = "dq-cam-ol";

      var sheet = document.createElement("div");
      sheet.className = "dq-cam-sheet";

      var v = document.createElement("video");
      v.className = "dq-cam-video";
      v.autoplay = true;
      v.playsInline = true;
      v.muted = true;

      var top = document.createElement("div");
      top.className = "dq-cam-top";

      var cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "dq-cam-btn";
      cancelBtn.textContent = "✕ Cancel";

      var switchBtn = document.createElement("button");
      switchBtn.type = "button";
      switchBtn.className = "dq-cam-btn";
      switchBtn.textContent = "🔄 Switch Camera";

      top.appendChild(cancelBtn);
      top.appendChild(switchBtn);

      var bottom = document.createElement("div");
      bottom.className = "dq-cam-bottom";

      var shotBtn = document.createElement("button");
      shotBtn.type = "button";
      shotBtn.className = "dq-cam-shot";
      shotBtn.textContent = "📸 Take Photo";

      bottom.appendChild(shotBtn);

      sheet.appendChild(v);
      sheet.appendChild(top);
      sheet.appendChild(bottom);
      ol.appendChild(sheet);
      document.body.appendChild(ol);

      function closeOverlay() {
        stopStream();
        try {
          if (ol && ol.parentNode) ol.parentNode.removeChild(ol);
        } catch (_e) { }
      }

      async function startCam() {
        stopStream();
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: camFacingMode },
            audio: false
          });
        } catch (_e1) {
          // Fallback for browsers that don't honor facingMode.
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        v.srcObject = stream;
      }

      cancelBtn.addEventListener("click", closeOverlay);
      ol.addEventListener("click", function (e) {
        if (e.target === ol) closeOverlay();
      });

      switchBtn.addEventListener("click", async function (e) {
        e.preventDefault();
        e.stopPropagation();
        camFacingMode = camFacingMode === "environment" ? "user" : "environment";
        try { await startCam(); } catch (_e) { }
      });

      shotBtn.addEventListener("click", function () {
        if (!v.videoWidth) return;
        var canvas = document.createElement("canvas");
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(v, 0, 0);
        var dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        var blob = dataUrlToBlob(dataUrl);
        if (blob) modelFile = fileFromBlob(blob, "user.jpg");
        hideDownload();
        setStageImage(dataUrl, "Your photo");
        closeOverlay();
      });

      // Start with back camera.
      camFacingMode = "environment";
      startCam();
    }

    // stop stream on close
    var originalClose = m.close;
    m.close = function () {
      stopStream();
      closeFullscreen();
      originalClose();
    };

    uploadBtn.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      modelFile = f;
      hideDownload();
      setStageImage(URL.createObjectURL(f), "Your photo");
    });

    cameraBtn.addEventListener("click", async function () {
      try {
        openCameraOverlay();
      } catch (_e) {
        // Minimal UI: ignore (user can use gallery).
      }
    });

    (async function initGarment() {
      try {
        // Garment file from the clicked product image; category is sent separately (tops | auto | …).
        garmentFile = await garmentFilePromise;
      } catch (_e) {
        garmentFile = null;
      }
    })();

    var progressTimer = null;
    var currentPct = 0;
    var tryOnFetchInFlight = false;

    function setProgress(pct) {
      currentPct = Math.max(0, Math.min(100, Math.round(pct)));
      progressFill.style.width = currentPct + "%";
    }

    function startLoading() {
      processing.classList.add("is-on");
      progress.classList.add("is-on");
      wow.classList.remove("is-on");
      setProgress(0);
      if (progressTimer) window.clearInterval(progressTimer);
      progressTimer = window.setInterval(function () {
        if (currentPct < 92) {
          var bump = currentPct < 55 ? 6 : (currentPct < 78 ? 3 : 1);
          setProgress(currentPct + bump);
        }
      }, 260);
    }

    function stopLoading(ok) {
      if (progressTimer) window.clearInterval(progressTimer);
      progressTimer = null;
      if (ok) setProgress(100);
      window.setTimeout(function () {
        processing.classList.remove("is-on");
        progress.classList.remove("is-on");
      }, ok ? 450 : 0);
    }

    function downloadDataUrl(dataUrl) {
      var a = document.createElement("a");
      a.href = dataUrl;
      a.download = "fit-room-tryon.png";
      document.body.appendChild(a);
      a.click();
      a.parentNode.removeChild(a);
    }

    saveBtn.addEventListener("click", function () {
      var src = stageImg && stageImg.src ? stageImg.src : "";
      if (!src) return;
      downloadDataUrl(src);
    });

    generateBtn.addEventListener("click", async function () {
      if (tryOnFetchInFlight) return;
      if (!clientKey) return;
      if (!modelFile) return;
      if (!garmentFile) return;
      tryOnFetchInFlight = true;

      hideDownload();
      generateBtn.disabled = true;
      startLoading();

      try {
        var modelC = await compressImageToMax1000px(modelFile);
        var garmentC = await compressImageToMax1000px(garmentFile);
        var fd = new FormData();
        fd.append("model", modelC);
        fd.append("garment", garmentC);
        fd.append("category", selectedCategory);
        fd.append("generationMode", "balanced");

        var tryOnTrace =
          globalThis.crypto && globalThis.crypto.randomUUID
            ? globalThis.crypto.randomUUID()
            : "tryon-" + Date.now() + "-" + Math.random();
        console.log(
          "[fit-room] widget: about to fetch POST " + API_ENDPOINT + " (one per try-on; if 2+ per click, duplicate widget handlers)",
          { tryOnTrace: tryOnTrace }
        );
        var res = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "x-api-key": clientKey, "x-tryon-trace": tryOnTrace },
          body: fd
        });

        var data = null;
        try { data = await res.json(); } catch (_e) { }
        if (!res.ok) {
          stopLoading(false);
          var usageLimited = res.status === 403 && data && data.code === "USAGE_LIMIT";
          if (usageLimited) {
            limitCopy.textContent = "Wear Me is temporarily unavailable. Please try again later.";
            limitBanner.style.display = "flex";
            try {
              limitBanner.scrollIntoView({ block: "nearest", behavior: "smooth" });
            } catch (_scroll) { }
          }
          return;
        }

        var out = data && data.output && data.output[0] ? data.output[0] : null;
        if (!out) {
          stopLoading(false);
          return;
        }

        setStageImage(out, "Try-on result");
        stopLoading(true);
        wow.classList.add("is-on");
        showDownload();
      } catch (_e) {
        stopLoading(false);
      } finally {
        tryOnFetchInFlight = false;
        generateBtn.disabled = false;
      }
    });

    return m;
  }

  function bindImage(img) {
    if (img.getAttribute(WIDGET_ATTR_BOUND) === "1") return;
    if (img.getAttribute(WIDGET_ATTR_SKIP) === "1") return;
    if (shouldSkipAccessoryImage(img)) {
      img.setAttribute(WIDGET_ATTR_SKIP, "1");
      return;
    }
    var par = img.parentElement;
    if (!par) return;

    img.setAttribute(WIDGET_ATTR_BOUND, "1");

    var wrapper = document.createElement("span");
    wrapper.className = "dq-wrap";
    par.insertBefore(wrapper, img);
    wrapper.appendChild(img);
    ensureRelative(wrapper);

    var overlay = document.createElement("div");
    overlay.className = "dq-overlay";

    var btn = document.createElement("button");
    btn.className = "dq-wear-btn";
    btn.type = "button";
    btn.textContent = "Wear Me ✨";
    btn.setAttribute("aria-label", "Wear Me");

    overlay.appendChild(btn);
    wrapper.appendChild(overlay);

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (OPEN_MODAL && typeof OPEN_MODAL.close === "function") {
        try { OPEN_MODAL.close(); } catch (_e0) { }
      }

      var key = getClientKey();
      var src = img.currentSrc || img.src;
      var garmentFilePromise = fetchImageAsFile(src, "garment.jpg");
      var category = inferCategoryFromImage(img);

      buildTryOnUI({
        garmentImgEl: img,
        garmentFilePromise: garmentFilePromise,
        clientKey: key,
        category: category
      });
    });
  }

  function scanAndBind() {
    if (!shouldBindOnThisPage()) return;
    injectStyles();
    var imgs = Array.prototype.slice.call(document.images || []);
    imgs.forEach(function (img) {
      if (img.getAttribute(WIDGET_ATTR_SKIP) === "1") return;
      if (isEligibleImage(img)) {
        bindImage(img);
        return;
      }

      if (img.getAttribute(WIDGET_ATTR_BOUND) === "1") return;
      if (img.getAttribute(WIDGET_ATTR_PENDING) === "1") return;

      var src = img.currentSrc || img.src || "";
      if (!src || src.indexOf("data:") === 0) return;
      if (img.complete) return;

      img.setAttribute(WIDGET_ATTR_PENDING, "1");
      function clearPending() { img.removeAttribute(WIDGET_ATTR_PENDING); }

      img.addEventListener("load", function () {
        clearPending();
        scanAndBind();
      }, { once: true });

      img.addEventListener("error", function () {
        clearPending();
      }, { once: true });
    });
  }

  function observe() {
    var mo = new MutationObserver(function () { scanAndBind(); });
    mo.observe(document.documentElement, { subtree: true, childList: true, attributes: false });
  }

  function beaconClientVisit(key) {
    if (!key) return;
    try {
      fetch(getWidgetApiOrigin() + "/api/client-visit", {
        method: "POST",
        headers: { "x-api-key": key },
        credentials: "omit",
      }).catch(function () {});
    } catch (_e) {}
  }

  function boot() {
    beaconClientVisit(getClientKey());
    scanAndBind();
    observe();
    window.addEventListener("load", function () { scanAndBind(); });
    window.addEventListener("hashchange", function () { scanAndBind(); });
    window.addEventListener("fit-room-rescan", function () { scanAndBind(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

