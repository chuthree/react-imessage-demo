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
  return (
    plain.textContent?.trim() ||
    source.querySelector("image")?.getAttribute("href") ||
    source.querySelector("img")?.src ||
    ""
  );
}
