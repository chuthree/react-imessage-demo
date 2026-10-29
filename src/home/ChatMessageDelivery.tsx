import { useState } from "react";
import { CircleAlert } from "lucide-react";
import { useFormatter, useTranslations } from "use-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useReplyPreview } from "./ReplyPreview";
import type { ChatTurn } from "./chat";

const receiptScale = [
  0, 0.194, 0.456, 0.675, 0.825, 0.906, 0.95, 0.975, 0.988, 1,
];
const receiptTimes = [0, 0.09, 0.21, 0.33, 0.45, 0.58, 0.7, 0.82, 0.91, 1];

export default function ChatMessageDelivery({
  turn,
  failed,
  latestId,
  latestReadId,
  busy,
  onRetry,
}: {
  turn: ChatTurn;
  failed: boolean;
  latestId?: string;
  latestReadId?: string;
  busy: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations("HomeChat");
  const format = useFormatter();
  const reduced = useReducedMotion();
  const { inPreview } = useReplyPreview();
  const [animateFailure, setAnimateFailure] = useState(
    () => Boolean(turn.live) && turn.status !== "error",
  );
  const superseded = Boolean(turn.readAt) && turn.id !== latestReadId;

  return (
    <>
      {failed && (
        <>
          <motion.p
            data-message-delivery
            role="status"
            initial={
              reduced || !animateFailure ? false : { opacity: 0, scale: 0 }
            }
            animate={{
              opacity: 1,
              scale: reduced || !animateFailure ? 1 : receiptScale,
            }}
            transition={{
              opacity: {
                delay: reduced || !animateFailure ? 0 : 0.075,
                duration: reduced ? 0 : 0.15,
              },
              scale: {
                delay: reduced || !animateFailure ? 0 : 0.075,
                duration: reduced ? 0 : 0.55,
                ease: "linear",
                times: receiptTimes,
              },
            }}
            className="pointer-events-none absolute top-full right-0 m-0 mt-1.5 origin-center text-[11px] leading-4 font-semibold whitespace-nowrap text-[#ff3b30] select-none in-data-[home-theme=dark]:text-[#ff453a]"
          >
            {t("notDelivered")}
          </motion.p>
          <button
            data-message-retry
            type="button"
            onClick={() => {
              setAnimateFailure(true);
              onRetry();
            }}
            disabled={busy || turn.id !== latestId}
            aria-label={t("retryNotDelivered")}
            className="pointer-events-auto absolute top-1/2 -right-[34px] flex size-8 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full text-[#ff3b30] outline-none before:absolute before:-inset-1 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default in-data-[home-theme=dark]:text-[#ff453a]"
          >
            <CircleAlert size={24} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </>
      )}
      <AnimatePresence initial={false}>
        {/* Keep faded read receipts mounted so their reserved space stays stable. */}
        {turn.status !== "error" &&
          (turn.readAt ||
            (turn.id === latestId &&
              (turn.status === "sent" || turn.status === "waiting"))) && (
            <motion.p
              data-message-delivery
              key={turn.readAt ? "read" : "sent"}
              role={superseded ? undefined : "status"}
              aria-hidden={superseded || undefined}
              aria-label={t(turn.readAt ? "readByAI" : "sentToAI")}
              initial={
                reduced || !turn.live || inPreview
                  ? false
                  : {
                      opacity: turn.readAt ? 0 : 1,
                      scale: turn.readAt ? 1 : 0,
                    }
              }
              animate={{
                opacity: superseded ? 0 : 1,
                scale: reduced || turn.readAt || inPreview ? 1 : receiptScale,
              }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: reduced ? 0 : 0.15 },
                scale: {
                  duration: reduced ? 0 : 0.55,
                  ease: "linear",
                  times: receiptTimes,
                },
              }}
              className="pointer-events-none absolute top-full right-5 m-0 mt-1.5 origin-center text-[11px] leading-4 font-semibold whitespace-nowrap text-(--message-secondary) select-none"
            >
              {turn.readAt
                ? t.rich("readAt", {
                    time: format.dateTime(new Date(turn.readAt), {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                      timeZone: turn.live
                        ? Intl.DateTimeFormat().resolvedOptions().timeZone
                        : "Asia/Shanghai",
                    }),
                    timeText: (chunks) => (
                      <span className="font-normal">{chunks}</span>
                    ),
                  })
                : t("sent")}
            </motion.p>
          )}
      </AnimatePresence>
    </>
  );
}
