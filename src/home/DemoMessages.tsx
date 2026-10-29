import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "use-intl";
import { useState, type ReactNode } from "react";
import MessageReaction from "./MessageReaction";
import { chatReactionIcons } from "../lib/chat/reaction";
import MessageBubbleShape, {
  messageBubbleFrame,
} from "../components/MessageBubbleShape";
import FittedMessageText from "./FittedMessageText";
import ChatPhotoMessage from "./ChatPhotoMessage";
import PhotoReplyThumbnail from "./PhotoReplyThumbnail";
import ChatMessageDelivery from "./ChatMessageDelivery";
import ChatTypingIndicator from "./ChatTypingIndicator";
import ReplyThreadConnector from "./ReplyThreadConnector";
import { SharedReplySurface, useReplyPreview } from "./ReplyPreview";
import { turnMessages, type ChatTurn, type DemoMessage } from "./chat";
import styles from "./HomeChat.module.css";

export function ReplyQuote({
  message,
  onOpen,
}: {
  message: DemoMessage;
  onOpen: (message: DemoMessage) => void;
}) {
  const t = useTranslations("Conversation");
  const h = useTranslations("HomeChat");
  const label =
    message.text || h("photos", { count: message.photos?.length ?? 0 });
  return (
    <blockquote
      className={`relative m-0 w-fit max-w-[73.5%] ${message.outgoing ? "ml-auto" : ""}`}
    >
      <Dialog.Trigger
        data-reply-thread={message.threadId}
        aria-label={t("viewReplies", { name: label })}
        onClick={() => onOpen(message)}
        className={`${messageBubbleFrame} block min-h-7! max-w-full min-w-10! cursor-pointer rounded-[20px] text-left text-xs leading-4 outline-none [--bubble-fill:var(--home-background,#fff)] ${message.photos?.length ? "w-12" : "px-2.5 py-1.5"} ${message.outgoing ? "text-(--message-link) [&>svg]:-scale-x-100 [--message-border:color-mix(in_srgb,var(--message-link)_40%,var(--home-background,#fff))]" : "text-(--message-secondary)"} focus-visible:outline-2 focus-visible:outline-[#007aff] active:opacity-70`}
      >
        {message.photos?.length ? (
          <PhotoReplyThumbnail
            photo={message.photos[0]}
            outgoing={Boolean(message.outgoing)}
          />
        ) : (
          <>
            <MessageBubbleShape tail bordered />
            <span className="line-clamp-3 [overflow-wrap:anywhere] whitespace-pre-wrap">
              {message.text}
            </span>
          </>
        )}
      </Dialog.Trigger>
    </blockquote>
  );
}

export function MessageRow({
  message,
  turn,
  latestId,
  latestReadId,
  onSelect,
  count = 0,
  tail = true,
  delivery = false,
}: {
  message: DemoMessage;
  turn?: ChatTurn;
  latestId?: string;
  latestReadId?: string;
  onSelect: (message: DemoMessage, last?: boolean) => void;
  count?: number;
  tail?: boolean;
  delivery?: boolean;
}) {
  const t = useTranslations("Conversation");
  const h = useTranslations("HomeChat");
  const { inPreview } = useReplyPreview();
  const d = useTranslations("Demo");
  const reaction =
    message.outgoing &&
    turn?.reaction?.target === (message.photos?.length ? "photo" : "text")
      ? turn.reaction
      : undefined;
  const [initialReaction] = useState(reaction);
  const animateReaction = Boolean(
    reaction && reaction !== initialReaction && turn?.live,
  );
  const label =
    message.text || h("photos", { count: message.photos?.length ?? 0 });
  const receipt =
    delivery && turn ? (
      <ChatMessageDelivery
        turn={turn}
        failed={false}
        busy={false}
        latestId={latestId}
        latestReadId={latestReadId}
        onRetry={() => {}}
      />
    ) : undefined;
  return (
    <div
      data-chat-layout-row
      className={`relative flex w-full flex-col ${reaction && (reaction.target !== "photo" || reaction.index === 0) ? "mt-6" : ""} ${count && !inPreview ? "mb-6" : ""}`}
    >
      <SharedReplySurface
        id={message.id}
        className={`relative flex w-full flex-col ${message.outgoing ? "items-end" : "items-start"} ${!message.outgoing && turn?.live && !inPreview ? styles.replyIn : ""}`}
      >
        {message.photos?.length ? (
          <ChatPhotoMessage
            photos={message.photos}
            tail={tail}
            outgoing={Boolean(message.outgoing)}
            messageId={message.id}
            delivery={receipt}
            reaction={reaction}
            animateReaction={animateReaction}
          />
        ) : (
          <div
            tabIndex={0}
            data-message-id={message.id}
            data-message-selection={message.outgoing ? "outgoing" : "incoming"}
            data-chat-outgoing={
              message.outgoing && !turn?.photos?.length ? turn?.id : undefined
            }
            data-outgoing-message={message.outgoing ? "" : undefined}
            className={`${messageBubbleFrame} pointer-events-auto flex w-fit ${message.outgoing ? "max-w-[73.5%] self-end text-white" : "min-h-[42px] max-w-[78%] self-start text-(--message-foreground)"} items-center justify-center rounded-[20px] px-3.5 py-[9px] text-[17px] leading-tight [overflow-wrap:anywhere] whitespace-pre-wrap focus-visible:outline-2 focus-visible:outline-[#007aff]`}
          >
            <MessageBubbleShape
              outgoing={Boolean(message.outgoing)}
              tail={tail}
            />
            <span className="sr-only">
              {h(message.outgoing ? "you" : "assistant")}
            </span>
            <FittedMessageText>
              {message.id === "intro"
                ? d.rich("intro", {
                    demo: (chunks) => (
                      <a
                        href="https://github.com/chuthree/react-imessage-demo"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={d("github")}
                        className="inline cursor-pointer rounded-sm text-(--message-link) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007aff]"
                      >
                        {chunks}
                      </a>
                    ),
                  })
                : message.text}
            </FittedMessageText>
            {reaction && (
              <MessageReaction
                key={reaction.type}
                icon={chatReactionIcons[reaction.type]}
                label={h(`reactions.${reaction.type}`)}
                from="other"
                side="left"
                animate={animateReaction}
              />
            )}
          </div>
        )}
        {!message.photos?.length && receipt}
      </SharedReplySurface>
      {count > 0 && !inPreview && (
        <Dialog.Trigger
          data-reply-thread={message.threadId}
          aria-label={t("viewReplyCount", { name: label, count })}
          onClick={() => onSelect(message, true)}
          className={`absolute top-full mt-1 block w-fit cursor-pointer rounded-sm text-xs leading-4 whitespace-nowrap text-(--message-link) after:absolute after:-inset-x-2 after:-inset-y-1 ${message.outgoing ? "right-8" : "left-8"} focus-visible:outline-2 focus-visible:outline-[#007aff] active:opacity-70`}
        >
          {t("replyCount", { count })}
        </Dialog.Trigger>
      )}
    </div>
  );
}

export function TurnMessages({
  turn,
  previous,
  adjacentTo,
  messages,
  latestId,
  latestReadId,
  onSelect,
  counts,
}: {
  turn: ChatTurn;
  previous?: ChatTurn;
  adjacentTo?: DemoMessage;
  messages: Map<string, DemoMessage>;
  latestId?: string;
  latestReadId?: string;
  onSelect: (message: DemoMessage, last?: boolean) => void;
  counts: Map<string, number>;
}) {
  const { inPreview } = useReplyPreview();
  const all = turnMessages(turn);
  const outgoing = all.filter((message) => message.outgoing);
  const incoming = all.filter((message) => !message.outgoing);
  const originalQuote = turn.context
    ? (messages.get(turn.context.messageId) ?? turn.quote)
    : undefined;
  const photoIndex = turn.context?.photoIndex ?? 0;
  const photo = originalQuote?.photos?.[photoIndex] ?? turn.context?.photo;
  const quote = originalQuote
    ? {
        ...originalQuote,
        text: photo?.name ?? originalQuote.text,
        photos: photo ? [photo] : undefined,
        photoIndex: photo ? photoIndex : undefined,
      }
    : undefined;
  const adjacent = Boolean(
    turn.context &&
    adjacentTo?.id === turn.context.messageId &&
    (turn.context.photoIndex === undefined ||
      turn.context.photoIndex === (adjacentTo.photos?.length ?? 1) - 1),
  );
  const continues = Boolean(
    turn.context &&
    previous?.reply.length &&
    previous?.context?.threadId === turn.context.threadId &&
    previous.context.messageId === turn.context.messageId &&
    previous.context.photoIndex === turn.context.photoIndex,
  );
  const render = (
    message: DemoMessage,
    tail: boolean,
    delivery = false,
  ): ReactNode => (
    <MessageRow
      key={message.id}
      message={message}
      turn={turn}
      latestId={latestId}
      latestReadId={latestReadId}
      onSelect={onSelect}
      count={counts.get(message.id)}
      tail={tail}
      delivery={delivery}
    />
  );
  return (
    <li className="relative flex flex-col gap-3">
      {!inPreview && quote && !continues && !adjacent && (
        <div data-chat-layout-row data-chat-quote className="mb-4">
          <ReplyQuote message={quote} onOpen={onSelect} />
        </div>
      )}
      {!inPreview && quote && (
        <ReplyThreadConnector
          continuation={continues || adjacent}
          continuationFrom={
            adjacent
              ? adjacentTo?.id
              : continues && previous
                ? turnMessages(previous).at(-1)?.id
                : undefined
          }
          outgoingQuote={Boolean(quote.outgoing)}
          connected={turn.reply.length > 0}
          live={turn.live}
        />
      )}
      {outgoing.length > 0 && (
        <div
          data-chat-outgoing={turn.photos?.length ? turn.id : undefined}
          className="relative mb-3.5 flex w-full shrink-0 flex-col items-end gap-1"
        >
          {outgoing.map((message, index) =>
            render(
              message,
              index === outgoing.length - 1,
              index === outgoing.length - 1,
            ),
          )}
        </div>
      )}
      {(incoming.length > 0 || turn.status === "waiting") && (
        <div
          data-chat-incoming={turn.reply.length ? "" : undefined}
          className="flex flex-col gap-1"
        >
          {incoming.map((message, index) =>
            render(
              message,
              index === incoming.length - 1 && turn.status !== "waiting",
            ),
          )}
          {turn.status === "waiting" && (
            <div data-chat-layout-row>
              <SharedReplySurface
                id={`chat-${turn.id}-typing`}
                className="h-[42px] w-[58px] shrink-0 self-start"
              >
                <ChatTypingIndicator animateEntrance={!inPreview} />
              </SharedReplySurface>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
