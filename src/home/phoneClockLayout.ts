import metrics from "../../public/phone-clock/metrics.json";

export function phoneClockLayout(
  time: string,
  {
    advances,
    kerning,
  }: {
    advances: Record<string, number>;
    kerning: Record<string, number>;
  } = metrics,
) {
  const characters = Array.from(time);
  let width = 0;
  const glyphs = characters.map((character, index) => {
    const x = width;
    width +=
      advances[character] +
      (kerning[character + (characters[index + 1] ?? "")] ?? 0);
    return { character, x };
  });
  // Center the complete, naturally spaced time inside the original status area.
  const left = 214.5 - width / 2;
  return glyphs.map(({ character, x }) => ({ character, x: left + x }));
}
