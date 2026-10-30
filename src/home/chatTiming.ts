// Sample delays once per phase; URL length should not dominate simulated typing time.
function between(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function proseLength(text: string) {
  return Array.from(
    text.replace(/https?:\/\/[^\s<>]+/g, "链接").replace(/\s/g, ""),
  ).length;
}

export function chatSentDelay() {
  return between(650, 1100);
}

export function chatReadingDelay(text: string) {
  // Includes room for the 550ms receipt animation to finish and remain legible.
  return (
    550 +
    between(1200, 2100) +
    Math.min(2600, proseLength(text) * between(25, 45))
  );
}

export function chatTypingDelay(text: string): number {
  const pauses = (text.match(/[，。！？；,.!?;]/g) ?? []).length;
  const estimate =
    proseLength(text) * between(170, 280) + pauses * between(100, 260);
  return Math.min(16000, Math.max(1000, estimate)) * between(0.9, 1.15);
}
