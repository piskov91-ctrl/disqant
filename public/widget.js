(function () {
  "use strict";

  /** Set once while this file executes; later `document.currentScript` is null. */
  var WIDGET_SCRIPT_EL = document.currentScript || null;

  var WIDGET_ATTR_KEY = "data-disquant-key";
  var WIDGET_ATTR_BOUND = "data-disquant-tryon-bound";
  var WIDGET_ATTR_PENDING = "data-disquant-tryon-pending-load";
  var API_ENDPOINT = "/api/try-on";

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function getCurrentScript() {
    if (WIDGET_SCRIPT_EL) return WIDGET_SCRIPT_EL;
    return document.currentScript || (function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1] || null;
    })();
  }

  function getClientKey() {
    var s = getCurrentScript();
    if (!s) return null;

    // Support either:
    // - <script src="/widget.js?key=QB1_xxx"></script>
    // - <script src="/widget.js" data-disquant-key="QB1_xxx"></script>
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

  /** Enough layout to place a control (must not bind at 0×0 before decode). */
  function isVisibleEnough(img) {
    if (!img) return false;
    var rect = img.getBoundingClientRect();
    return rect.width >= 24 && rect.height >= 24 && rect.bottom > 0 && rect.right > 0;
  }

  function isLikelyProductImage(img) {
    if (!img || img.tagName !== "IMG") return false;
    if (img.getAttribute(WIDGET_ATTR_BOUND) === "1") return false;

    var src = img.currentSrc || img.src || "";
    if (!src) return false;
    if (src.indexOf("data:") === 0) return false;
    if (src.indexOf(".svg") !== -1) return false;

    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      if (img.naturalWidth < 24 || img.naturalHeight < 24) return false;
    }

    if (!isVisibleEnough(img)) return false;
    return true;
  }

  function ensureRelative(el) {
    var style = window.getComputedStyle(el);
    if (style.position === "static") {
      el.style.position = "relative";
    }
  }

  function injectStyles() {
    if (qs("#disquant-widget-style")) return;
    var css = ""
      + ".dq-wrap{display:inline-block;position:relative;vertical-align:top;line-height:0;max-width:100%;}"
      + ".dq-wrap>img{display:block;max-width:100%;height:auto;vertical-align:top;}"
      + ".dq-btn{appearance:none;border:1px solid rgba(255,255,255,.22);background:rgba(12,12,15,.92);color:#fff;font:600 13px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:10px 14px;border-radius:999px;cursor:pointer;backdrop-filter:blur(10px);box-shadow:0 6px 22px rgba(0,0,0,.35);transition:transform .16s ease, box-shadow .16s ease, filter .16s ease, border-color .16s ease;}"
      + ".dq-btn:hover{border-color:rgba(255,255,255,.35);transform:translateY(-1px);filter:saturate(1.1);}"
      + ".dq-btn:active{transform:translateY(0px) scale(.98);}"
      + ".dq-overlay{position:absolute;inset:auto 10px 10px auto;z-index:2147483646;display:flex;gap:8px;align-items:center;pointer-events:auto;}"
      + ".dq-wear-btn{border:none;background:linear-gradient(135deg,#7c5cff,#ff5ca8);color:#fff;padding:10px 14px;font-weight:800;letter-spacing:.2px;box-shadow:0 14px 30px rgba(124,92,255,.26),0 10px 26px rgba(255,92,168,.18);}"
      + ".dq-wear-btn:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 18px 36px rgba(124,92,255,.30),0 14px 30px rgba(255,92,168,.22);}"
      + ".dq-wear-btn::after{content:\"\";position:absolute;inset:-2px;border-radius:999px;opacity:.0;box-shadow:0 0 0 0 rgba(255,92,168,.38);transition:opacity .2s ease;}"
      + ".dq-wear-btn:hover::after{opacity:1;animation:dqpulse 1.4s ease-out infinite;}"
      + "@keyframes dqpulse{0%{box-shadow:0 0 0 0 rgba(255,92,168,.32)}100%{box-shadow:0 0 0 14px rgba(255,92,168,0)}}"

      + ".dq-backdrop{position:fixed;inset:0;z-index:2147483000;background:rgba(10,10,14,.55);display:flex;align-items:center;justify-content:center;padding:18px;opacity:0;transition:opacity .18s ease;}"
      + ".dq-backdrop.dq-open{opacity:1;}"
      + ".dq-modal{width:100%;max-width:920px;max-height:90vh;background:#fff;border:1px solid rgba(15,15,20,.08);border-radius:22px;box-shadow:0 30px 80px rgba(0,0,0,.32);overflow:hidden;display:flex;flex-direction:column;transform:translateY(10px) scale(.985);opacity:0;transition:transform .18s ease, opacity .18s ease;}"
      + ".dq-backdrop.dq-open .dq-modal{transform:translateY(0) scale(1);opacity:1;}"
      + ".dq-backdrop.dq-closing{opacity:0;}"
      + ".dq-backdrop.dq-closing .dq-modal{transform:translateY(10px) scale(.985);opacity:0;}"

      + ".dq-head{display:flex;justify-content:flex-end;align-items:center;padding:12px 12px;border-bottom:1px solid rgba(15,15,20,.08);background:#fff;gap:10px;}"
      + ".dq-head-right{display:flex;align-items:center;gap:10px;}"
      + ".dq-mode{display:inline-flex;gap:6px;padding:4px;border-radius:999px;background:rgba(15,15,20,.06);border:1px solid rgba(15,15,20,.08);}"
      + ".dq-mode button{appearance:none;border:0;background:transparent;color:rgba(15,15,20,.72);padding:8px 10px;border-radius:999px;font:800 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;cursor:pointer;transition:background .14s ease,color .14s ease;}"
      + ".dq-mode button[aria-pressed=\"true\"]{background:#fff;color:#0f0f14;box-shadow:0 6px 18px rgba(0,0,0,.10);}"
      + ".dq-close{appearance:none;border:1px solid rgba(15,15,20,.12);background:#fff;color:#0f0f14;border-radius:12px;padding:8px 10px;cursor:pointer;box-shadow:0 8px 20px rgba(0,0,0,.08);}"
      + ".dq-close:hover{transform:translateY(-1px);}"

      + ".dq-body{display:flex;flex-direction:column;gap:12px;padding:12px;overflow:auto;-webkit-overflow-scrolling:touch;}"
      + ".dq-row{display:flex;gap:10px;flex-wrap:wrap;}"

      + ".dq-choice{flex:1;min-width:160px;display:flex;align-items:center;gap:10px;justify-content:flex-start;padding:12px 12px;border-radius:16px;border:1px solid rgba(15,15,20,.10);background:#fff;color:#0f0f14;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.06);transition:transform .16s ease, box-shadow .16s ease;}"
      + ".dq-choice:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(0,0,0,.09);}"
      + ".dq-ico{width:18px;height:18px;display:inline-block;color:#0f0f14;opacity:.9;}"
      + ".dq-primary{border:none;background:linear-gradient(135deg,#7c5cff,#ff5ca8);color:#fff;font-weight:900;box-shadow:0 14px 30px rgba(124,92,255,.22),0 10px 26px rgba(255,92,168,.16);}"
      + ".dq-primary:hover{transform:translateY(-1px) scale(1.01);}"

      + ".dq-stage{position:relative;width:100%;height:min(70vh,560px);border-radius:18px;border:1px solid rgba(15,15,20,.10);background:linear-gradient(180deg,#ffffff,#fbfbfd);box-shadow:0 18px 50px rgba(0,0,0,.08);overflow:hidden;}"
      + ".dq-stage img{width:100%;height:100%;object-fit:contain;display:block;background:#fff;}"
      + ".dq-stage-empty{height:100%;display:flex;flex-direction:column;gap:8px;align-items:center;justify-content:center;color:rgba(15,15,20,.55);font:800 12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}"
      + ".dq-stage-hint{font:600 12px/1.3 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:rgba(15,15,20,.55);}"
      + ".dq-branding{position:absolute;left:12px;bottom:12px;z-index:3;font:900 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f0f14;letter-spacing:.25px;padding:8px 10px;border-radius:999px;background:rgba(255,255,255,.88);border:1px solid rgba(15,15,20,.10);backdrop-filter:blur(10px);}"
      + ".dq-processing{position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:10px;z-index:4;background:rgba(255,255,255,.58);backdrop-filter:blur(8px);}"
      + ".dq-processing.is-on{display:flex;}"
      + ".dq-processing-text{font:900 13px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f0f14;}"
      + ".dq-processing-pct{font:800 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:rgba(15,15,20,.65);}"
      + ".dq-progress{position:absolute;left:10px;right:10px;bottom:10px;z-index:5;height:10px;border-radius:999px;background:rgba(15,15,20,.10);overflow:hidden;display:none;}"
      + ".dq-progress.is-on{display:block;}"
      + ".dq-progress>span{display:block;height:100%;width:0%;background:linear-gradient(135deg,#7c5cff,#ff5ca8);transition:width .12s ease;}"

      + ".dq-dots{display:inline-flex;gap:4px;align-items:center;}"
      + ".dq-dots span{width:6px;height:6px;border-radius:999px;background:linear-gradient(135deg,#7c5cff,#ff5ca8);opacity:.35;animation:dqdots 1.0s infinite ease-in-out;}"
      + ".dq-dots span:nth-child(2){animation-delay:.12s}"
      + ".dq-dots span:nth-child(3){animation-delay:.24s}"
      + "@keyframes dqdots{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-4px);opacity:1}}"

      + "@media (max-width:420px){.dq-choice{min-width:100%}.dq-body{padding:10px}.dq-stage{height:min(72vh,520px)}}";

    var style = document.createElement("style");
    style.id = "disquant-widget-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function fileFromBlob(blob, name) {
    var type = blob.type || "image/jpeg";
    try {
      return new File([blob], name, { type: type });
    } catch (_e) {
      // Older Safari: File may not exist; fall back to Blob with name property.
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

  function createModal() {
    injectStyles();
    var backdrop = document.createElement("div");
    backdrop.className = "dq-backdrop";
    backdrop.tabIndex = -1;

    var modal = document.createElement("div");
    modal.className = "dq-modal";

    var head = document.createElement("div");
    head.className = "dq-head";
    var headRight = document.createElement("div");
    headRight.className = "dq-head-right";

    var modeWrap = document.createElement("div");
    modeWrap.className = "dq-mode";

    var modeClothing = document.createElement("button");
    modeClothing.type = "button";
    modeClothing.textContent = "Clothing";
    modeClothing.setAttribute("aria-pressed", "true");

    var modeShoes = document.createElement("button");
    modeShoes.type = "button";
    modeShoes.textContent = "Shoes";
    modeShoes.setAttribute("aria-pressed", "false");

    modeWrap.appendChild(modeClothing);
    modeWrap.appendChild(modeShoes);

    var close = document.createElement("button");
    close.className = "dq-close";
    close.type = "button";
    close.textContent = "✕";
    headRight.appendChild(modeWrap);
    headRight.appendChild(close);
    head.appendChild(headRight);

    var body = document.createElement("div");
    body.className = "dq-body";

    modal.appendChild(head);
    modal.appendChild(body);
    backdrop.appendChild(modal);

    function teardown() {
      backdrop.classList.add("dq-closing");
      backdrop.classList.remove("dq-open");
      window.setTimeout(function () {
        if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      }, 220);
      document.removeEventListener("keydown", onKeyDown);
    }

    function onKeyDown(e) {
      if (e.key === "Escape") teardown();
    }

    close.addEventListener("click", teardown);
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) teardown();
    });
    document.addEventListener("keydown", onKeyDown);

    // Trigger open animation on next paint.
    window.setTimeout(function () { backdrop.classList.add("dq-open"); }, 0);

    return {
      backdrop: backdrop,
      body: body,
      close: teardown,
      modeClothingBtn: modeClothing,
      modeShoesBtn: modeShoes
    };
  }

  function buildTryOnUI(opts) {
    var garmentImgEl = opts.garmentImgEl;
    var garmentFilePromise = opts.garmentFilePromise;
    var clientKey = opts.clientKey;

    var m = createModal();
    document.body.appendChild(m.backdrop);

    var body = m.body;

    var modelFile = null;
    var garmentFile = null;
    var stream = null;
    var tryOnType = "clothing";

    // Stage (single column)
    var stage = document.createElement("div");
    stage.className = "dq-stage";

    var stageEmpty = document.createElement("div");
    stageEmpty.className = "dq-stage-empty";
    stageEmpty.innerHTML = "<div>Select a photo to start</div><div class=\"dq-stage-hint\">Upload from Gallery or use your camera</div>";

    var stageImg = document.createElement("img");
    stageImg.alt = "Preview";
    stageImg.style.display = "none";

    var branding = document.createElement("div");
    branding.className = "dq-branding";
    branding.textContent = "Disqant";

    var processing = document.createElement("div");
    processing.className = "dq-processing";
    var processingText = document.createElement("div");
    processingText.className = "dq-processing-text";
    processingText.textContent = "Processing…";
    var processingPct = document.createElement("div");
    processingPct.className = "dq-processing-pct";
    processingPct.textContent = "0%";
    processing.appendChild(processingText);
    processing.appendChild(processingPct);

    var progress = document.createElement("div");
    progress.className = "dq-progress";
    var progressFill = document.createElement("span");
    progressFill.style.width = "0%";
    progress.appendChild(progressFill);

    stage.appendChild(stageEmpty);
    stage.appendChild(stageImg);
    stage.appendChild(branding);
    stage.appendChild(processing);
    stage.appendChild(progress);

    var row = document.createElement("div");
    row.className = "dq-row";

    function makeIcon(kind) {
      var span = document.createElement("span");
      span.className = "dq-ico";
      if (kind === "gallery") {
        span.innerHTML = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z\" stroke=\"currentColor\" stroke-width=\"1.8\"/><path d=\"M9 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z\" stroke=\"currentColor\" stroke-width=\"1.8\"/><path d=\"m5.5 18 5-5 3.2 3.2 2-2L20 18\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>";
      } else if (kind === "camera") {
        span.innerHTML = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M7 7h2l1.2-2h3.6L15 7h2a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3Z\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linejoin=\"round\"/><path d=\"M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z\" stroke=\"currentColor\" stroke-width=\"1.8\"/></svg>";
      }
      return span;
    }

    var uploadBtn = document.createElement("button");
    uploadBtn.className = "dq-choice";
    uploadBtn.type = "button";
    uploadBtn.appendChild(makeIcon("gallery"));
    uploadBtn.appendChild(document.createTextNode("Upload from Gallery"));

    var cameraBtn = document.createElement("button");
    cameraBtn.className = "dq-choice";
    cameraBtn.type = "button";
    cameraBtn.appendChild(makeIcon("camera"));
    cameraBtn.appendChild(document.createTextNode("Use Camera"));

    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";

    var takeBtn = document.createElement("button");
    takeBtn.className = "dq-btn dq-primary";
    takeBtn.type = "button";
    takeBtn.textContent = "Generate";

    var videoWrap = document.createElement("div");
    videoWrap.style.display = "none";
    videoWrap.style.marginTop = "12px";

    var video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.width = "100%";
    video.style.borderRadius = "14px";
    video.style.border = "1px solid rgba(255,255,255,.10)";

    var captureBtn = document.createElement("button");
    captureBtn.className = "dq-btn dq-primary";
    captureBtn.type = "button";
    captureBtn.textContent = "Capture photo";
    captureBtn.style.marginTop = "10px";

    videoWrap.appendChild(video);
    videoWrap.appendChild(captureBtn);

    row.appendChild(cameraBtn);
    row.appendChild(uploadBtn);

    body.appendChild(stage);
    body.appendChild(row);
    body.appendChild(fileInput);
    body.appendChild(videoWrap);
    body.appendChild(takeBtn);

    function setStageImage(url, alt) {
      if (!url) return;
      stageImg.alt = alt || "Preview";
      stageImg.src = url;
      stageImg.style.display = "block";
      stageEmpty.style.display = "none";
    }

    var progressTimer = null;
    var currentPct = 0;

    function setProgress(pct) {
      currentPct = Math.max(0, Math.min(100, Math.round(pct)));
      processingPct.textContent = currentPct + "%";
      progressFill.style.width = currentPct + "%";
    }

    function startProcessing() {
      processingText.textContent = "Processing…";
      processing.classList.add("is-on");
      progress.classList.add("is-on");
      setProgress(0);
      if (progressTimer) window.clearInterval(progressTimer);
      progressTimer = window.setInterval(function () {
        // Fake progress up to 92% while waiting for server.
        if (currentPct < 92) {
          var bump = currentPct < 60 ? 6 : (currentPct < 80 ? 3 : 1);
          setProgress(currentPct + bump);
        }
      }, 260);
    }

    function stopProcessing(ok) {
      if (progressTimer) window.clearInterval(progressTimer);
      progressTimer = null;
      if (ok) setProgress(100);
      window.setTimeout(function () {
        processing.classList.remove("is-on");
        progress.classList.remove("is-on");
      }, ok ? 450 : 0);
    }

    function stopStream() {
      if (stream) {
        try {
          stream.getTracks().forEach(function (t) { t.stop(); });
        } catch (_e) { }
      }
      stream = null;
    }

    m.backdrop.addEventListener("remove", stopStream);
    // Also stop on close
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
      setStageImage(URL.createObjectURL(f), "Your photo");
    });

    cameraBtn.addEventListener("click", async function () {
      try {
        stopStream();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        video.srcObject = stream;
        videoWrap.style.display = "block";
      } catch (e) {
        // Keep UI minimal; no additional status area.
      }
    });

    captureBtn.addEventListener("click", function () {
      if (!video.videoWidth) return;
      var canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(function (blob) {
        if (!blob) return;
        modelFile = fileFromBlob(blob, "user.jpg");
        setStageImage(URL.createObjectURL(blob), "Your photo");
        stopStream();
        videoWrap.style.display = "none";
      }, "image/jpeg", 0.9);
    });

    (async function initGarment() {
      try {
        garmentFile = await garmentFilePromise;
      } catch (e) {
        // No-op (minimal UI). Try-on will error if garment is unavailable.
      }
    })();

    function setTryOnType(next) {
      tryOnType = next === "shoes" ? "shoes" : "clothing";
      if (m.modeClothingBtn) m.modeClothingBtn.setAttribute("aria-pressed", tryOnType === "clothing" ? "true" : "false");
      if (m.modeShoesBtn) m.modeShoesBtn.setAttribute("aria-pressed", tryOnType === "shoes" ? "true" : "false");
    }

    if (m.modeClothingBtn) m.modeClothingBtn.addEventListener("click", function () { setTryOnType("clothing"); });
    if (m.modeShoesBtn) m.modeShoesBtn.addEventListener("click", function () { setTryOnType("shoes"); });

    takeBtn.addEventListener("click", async function () {
      if (!clientKey) {
        return;
      }
      if (!modelFile) {
        return;
      }
      if (!garmentFile) {
        return;
      }

      startProcessing();
      takeBtn.disabled = true;
      try {
        var fd = new FormData();
        fd.append("model", modelFile);
        fd.append("garment", garmentFile);
        fd.append("tryOnType", tryOnType);
        fd.append("mode", "balanced");
        fd.append("outputFormat", "png");
        fd.append("returnBase64", "true");

        var res = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "x-api-key": clientKey },
          body: fd
        });

        var data = null;
        try { data = await res.json(); } catch (_e) { }

        if (!res.ok) {
          var msg = data && data.error ? String(data.error) : ("Request failed (" + res.status + ")");
          setStatus(msg);
          takeBtn.disabled = false;
          return;
        }

        var out = data && data.output && data.output[0] ? data.output[0] : null;
        if (!out) {
          stopProcessing(false);
          takeBtn.disabled = false;
          return;
        }

        setStageImage(out, "Try-on result");
        stopProcessing(true);
      } catch (e) {
        stopProcessing(false);
      } finally {
        takeBtn.disabled = false;
      }
    });

    return m;
  }

  function bindImage(img) {
    if (img.getAttribute(WIDGET_ATTR_BOUND) === "1") return;

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
    btn.className = "dq-btn dq-wear-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Try On");
    btn.textContent = "Wear Me 👗";

    overlay.appendChild(btn);
    wrapper.appendChild(overlay);

    btn.addEventListener("click", async function (e) {
      e.preventDefault();
      e.stopPropagation();

      var clientKey = getClientKey();
      var src = img.currentSrc || img.src;
      var garmentFilePromise = fetchImageAsFile(src, "garment.jpg");

      buildTryOnUI({
        garmentImgEl: img,
        garmentFilePromise: garmentFilePromise,
        clientKey: clientKey
      });
    });
  }

  function scanAndBind() {
    injectStyles();
    var imgs = Array.prototype.slice.call(document.images || []);
    imgs.forEach(function (img) {
      if (isLikelyProductImage(img)) {
        bindImage(img);
        return;
      }
      if (img.getAttribute(WIDGET_ATTR_BOUND) === "1") return;
      if (img.getAttribute(WIDGET_ATTR_PENDING) === "1") return;
      var src = img.currentSrc || img.src || "";
      if (!src || src.indexOf("data:") === 0) return;
      if (img.complete) return;
      img.setAttribute(WIDGET_ATTR_PENDING, "1");
      function clearPending() {
        img.removeAttribute(WIDGET_ATTR_PENDING);
      }
      img.addEventListener(
        "load",
        function onImgLoad() {
          clearPending();
          scanAndBind();
        },
        { once: true }
      );
      img.addEventListener(
        "error",
        function onImgErr() {
          clearPending();
        },
        { once: true }
      );
    });
  }

  function observe() {
    var mo = new MutationObserver(function () {
      scanAndBind();
    });
    mo.observe(document.documentElement, { subtree: true, childList: true, attributes: false });
  }

  // Boot
  function boot() {
    scanAndBind();
    observe();
    window.addEventListener("load", function () {
      scanAndBind();
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

