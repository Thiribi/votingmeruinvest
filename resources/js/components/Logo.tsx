import { useState } from "react";

type LogoProps = {
  size?: number;
  withWordmark?: boolean;
  className?: string;
  variant?: "default" | "light";
};

// Drop the brand PNG at `public/fansbench-brand.png` and it is served here at build time.
// Until then (or if it fails to load) the component falls back to the SVG mark below,
// so the header is never broken.
const BRAND_IMAGE_SRC = "/fansbench-brand.png";

/**
 * FansBench brand mark. Prefers the uploaded brand PNG; falls back to the built-in
 * staggered "people" SVG silhouettes (navy → electric blue → coral) if the image
 * is unavailable.
 */
export function Logo({
  size = 36,
  withWordmark = true,
  className,
  variant = "default",
}: LogoProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const wordmarkColor = variant === "light" ? "#FFFFFF" : "#12355B";

  if (!imgFailed) {
    return (
      <div className={`inline-flex items-center ${className ?? ""}`}>
        <img
          src={BRAND_IMAGE_SRC}
          alt="FansBench"
          height={size}
          style={{ height: size, width: "auto" }}
          className="object-contain"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark size={size} />
      {withWordmark && (
        <span
          className="font-display text-[19px] font-extrabold tracking-tight"
          style={{ color: wordmarkColor }}
        >
          FansBench
        </span>
      )}
    </div>
  );
}

export function LogoMark({ size = 36 }: { size?: number }) {
  // Five figures: heights ascend then apex, colours navy → electric → coral.
  const figures = [
    { x: 4,  bodyY: 20, bodyH: 16, headCy: 15, color: "#12355B" }, // deep navy
    { x: 12, bodyY: 14, bodyH: 22, headCy:  9, color: "#1E4E8C" }, // navy-blue
    { x: 20, bodyY: 8,  bodyH: 28, headCy:  4, color: "#2F80ED" }, // electric — apex
    { x: 28, bodyY: 14, bodyH: 22, headCy:  9, color: "#FB923C" }, // orange-light
    { x: 36, bodyY: 20, bodyH: 16, headCy: 15, color: "#F97316" }, // vibrant orange
  ];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="FansBench"
      role="img"
    >
      {figures.map((f, i) => (
        <g key={i}>
          <rect
            x={f.x}
            y={f.bodyY}
            width="6"
            height={f.bodyH}
            rx="3"
            fill={f.color}
          />
          <circle cx={f.x + 3} cy={f.headCy} r="2.75" fill={f.color} />
        </g>
      ))}
    </svg>
  );
}
