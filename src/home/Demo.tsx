import coffeeImage from "../assets/demo-coffee.webp";
import alleyImage from "../assets/demo-alley.webp";
import dogImage from "../assets/demo-dog.webp";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { useReducedMotion } from "framer-motion";
import ProfileHeader from "./ProfileHeader";
import ReplyPreview, {
  SharedReplySurface,
  useReplyPreview,
} from "./ReplyPreview";
import MessageReplyGesture from "./MessageReplyGesture";
import { MessageRow, TurnMessages } from "./DemoMessages";
import ChatTimestamp from "./ChatTimestamp";
import {
  turnMessages,
  type ChatTurn,
  type DemoMessage,
  type MessageReplyTarget,
} from "./chat";
import { type ChatPhoto, isChatPhoto, maxChatPhotos } from "../lib/chat/photos";
import { deleteChatAnimations } from "./chatAnimations";
import { playChatSound } from "./chatSounds";
import {
  chatReactionIcons,
  type ChatReaction,
  type ChatReactionType,
} from "../lib/chat/reaction";
import { randomUUID } from "../lib/randomUUID";
import useChatScroll from "./useChatScroll";
import { useContainedViewport } from "../components/ContainedViewport";
import {
  animateChatSend,
  animateChatScroll,
  chatScroller,
  chatComposerFocusEvent,
} from "./chatSendAnimation";
import { chatSentDelay, chatReadingDelay, chatTypingDelay } from "./chatTiming";

type TimeGroup = { id: string; turn: ChatTurn };
type RenderProps = {
  messages: Map<string, DemoMessage>;
  counts: Map<string, number>;
  latestId?: string;
  latestReadId?: string;
  onSelect: (message: DemoMessage, last?: boolean) => void;
};

function LiveChat({
  turns,
  times,
  ...props
}: RenderProps & { turns: ChatTurn[]; times: Map<string, TimeGroup> }) {
  const listRef = useRef<HTMLOListElement>(null);
  const following = useRef(false);
  const flight = useRef<(() => void) | null>(null);
  const focusScroll = useRef<(() => void) | null>(null);
  const lastSent = useRef<string | null>(null);
  const reduced = Boolean(useReducedMotion());
  const { mounted } = useReplyPreview();
  const viewport = useContainedViewport();
  const latest = turns.at(-1);
  useChatScroll(listRef, following, flight, () => !mounted, reduced);
  useLayoutEffect(() => {
    if (mounted || !latest?.live) {
      following.current = false;
      flight.current?.();
      lastSent.current = latest?.id ?? null;
      return;
    }
    const list = listRef.current;
    if (!list || !latest || lastSent.current === latest.id) return;
    lastSent.current = latest.id;
    focusScroll.current?.();
    flight.current?.();
    following.current = true;
    const target = list.querySelector<HTMLElement>(
      `[data-chat-outgoing="${latest.id}"]`,
    );
    if (target && latest.origin && !reduced)
      flight.current = animateChatSend(
        list,
        target,
        latest.origin,
        (completed) => {
          flight.current = null;
          if (!completed) following.current = false;
        },
      );
    else {
      const scroller = chatScroller(list);
      scroller.scroll(scroller.bottom());
    }
  }, [latest, reduced, mounted]);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const scroller = chatScroller(list);
    const stop = () => {
      focusScroll.current?.();
      flight.current?.();
    };
    const focus = () => {
      following.current = true;
      focusScroll.current?.();
      if (flight.current) return;
      if (reduced) scroller.scroll(scroller.bottom());
      else
        focusScroll.current = animateChatScroll(
          list,
          () => {
            focusScroll.current = null;
          },
          undefined,
          scroller.bottom,
        );
    };
    const key = (event: KeyboardEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest("textarea, input")
      )
        return;
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "PageUp",
          "PageDown",
          "Home",
          "End",
          " ",
        ].includes(event.key)
      )
        stop();
    };
    scroller.source.addEventListener("wheel", stop, { passive: true });
    scroller.source.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", key);
    window.addEventListener(chatComposerFocusEvent, focus);
    return () => {
      stop();
      scroller.source.removeEventListener("wheel", stop);
      scroller.source.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", key);
      window.removeEventListener(chatComposerFocusEvent, focus);
    };
  }, [viewport, reduced]);
  return (
    <div className="mt-6">
      <ol ref={listRef} className="m-0 flex list-none flex-col gap-6 p-0">
        {turns.map((turn, index) => (
          <Fragment key={turn.id}>
            {index > 0 && times.get(turn.id)?.turn.id === turn.id && (
              <li>
                <ChatTimestamp time={times.get(turn.id)!} />
              </li>
            )}
            <TurnMessages
              turn={turn}
              previous={turns[index - 1]}
              adjacentTo={
                index
                  ? turnMessages(turns[index - 1]).at(-1)
                  : props.messages.get("welcome")
              }
              {...props}
            />
          </Fragment>
        ))}
      </ol>
    </div>
  );
}

function demoPhotoTimes(now: Date): { coffee: number; walk: number } {
  // Use the latest completed Wednesday, keeping both sample conversations in the past.
  const wednesday = new Date(now);
  const daysBack = (now.getDay() - 3 + 7) % 7 || 7;
  wednesday.setDate(wednesday.getDate() - daysBack);
  wednesday.setHours(18, 6, 0, 0);
  const tuesday = new Date(wednesday);
  tuesday.setDate(tuesday.getDate() - 1);
  tuesday.setHours(14, 20, 0, 0);
  return { coffee: tuesday.getTime(), walk: wednesday.getTime() };
}

export default function Demo() {
  const t = useTranslations("Demo");
  const h = useTranslations("HomeChat");
  const c = useTranslations("Conversation");
  const [openedAt] = useState(() => Date.now());
  // Freeze demo dates for this visit so they do not move during a conversation.
  const [photoTimes] = useState(() => demoPhotoTimes(new Date(openedAt)));
  const groups = [
    {
      id: "intro",
      // Fixed development date, intentionally shown at 09:41 in the viewer’s locale.
      sentAt: new Date(2026, 9, 15, 9, 41).getTime(),
      keys: ["introGreeting", "intro"],
    },
    {
      id: "coffee",
      sentAt: photoTimes.coffee,
      weekdayOnly: true,
      keys: ["coffee", "coffeeImage"],
    },
    {
      id: "walk",
      sentAt: photoTimes.walk,
      weekdayOnly: true,
      keys: ["walk"],
    },
    { id: "live", keys: ["welcome"] },
  ];
  const initial: DemoMessage[] = groups.flatMap((group) =>
    group.keys.map((key) => ({
      id: key,
      threadId: key,
      text:
        key === "intro"
          ? t.markup(key, { demo: (chunks) => chunks })
          : key === "introGreeting"
            ? t.markup(key, { wave: () => "" })
            : t(key),
      ...(key === "coffeeImage"
        ? {
            photos: [
              {
                url: coffeeImage,
                name: t("coffeeImage"),
                width: 960,
                height: 716,
              },
            ],
          }
        : {}),
    })),
  );
  const examples: { groupId: string; turn: ChatTurn }[] = [
    {
      groupId: "coffee",
      turn: {
        id: "example-coffee",
        text: t("coffeeReply"),
        context: {
          threadId: "coffeeImage",
          messageId: "coffeeImage",
          photoIndex: 0,
          title: t("coffeeImage"),
          text: t("coffeeImage"),
        },
        reply: [t("coffeeAnswer")],
        reaction: { type: "like", target: "text", index: 0 },
        status: "done",
        live: false,
        sentAt: photoTimes.coffee + 2 * 60000,
        readAt: photoTimes.coffee + 3 * 60000,
      },
    },
    {
      groupId: "walk",
      turn: {
        id: "example-walk",
        text: t("walkReply"),
        photos: [
          {
            url: alleyImage,
            name: t("alleyImage"),
            width: 960,
            height: 716,
          },
          {
            url: dogImage,
            name: t("dogImage"),
            width: 960,
            height: 716,
          },
        ],
        context: {
          threadId: "walk",
          messageId: "walk",
          title: t("walk"),
          text: t("walk"),
        },
        reply: [t("camera")],
        reaction: { type: "love", target: "photo", index: 1 },
        status: "done",
        live: false,
        sentAt: photoTimes.walk + 2 * 60000,
        readAt: photoTimes.walk + 3 * 60000,
      },
    },
  ];
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [selection, setSelection] = useState<MessageReplyTarget>();
  const busy = useRef(false);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const [soundSession] = useState(() => new AbortController());
  const exampleTurns = examples.map((example) => example.turn);
  const allTurns = [...exampleTurns, ...turns];
  const messages = new Map(
    [...initial, ...allTurns.flatMap(turnMessages)].map((message) => [
      message.id,
      message,
    ]),
  );
  const turnsRef = useRef(turns);
  turnsRef.current = turns;
  const counts = new Map<string, number>();
  for (const message of messages.values())
    if (message.threadId !== message.id)
      counts.set(message.threadId, (counts.get(message.threadId) ?? 0) + 1);
  const latestId = allTurns.at(-1)?.id;
  const latestReadId = [...allTurns].reverse().find((turn) => turn.readAt)?.id;
  const times = new Map<string, TimeGroup>();
  examples.forEach(({ groupId, turn }) =>
    times.set(turn.id, { id: `${groupId}-time`, turn }),
  );
  let time: TimeGroup | undefined;
  turns.forEach((turn, index) => {
    const previous = turns[index - 1];
    const previousTime =
      previous?.lastReplyAt ?? previous?.readAt ?? previous?.sentAt;
    if (
      !previousTime ||
      turn.sentAt - previousTime >= 5 * 60 * 1000 ||
      new Date(turn.sentAt).toDateString() !==
        new Date(previousTime).toDateString()
    )
      time = { id: index === 0 ? "live-time" : `chat-${turn.id}-time`, turn };
    if (time) times.set(turn.id, time);
  });
  const selectedRoot = selection ? messages.get(selection.threadId) : undefined;
  const selectedGroup = groups.find((group) =>
    group.keys.includes(selectedRoot?.id ?? ""),
  );
  const previewTurns = allTurns.filter(
    (turn) => turn.context?.threadId === selection?.threadId,
  );
  const rootTurn = selectedRoot?.turnId
    ? allTurns.find((turn) => turn.id === selectedRoot.turnId)
    : undefined;
  const activeIds = [
    ...(selectedRoot ? [selectedRoot.id] : []),
    ...(selectedGroup ? [`${selectedGroup.id}-time`] : []),
    ...(rootTurn && times.get(rootTurn.id) ? [times.get(rootTurn.id)!.id] : []),
    ...previewTurns.flatMap((turn) => [
      ...turnMessages(turn).map((message) => message.id),
      `chat-${turn.id}-typing`,
      times.get(turn.id)!.id,
    ]),
  ];
  const select = (message: DemoMessage, last = false) => {
    if (last)
      message =
        [...messages.values()]
          .filter((item) => item.threadId === message.threadId)
          .at(-1) ?? message;
    const photoIndex =
      message.photoIndex ?? (message.photos?.length ? 0 : undefined);
    const photo =
      photoIndex === undefined
        ? undefined
        : (messages.get(message.id)?.photos?.[photoIndex] ??
          message.photos?.[0]);
    const label = photo?.name ?? message.text;
    setSelection({
      threadId: message.threadId,
      messageId: message.id,
      ...(photoIndex !== undefined ? { photoIndex } : {}),
      ...(photo ? { photo: { ...photo, animationId: undefined } } : {}),
      title: label.slice(0, 120),
      text: label.slice(0, 350),
    });
  };
  const props: RenderProps = {
    messages,
    counts,
    latestId,
    latestReadId,
    onSelect: select,
  };
  useEffect(
    () => () => {
      soundSession.abort();
      timers.current.forEach(clearTimeout);
      timers.current.clear();
      void deleteChatAnimations(
        turnsRef.current.flatMap(
          (turn) =>
            turn.photos?.flatMap((photo) =>
              photo.animationId ? [photo.animationId] : [],
            ) ?? [],
        ),
      );
    },
    [soundSession],
  );
  const later = (delay: number, action: () => void) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      action();
    }, delay);
    timers.current.add(timer);
  };
  const send = (
    text: string,
    rect?: DOMRect,
    context?: MessageReplyTarget,
    photos?: ChatPhoto[],
  ) => {
    if (
      busy.current ||
      (!text.trim() && !photos?.length) ||
      text.length > 2000 ||
      (photos?.length ?? 0) > maxChatPhotos ||
      photos?.some((photo) => !isChatPhoto(photo))
    )
      return false;
    busy.current = true;
    const id = randomUUID();
    const turn: ChatTurn = {
      id,
      text,
      photos,
      context,
      quote: context
        ? (messages.get(context.messageId) ?? {
            id: context.messageId,
            threadId: context.threadId,
            text: context.text,
          })
        : undefined,
      reply: [],
      status: "sending",
      sentAt: Date.now(),
      origin: rect ? { rect } : undefined,
      live: true,
    };
    setTurns((previous) => [...previous, turn]);
    playChatSound("sent", soundSession.signal);
    const update = (patch: Partial<ChatTurn>) =>
      setTurns((previous) =>
        previous.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)),
      );
    const reply = photos?.length ? t("photoReply") : t("welcomeReply");
    const sentDelay = chatSentDelay();
    const readingDelay = sentDelay + chatReadingDelay(text);
    const reactionTypes = Object.keys(chatReactionIcons) as ChatReactionType[];
    const reaction: ChatReaction | undefined = allTurns.at(-1)?.reaction
      ? undefined
      : {
          type: reactionTypes[
            Math.floor(turns.length / 2) % reactionTypes.length
          ],
          target: photos?.length ? "photo" : "text",
          index: 0,
        };
    later(sentDelay, () => update({ status: "sent" }));
    later(readingDelay, () => update({ status: "waiting" }));
    let delay = readingDelay + chatTypingDelay(reply);
    let readAt: number | undefined;
    if (reaction) {
      later(delay, () => {
        readAt = Date.now();
        update({ reaction, readAt });
        playChatSound(`reaction-${reaction.type}`, soundSession.signal);
      });
      delay += 450;
    }
    later(delay, () => {
      update({
        reply: [reply],
        readAt: readAt ?? Date.now(),
        lastReplyAt: Date.now(),
        status: "done",
      });
      playChatSound("received", soundSession.signal);
      busy.current = false;
    });
    return true;
  };
  const heading = (group: (typeof groups)[number]) =>
    group.id === "live" && turns[0] ? (
      <ChatTimestamp time={times.get(turns[0].id)!} heading />
    ) : (
      <ChatTimestamp
        time={{
          id: `${group.id}-time`,
          turn: { sentAt: group.sentAt ?? openedAt },
        }}
        heading
        showTime={group.sentAt !== undefined}
        weekdayOnly={group.weekdayOnly}
      />
    );
  const shownTimes = new Set<string>(
    selectedGroup ? [`${selectedGroup.id}-time`] : [],
  );
  const previewTime = (turn: ChatTurn) => {
    const time = times.get(turn.id);
    if (!time || shownTimes.has(time.id)) return null;
    shownTimes.add(time.id);
    const group = groups.find((group) => `${group.id}-time` === time.id);
    return (
      <li key={time.id}>
        {group ? heading(group) : <ChatTimestamp time={time} />}
      </li>
    );
  };
  return (
    <main className="min-h-full bg-(--home-background) text-(--message-foreground) sm:min-h-[var(--app-viewport-height,100dvh)]">
      <ProfileHeader />
      <ReplyPreview
        title={
          selection ? c("repliesFor", { name: selection.title }) : c("reply")
        }
        previewKey={selection?.threadId}
        replyTarget={selection}
        activeSurfaceIds={activeIds}
        onSend={send}
        busy={Boolean(turns.at(-1) && turns.at(-1)?.status !== "done")}
        messageGestures={(children) => (
          <MessageReplyGesture
            resolveMessage={(id, _text, photoIndex) => {
              const message = messages.get(id);
              const photo =
                photoIndex === undefined
                  ? undefined
                  : message?.photos?.[photoIndex];
              if (photoIndex !== undefined && !photo) return null;
              return message
                ? {
                    threadId: message.threadId,
                    messageId: id,
                    ...(photoIndex !== undefined ? { photoIndex } : {}),
                    text:
                      (photo?.name ?? message.text) ||
                      h("photos", { count: message.photos?.length ?? 0 }),
                  }
                : null;
            }}
            onReply={(target) => {
              const message = messages.get(target.messageId);
              if (message)
                select({ ...message, photoIndex: target.photoIndex });
            }}
          >
            {children}
          </MessageReplyGesture>
        )}
        preview={
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {selectedRoot && (
              <>
                {selectedGroup && <li>{heading(selectedGroup)}</li>}
                {rootTurn && previewTime(rootTurn)}
                <li className={selectedRoot.outgoing ? "mb-3.5" : ""}>
                  <MessageRow
                    message={selectedRoot}
                    turn={rootTurn}
                    latestId={latestId}
                    latestReadId={latestReadId}
                    onSelect={select}
                    delivery={Boolean(
                      selectedRoot.outgoing &&
                      rootTurn &&
                      selectedRoot.id ===
                        turnMessages(rootTurn)
                          .filter((message) => message.outgoing)
                          .at(-1)?.id,
                    )}
                  />
                </li>
              </>
            )}
            {previewTurns.map((turn) => (
              <Fragment key={turn.id}>
                {previewTime(turn)}
                <TurnMessages turn={turn} {...props} />
              </Fragment>
            ))}
          </ol>
        }
      >
        <div
          data-home-thread
          className="mx-auto w-full max-w-100 pt-[calc(7.5rem+var(--app-safe-top,env(safe-area-inset-top,0px)))] pr-[max(1rem,var(--app-safe-right,env(safe-area-inset-right,0px)))] pb-[calc(var(--home-composer-height,40px)+1.25rem+max(1rem,env(safe-area-inset-bottom,0px)-6px))] pl-[max(1rem,var(--app-safe-left,env(safe-area-inset-left,0px)))] sm:pt-[calc(6.75rem+var(--app-safe-top,env(safe-area-inset-top,0px)))] sm:pb-[calc(var(--home-composer-height,40px)+1.25rem+var(--app-safe-bottom,env(safe-area-inset-bottom,0px)))]"
        >
          <h1 className="sr-only">{t("title")}</h1>
          <div data-home-conversation className="flex flex-col gap-8">
            {groups.map((group) => (
              <section
                key={group.id}
                data-composer-anchor={group.id === "live" ? "" : undefined}
                className="flex flex-col gap-6"
              >
                {heading(group)}
                <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {group.keys.map((key, index) => (
                    <li key={key}>
                      <MessageRow
                        message={messages.get(key)!}
                        onSelect={select}
                        count={counts.get(key)}
                        tail={index === group.keys.length - 1}
                      />
                    </li>
                  ))}
                </ol>
                {examples.some((example) => example.groupId === group.id) && (
                  <ol className="m-0 flex list-none flex-col gap-6 p-0">
                    {examples
                      .filter((example) => example.groupId === group.id)
                      .map(({ turn }, index, entries) => (
                        <TurnMessages
                          key={turn.id}
                          turn={turn}
                          previous={entries[index - 1]?.turn}
                          adjacentTo={
                            index
                              ? turnMessages(entries[index - 1].turn).at(-1)
                              : messages.get(group.keys.at(-1)!)
                          }
                          {...props}
                        />
                      ))}
                  </ol>
                )}
              </section>
            ))}
          </div>
          <LiveChat turns={turns} times={times} {...props} />
          <p aria-live="polite" aria-atomic="true" className="sr-only">
            {turns.at(-1)?.status === "done"
              ? `${h("assistant")}${turns.at(-1)!.reply.join("\n\n")}`
              : ""}
          </p>
        </div>
      </ReplyPreview>
    </main>
  );
}
