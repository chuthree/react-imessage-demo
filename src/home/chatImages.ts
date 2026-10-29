import { saveChatAnimation } from "./chatAnimations";
import {
  maxChatImageSide,
  maxChatImageDataLength,
  type ChatPhoto,
} from "../lib/chat/photos";

export async function compressChatPhoto(
  file: File,
  url: string,
): Promise<ChatPhoto> {
  if (file.size > 20 * 1024 * 1024) throw new Error("image too large");
  const signature = new TextDecoder().decode(
    await file.slice(0, 6).arrayBuffer(),
  );
  const isGif = signature === "GIF87a" || signature === "GIF89a";
  const image = new Image();
  image.src = url;
  await image.decode();
  const scale = Math.min(
    1,
    maxChatImageSide / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas unavailable");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.8, 0.65, 0.5]) {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (value) =>
            value ? resolve(value) : reject(new Error("encode failed")),
          "image/webp",
          quality,
        );
      });
      // Some browsers fall back to PNG when WebP encoding is unavailable.
      const encoded =
        blob.type === "image/webp"
          ? blob
          : await new Promise<Blob>((resolve, reject) => {
              canvas.toBlob(
                (value) =>
                  value ? resolve(value) : reject(new Error("encode failed")),
                "image/jpeg",
                quality,
              );
            });
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(encoded);
      });
      if (dataUrl.length <= maxChatImageDataLength)
        return {
          url: dataUrl,
          name: file.name.slice(0, 200),
          width: canvas.width,
          height: canvas.height,
          ...(isGif ? { animationId: await saveChatAnimation(file) } : {}),
        };
    }
    throw new Error("compressed image too large");
  } finally {
    canvas.width = canvas.height = 0;
    image.src = "";
  }
}
