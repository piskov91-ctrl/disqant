/** Example poses for full-body try-on uploads (Unsplash, free to use). */
export const PHOTO_POSE_GUIDE_GOOD_URL =
  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=360&h=480&q=80";
export const PHOTO_POSE_GUIDE_BAD_URL =
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=360&h=480&q=80";

export const PHOTO_POSE_GUIDE_CSS =
  ".dq-empty{padding:14px 14px 110px;justify-content:flex-start;overflow-y:auto;}" +
  ".dq-empty-sub{font:600 12px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:rgba(245,237,228,.58);max-width:320px;}" +
  ".dq-pose-guide{display:flex;gap:10px;width:100%;max-width:340px;margin-top:2px;}" +
  ".dq-pose-card{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px;}" +
  ".dq-pose-img-wrap{position:relative;width:100%;aspect-ratio:3/4;border-radius:10px;overflow:hidden;background:#1a1612;}" +
  ".dq-pose-card--good .dq-pose-img-wrap{border:1px solid rgba(52,211,153,.42);box-shadow:0 0 0 1px rgba(52,211,153,.1),0 10px 28px rgba(0,0,0,.4);}" +
  ".dq-pose-card--bad .dq-pose-img-wrap{border:1px solid rgba(248,113,113,.42);box-shadow:0 0 0 1px rgba(248,113,113,.1),0 10px 28px rgba(0,0,0,.4);}" +
  ".dq-pose-img-wrap img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block;}" +
  ".dq-pose-badge{position:absolute;top:6px;right:6px;width:22px;height:22px;border-radius:999px;display:flex;align-items:center;justify-content:center;font:900 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.35);}" +
  ".dq-pose-badge--good{background:rgba(16,185,129,.94);color:#052e1a;}" +
  ".dq-pose-badge--bad{background:rgba(239,68,68,.94);color:#fff;}" +
  ".dq-pose-label{font:800 11px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.02em;}" +
  ".dq-pose-label--good{color:#6ee7b7;}" +
  ".dq-pose-label--bad{color:#fca5a5;}" +
  ".dq-pose-guide--inline{margin-top:12px;max-width:none;}" +
  "@media (max-width:420px){.dq-pose-guide{gap:8px;max-width:100%;}.dq-pose-label{font-size:10px;}}";

export function buildPhotoPoseGuideHtml(goodUrl: string, badUrl: string): string {
  return (
    '<div class="dq-pose-guide" role="group" aria-label="Photo pose examples">' +
    '<div class="dq-pose-card dq-pose-card--good">' +
    '<div class="dq-pose-img-wrap">' +
    '<img src="' +
    goodUrl +
    '" alt="Good example: standing straight, full body visible" loading="lazy" decoding="async" />' +
    '<span class="dq-pose-badge dq-pose-badge--good" aria-hidden="true">✓</span>' +
    "</div>" +
    '<span class="dq-pose-label dq-pose-label--good">✓ Perfect</span>' +
    "</div>" +
    '<div class="dq-pose-card dq-pose-card--bad">' +
    '<div class="dq-pose-img-wrap">' +
    '<img src="' +
    badUrl +
    '" alt="Avoid: sideways or partially visible" loading="lazy" decoding="async" />' +
    '<span class="dq-pose-badge dq-pose-badge--bad" aria-hidden="true">✗</span>' +
    "</div>" +
    '<span class="dq-pose-label dq-pose-label--bad">✗ Avoid</span>' +
    "</div>" +
    "</div>"
  );
}

export function buildStageEmptyPoseGuideHtml(): string {
  return (
    "<strong>Upload a full-body photo</strong>" +
    '<span class="dq-empty-sub">Face forward with your full body in frame — good lighting helps.</span>' +
    buildPhotoPoseGuideHtml(PHOTO_POSE_GUIDE_GOOD_URL, PHOTO_POSE_GUIDE_BAD_URL)
  );
}
