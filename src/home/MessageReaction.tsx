import { useTranslations } from "use-intl";
import thumbsUpEmoji from "../assets/thumbs-up-apple.png";
import thumbsDownEmoji from "../assets/thumbs-down-apple.png";
import laughEmoji from "../assets/laugh-apple.png";
import questionEmoji from "../assets/question-apple.png";
import heartEmoji from "../assets/heart-apple.png";
import zzzEmoji from "../assets/zzz-apple.webp";
import exclamationEmoji from "../assets/exclamation-apple.png";

import type { ChatReactionIcon } from "../lib/chat/reaction";
type MessageReactionData = {
  icon: ChatReactionIcon;
  label: string;
  from: "me" | "other";
};
import styles from "./MessageReaction.module.css";

const REACTION_IMAGES = {
  "thumbs-up": thumbsUpEmoji,
  "thumbs-down": thumbsDownEmoji,
  laugh: laughEmoji,
  question: questionEmoji,
  heart: heartEmoji,
  zzz: zzzEmoji,
  exclamation: exclamationEmoji,
};

export default function MessageReaction({
  icon,
  label,
  from,
  side = "right",
  animate = false,
  photo = false,
}: MessageReactionData & {
  side?: "left" | "right";
  animate?: boolean;
  photo?: boolean;
}) {
  const fromMe = from === "me";
  const t = useTranslations("Conversation");
  const colorClassName = fromMe
    ? "bg-[var(--message-blue-top,#2fa4fb)]"
    : "bg-[var(--message-incoming-bg)]";

  return (
    <span
      role="img"
      aria-label={
        fromMe ? t("myReaction", { label }) : t("theirReaction", { label })
      }
      data-outgoing-message={fromMe ? "" : undefined}
      data-message-reaction
      data-animate={animate ? "" : undefined}
      data-side={side}
      className={`${styles.reaction} pointer-events-none absolute ${photo ? `-top-5 size-[34px] ${side === "left" ? "-left-[11px]" : "-right-[11px]"}` : `-top-[30px] size-11 ${side === "left" ? "-left-[19px]" : "-right-[19px]"}`} z-10 grid place-items-center select-none`}
    >
      {!photo && (
        <>
          <span
            className={`${styles.connector} absolute ${side === "left" ? "left-[7px]" : "right-[7px]"} bottom-[3px] z-10 size-[9.5px] rounded-full ${colorClassName}`}
            aria-hidden="true"
          />
          <span
            className={`${styles.dot} absolute ${side === "left" ? "left-[4px]" : "right-[4px]"} bottom-[-2px] size-[4.5px] rounded-full ${colorClassName}`}
            aria-hidden="true"
          />
        </>
      )}
      <span
        className={`${styles.body} relative grid ${photo ? "size-[34px]" : "size-8"} place-items-center rounded-full border-[0.5px] border-(--home-background) ${colorClassName}`}
        aria-hidden="true"
      >
        <img
          src={REACTION_IMAGES[icon]}
          alt=""
          width={18}
          height={18}
          loading="eager"
          className={`${styles.icon} size-[18px] object-contain`}
        />
      </span>
    </span>
  );
}
