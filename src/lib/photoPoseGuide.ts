/** Illustrated silhouettes — body position only, no facial stock photos. */
export const PHOTO_POSE_GUIDE_GOOD_PATH = "/tryon-pose-good.svg";
export const PHOTO_POSE_GUIDE_BAD_PATH = "/tryon-pose-bad.svg";

export const PHOTO_POSE_GUIDE_GOOD_LABEL = "✓ Stand straight, full body";
export const PHOTO_POSE_GUIDE_BAD_LABEL = "✗ Avoid side angles";

export const PHOTO_POSE_GUIDE_CSS =
  ".dq-empty{padding:14px 14px 110px;justify-content:flex-start;overflow-y:auto;}" +
  ".dq-empty-sub{font:600 12px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:rgba(245,237,228,.58);max-width:320px;}" +
  ".dq-pose-guide{display:flex;gap:10px;width:100%;max-width:340px;margin-top:2px;}" +
  ".dq-pose-card{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px;}" +
  ".dq-pose-img-wrap{position:relative;width:100%;aspect-ratio:3/4;border-radius:10px;overflow:hidden;background:#121018;}" +
  ".dq-pose-card--good .dq-pose-img-wrap{border:1px solid rgba(52,211,153,.42);box-shadow:0 0 0 1px rgba(52,211,153,.1),0 10px 28px rgba(0,0,0,.4);}" +
  ".dq-pose-card--bad .dq-pose-img-wrap{border:1px solid rgba(248,113,113,.42);box-shadow:0 0 0 1px rgba(248,113,113,.1),0 10px 28px rgba(0,0,0,.4);}" +
  ".dq-pose-img-wrap img,.dq-pose-img-wrap svg{width:100%;height:100%;object-fit:contain;object-position:center;display:block;}" +
  ".dq-pose-badge{position:absolute;top:6px;right:6px;width:22px;height:22px;border-radius:999px;display:flex;align-items:center;justify-content:center;font:900 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.35);}" +
  ".dq-pose-badge--good{background:rgba(16,185,129,.94);color:#052e1a;}" +
  ".dq-pose-badge--bad{background:rgba(239,68,68,.94);color:#fff;}" +
  ".dq-pose-label{font:800 10px/1.25 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.01em;text-align:center;max-width:100%;}" +
  ".dq-pose-label--good{color:#6ee7b7;}" +
  ".dq-pose-label--bad{color:#fca5a5;}" +
  ".dq-pose-guide--inline{margin-top:12px;max-width:none;}" +
  "@media (max-width:420px){.dq-pose-guide{gap:8px;max-width:100%;}.dq-pose-label{font-size:9px;}}";

export function buildPhotoPoseGuideHtml(goodSrc: string, badSrc: string): string {
  return (
    '<div class="dq-pose-guide" role="group" aria-label="Photo pose examples">' +
    '<div class="dq-pose-card dq-pose-card--good">' +
    '<div class="dq-pose-img-wrap">' +
    '<img src="' +
    goodSrc +
    '" alt="Stand straight facing camera, full body from head to toe" loading="lazy" decoding="async" />' +
    '<span class="dq-pose-badge dq-pose-badge--good" aria-hidden="true">✓</span>' +
    "</div>" +
    '<span class="dq-pose-label dq-pose-label--good">' +
    PHOTO_POSE_GUIDE_GOOD_LABEL +
    "</span>" +
    "</div>" +
    '<div class="dq-pose-card dq-pose-card--bad">' +
    '<div class="dq-pose-img-wrap">' +
    '<img src="' +
    badSrc +
    '" alt="Avoid side angles, cropped body, or harsh lighting" loading="lazy" decoding="async" />' +
    '<span class="dq-pose-badge dq-pose-badge--bad" aria-hidden="true">✗</span>' +
    "</div>" +
    '<span class="dq-pose-label dq-pose-label--bad">' +
    PHOTO_POSE_GUIDE_BAD_LABEL +
    "</span>" +
    "</div>" +
    "</div>"
  );
}

export function buildStageEmptyPoseGuideHtml(assetOrigin: string): string {
  const base = assetOrigin.replace(/\/$/, "");
  return (
    "<strong>Upload a full-body photo</strong>" +
    '<span class="dq-empty-sub">Face forward with your full body in frame — good lighting helps.</span>' +
    buildPhotoPoseGuideHtml(
      base + PHOTO_POSE_GUIDE_GOOD_PATH,
      base + PHOTO_POSE_GUIDE_BAD_PATH,
    )
  );
}
