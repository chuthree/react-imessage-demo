export const maxChatPhotos = 2;
export const maxChatImageSide = 1024;
export const maxChatImageDataLength = 350000;
export const maxChatRequestBytes = 3000000;
export const maxChatHistoryLength = 2000000;

export type ChatPhoto = {
  url: string;
  name: string;
  width: number;
  height: number;
  animationId?: string;
};

export function isChatPhoto(value: unknown): value is ChatPhoto {
  if (!value || typeof value !== "object") return false;
  const photo = value as ChatPhoto;
  return (
    typeof photo.url === "string" &&
    photo.url.length <= maxChatImageDataLength &&
    /^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo.url) &&
    typeof photo.name === "string" &&
    photo.name.length <= 200 &&
    (photo.animationId === undefined ||
      (typeof photo.animationId === "string" &&
        /^[a-f0-9-]{36}$/.test(photo.animationId))) &&
    Number.isInteger(photo.width) &&
    photo.width > 0 &&
    photo.width <= maxChatImageSide &&
    Number.isInteger(photo.height) &&
    photo.height > 0 &&
    photo.height <= maxChatImageSide
  );
}
