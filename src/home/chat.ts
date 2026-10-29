import type { ChatPhoto } from "../lib/chat/photos";
import type { ChatReaction } from "../lib/chat/reaction";

export type MessageReplyTarget = {
  threadId: string;
  messageId: string;
  title: string;
  text: string;
  photoIndex?: number;
  photo?: ChatPhoto;
};
export type ChatOrigin = { rect: DOMRect };
export type DemoMessage = {
  id: string;
  threadId: string;
  text: string;
  outgoing?: boolean;
  photos?: ChatPhoto[];
  turnId?: string;
  photoIndex?: number;
};
export type ChatTurn = {
  id: string;
  text: string;
  photos?: ChatPhoto[];
  context?: MessageReplyTarget;
  quote?: DemoMessage;
  reply: string[];
  reaction?: ChatReaction;
  status: "sending" | "sent" | "waiting" | "done" | "error";
  sentAt: number;
  lastReplyAt?: number;
  readAt?: number;
  origin?: ChatOrigin;
  live: boolean;
};

export function turnMessages(turn: ChatTurn): DemoMessage[] {
  const parts = [
    ...(turn.photos?.length
      ? [
          {
            id: `chat-${turn.id}-photos`,
            text: turn.photos.map((photo) => photo.name).join(", "),
            photos: turn.photos,
            outgoing: true,
            turnId: turn.id,
          },
        ]
      : []),
    ...(turn.text
      ? [
          {
            id: `chat-${turn.id}-text-0`,
            text: turn.text,
            outgoing: true,
            turnId: turn.id,
          },
        ]
      : []),
    ...turn.reply.map((text, index) => ({
      id: `chat-${turn.id}-reply-${index}`,
      text,
      turnId: turn.id,
    })),
  ];
  return parts.map((part) => ({
    ...part,
    threadId: turn.context?.threadId ?? part.id,
  }));
}
