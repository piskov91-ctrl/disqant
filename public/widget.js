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
      + ".dq-btn{appearance:none;border:1px solid rgba(255,255,255,.22);background:rgba(12,12,15,.92);color:#fff;font:600 13px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:10px 14px;border-radius:999px;cursor:pointer;backdrop-filter:blur(10px);box-shadow:0 4px 18px rgba(0,0,0,.35);transition:all .15s ease;}"
      + ".dq-btn:hover{border-color:rgba(255,255,255,.35);transform:translateY(-1px);}"
      + ".dq-overlay{position:absolute;inset:auto 10px 10px auto;z-index:2147483646;display:flex;gap:8px;align-items:center;pointer-events:auto;}"
      + ".dq-backdrop{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:18px;}"
      + ".dq-modal{width:100%;max-width:980px;background:#0c0c0f;border:1px solid rgba(255,255,255,.10);border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.6);overflow:hidden;}"
      + ".dq-head{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(18,18,26,.45);}"
      + ".dq-title{color:#fff;font-weight:700;font-size:14px;letter-spacing:.2px;}"
      + ".dq-close{appearance:none;border:1px solid rgba(255,255,255,.12);background:transparent;color:#fff;border-radius:10px;padding:8px 10px;cursor:pointer;}"
      + ".dq-body{display:grid;grid-template-columns:1fr;gap:14px;padding:16px;}"
      + "@media (min-width:880px){.dq-body{grid-template-columns:380px 1fr;}}"
      + ".dq-panel{border:1px solid rgba(255,255,255,.10);border-radius:16px;background:rgba(18,18,26,.35);padding:14px;}"
      + ".dq-label{color:#fff;font-size:12px;font-weight:700;margin-bottom:8px;}"
      + ".dq-sub{color:rgba(255,255,255,.55);font-size:12px;margin-top:6px;}"
      + ".dq-row{display:flex;gap:10px;flex-wrap:wrap;}"
      + ".dq-input{width:100%;display:block;border:1px solid rgba(255,255,255,.10);background:#0c0c0f;color:#fff;border-radius:12px;padding:10px 12px;font-size:13px;}"
      + ".dq-primary{background:#7c5cff;border-color:rgba(124,92,255,.6);}"
      + ".dq-primary:hover{background:#a89bff;}"
      + ".dq-ghost{background:rgba(18,18,26,.35);}"
      + ".dq-preview{width:100%;aspect-ratio:4/3;border-radius:14px;border:1px dashed rgba(255,255,255,.14);background:rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.45);overflow:hidden;}"
      + ".dq-preview img{max-width:100%;max-height:100%;object-fit:contain;}"
      + ".dq-status{color:rgba(255,255,255,.65);font-size:12px;margin-top:10px;min-height:18px;}"
      + ".dq-spin{width:22px;height:22px;border-radius:999px;border:2px solid rgba(255,255,255,.25);border-top-color:#7c5cff;animation:dqspin 1s linear infinite;}"
      + "@keyframes dqspin{to{transform:rotate(360deg);}}";

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
    title.textContent = "Disquant · Virtual try-on";
    var close = document.createElement("button");
    close.className = "dq-close";
    close.type = "button";
    close.textContent = "Close";
    head.appendChild(title);
    head.appendChild(close);

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
    backdrop.appendChild(modal);

    function teardown() {
      if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
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

    return { backdrop: backdrop, left: left, right: right, close: teardown };
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

    var statusEl = document.createElement("div");
    statusEl.className = "dq-status";

    // Left: upload/camera
    var label1 = document.createElement("div");
    label1.className = "dq-label";
    label1.textContent = "1) Your photo";

    var row = document.createElement("div");
    row.className = "dq-row";

    var cameraBtn = document.createElement("button");
    cameraBtn.className = "dq-btn dq-ghost";
    cameraBtn.type = "button";
    cameraBtn.textContent = "Use camera";

    var uploadBtn = document.createElement("button");
    uploadBtn.className = "dq-btn dq-ghost";
    uploadBtn.type = "button";
    uploadBtn.textContent = "Upload photo";

    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";

    var takeBtn = document.createElement("button");
    takeBtn.className = "dq-btn dq-primary";
    takeBtn.type = "button";
    takeBtn.textContent = "Generate try-on";

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
    label2.textContent = "2) Garment & result";

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

    function setStatus(msg, spinning) {
      statusEl.innerHTML = "";
      if (spinning) {
        var spin = document.createElement("span");
        spin.className = "dq-spin";
        spin.style.display = "inline-block";
        spin.style.verticalAlign = "middle";
        spin.style.marginRight = "10px";
        statusEl.appendChild(spin);
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

      setStatus("Generating try-on…", true);
      takeBtn.disabled = true;
      try {
        var fd = new FormData();
        fd.append("model", modelFile);
        fd.append("garment", garmentFile);
        fd.append("tryOnType", "clothing"); // Widget default; you can enhance detection later.
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
    btn.className = "dq-btn dq-primary";
    btn.type = "button";
    btn.setAttribute("aria-label", "Try On");
    btn.textContent = "Try On 👗";

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

