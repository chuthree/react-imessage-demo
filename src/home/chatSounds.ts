import { prepareSound } from "../lib/audio";
import type { ChatReactionType } from "../lib/chat/reaction";

const soundFiles = {
  sent: "sent",
  received: "received",
  "reaction-like": "reaction-like",
  "reaction-dislike": "reaction-dislike",
  "reaction-love": "reaction-love",
  "reaction-laugh": "reaction-laugh",
  "reaction-question": "reaction-question",
  "reaction-emphasis": "reaction-emphasis",
  // Use the generic reaction sound for zzz, which has no dedicated sample.
  "reaction-sleep": "reaction",
} satisfies Record<
  "sent" | "received" | `reaction-${ChatReactionType}`,
  string
>;

type MessageSound = keyof typeof soundFiles;

function prepare(kind: MessageSound) {
  return prepareSound({
    source: { type: "sample", url: `/home/chat/${soundFiles[kind]}.wav` },
    gain: 1,
  });
}

export function prepareChatSounds() {
  for (const kind of Object.keys(soundFiles) as MessageSound[])
    void prepare(kind).catch(() => {});
}

export function playChatSound(kind: MessageSound, signal?: AbortSignal) {
  const started = performance.now();
  if (document.hidden) return;
  void prepare(kind)
    .then(({ play, context }) => {
      // Never replay stale feedback after loading, tab switching or cancellation.
      if (
        signal?.aborted ||
        document.hidden ||
        context.state !== "running" ||
        performance.now() - started > 500
      )
        return;
      play();
    })
    .catch(() => {});
}
