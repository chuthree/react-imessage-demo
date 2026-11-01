// Use anchor.href to copy absolute URLs rather than link preview text.
export function messageCopyText(
  source: HTMLElement,
  selectedLink: HTMLAnchorElement | null,
) {
  if (selectedLink && source.contains(selectedLink)) return selectedLink.href;

  const card = source.matches("a[data-message-copy-link]")
    ? (source as HTMLAnchorElement)
    : source.querySelector<HTMLAnchorElement>("a[data-message-copy-link]");
  if (card) return card.href;

  const plain = source.cloneNode(true) as HTMLElement;
  plain
    .querySelectorAll(
      '.sr-only, [aria-hidden="true"], [data-message-delivery], [data-message-retry], [data-message-reaction]',
    )
    .forEach((node) => node.remove());
  plain.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
  return plain.textContent?.trim() || "";
}

export function copyMessageImage(url: string) {
  // Pass a promise immediately so Safari retains the click's clipboard permission.
  return navigator.clipboard.write([
    new ClipboardItem({ "image/png": imagePng(url) }),
  ]);
}

async function imagePng(url: string): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = url;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas unavailable");
    context.drawImage(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("encode failed")),
        "image/png",
      );
    });
  } finally {
    canvas.width = canvas.height = 0;
    image.src = "";
  }
}
