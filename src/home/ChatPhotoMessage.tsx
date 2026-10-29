import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type SVGProps,
} from "react";
import { useReducedMotion } from "framer-motion";
import { useTranslations } from "use-intl";
import bubblePath from "../components/messageBubblePath";
import type { ChatPhoto } from "../lib/chat/photos";
import MessageReaction from "./MessageReaction";
import { chatReactionIcons, type ChatReaction } from "../lib/chat/reaction";
import { readChatAnimation } from "./chatAnimations";
import { useSharedReplyImage } from "./ReplyPreview";

function ChatPhotoImage({
  photo,
  messageId,
  index,
  ...props
}: {
  photo: ChatPhoto;
  messageId: string;
  index: number;
} & SVGProps<SVGImageElement>) {
  const reducedMotion = useReducedMotion();
  const animationId = photo.animationId;
  const imageRef = useRef<SVGImageElement>(null);
  useSharedReplyImage(
    animationId || /\.gif(?:$|[?#])/i.test(photo.url) ? messageId : "",
    index,
    imageRef,
  );
  const [animation, setAnimation] = useState<{ id: string; url: string }>();
  useEffect(() => {
    if (!animationId) return;
    let disposed = false;
    let url: string | undefined;
    void readChatAnimation(animationId)
      .then((blob) => {
        if (disposed || !blob) return;
        url = URL.createObjectURL(blob);
        setAnimation({ id: animationId, url });
      })
      .catch(() => {}); // A missing or evicted original still has a valid static preview.
    return () => {
      disposed = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [animationId]);
  return (
    <g>
      <image
        ref={imageRef}
        {...props}
        href={
          !reducedMotion && animationId && animation?.id === animationId
            ? animation.url
            : photo.url
        }
      />
    </g>
  );
}

// Figma supplies the surface; the supplied phone capture supplies variable card proportions.
export default function ChatPhotoMessage({
  photos,
  tail,
  messageId,
  reaction,
  animateReaction = false,
  outgoing = true,
  maxWidth = 273.5,
  imageKind = "photo",
  delivery,
}: {
  photos: ChatPhoto[];
  tail: boolean;
  messageId: string;
  reaction?: ChatReaction;
  animateReaction?: boolean;
  outgoing?: boolean;
  maxWidth?: number;
  imageKind?: "photo" | "sticker";
  delivery?: ReactNode;
}) {
  const t = useTranslations("HomeChat");
  const reactions = useTranslations("HomeChat.reactions");
  const reactionIndex = reaction?.index;
  const id = useId();
  const stacked = photos.length === 2;
  const bottom = !stacked && tail ? 6.433 : 0;
  const cards = photos.map((photo) => {
    if (!stacked) {
      const width = Math.min(
        maxWidth,
        ((364 - bottom) * photo.width) / photo.height,
      );
      return { width, height: (width * photo.height) / photo.width };
    }
    // Approximate the phone capture: similar visual area, with moderate cropping at the extremes.
    const ratio = Math.max(3 / 4, Math.min(4 / 3, photo.width / photo.height));
    return {
      width: Math.sqrt(27000 * ratio),
      height: Math.sqrt(27000 / ratio),
    };
  });
  const angle = (1.11006 * Math.PI) / 180;
  const second = cards[1];
  const rotatedWidth = second
    ? second.width * Math.cos(angle) + second.height * Math.sin(angle)
    : 0;
  const rotatedHeight = second
    ? second.height * Math.cos(angle) + second.width * Math.sin(angle)
    : 0;
  const firstOnLeft = stacked && cards[0].width > second.width;
  const lowerTop = cards[0].height * (181.933 / 216);
  const width = stacked
    ? Math.max(cards[0].width, rotatedWidth) + 50.75
    : cards[0].width;
  const height = stacked
    ? Math.max(cards[0].height, lowerTop + rotatedHeight)
    : cards[0].height;
  return (
    <div
      data-message-id={imageKind === "sticker" ? messageId : undefined}
      data-chat-photo-group
      data-outgoing-message={outgoing ? "" : undefined}
      className={`${stacked ? "my-2" : ""} relative shrink-0 has-[[data-message-delivery]]:mb-5 has-[[data-message-retry]]:mr-[34px] ${outgoing ? "max-w-[73.5%] self-end" : "max-w-full self-start"}`}
      style={{ width, aspectRatio: `${width} / ${height + bottom}` }}
    >
      {photos.map((photo, index) => {
        const card = cards[index];
        const left = stacked
          ? index === 0
            ? firstOnLeft
              ? 0
              : width - card.width
            : (firstOnLeft ? width - rotatedWidth : 0) +
              second.height * Math.sin(angle)
          : 0;
        const top = stacked && index === 1 ? lowerTop : 0;
        return (
          <div
            key={index}
            tabIndex={0}
            data-message-id={messageId}
            data-chat-photo-item
            data-photo-index={imageKind === "photo" ? index : undefined}
            data-message-selection={outgoing ? "outgoing" : "incoming"}
            className="pointer-events-auto absolute origin-top-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007aff]"
            style={{
              left: `${(left / width) * 100}%`,
              top: `${(top / (height + bottom)) * 100}%`,
              width: `${(card.width / width) * 100}%`,
              aspectRatio: `${card.width} / ${card.height + bottom}`,
              transform:
                stacked && index === 1 ? "rotate(1.11006deg)" : undefined,
              filter: stacked
                ? "drop-shadow(0 4px 7px rgb(0 0 0 / 0.12))"
                : undefined,
            }}
          >
            <svg
              role="img"
              aria-label={t(imageKind, { name: photo.name })}
              viewBox={`0 0 ${card.width} ${card.height + bottom}`}
              className="block size-full overflow-visible"
            >
              <defs>
                <clipPath id={`${id}-${index}`}>
                  {stacked ? (
                    <rect width={card.width} height={card.height} rx="20" />
                  ) : (
                    <path
                      d={bubblePath(card.width, card.height, 20, tail)}
                      transform={
                        outgoing
                          ? `translate(${card.width} 0) scale(-1 1)`
                          : undefined
                      }
                    />
                  )}
                </clipPath>
              </defs>
              <ChatPhotoImage
                photo={photo}
                messageId={messageId}
                index={index}
                width={card.width}
                height={card.height + bottom}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${id}-${index})`}
                className="pointer-events-none"
              />
              <rect
                aria-hidden="true"
                width={card.width}
                height={card.height + bottom}
                fill="transparent"
                clipPath={`url(#${id}-${index})`}
              />
            </svg>
            {reaction && reactionIndex === index && (
              <MessageReaction
                photo
                key={reaction.type}
                icon={chatReactionIcons[reaction.type]}
                label={reactions(reaction.type)}
                from="other"
                side="left"
                animate={animateReaction}
              />
            )}
          </div>
        );
      })}
      {delivery}
    </div>
  );
}
