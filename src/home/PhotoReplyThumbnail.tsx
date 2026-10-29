import { useId } from "react";
import type { ChatPhoto } from "../lib/chat/photos";
import bubblePath from "../components/messageBubblePath";

export default function PhotoReplyThumbnail({
  photo,
  outgoing,
}: {
  photo: ChatPhoto;
  outgoing: boolean;
}) {
  const id = useId();
  const scale = Math.max(48 / photo.width, 54.433 / photo.height);
  const width = photo.width * scale;
  const height = photo.height * scale;
  return (
    <span className="relative block size-12">
      <svg
        aria-hidden="true"
        viewBox="0 0 48 54.433"
        className="absolute top-0 left-0 h-[54.433px] w-12 overflow-visible opacity-50"
      >
        <defs>
          <clipPath id={id}>
            <path
              d={bubblePath(48, 48, 14, true)}
              transform={outgoing ? "translate(48 0) scale(-1 1)" : undefined}
            />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id})`}>
          <image
            href={photo.url}
            x={(48 - width) / 2}
            y={(54.433 - height) / 2}
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        </g>
      </svg>
    </span>
  );
}
