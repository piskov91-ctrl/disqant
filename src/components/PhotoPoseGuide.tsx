import {
  PHOTO_POSE_GUIDE_BAD_LABEL,
  PHOTO_POSE_GUIDE_BAD_PATH,
  PHOTO_POSE_GUIDE_GOOD_LABEL,
  PHOTO_POSE_GUIDE_GOOD_PATH,
} from "@/lib/photoPoseGuide";

type PhotoPoseGuideProps = {
  /** Extra class on the row (e.g. `dq-pose-guide--inline` outside the stage empty state). */
  className?: string;
};

function PoseIllustration({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" decoding="async" />
  );
}

export function PhotoPoseGuide({ className }: PhotoPoseGuideProps) {
  const rowClass = ["dq-pose-guide", className].filter(Boolean).join(" ");
  return (
    <div className={rowClass} role="group" aria-label="Photo pose examples">
      <div className="dq-pose-card dq-pose-card--good">
        <div className="dq-pose-img-wrap">
          <PoseIllustration
            src={PHOTO_POSE_GUIDE_GOOD_PATH}
            alt="Stand straight facing camera, full body from head to toe"
          />
          <span className="dq-pose-badge dq-pose-badge--good" aria-hidden>
            ✓
          </span>
        </div>
        <span className="dq-pose-label dq-pose-label--good">{PHOTO_POSE_GUIDE_GOOD_LABEL}</span>
      </div>
      <div className="dq-pose-card dq-pose-card--bad">
        <div className="dq-pose-img-wrap">
          <PoseIllustration
            src={PHOTO_POSE_GUIDE_BAD_PATH}
            alt="Avoid side angles, cropped body, or harsh lighting"
          />
          <span className="dq-pose-badge dq-pose-badge--bad" aria-hidden>
            ✗
          </span>
        </div>
        <span className="dq-pose-label dq-pose-label--bad">{PHOTO_POSE_GUIDE_BAD_LABEL}</span>
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
