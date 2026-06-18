"use client";

import { useEffect, useLayoutEffect, useState } from "react";

/** Echoed from FormData; the API route uses Fashn Try-On Max. */
export type GarmentCategoryHint = "tops" | "bottoms";

export type TryOnResponse =
  | { id: string; output: string[]; category?: GarmentCategoryHint }
  | { error: string; code?: string; keyKind?: "demo" | "client" };

export function formatTryOnApiError(err: unknown): string {
  if (err == null) return "Try-on failed.";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return "Try-on failed.";
  }
}

export const WEAR_LOADING_MESSAGES: readonly string[] = [
  "AI is styling your outfit...",
  "Almost ready...",
  "Adding final touches...",
  "Blending the look on you...",
  "Tuning the fit and colors...",
  "AI is processing your look... usually ready in 20-30 seconds",
];

/** Tips + privacy block — first child of Wear Me modal body (matches `public/widget.js`). */
const WEAR_ME_TIPS = [
  "Stand in good lighting with your full body visible",
  "Keep 1-2 metres from the camera",
  "Plain backgrounds work best",
] as const;

export function WearMeTipsPrivacy() {
  return (
    <div className="dq-tips-block">
      <div className="dq-tips">
        <ul className="dq-tips-list">
          {WEAR_ME_TIPS.map((tip) => (
            <li key={tip}>
              <span className="dq-tips-mark" aria-hidden>
                ✦
              </span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="dq-tips-privacy">
        🔒 Your privacy is protected. Photos are processed instantly and permanently deleted.
      </div>
    </div>
  );
}

export const WEAR_ME_FULLSCREEN_STYLE_ID = "fit-room-wear-fullscreen-style";

/** Fullscreen expand control + overlay (matches `public/widget.js`). */
export const WEAR_ME_FULLSCREEN_CSS =
  ".dq-fs{position:absolute;top:12px;left:12px;z-index:6;width:40px;height:40px;padding:0;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;border:1px solid rgba(255,255,255,.35);background:rgba(26,22,18,.82);color:#f5ede4;box-shadow:0 6px 18px rgba(0,0,0,.35);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:transform .16s ease,filter .16s ease;-webkit-tap-highlight-color:transparent;}" +
  ".dq-fs:hover{transform:translateY(-1px);filter:brightness(1.08);}" +
  ".dq-fs:active{transform:translateY(0);}" +
  ".dq-fs-icon{width:18px;height:18px;display:block;}" +
  ".dq-fs-overlay{position:fixed;inset:0;z-index:2147483648;background:rgba(12,10,8,.94);display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) max(16px,env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));}" +
  ".dq-fs-overlay img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;}" +
  ".dq-fs-close{position:absolute;top:max(16px,env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));appearance:none;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.14);background:#0f0f14;color:#fff;border-radius:999px;min-width:44px;min-height:44px;padding:0;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.22);transition:transform .16s ease,box-shadow .16s ease,background-color .16s ease;z-index:1;-webkit-tap-highlight-color:transparent;}" +
  ".dq-fs-close:hover{background:#2a2633;transform:translateY(-1px);}" +
  ".dq-fs-close:active{transform:translateY(0);}" +
  ".dq-fs-close-icon{width:22px;height:22px;display:block;}";

function ensureWearMeFullscreenStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(WEAR_ME_FULLSCREEN_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = WEAR_ME_FULLSCREEN_STYLE_ID;
  el.textContent = WEAR_ME_FULLSCREEN_CSS;
  document.head.appendChild(el);
}

function DqExpandIcon() {
  return (
    <svg
      className="dq-fs-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

/** Expand button on try-on result + fullscreen image overlay. */
export function WearMeResultFullscreen({
  imageUrl,
  active,
}: {
  imageUrl: string | null;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    ensureWearMeFullscreenStyles();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!active) setOpen(false);
  }, [active]);

  if (!active || !imageUrl) return null;

  return (
    <>
      <button
        type="button"
        className="dq-fs"
        onClick={() => setOpen(true)}
        aria-label="View fullscreen"
        title="Fullscreen"
      >
        <DqExpandIcon />
      </button>
      {open ? (
        <div
          className="dq-fs-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Try-on result fullscreen"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <button
            type="button"
            className="dq-fs-close"
            onClick={() => setOpen(false)}
            aria-label="Close fullscreen"
            title="Close"
          >
            <svg
              className="dq-fs-close-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Try-on result" />
        </div>
      ) : null}
    </>
  );
}

export const DEMO_WEAR_MODAL_STYLE_ID = "fit-room-demo-wear-modal-style";

/** Matches `public/widget.js` injectStyles (Wear Me + modal) for pixel-consistent modal. */
export const DEMO_WEAR_MODAL_CSS =
  ".dq-wrap{display:inline-block;position:relative;vertical-align:top;line-height:0;max-width:100%;}" +
  ".dq-wrap>img{display:block;max-width:100%;height:auto;vertical-align:top;}" +
  ".dq-overlay{position:absolute;inset:auto 12px 12px auto;z-index:20;display:flex;align-items:center;pointer-events:auto;}" +
  ".dq-wear-btn{position:relative;appearance:none;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:12px 30px;border-radius:50px;color:#2c241f;text-decoration:none;font-family:Georgia,ui-serif,serif;font-weight:700;font-size:14px;line-height:1.25;letter-spacing:2px;background:linear-gradient(135deg,#c6a77d 0%,#e2cfb4 50%,#c6a77d 100%);border:1px solid rgba(255,255,255,.3);box-shadow:0 4px 15px rgba(0,0,0,.3),inset 0 1px 1px rgba(255,255,255,.5);transition:all .3s ease;transform:translateY(0);-webkit-font-smoothing:antialiased;}" +
  ".dq-wear-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(198,167,125,.4);filter:brightness(1.1);}" +
  ".dq-wear-btn:active{transform:translateY(-1px);filter:brightness(1.05);}" +
  ".dq-backdrop{position:fixed;inset:0;z-index:50;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:14px;opacity:0;transition:opacity .18s ease;}" +
  ".dq-backdrop.dq-open{opacity:1;}" +
  ".dq-backdrop.dq-dismiss-locked{cursor:default;-webkit-user-select:none;user-select:none;}" +
  ".dq-modal{position:relative;width:min(720px,100%);min-height:0;max-height:calc(100vh - 28px);max-height:min(90vh,calc(100dvh - 28px));background:#2c241f;border:1px solid rgba(198,167,125,.22);border-radius:20px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.45);display:flex;flex-direction:column;color:#f5ede4;transform:translateY(10px) scale(.985);opacity:0;transition:transform .18s ease, opacity .18s ease;}" +
  ".dq-backdrop.dq-open .dq-modal{transform:translateY(0) scale(1);opacity:1;}" +
  ".dq-backdrop.dq-closing{opacity:0;}" +
  ".dq-backdrop.dq-closing .dq-modal{transform:translateY(10px) scale(.985);opacity:0;}" +
  ".dq-head{display:flex;align-items:center;justify-content:flex-start;flex-shrink:0;padding:12px;padding-left:max(12px, env(safe-area-inset-left, 0px));padding-right:max(12px, env(safe-area-inset-right, 0px));padding-top:max(12px, env(safe-area-inset-top, 0px));border-bottom:1px solid rgba(198,167,125,.18);background:#2c241f;}" +
  ".dq-head-title{font:900 13px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.25px;color:#f5ede4;}" +
  ".dq-modal-foot{flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:12px;padding-bottom:max(16px, env(safe-area-inset-bottom, 0px));border-top:1px solid rgba(198,167,125,.18);background:#2c241f;}" +
  ".dq-x{appearance:none;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.14);background:#0f0f14;color:#fff;border-radius:999px;min-width:44px;min-height:44px;padding:0;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.22);transition:transform .16s ease, box-shadow .16s ease, background-color .16s ease;-webkit-tap-highlight-color:transparent;-webkit-font-smoothing:antialiased;}" +
  ".dq-x:hover{background:#2a2633;color:#fff;transform:translateY(-1px);box-shadow:0 14px 32px rgba(0,0,0,.26);}" +
  ".dq-x:active{transform:translateY(0);}" +
  ".dq-x-icon{width:22px;height:22px;display:block;flex-shrink:0;}" +
  ".dq-body{flex:1 1 0%;min-height:0;padding:12px;display:flex;flex-direction:column;gap:12px;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;background:#2c241f;}" +
  ".dq-tips-block{flex-shrink:0;display:flex;flex-direction:column;gap:8px;}" +
  ".dq-tips{padding:12px;border-radius:12px;border-left:3px solid #c6a77d;background:rgba(198,167,125,.08);}" +
  ".dq-tips-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px;}" +
  ".dq-tips-list li{display:flex;align-items:flex-start;gap:8px;font:400 11px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:rgba(245,237,228,.88);letter-spacing:.01em;}" +
  ".dq-tips-mark{flex-shrink:0;color:#c6a77d;font-size:10px;line-height:1.55;font-weight:600;}" +
  ".dq-tips-privacy{margin:0;padding:12px 14px;border-radius:12px;border:1px solid rgba(198,167,125,.5);background:#1a1612;font:500 13px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:rgba(245,237,228,.92);letter-spacing:.02em;box-shadow:inset 0 1px 0 rgba(198,167,125,.08);}" +
  ".dq-stage{position:relative;width:100%;height:min(80vh,640px);border-radius:18px;border:1px solid rgba(198,167,125,.2);background:linear-gradient(180deg,#1a1612,#141210);box-shadow:inset 0 1px 0 rgba(198,167,125,.08);overflow:hidden;}" +
  ".dq-stage img{width:100%;height:100%;display:block;background:#0f0f14;object-fit:contain;object-position:center center;}" +
  ".dq-empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:rgba(245,237,228,.65);text-align:center;padding:18px;}" +
  ".dq-empty strong{color:#f5ede4;font:900 14px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}" +
  ".dq-empty span{font:600 12px/1.3 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}" +
  ".dq-processing{position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:10px;z-index:4;background:rgba(26,22,18,.82);backdrop-filter:blur(8px);}" +
  ".dq-processing.is-on{display:flex;}" +
  ".dq-spin{width:34px;height:34px;border-radius:999px;border:3px solid rgba(15,15,20,.14);border-top-color:#c6a77d;animation:dqspin 1s linear infinite;}" +
  "@keyframes dqspin{to{transform:rotate(360deg);}}" +
  ".dq-processing-inner{display:flex;flex-direction:column;align-items:center;gap:14px;min-height:4.5rem;justify-content:center;}" +
  ".dq-processing-text{font:900 14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#f5ede4;text-align:center;max-width:420px;padding:0 16px;}" +
  ".dq-processing-msg{animation:dq-msg-in .42s ease both;}" +
  "@keyframes dq-msg-in{0%{opacity:0;transform:translateY(8px) scale(.99)}100%{opacity:1;transform:translateY(0) scale(1)}}" +
  ".dq-progress{position:absolute;left:12px;right:12px;bottom:12px;z-index:5;height:10px;border-radius:999px;background:rgba(245,237,228,.12);overflow:hidden;display:none;}" +
  ".dq-progress.is-on{display:block;}" +
  ".dq-progress>span{display:block;height:100%;width:0%;background:linear-gradient(135deg,#a68958,#c6a77d 45%,#e8d4bc 100%);background-size:200% 100%;transition:width .12s ease;position:relative;animation:dq-bar-pulse 1.9s ease-in-out infinite;}" +
  "@keyframes dq-bar-pulse{0%,100%{background-position:0% 50%;filter:brightness(1)}50%{background-position:100% 50%;filter:brightness(1.12)}}" +
  ".dq-row{display:flex;gap:10px;flex-wrap:wrap;}" +
  ".dq-choice{flex:1;min-width:160px;display:flex;align-items:center;gap:10px;justify-content:center;padding:12px 12px;border-radius:16px;border:1px solid rgba(198,167,125,.28);background:#1a1612;color:#f5ede4;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.22);font:900 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;transition:transform .16s ease, box-shadow .16s ease, border-color .16s ease;}" +
  ".dq-choice:hover{transform:translateY(-1px);box-shadow:0 12px 28px rgba(0,0,0,.28);border-color:rgba(198,167,125,.45);}" +
  ".dq-ico{width:18px;height:18px;display:inline-block;opacity:.92;}" +
  ".dq-wear-me{appearance:none;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:100%;padding:14px 32px;border-radius:50px;color:#2c241f;font-family:Georgia,ui-serif,serif;font-weight:700;font-size:15px;line-height:1.25;letter-spacing:2px;background:linear-gradient(135deg,#c6a77d 0%,#e2cfb4 50%,#c6a77d 100%);border:1px solid rgba(255,255,255,.3);box-shadow:0 4px 15px rgba(0,0,0,.3),inset 0 1px 1px rgba(255,255,255,.5);transition:all .3s ease;transform:translateY(0);-webkit-font-smoothing:antialiased;}" +
  ".dq-wear-me:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(198,167,125,.4);filter:brightness(1.08);}" +
  ".dq-wear-me:active{transform:translateY(-1px);filter:brightness(1.04);}" +
  ".dq-wear-me:disabled{opacity:.55;cursor:not-allowed;transform:none;filter:none;}" +
  ".dq-cta{position:relative;overflow:hidden;appearance:none;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:100%;padding:14px 28px;border-radius:50px;color:#2c241f;text-decoration:none;font-family:Georgia,ui-serif,serif;font-weight:700;font-size:14px;line-height:1.25;letter-spacing:1.5px;background:linear-gradient(115deg,#a6864f 0%,#d8be97 22%,#fff6e3 48%,#d8be97 74%,#a6864f 100%);background-size:220% 100%;border:1px solid rgba(255,255,255,.4);box-shadow:0 6px 20px rgba(166,134,79,.4),inset 0 1px 1px rgba(255,255,255,.6);animation:dq-cta-shimmer 3.2s linear infinite;transition:transform .2s ease,box-shadow .2s ease;-webkit-font-smoothing:antialiased;}" +
  "@keyframes dq-cta-shimmer{0%{background-position:220% 0}100%{background-position:-220% 0}}" +
  ".dq-cta::after{content:\"\";position:absolute;top:0;left:-75%;width:50%;height:100%;background:linear-gradient(110deg,transparent 0%,rgba(255,255,255,.85) 50%,transparent 100%);transform:skewX(-20deg);pointer-events:none;animation:dq-cta-sheen 3.2s ease-in-out infinite;}" +
  "@keyframes dq-cta-sheen{0%{left:-75%}55%{left:135%}100%{left:135%}}" +
  ".dq-cta:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(198,167,125,.55),inset 0 1px 1px rgba(255,255,255,.6);}" +
  ".dq-cta:active{transform:translateY(-1px);}" +
  "@media (prefers-reduced-motion:reduce){.dq-cta{animation:none;}.dq-cta::after{animation:none;display:none;}}" +
  ".dq-wow{text-align:center;color:#c6a77d;font-family:Georgia,ui-serif,serif;font-weight:700;font-size:16px;letter-spacing:1px;padding:2px 8px;animation:dq-wow-in .6s ease both;}" +
  "@keyframes dq-wow-in{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}" +
  ".dq-dl{position:absolute;right:12px;bottom:12px;z-index:6;width:44px;height:44px;padding:0;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;border:1px solid rgba(255,255,255,.4);background:linear-gradient(135deg,#c6a77d 0%,#e2cfb4 50%,#c6a77d 100%);color:#2c241f;box-shadow:0 6px 18px rgba(0,0,0,.3),inset 0 1px 1px rgba(255,255,255,.5);transition:transform .16s ease,box-shadow .16s ease,filter .16s ease;-webkit-tap-highlight-color:transparent;}" +
  ".dq-dl:hover{transform:translateY(-1px);filter:brightness(1.07);box-shadow:0 10px 24px rgba(0,0,0,.34);}" +
  ".dq-dl:active{transform:translateY(0);}" +
  ".dq-dl:disabled{opacity:.6;cursor:not-allowed;transform:none;}" +
  ".dq-dl-icon{width:20px;height:20px;display:block;}" +
  ".dq-primary{appearance:none;border:0;cursor:pointer;border-radius:10px;padding:14px 28px;background:#1a1612;color:#f5ede4;border:1px solid rgba(198,167,125,.28);font:600 16px/1.25 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.5px;box-shadow:0 8px 22px rgba(0,0,0,.22);transition:background-color .3s ease,color .3s ease,transform .16s ease,border-color .16s ease;}" +
  ".dq-primary:hover{background:#c6a77d;color:#2c241f;border-color:rgba(255,255,255,.25);transform:translateY(-1px);}" +
  ".dq-primary:disabled{opacity:.55;cursor:not-allowed;transform:none;background:#1a1612;color:#f5ede4;}" +
  ".dq-save{appearance:none;border:1px solid rgba(198,167,125,.28);background:#1a1612;color:#f5ede4;cursor:pointer;border-radius:16px;padding:12px 12px;font:900 13px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;box-shadow:0 8px 22px rgba(0,0,0,.22);transition:transform .16s ease, box-shadow .16s ease;}" +
  ".dq-save:hover{transform:translateY(-1px);box-shadow:0 12px 28px rgba(0,0,0,.28);}" +
  ".dq-brand{flex-shrink:0;padding:12px 12px;padding-bottom:max(12px, env(safe-area-inset-bottom, 0px));border-top:1px solid rgba(198,167,125,.18);display:flex;align-items:center;justify-content:flex-start;background:#2c241f;}" +
  ".dq-brand span{font:900 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#f5ede4;letter-spacing:.25px;}" +
  ".dq-brand small{margin-left:8px;font:700 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:rgba(245,237,228,.6);}" +
  ".dq-cam-row{display:flex;flex-wrap:wrap;gap:10px;align-items:stretch;}" +
  ".dq-flip{flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;padding:12px 14px;border-radius:16px;border:1px solid rgba(198,167,125,.28);background:#1a1612;color:#f5ede4;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.22);font:900 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;transition:transform .16s ease, box-shadow .16s ease;}" +
  ".dq-flip:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(0,0,0,.09);}" +
  ".dq-flip:disabled{opacity:.55;cursor:not-allowed;transform:none;}" +
  ".dq-cam-row .dq-primary{flex:1;min-width:0;}" +
  "@media (min-width:521px){.dq-backdrop{top:var(--site-header-height,0px);}.dq-modal{max-height:min(calc(100dvh - var(--site-header-height,0px) - 28px),calc(100vh - var(--site-header-height,0px) - 28px));}.dq-modal-foot{padding:20px 16px 24px;}.dq-modal-foot .dq-x{min-width:88px;min-height:58px;font-size:28px;line-height:1;box-shadow:0 14px 32px rgba(0,0,0,.2);}.dq-modal-foot .dq-x-icon{width:30px;height:30px;}}" +
  "@media (max-width:520px){.dq-backdrop{align-items:flex-start;top:var(--site-header-height,0px);padding-top:max(14px,calc(env(safe-area-inset-top,0px) + 10px));}.dq-modal{max-height:min(calc(100dvh - var(--site-header-height,0px) - 28px),calc(100vh - var(--site-header-height,0px) - 28px));}.dq-head{padding-right:max(56px,calc(60px + env(safe-area-inset-right, 0px)));}.dq-modal-foot{position:absolute;top:max(10px, env(safe-area-inset-top, 0px));right:max(10px, env(safe-area-inset-right, 0px));left:auto;bottom:auto;z-index:50;border:0;padding:0;background:transparent;}.dq-x{min-width:54px;min-height:54px;font-size:22px;line-height:1}.dq-x-icon{width:26px;height:26px}}" +
  "@media (max-width:420px){.dq-body{padding:10px}.dq-stage{height:min(52vh,380px)}.dq-choice{min-width:100%}}" +
  WEAR_ME_FULLSCREEN_CSS;

export async function compressImageToMax1000px(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const maxDim = 1000;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const targetW = Math.max(1, Math.round(bitmap.width * scale));
    const targetH = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Image compression failed."))),
        "image/jpeg",
        0.86,
      );
    });

    const nameBase = file.name.replace(/\.[^/.]+$/, "");
    return new File([blob], `${nameBase || "image"}-1000.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export type CameraFacingMode = "user" | "environment";

/** True when the browser can access a camera (secure context + getUserMedia API). */
export function isCameraCaptureSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext) return false;
  const md = navigator.mediaDevices;
  if (md && typeof md.getUserMedia === "function") return true;
  const legacy = navigator as Navigator & {
    getUserMedia?: (
      constraints: MediaStreamConstraints,
      onSuccess: (stream: MediaStream) => void,
      onError: (error: Error) => void,
    ) => void;
    webkitGetUserMedia?: (
      constraints: MediaStreamConstraints,
      onSuccess: (stream: MediaStream) => void,
      onError: (error: Error) => void,
    ) => void;
  };
  return (
    typeof legacy.getUserMedia === "function" || typeof legacy.webkitGetUserMedia === "function"
  );
}

/**
 * Opens a camera stream with facingMode preference, falling back to `{ video: true }`
 * when constraints are rejected (common on some Android / Samsung browsers).
 */
export async function requestCameraVideoStream(
  facingMode: CameraFacingMode = "user",
): Promise<MediaStream> {
  const withFacing: MediaStreamConstraints = {
    video: { facingMode: { ideal: facingMode } },
    audio: false,
  };
  const fallback: MediaStreamConstraints = { video: true, audio: false };

  const md = navigator.mediaDevices;
  if (md?.getUserMedia) {
    try {
      return await md.getUserMedia(withFacing);
    } catch {
      return await md.getUserMedia(fallback);
    }
  }

  const legacy = navigator as Navigator & {
    getUserMedia?: (
      constraints: MediaStreamConstraints,
      onSuccess: (stream: MediaStream) => void,
      onError: (error: Error) => void,
    ) => void;
    webkitGetUserMedia?: (
      constraints: MediaStreamConstraints,
      onSuccess: (stream: MediaStream) => void,
      onError: (error: Error) => void,
    ) => void;
  };
  const getUserMedia = legacy.getUserMedia ?? legacy.webkitGetUserMedia;
  if (!getUserMedia) {
    throw new Error("Camera is not supported in this browser.");
  }

  const legacyGet = (constraints: MediaStreamConstraints) =>
    new Promise<MediaStream>((resolve, reject) => {
      getUserMedia.call(navigator, constraints, resolve, reject);
    });

  try {
    return await legacyGet(withFacing);
  } catch {
    return legacyGet(fallback);
  }
}

export async function fetchUrlAsFile(url: string, name: string) {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error("Failed to fetch preset garment image.");
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}

export async function fetchImageBlobFromUrl(url: string): Promise<Blob> {
  const r = await fetch(url, { mode: "cors" });
  if (!r.ok) throw new Error("Could not read image");
  return r.blob();
}

export function DqIconGallery() {
  return (
    <span className="dq-ico">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
          d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M9 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="m5.5 18 5-5 3.2 3.2 2-2L20 18"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function DqIconCamera() {
  return (
    <span className="dq-ico">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
          d="M7 7h2l1.2-2h3.6L15 7h2a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    </span>
  );
}
