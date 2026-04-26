(function () {
  "use strict";

  // Keep a stable reference for key lookup (document.currentScript becomes null later).
  var WIDGET_SCRIPT_EL = document.currentScript || null;

  var WIDGET_ATTR_KEY = "data-disquant-key";
  var WIDGET_ATTR_BOUND = "data-disquant-tryon-bound";
  var WIDGET_ATTR_PENDING = "data-disquant-tryon-pending-load";
  var WIDGET_ATTR_SKIP = "data-disquant-tryon-skip";

  // Matches app route /api/try-on in this repo.
  var API_ENDPOINT = "/api/try-on";
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
    if (qs("#disqant-widget-style")) return;

    var css = ""
      // Overlay wrapping
      + ".dq-wrap{display:inline-block;position:relative;vertical-align:top;line-height:0;max-width:100%;}"
      + ".dq-wrap>img{display:block;max-width:100%;height:auto;vertical-align:top;}"
      + ".dq-overlay{position:absolute;inset:auto 12px 12px auto;z-index:2147483646;display:flex;align-items:center;pointer-events:auto;}"

      // Wear button
      + ".dq-wear-btn{position:relative;appearance:none;border:0;cursor:pointer;"
      + "padding:10px 14px;border-radius:999px;"
      + "color:#fff;font:900 13px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"
      + "letter-spacing:.2px;"
      + "background:linear-gradient(135deg,#7c3aed 0%,#ec4899 100%);"
      + "box-shadow:0 16px 34px rgba(124,58,237,.22),0 12px 30px rgba(236,72,153,.16);"
      + "transform:translateY(0) scale(1);"
      + "transition:transform .18s ease, filter .18s ease, box-shadow .18s ease;"
      + "}"
      + ".dq-wear-btn:hover{transform:translateY(-2px) scale(1.03);filter:saturate(1.08);"
      + "box-shadow:0 22px 44px rgba(124,58,237,.24),0 18px 36px rgba(236,72,153,.2);}"
      + ".dq-wear-btn:active{transform:translateY(-1px) scale(.99);}"
      + ".dq-wear-btn::after{content:\"\";position:absolute;inset:-2px;border-radius:999px;opacity:0;"
      + "box-shadow:0 0 0 0 rgba(236,72,153,.38);transition:opacity .18s ease;}"
      + ".dq-wear-btn:hover::after{opacity:1;animation:dq-pulse 1.35s ease-out infinite;}"
      + "@keyframes dq-pulse{0%{box-shadow:0 0 0 0 rgba(236,72,153,.32)}100%{box-shadow:0 0 0 16px rgba(236,72,153,0)}}"

      // Backdrop + modal
      + ".dq-backdrop{position:fixed;inset:0;z-index:2147483000;"
      + "background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:14px;"
      + "opacity:0;transition:opacity .18s ease;}"
      + ".dq-backdrop.dq-open{opacity:1;}"
      + ".dq-modal{width:min(720px,100%);max-height:90vh;background:#fff;"
      + "border:1px solid rgba(15,15,20,.08);border-radius:20px;overflow:hidden;"
      + "box-shadow:0 30px 80px rgba(0,0,0,.30);"
      + "display:flex;flex-direction:column;"
      + "transform:translateY(10px) scale(.985);opacity:0;"
      + "transition:transform .18s ease, opacity .18s ease;}"
      + ".dq-backdrop.dq-open .dq-modal{transform:translateY(0) scale(1);opacity:1;}"
      + ".dq-backdrop.dq-closing{opacity:0;}"
      + ".dq-backdrop.dq-closing .dq-modal{transform:translateY(10px) scale(.985);opacity:0;}"

      // Header
      + ".dq-head{display:flex;align-items:center;justify-content:space-between;"
      + "padding:12px 12px;border-bottom:1px solid rgba(15,15,20,.08);background:#fff;}"
      + ".dq-head-title{font:900 13px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"
      + "letter-spacing:.25px;color:#0f0f14;}"
      + ".dq-x{appearance:none;border:1px solid rgba(15,15,20,.12);background:#fff;color:#0f0f14;"
      + "border-radius:12px;padding:8px 10px;cursor:pointer;box-shadow:0 10px 22px rgba(0,0,0,.08);"
      + "transition:transform .16s ease, box-shadow .16s ease;}"
      + ".dq-x:hover{transform:translateY(-1px);box-shadow:0 14px 28px rgba(0,0,0,.10);}"

      // Body
      + ".dq-body{padding:12px;display:flex;flex-direction:column;gap:12px;overflow:auto;-webkit-overflow-scrolling:touch;}"
      + ".dq-stage{position:relative;width:100%;height:min(72vh,560px);"
      + "border-radius:18px;border:1px solid rgba(15,15,20,.10);"
      + "background:linear-gradient(180deg,#ffffff,#fbfbfd);"
      + "box-shadow:0 18px 50px rgba(0,0,0,.08);overflow:hidden;}"
      + ".dq-stage img{width:100%;height:100%;display:block;background:#fff;"
      + "object-fit:contain;object-position:center center;}"
      + ".dq-empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;"
      + "color:rgba(15,15,20,.55);text-align:center;padding:18px;}"
      + ".dq-empty strong{color:#0f0f14;font:900 14px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}"
      + ".dq-empty span{font:600 12px/1.3 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}"

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
      + ".dq-cam-shot{pointer-events:auto;min-height:54px;min-width:220px;padding:0 18px;border-radius:999px;"
      + "background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;"
      + "font:900 14px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"
      + "box-shadow:0 18px 40px rgba(124,58,237,.22),0 14px 34px rgba(236,72,153,.18);}"

      // Processing overlay + spinner + progress
      + ".dq-processing{position:absolute;inset:0;display:none;align-items:center;justify-content:center;"
      + "flex-direction:column;gap:10px;z-index:4;background:rgba(255,255,255,.62);backdrop-filter:blur(8px);}"
      + ".dq-processing.is-on{display:flex;}"
      + ".dq-spin{width:34px;height:34px;border-radius:999px;border:3px solid rgba(15,15,20,.14);"
      + "border-top-color:#7c3aed;animation:dqspin 1s linear infinite;}"
      + "@keyframes dqspin{to{transform:rotate(360deg);}}"
      + ".dq-processing-text{font:900 13px/1.25 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f0f14;"
      + "text-align:center;max-width:420px;padding:0 14px;}"
      + ".dq-progress{position:absolute;left:12px;right:12px;bottom:12px;z-index:5;height:10px;"
      + "border-radius:999px;background:rgba(15,15,20,.10);overflow:hidden;display:none;}"
      + ".dq-progress.is-on{display:block;}"
      + ".dq-progress>span{display:block;height:100%;width:0%;background:linear-gradient(135deg,#7c3aed,#ec4899);"
      + "transition:width .12s ease;}"

      // Controls
      + ".dq-row{display:flex;gap:10px;flex-wrap:wrap;}"
      + ".dq-choice{flex:1;min-width:160px;display:flex;align-items:center;gap:10px;justify-content:center;"
      + "padding:12px 12px;border-radius:16px;border:1px solid rgba(15,15,20,.10);background:#fff;color:#0f0f14;"
      + "cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.06);"
      + "font:900 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"
      + "transition:transform .16s ease, box-shadow .16s ease;}"
      + ".dq-choice:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(0,0,0,.09);}"
      + ".dq-ico{width:18px;height:18px;display:inline-block;opacity:.92;}"
      + ".dq-primary{appearance:none;border:0;cursor:pointer;border-radius:16px;padding:12px 12px;"
      + "background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;"
      + "font:900 13px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"
      + "box-shadow:0 16px 34px rgba(124,58,237,.18),0 12px 30px rgba(236,72,153,.14);"
      + "transition:transform .16s ease, filter .16s ease, box-shadow .16s ease;}"
      + ".dq-primary:hover{transform:translateY(-1px) scale(1.01);filter:saturate(1.05);}"
      + ".dq-primary:disabled{opacity:.55;cursor:not-allowed;transform:none;filter:none;}"

      // Save button
      + ".dq-save{appearance:none;border:1px solid rgba(15,15,20,.12);background:#fff;color:#0f0f14;"
      + "cursor:pointer;border-radius:16px;padding:12px 12px;font:900 13px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"
      + "box-shadow:0 10px 26px rgba(0,0,0,.06);transition:transform .16s ease, box-shadow .16s ease;}"
      + ".dq-save:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(0,0,0,.09);}"

      // Branding
      + ".dq-brand{padding:12px 12px;border-top:1px solid rgba(15,15,20,.08);"
      + "display:flex;align-items:center;justify-content:flex-start;background:#fff;}"
      + ".dq-brand span{font:900 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f0f14;letter-spacing:.25px;}"
      + ".dq-brand small{margin-left:8px;font:700 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:rgba(15,15,20,.55);}"

      // Mobile tweaks
      + "@media (max-width:420px){.dq-body{padding:10px}.dq-stage{height:min(74vh,520px)}.dq-choice{min-width:100%}}";

    var style = document.createElement("style");
    style.id = "disqant-widget-style";
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

    var headTitle = document.createElement("div");
    headTitle.className = "dq-head-title";
    headTitle.textContent = "Try On";

    var close = document.createElement("button");
    close.className = "dq-x";
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.textContent = "✕";

    head.appendChild(headTitle);
    head.appendChild(close);

    var body = document.createElement("div");
    body.className = "dq-body";

    var brand = document.createElement("div");
    brand.className = "dq-brand";
    var brandName = document.createElement("span");
    brandName.textContent = "Disqant";
    var brandSub = document.createElement("small");
    brandSub.textContent = "virtual try-on";
    brand.appendChild(brandName);
    brand.appendChild(brandSub);

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
    var spin = document.createElement("div");
    spin.className = "dq-spin";
    var processingText = document.createElement("div");
    processingText.className = "dq-processing-text";
    processingText.textContent = "This may take 20-30 seconds, please wait ✨";
    processing.appendChild(spin);
    processing.appendChild(processingText);

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
    cameraBtn.appendChild(document.createTextNode("Use Camera"));

    row.appendChild(uploadBtn);
    row.appendChild(cameraBtn);

    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";

    var generateBtn = document.createElement("button");
    generateBtn.className = "dq-primary";
    generateBtn.type = "button";
    generateBtn.textContent = "Generate";

    var saveBtn = document.createElement("button");
    saveBtn.className = "dq-save";
    saveBtn.type = "button";
    saveBtn.textContent = "⬇️ Save Photo";
    saveBtn.style.display = "none";

    body.appendChild(stage);
    body.appendChild(row);
    body.appendChild(fileInput);
    body.appendChild(generateBtn);
    body.appendChild(saveBtn);

    function setStageImage(url, alt) {
      if (!url) return;
      stageImg.alt = alt || "Preview";
      stageImg.src = url;
      stageImg.style.display = "block";
      stageEmpty.style.display = "none";
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
        saveBtn.style.display = "none";
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
      originalClose();
    };

    uploadBtn.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      modelFile = f;
      saveBtn.style.display = "none";
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
      a.download = "disqant-tryon.png";
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

      saveBtn.style.display = "none";
      generateBtn.disabled = true;
      startLoading();

      try {
        var fd = new FormData();
        fd.append("model", modelFile);
        fd.append("garment", garmentFile);
        fd.append("category", selectedCategory);
        fd.append("generationMode", "balanced");

        var tryOnTrace =
          globalThis.crypto && globalThis.crypto.randomUUID
            ? globalThis.crypto.randomUUID()
            : "tryon-" + Date.now() + "-" + Math.random();
        console.log(
          "[disquant] widget: about to fetch POST " + API_ENDPOINT + " (one per try-on; if 2+ per click, duplicate widget handlers)",
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
          return;
        }

        var out = data && data.output && data.output[0] ? data.output[0] : null;
        if (!out) {
          stopLoading(false);
          return;
        }

        setStageImage(out, "Try-on result");
        stopLoading(true);
        saveBtn.style.display = "block";
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

  function boot() {
    scanAndBind();
    observe();
    window.addEventListener("load", function () { scanAndBind(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

