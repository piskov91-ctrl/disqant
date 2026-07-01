import {
  PHOTO_POSE_GUIDE_BAD_URL,
  PHOTO_POSE_GUIDE_GOOD_URL,
} from "@/lib/photoPoseGuide";

type PhotoPoseGuideProps = {
  /** Extra class on the row (e.g. `dq-pose-guide--inline` outside the stage empty state). */
  className?: string;
};

export function PhotoPoseGuide({ className }: PhotoPoseGuideProps) {
  const rowClass = ["dq-pose-guide", className].filter(Boolean).join(" ");
  return (
    <div className={rowClass} role="group" aria-label="Photo pose examples">
      <div className="dq-pose-card dq-pose-card--good">
        <div className="dq-pose-img-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PHOTO_POSE_GUIDE_GOOD_URL}
            alt="Good example: standing straight, full body visible"
            loading="lazy"
            decoding="async"
          />
          <span className="dq-pose-badge dq-pose-badge--good" aria-hidden>
            ✓
          </span>
        </div>
        <span className="dq-pose-label dq-pose-label--good">✓ Perfect</span>
      </div>
      <div className="dq-pose-card dq-pose-card--bad">
        <div className="dq-pose-img-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PHOTO_POSE_GUIDE_BAD_URL}
            alt="Avoid: sideways or partially visible"
            loading="lazy"
            decoding="async"
          />
          <span className="dq-pose-badge dq-pose-badge--bad" aria-hidden>
            ✗
          </span>
        </div>
        <span className="dq-pose-label dq-pose-label--bad">✗ Avoid</span>
      </div>
    </div>
  );
}

export function PhotoPoseGuideEmpty() {
  return (
    <>
      <strong>Upload a full-body photo</strong>
      <span className="dq-empty-sub">
        Face forward with your full body in frame — good lighting helps.
      </span>
      <PhotoPoseGuide />
    </>
  );
}
