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

      + ".dq-head{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid rgba(15,15,20,.08);background:linear-gradient(180deg,rgba(255,255,255,1),rgba(250,250,252,1));}"
      + ".dq-title{color:#0f0f14;font-weight:900;font-size:13px;letter-spacing:.3px;text-transform:none;display:flex;align-items:center;gap:10px;}"
      + ".dq-title-badge{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:10px;background:linear-gradient(135deg,#7c5cff,#ff5ca8);color:#fff;font-weight:900;font-size:12px;}"
      + ".dq-head-right{display:flex;align-items:center;gap:10px;}"
      + ".dq-mode{display:inline-flex;gap:6px;padding:4px;border-radius:999px;background:rgba(15,15,20,.06);border:1px solid rgba(15,15,20,.08);}"
      + ".dq-mode button{appearance:none;border:0;background:transparent;color:rgba(15,15,20,.72);padding:8px 10px;border-radius:999px;font:800 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;cursor:pointer;transition:background .14s ease,color .14s ease;}"
      + ".dq-mode button[aria-pressed=\"true\"]{background:#fff;color:#0f0f14;box-shadow:0 6px 18px rgba(0,0,0,.10);}"
      + ".dq-close{appearance:none;border:1px solid rgba(15,15,20,.12);background:#fff;color:#0f0f14;border-radius:12px;padding:8px 10px;cursor:pointer;box-shadow:0 8px 20px rgba(0,0,0,.08);}"
      + ".dq-close:hover{transform:translateY(-1px);}"

      + ".dq-body{display:grid;grid-template-columns:1fr;gap:14px;padding:16px;overflow:auto;-webkit-overflow-scrolling:touch;}"
      + "@media (min-width:880px){.dq-body{grid-template-columns:420px 1fr;}}"
      + ".dq-panel{border:1px solid rgba(15,15,20,.10);border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,1),rgba(250,250,252,1));padding:14px;}"
      + ".dq-label{color:rgba(15,15,20,.78);font-size:12px;font-weight:900;margin-bottom:10px;letter-spacing:.2px;}"
      + ".dq-sub{color:rgba(15,15,20,.55);font-size:12px;margin-top:6px;}"
      + ".dq-row{display:flex;gap:10px;flex-wrap:wrap;}"

      + ".dq-choice{flex:1;min-width:160px;display:flex;align-items:center;gap:10px;justify-content:flex-start;padding:12px 12px;border-radius:16px;border:1px solid rgba(15,15,20,.10);background:#fff;color:#0f0f14;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.06);transition:transform .16s ease, box-shadow .16s ease;}"
      + ".dq-choice:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(0,0,0,.09);}"
      + ".dq-ico{width:18px;height:18px;display:inline-block;color:#0f0f14;opacity:.9;}"
      + ".dq-primary{border:none;background:linear-gradient(135deg,#7c5cff,#ff5ca8);color:#fff;font-weight:900;box-shadow:0 14px 30px rgba(124,92,255,.22),0 10px 26px rgba(255,92,168,.16);}"
      + ".dq-primary:hover{transform:translateY(-1px) scale(1.01);}"

      + ".dq-preview{width:100%;height:280px;border-radius:16px;border:1px solid rgba(15,15,20,.10);background:linear-gradient(180deg,#ffffff,#fbfbfd);display:flex;align-items:center;justify-content:center;color:rgba(15,15,20,.45);overflow:hidden;}"
      + ".dq-preview img{width:100%;height:100%;object-fit:contain;}"
      + ".dq-status{color:rgba(15,15,20,.65);font-size:12px;margin-top:10px;min-height:18px;display:flex;align-items:center;gap:10px;}"

      + ".dq-dots{display:inline-flex;gap:4px;align-items:center;}"
      + ".dq-dots span{width:6px;height:6px;border-radius:999px;background:linear-gradient(135deg,#7c5cff,#ff5ca8);opacity:.35;animation:dqdots 1.0s infinite ease-in-out;}"
      + ".dq-dots span:nth-child(2){animation-delay:.12s}"
      + ".dq-dots span:nth-child(3){animation-delay:.24s}"
      + "@keyframes dqdots{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-4px);opacity:1}}"

      + ".dq-footer{padding:12px 16px;border-top:1px solid rgba(15,15,20,.08);display:flex;justify-content:center;align-items:center;background:#fff;}"
      + ".dq-brand{font:800 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:rgba(15,15,20,.55);letter-spacing:.25px;}"
      + ".dq-brand strong{color:#0f0f14;}"
      + "@media (max-width:420px){.dq-choice{min-width:100%}.dq-body{padding:12px}.dq-panel{padding:12px}.dq-preview{height:240px}}";

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
    var title = document.createElement("div");
    title.className = "dq-title";
    var badge = document.createElement("span");
    badge.className = "dq-title-badge";
    badge.textContent = "Dq";
    var titleText = document.createElement("span");
    titleText.textContent = "Disqant Try-On";
    title.appendChild(badge);
    title.appendChild(titleText);

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
    head.appendChild(title);
    headRight.appendChild(modeWrap);
    headRight.appendChild(close);
    head.appendChild(headRight);

    var body = document.createElement("div");
    body.className = "dq-body";

    var left = document.createElement("div");
    left.className = "dq-panel";

    var right = document.createElement("div");
    right.className = "dq-panel";

    body.appendChild(left);
    body.appendChild(right);

    modal.appendChild(head);
    modal.appendChild(body);

    var footer = document.createElement("div");
    footer.className = "dq-footer";
    var brand = document.createElement("div");
    brand.className = "dq-brand";
    brand.innerHTML = "<strong>Disqant</strong> · virtual try-on";
    footer.appendChild(brand);
    modal.appendChild(footer);
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
      left: left,
      right: right,
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

    var left = m.left;
    var right = m.right;

    var modelFile = null;
    var garmentFile = null;
    var stream = null;
    var tryOnType = "clothing";

    var statusEl = document.createElement("div");
    statusEl.className = "dq-status";

    // Left: upload/camera
    var label1 = document.createElement("div");
    label1.className = "dq-label";
    label1.textContent = "Your photo";

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

    var preview = document.createElement("div");
    preview.className = "dq-preview";
    preview.textContent = "No photo selected";

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

    left.appendChild(label1);
    left.appendChild(row);
    left.appendChild(fileInput);
    left.appendChild(preview);
    left.appendChild(videoWrap);
    left.appendChild(statusEl);
    left.appendChild(document.createElement("div")).style.height = "10px";
    left.appendChild(takeBtn);

    // Right: garment + result
    var label2 = document.createElement("div");
    label2.className = "dq-label";
    label2.textContent = "Garment & result";

    var garmentPreview = document.createElement("div");
    garmentPreview.className = "dq-preview";
    var garmentImg = document.createElement("img");
    garmentImg.alt = "Garment";
    garmentImg.src = garmentImgEl.currentSrc || garmentImgEl.src || "";
    garmentPreview.innerHTML = "";
    garmentPreview.appendChild(garmentImg);

    var resultPreview = document.createElement("div");
    resultPreview.className = "dq-preview";
    resultPreview.textContent = "Result will appear here";

    right.appendChild(label2);
    right.appendChild(garmentPreview);
    right.appendChild(document.createElement("div")).style.height = "12px";
    right.appendChild(resultPreview);

    function setStatus(msg, loading) {
      statusEl.innerHTML = "";
      if (loading) {
        var dots = document.createElement("span");
        dots.className = "dq-dots";
        dots.innerHTML = "<span></span><span></span><span></span>";
        statusEl.appendChild(dots);
      }
      var t = document.createElement("span");
      t.textContent = msg || "";
      statusEl.appendChild(t);
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
      preview.innerHTML = "";
      var img = document.createElement("img");
      img.alt = "Your photo";
      img.src = URL.createObjectURL(f);
      preview.appendChild(img);
      setStatus("");
    });

    cameraBtn.addEventListener("click", async function () {
      setStatus("");
      try {
        stopStream();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        video.srcObject = stream;
        videoWrap.style.display = "block";
      } catch (e) {
        setStatus("Camera unavailable. Please upload a photo instead.");
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
        preview.innerHTML = "";
        var img = document.createElement("img");
        img.alt = "Your photo";
        img.src = URL.createObjectURL(blob);
        preview.appendChild(img);
        stopStream();
        videoWrap.style.display = "none";
      }, "image/jpeg", 0.9);
    });

    (async function initGarment() {
      try {
        garmentFile = await garmentFilePromise;
      } catch (e) {
        setStatus("Could not read product image. This site may block cross-origin images.");
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
        setStatus("Missing Disquant client key on the script tag.");
        return;
      }
      if (!modelFile) {
        setStatus("Please upload a photo or use camera.");
        return;
      }
      if (!garmentFile) {
        setStatus("Garment image unavailable (CORS).");
        return;
      }

      setStatus("AI is working…", true);
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
          setStatus("No output returned.");
          takeBtn.disabled = false;
          return;
        }

        resultPreview.innerHTML = "";
        var outImg = document.createElement("img");
        outImg.alt = "Try-on result";
        outImg.src = out;
        resultPreview.appendChild(outImg);
        setStatus("Done.");
      } catch (e) {
        setStatus("Try-on failed. Please try again.");
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

