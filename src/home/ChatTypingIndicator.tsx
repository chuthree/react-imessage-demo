import { useTranslations } from "use-intl";
import styles from "./HomeChat.module.css";

export default function ChatTypingIndicator({
  animateEntrance = true,
}: {
  animateEntrance?: boolean;
}) {
  const t = useTranslations("HomeChat");

  return (
    <span
      role="status"
      aria-label={t("typing")}
      className="relative block h-[42px] w-[58px] shrink-0 self-start"
    >
      <span
        aria-hidden="true"
        className={`${animateEntrance ? styles.typingSmallCircle : ""} absolute bottom-0 -left-[5px] size-[5.5px] rounded-full bg-(--message-incoming-bg)`}
      />
      <span
        aria-hidden="true"
        className={`${animateEntrance ? styles.typingCircle : ""} absolute bottom-[3px] left-0 size-3 rounded-full bg-(--message-incoming-bg)`}
      />
      <span
        aria-hidden="true"
        className={`${animateEntrance ? styles.typingBody : ""} relative flex h-[35px] w-[58px] items-center justify-center gap-1 rounded-full bg-(--message-incoming-bg)`}
      >
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className={`${styles.dot} size-[8.5px] rounded-full bg-[#767676] dark:bg-[#aaa]`}
          />
        ))}
      </span>
    </span>
  );
}
