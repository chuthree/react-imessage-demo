export const chatReactionIcons = {
  like: "thumbs-up",
  dislike: "thumbs-down",
  love: "heart",
  laugh: "laugh",
  question: "question",
  sleep: "zzz",
  emphasis: "exclamation",
} as const;

export type ChatReactionType = keyof typeof chatReactionIcons;
export type ChatReactionIcon = (typeof chatReactionIcons)[ChatReactionType];
export type ChatReaction = {
  type: ChatReactionType;
  target: "text" | "photo";
  index: number;
};
