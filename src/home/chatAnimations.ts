import { randomUUID } from "../lib/randomUUID";

// GIF originals have the same page lifetime as this demo's messages.
const animations = new Map<string, Blob>();
export async function saveChatAnimation(file: File) {
  const id = randomUUID();
  animations.set(id, file);
  return id;
}
export async function readChatAnimation(id: string) {
  return animations.get(id);
}
export async function deleteChatAnimations(ids: string[]) {
  ids.forEach((id) => animations.delete(id));
}
