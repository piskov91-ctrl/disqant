"use client";

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

export const DEMO_WEAR_MODAL_STYLE_ID = "fit-room-demo-wear-modal-style";

/** Matches `public/widget.js` injectStyles (Wear Me + modal) for pixel-consistent modal. */
export const DEMO_WEAR_MODAL_CSS =
  ".dq-wrap{display:inline-block;position:relative;vertical-align:top;line-height:0;max-width:100%;}" +
  ".dq-wrap>img{display:block;max-width:100%;height:auto;vertical-align:top;}" +
  ".dq-overlay{position:absolute;inset:auto 12px 12px auto;z-index:20;display:flex;align-items:center;pointer-events:auto;}" +
  ".dq-wear-btn{position:relative;appearance:none;border:0;cursor:pointer;padding:10px 14px;border-radius:999px;color:#fff;font:900 13px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.2px;background:linear-gradient(135deg,#7c3aed 0%,#ec4899 100%);box-shadow:0 16px 34px rgba(124,58,237,.22),0 12px 30px rgba(236,72,153,.16);transform:translateY(0) scale(1);transition:transform .18s ease, filter .18s ease, box-shadow .18s ease;}" +
  ".dq-wear-btn:hover{transform:translateY(-2px) scale(1.03);filter:saturate(1.08);box-shadow:0 22px 44px rgba(124,58,237,.24),0 18px 36px rgba(236,72,153,.2);}" +
  ".dq-wear-btn:active{transform:translateY(-1px) scale(.99);}" +
  ".dq-wear-btn::after{content:\"\";position:absolute;inset:-2px;border-radius:999px;opacity:0;box-shadow:0 0 0 0 rgba(236,72,153,.38);transition:opacity .18s ease;}" +
  ".dq-wear-btn:hover::after{opacity:1;animation:dq-pulse 1.35s ease-out infinite;}" +
  "@keyframes dq-pulse{0%{box-shadow:0 0 0 0 rgba(236,72,153,.32)}100%{box-shadow:0 0 0 16px rgba(236,72,153,0)}}" +
  ".dq-backdrop{position:fixed;inset:0;z-index:50;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:14px;opacity:0;transition:opacity .18s ease;}" +
  ".dq-backdrop.dq-open{opacity:1;}" +
  ".dq-modal{width:min(720px,100%);max-height:90vh;background:#fff;border:1px solid rgba(15,15,20,.08);border-radius:20px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.30);display:flex;flex-direction:column;transform:translateY(10px) scale(.985);opacity:0;transition:transform .18s ease, opacity .18s ease;}" +
  ".dq-backdrop.dq-open .dq-modal{transform:translateY(0) scale(1);opacity:1;}" +
  ".dq-backdrop.dq-closing{opacity:0;}" +
  ".dq-backdrop.dq-closing .dq-modal{transform:translateY(10px) scale(.985);opacity:0;}" +
  ".dq-head{display:flex;align-items:center;justify-content:space-between;padding:12px 12px;border-bottom:1px solid rgba(15,15,20,.08);background:#fff;}" +
  ".dq-head-title{font:900 13px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.25px;color:#0f0f14;}" +
  ".dq-x{appearance:none;border:1px solid rgba(15,15,20,.12);background:#fff;color:#0f0f14;border-radius:12px;padding:8px 10px;cursor:pointer;box-shadow:0 10px 22px rgba(0,0,0,.08);transition:transform .16s ease, box-shadow .16s ease;}" +
  ".dq-x:hover{transform:translateY(-1px);box-shadow:0 14px 28px rgba(0,0,0,.10);}" +
  ".dq-body{padding:12px;display:flex;flex-direction:column;gap:12px;overflow:auto;-webkit-overflow-scrolling:touch;}" +
  ".dq-stage{position:relative;width:100%;height:min(72vh,560px);border-radius:18px;border:1px solid rgba(15,15,20,.10);background:linear-gradient(180deg,#ffffff,#fbfbfd);box-shadow:0 18px 50px rgba(0,0,0,.08);overflow:hidden;}" +
  ".dq-stage img{width:100%;height:100%;display:block;background:#fff;object-fit:contain;object-position:center center;}" +
  ".dq-empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:rgba(15,15,20,.55);text-align:center;padding:18px;}" +
  ".dq-empty strong{color:#0f0f14;font:900 14px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}" +
  ".dq-empty span{font:600 12px/1.3 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}" +
  ".dq-processing{position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:10px;z-index:4;background:rgba(255,255,255,.62);backdrop-filter:blur(8px);}" +
  ".dq-processing.is-on{display:flex;}" +
  ".dq-spin{width:34px;height:34px;border-radius:999px;border:3px solid rgba(15,15,20,.14);border-top-color:#7c3aed;animation:dqspin 1s linear infinite;}" +
  "@keyframes dqspin{to{transform:rotate(360deg);}}" +
  ".dq-processing-inner{display:flex;flex-direction:column;align-items:center;gap:14px;min-height:4.5rem;justify-content:center;}" +
  ".dq-processing-text{font:900 14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f0f14;text-align:center;max-width:420px;padding:0 16px;}" +
  ".dq-processing-msg{animation:dq-msg-in .42s ease both;}" +
  "@keyframes dq-msg-in{0%{opacity:0;transform:translateY(8px) scale(.99)}100%{opacity:1;transform:translateY(0) scale(1)}}" +
  ".dq-progress{position:absolute;left:12px;right:12px;bottom:12px;z-index:5;height:10px;border-radius:999px;background:rgba(15,15,20,.10);overflow:hidden;display:none;}" +
  ".dq-progress.is-on{display:block;}" +
  ".dq-progress>span{display:block;height:100%;width:0%;background:linear-gradient(135deg,#7c3aed,#c084fc 45%,#ec4899 100%);background-size:200% 100%;transition:width .12s ease;position:relative;animation:dq-bar-pulse 1.9s ease-in-out infinite;}" +
  "@keyframes dq-bar-pulse{0%,100%{background-position:0% 50%;filter:brightness(1)}50%{background-position:100% 50%;filter:brightness(1.12)}}" +
  ".dq-row{display:flex;gap:10px;flex-wrap:wrap;}" +
  ".dq-choice{flex:1;min-width:160px;display:flex;align-items:center;gap:10px;justify-content:center;padding:12px 12px;border-radius:16px;border:1px solid rgba(15,15,20,.10);background:#fff;color:#0f0f14;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.06);font:900 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;transition:transform .16s ease, box-shadow .16s ease;}" +
  ".dq-choice:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(0,0,0,.09);}" +
  ".dq-ico{width:18px;height:18px;display:inline-block;opacity:.92;}" +
  ".dq-primary{appearance:none;border:0;cursor:pointer;border-radius:16px;padding:12px 12px;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;font:900 13px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;box-shadow:0 16px 34px rgba(124,58,237,.18),0 12px 30px rgba(236,72,153,.14);transition:transform .16s ease, filter .16s ease, box-shadow .16s ease;}" +
  ".dq-primary:hover{transform:translateY(-1px) scale(1.01);filter:saturate(1.05);}" +
  ".dq-primary:disabled{opacity:.55;cursor:not-allowed;transform:none;filter:none;}" +
  ".dq-save{appearance:none;border:1px solid rgba(15,15,20,.12);background:#fff;color:#0f0f14;cursor:pointer;border-radius:16px;padding:12px 12px;font:900 13px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;box-shadow:0 10px 26px rgba(0,0,0,.06);transition:transform .16s ease, box-shadow .16s ease;}" +
  ".dq-save:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(0,0,0,.09);}" +
  ".dq-brand{padding:12px 12px;border-top:1px solid rgba(15,15,20,.08);display:flex;align-items:center;justify-content:flex-start;background:#fff;}" +
  ".dq-brand span{font:900 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f0f14;letter-spacing:.25px;}" +
  ".dq-brand small{margin-left:8px;font:700 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:rgba(15,15,20,.55);}" +
  ".dq-cam-row{display:flex;flex-wrap:wrap;gap:10px;align-items:stretch;}" +
  ".dq-flip{flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;padding:12px 14px;border-radius:16px;border:1px solid rgba(15,15,20,.10);background:#fff;color:#0f0f14;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.06);font:900 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;transition:transform .16s ease, box-shadow .16s ease;}" +
  ".dq-flip:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(0,0,0,.09);}" +
  ".dq-flip:disabled{opacity:.55;cursor:not-allowed;transform:none;}" +
  ".dq-cam-row .dq-primary{flex:1;min-width:0;}" +
  "@media (max-width:420px){.dq-body{padding:10px}.dq-stage{height:min(74vh,520px)}.dq-choice{min-width:100%}}";

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
