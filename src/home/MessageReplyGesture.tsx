import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { Dialog } from "@base-ui/react/dialog";
import { useContainedViewportLocked } from "../components/ContainedViewport";
import { useReplyPreview } from "./ReplyPreview";
import styles from "./MessageReplyGesture.module.css";
import MessageContextMenu from "./MessageContextMenu";
import { findMessage } from "./messageSurface";

type ReplySelection = {
  threadId: string;
  messageId: string;
  text: string;
  photoIndex?: number;
};

export default function MessageReplyGesture({
  children,
  resolveMessage,
  onReply,
}: {
  children: ReactNode;
  resolveMessage: (
    id: string,
    text: string,
    photoIndex?: number,
  ) => ReplySelection | null;
  onReply: (target: ReplySelection) => void;
}) {
  const locked = useContainedViewportLocked();
  const { inPreview, mounted, scrollToBottom } = useReplyPreview();
  const trigger = useRef<HTMLButtonElement>(null);
  const suppressClick = useRef(false);
  const [menu, setMenu] = useState<{
    message: HTMLElement;
    link: HTMLAnchorElement | null;
  } | null>(null);
  const hold = useRef<{
    timer: ReturnType<typeof setTimeout>;
    x: number;
    y: number;
  } | null>(null);
  const cancelHold = useCallback(() => {
    if (hold.current) clearTimeout(hold.current.timer);
    hold.current = null;
  }, []);

  const openMenu = (element: Element) => {
    if (locked || (mounted && !inPreview)) return;
    const message = findMessage(element);
    if (!message?.isConnected) return;
    suppressClick.current = true;
    setMenu({
      message,
      link: element.closest<HTMLAnchorElement>("a[href]"),
    });
  };

  const openReply = (element: Element) => {
    if (locked || (mounted && !inPreview)) return;
    const message = findMessage(element);
    if (!message?.dataset.messageId) return;
    const text = message.cloneNode(true) as HTMLElement;
    text
      .querySelectorAll('.sr-only, [aria-hidden="true"]')
      .forEach((node) => node.remove());
    const target = resolveMessage(
      message.dataset.messageId,
      text.textContent?.trim() ?? "",
      message.dataset.photoIndex === undefined
        ? undefined
        : Number(message.dataset.photoIndex),
    );
    if (!target) return;
    suppressClick.current = true;
    flushSync(() => onReply(target));
    if (inPreview) {
      scrollToBottom?.();
    } else {
      trigger.current?.setAttribute("data-reply-thread", target.threadId);
      trigger.current?.setAttribute("data-reply-message-id", target.messageId);
      if (target.photoIndex === undefined)
        trigger.current?.removeAttribute("data-reply-photo-index");
      else
        trigger.current?.setAttribute(
          "data-reply-photo-index",
          String(target.photoIndex),
        );
      trigger.current?.click();
    }
  };

  useEffect(() => {
    cancelHold();
  }, [locked, mounted, cancelHold]);

  useEffect(() => {
    const nextPress = () => {
      suppressClick.current = false;
    };
    const consumeClick = (event: MouseEvent) => {
      // Opening the menu changes hit testing before the finger lifts.
      // Consume that release's click without swallowing the next tap.
      if (!suppressClick.current || event.detail === 0) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("pointerdown", nextPress, true);
    window.addEventListener("click", consumeClick, true);
    window.addEventListener("scroll", cancelHold, true);
    window.addEventListener("resize", cancelHold);
    window.addEventListener("blur", cancelHold);
    return () => {
      cancelHold();
      window.removeEventListener("pointerdown", nextPress, true);
      window.removeEventListener("click", consumeClick, true);
      window.removeEventListener("scroll", cancelHold, true);
      window.removeEventListener("resize", cancelHold);
      window.removeEventListener("blur", cancelHold);
    };
  }, [cancelHold]);

  return (
    <>
      <div
        className={`${styles.scope} contents`}
        onDragStart={(event) => event.preventDefault()}
        onContextMenu={(event) => {
          cancelHold();
          if ((event.target as Element).closest("[data-message-actions]"))
            return;
          event.preventDefault();
          if (suppressClick.current || locked || (mounted && !inPreview))
            return;
          openMenu(event.target as Element);
        }}
        onPointerDown={(event) => {
          cancelHold();
          if (
            menu ||
            event.pointerType === "mouse" ||
            !event.isPrimary ||
            event.button !== 0 ||
            locked ||
            (mounted && !inPreview)
          )
            return;
          const element = event.target as Element;
          if (!findMessage(element)) return;
          hold.current = {
            x: event.clientX,
            y: event.clientY,
            timer: setTimeout(() => {
              hold.current = null;
              openMenu(element);
            }, 250),
          };
        }}
        onClickCapture={(event) => {
          if (!menu) return;
          event.preventDefault();
          event.stopPropagation();
        }}
        onPointerMove={(event) => {
          if (
            hold.current &&
            Math.hypot(
              event.clientX - hold.current.x,
              event.clientY - hold.current.y,
            ) > 8
          )
            cancelHold();
        }}
        onPointerUp={cancelHold}
        onPointerCancel={cancelHold}
      >
        {children}
      </div>
      <Dialog.Trigger
        ref={trigger}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />
      <MessageContextMenu
        message={menu?.message ?? null}
        copyLink={menu?.link ?? null}
        onClose={() => setMenu(null)}
        onReply={() => {
          if (menu) openReply(menu.message);
        }}
      />
    </>
  );
}
