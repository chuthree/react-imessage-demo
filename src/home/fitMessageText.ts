export default function fitMessageText(text: HTMLElement) {
  text.style.removeProperty("width");
  if (text.querySelector("[data-fixed-message-lines]")) return;

  const layoutWidth = parseFloat(getComputedStyle(text).width);
  const scale = text.getBoundingClientRect().width / layoutWidth;
  if (!layoutWidth || !Number.isFinite(scale) || scale <= 0) return;

  const lines: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  }[] = [];
  const walker = document.createTreeWalker(
    text,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
  );
  const range = document.createRange();
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node instanceof Element) {
      if (!node.matches("img") || node.closest(".sr-only")) continue;
      range.selectNode(node);
    } else {
      if (node.parentElement?.closest(".sr-only")) continue;
      range.selectNodeContents(node);
    }
    for (const rect of range.getClientRects()) {
      if (!rect.width || !rect.height) continue;
      const line = lines.find(
        (line) =>
          Math.min(line.bottom, rect.bottom) - Math.max(line.top, rect.top) >
          rect.height / 2,
      );
      if (line) {
        line.left = Math.min(line.left, rect.left);
        line.right = Math.max(line.right, rect.right);
      } else {
        lines.push({
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
        });
      }
    }
  }
  if (!lines.length) return;
  // Round up so subpixel layout cannot push a character onto another line.
  const width = Math.ceil(
    lines.reduce(
      (longest, line) => Math.max(longest, line.right - line.left),
      0,
    ) / scale,
  );
  if (width < layoutWidth) text.style.width = `${width}px`;
}
