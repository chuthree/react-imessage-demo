import { useFormatter, useNow, useTranslations } from "use-intl";
import type { ChatTurn } from "./chat";
type ChatTimeGroup = { id: string; turn: ChatTurn };
import { SharedReplySurface } from "./ReplyPreview";

export default function ChatTimestamp({
  time,
  heading = false,
}: {
  time: ChatTimeGroup;
  heading?: boolean;
}) {
  const format = useFormatter();
  const now = useNow({ updateInterval: 60000 });
  const t = useTranslations("HomeChat");
  if (!time.turn.sentAt) return null;
  const date = new Date(time.turn.sentAt);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const label = sameDay(date, now)
    ? t("today")
    : sameDay(date, yesterday)
      ? t("yesterday")
      : format.dateTime(date, {
          timeZone,
          month: "short",
          day: "numeric",
          weekday: "short",
          ...(date.getFullYear() !== now.getFullYear()
            ? { year: "numeric" as const }
            : {}),
        });
  const Tag = heading ? "h2" : "p";
  return (
    <div data-chat-layout-row className={heading ? undefined : "mt-3 mb-3"}>
      <SharedReplySurface id={time.id} className="mx-auto w-fit max-w-full">
        <Tag className="m-0 h-4 w-fit max-w-full text-center text-[11px] leading-4 whitespace-nowrap text-(--message-timestamp) select-none">
          <time dateTime={date.toISOString()}>
            <span className="font-medium">{label}</span>
            <span className="ml-0.5">
              {format.dateTime(date, {
                timeZone,
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </time>
        </Tag>
      </SharedReplySurface>
    </div>
  );
}
