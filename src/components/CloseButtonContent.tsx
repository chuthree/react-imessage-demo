import GlassButtonContent from "./GlassButtonContent";
import { iconButtonClass } from "./iconButtonClass";

export const closeButtonClassName = `${iconButtonClass} size-11`;

export default function CloseButtonContent() {
  return (
    <GlassButtonContent size={44}>
      <svg
        aria-hidden="true"
        className="size-5"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path
          d="m2.75 2.75 14.5 14.5M17.25 2.75 2.75 17.25"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </GlassButtonContent>
  );
}
