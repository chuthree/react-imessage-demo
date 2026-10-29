import type { ReactNode } from "react";
import ProfileGlassSurface from "./ProfileGlassSurface";

export default function GlassButtonContent({
  children,
  size = 36,
}: {
  children: ReactNode;
  size?: 36 | 44;
}) {
  const sizeClassName = size === 44 ? "size-11" : "size-9";

  return (
    <ProfileGlassSurface
      radius={size / 2}
      smoothing={0}
      className={`${sizeClassName} block! shrink-0 touch-manipulation rounded-full`}
    >
      <span
        className={`grid place-items-center group-disabled/glass-button:opacity-40 ${sizeClassName}`}
      >
        {children}
      </span>
    </ProfileGlassSurface>
  );
}
