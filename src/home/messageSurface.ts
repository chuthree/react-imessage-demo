// Message identity lives on content in some renderers and on the outer row in
// others. The shared surface owns the complete message, including its receipt.
export function findMessage(element: Element): HTMLElement | null {
  const message = element.closest<HTMLElement>("[data-message-id]");
  if (message) return message;
  const surface = element.closest<HTMLElement>("[data-reply-surface]");
  const candidate =
    surface?.querySelector<HTMLElement>(
      `[data-message-id="${CSS.escape(surface.dataset.replySurface ?? "")}"]`,
    ) ?? null;
  return candidate?.matches("[data-chat-photo-item]") ? null : candidate;
}

export function messageSurface(message: HTMLElement) {
  if (message.matches("[data-chat-photo-item]")) return message;
  const id = message.dataset.messageId;
  const selector = `[data-reply-surface="${CSS.escape(id ?? "")}"]`;
  return (
    message.closest<HTMLElement>(selector) ??
    message.querySelector<HTMLElement>(selector) ??
    message
  );
}

// Keep the original photo (including a playing GIF), while its group stays below the scrim.
export function liftMessagePhoto(source: HTMLElement, host: HTMLElement) {
  if (!source.matches("[data-chat-photo-item]")) return null;
  const group = source.closest<HTMLElement>("[data-chat-photo-group]");
  if (!group) return null;
  const slot = source.cloneNode(false) as HTMLElement;
  for (const attribute of [...slot.attributes])
    if (
      attribute.name === "id" ||
      attribute.name === "tabindex" ||
      attribute.name.startsWith("data-")
    )
      slot.removeAttribute(attribute.name);
  slot.inert = true;
  slot.setAttribute("aria-hidden", "true");
  slot.style.visibility = "hidden";
  slot.style.pointerEvents = "none";
  source.before(slot);
  const layer = document.createElement("div");
  Object.assign(layer.style, {
    position: "fixed",
    zIndex: "21",
    pointerEvents: "none",
  });
  host.appendChild(layer);
  const move = (parent: HTMLElement, before: Node | null) => {
    const target = parent as HTMLElement & {
      moveBefore?: (node: Node, child: Node | null) => void;
    };
    if (target.moveBefore && source.isConnected && parent.isConnected)
      target.moveBefore(source, before);
    else parent.insertBefore(source, before);
  };
  const update = () => {
    const bounds = host.getBoundingClientRect();
    const zoom =
      host === document.body
        ? 1
        : bounds.width / parseFloat(getComputedStyle(host).width);
    const rect = group.getBoundingClientRect();
    Object.assign(layer.style, {
      left: `${(rect.left - (host === document.body ? 0 : bounds.left)) / zoom}px`,
      top: `${(rect.top - (host === document.body ? 0 : bounds.top)) / zoom}px`,
      width: `${rect.width / zoom}px`,
      height: `${rect.height / zoom}px`,
    });
  };
  update();
  // Let the menu take focus without reparenting a focused photo and scrolling its old container.
  if (document.activeElement === source) source.blur();
  move(layer, null);
  return {
    update,
    connected: () => slot.isConnected,
    setZIndex: (value: string) => {
      layer.style.zIndex = value;
      // Restore sibling overlap as dismissal starts, while the photo animates home.
      if (value !== "21" && source.parentElement === layer && slot.parentElement)
        move(slot.parentElement, slot);
    },
    restore: () => {
      if (slot.parentElement) move(slot.parentElement, slot);
      slot.remove();
      layer.remove();
    },
  };
}

export function messageSurfaceBounds(surface: HTMLElement) {
  // Layout wrappers may span the entire row; visible decorations may extend
  // beyond them. Measure the union, never a hard-coded receipt allowance.
  const parts = [
    ...surface.querySelectorAll<HTMLElement>(
      '[class~="group/bubble"], [data-bubble-path], [data-chat-photo-group], [data-message-delivery], [data-message-retry]',
    ),
  ];
  if (
    surface.matches(
      '[class~="group/bubble"], [data-chat-photo-group], [data-chat-photo-item]',
    )
  )
    parts.push(surface);
  const rects = parts
    .map((part) => part.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0);
  if (!rects.length) return surface.getBoundingClientRect();
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  return new DOMRect(
    left,
    top,
    Math.max(...rects.map((rect) => rect.right)) - left,
    Math.max(...rects.map((rect) => rect.bottom)) - top,
  );
}
