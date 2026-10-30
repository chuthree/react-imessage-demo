import { useFormatter, useLocale, useNow } from "use-intl";
import type { ChatTurn } from "./chat";
import { SharedReplySurface } from "./ReplyPreview";

function formatChatDate(date: Date, now: Date, locale: string): string {
  // Compare local calendar days, not elapsed hours: DST days can be 23 or 25 hours.
  const calendarDay = (value: Date) =>
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86400000;
  const daysAgo = calendarDay(now) - calendarDay(date);

  if (daysAgo === 0 || daysAgo === 1) {
    const label = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      -daysAgo,
      "day",
    );
    return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
  }

  const recent = daysAgo > 1 && daysAgo < 7;
  const english = locale.startsWith("en");
  const sameYear = date.getFullYear() === now.getFullYear();
  const formatter = new Intl.DateTimeFormat(locale, {
    ...(recent
      ? { weekday: "long" as const }
      : {
          month: "long" as const,
          day: "numeric" as const,
          ...(!sameYear
            ? { year: "numeric" as const }
            : english
              ? {}
              : { weekday: "short" as const }),
        }),
  });
  if (english && !recent && sameYear) {
    const weekday = new Intl.DateTimeFormat(locale, {
      weekday: "short",
    }).format(date);
    return `${formatter.format(date)}, ${weekday}`;
  }
  // Match the original Chinese layout: “10月15日 周四”, with a space before the weekday.
  return formatter
    .formatToParts(date)
    .map(({ type, value }) =>
      locale.startsWith("zh") && type === "weekday" && !recent
        ? ` ${value}`
        : value,
    )
    .join("");
}

type ChatTimeGroup = { id: string; turn: Pick<ChatTurn, "sentAt"> };

export default function ChatTimestamp({
  time,
  heading = false,
  showTime = true,
  weekdayOnly = false,
}: {
  time: ChatTimeGroup;
  heading?: boolean;
  showTime?: boolean;
  // Curated demo conversations keep weekday labels, even when older than seven days.
  weekdayOnly?: boolean;
}) {
  const format = useFormatter();
  const now = useNow({ updateInterval: 60000 });
  const locale = useLocale();

  const date = new Date(time.turn.sentAt);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const label = weekdayOnly
    ? format.dateTime(date, { timeZone, weekday: "long" })
    : formatChatDate(date, now, locale);
  const Tag = heading ? "h2" : "p";
  return (
    <div data-chat-layout-row className={heading ? undefined : "mt-3 mb-3"}>
      <SharedReplySurface id={time.id} className="mx-auto w-fit max-w-full">
        <Tag className="m-0 h-4 w-fit max-w-full text-center text-[11px] leading-4 whitespace-nowrap text-(--message-timestamp) select-none">
          <time dateTime={date.toISOString()}>
            <span className="font-medium">{label}</span>
            {showTime && (
              <span className="ml-0.5">
                {format.dateTime(date, {
                  timeZone,
                  hour: locale.startsWith("zh") ? "2-digit" : "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
          </time>
        </Tag>
      </SharedReplySurface>
    </div>
  );
}
