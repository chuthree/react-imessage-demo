// Build the silhouette once: adjoining mask layers leave antialiased seams
// at fractional device pixels, especially after the phone frame is scaled.
export default function bubblePath(
  width: number,
  height: number,
  radius: number,
  tail: boolean,
) {
  // Interpolate the measured single-line and multiline contours to preserve their corner shapes.
  const radiusScale = Math.min(radius / 20, height / 40);
  const compact = width < 64 * radiusScale;
  const q = compact
    ? Math.min(radius, width / 2, height / 2)
    : Math.min(height / 2, (30 + 1 / 6) * radiusScale);
  const blend = Math.max(0, Math.min(1, (q / radiusScale - 20 - 1 / 6) / 10));
  const mix = (short: number, tall: number) => short + (tall - short) * blend;
  const scaleX = Math.min(radiusScale, width / 64);
  const scaleY = q / (20 + 1 / 6 + 10 * blend);
  const points = [
    [32, 0],
    [mix(18.39218, 18.02571), 0],
    [mix(11.26136, 11.46531), 0],
    [mix(5.125, 5.13853), 20 / 3],
    [mix(1.90447, 0), mix(10.16552, 12.08125)],
    [0, mix(15.4554, 20.43008)],
    [0, 20 + 1 / 6 + 10 * blend],
  ].map(([x, y]) => [x * scaleX, y * scaleY]);
  const p = compact ? q : 32 * scaleX;
  const corner = (right: boolean, bottom: boolean, reverse: boolean) => {
    if (compact) {
      const [x, y] = right
        ? bottom
          ? [width - q, height]
          : [width, q]
        : bottom
          ? [0, height - q]
          : [q, 0];
      return `A${q} ${q} 0 0 1 ${x} ${y}`;
    }
    const ordered = reverse ? [...points].reverse() : points;
    const coordinates = ordered.map(
      ([x, y]) => `${right ? width - x : x} ${bottom ? height - y : y}`,
    );
    return `C${coordinates.slice(1, 4).join(" ")} C${coordinates.slice(4).join(" ")}`;
  };
  // Short reply quotes scale the curl with the body so its entry stays
  // below the upper corner; full-size messages keep the measured curl.
  const tailScale = Math.min(1, height / 40, width / 40);
  const bottomLeft = tail
    ? `H${22.333 * tailScale} C${18.232 * tailScale} ${height} ${15.366 * tailScale} ${height + 5.774 * tailScale} ${8.433 * tailScale} ${height + 6.433 * tailScale} C${7.257 * tailScale} ${height + 5.028 * tailScale} ${10.333 * tailScale} ${height + 3.923 * tailScale} ${10.333 * tailScale} ${height + 0.5 * tailScale} C${10.333 * tailScale} ${height - 4 * tailScale} ${6 * tailScale} ${height - 5.5 * tailScale} ${3 * tailScale} ${height - 9.833 * tailScale} C${0.5 * tailScale} ${height - 13 * tailScale} 0 ${height - 17 * tailScale} 0 ${height - q}`
    : `H${p} ${corner(false, true, false)}`;

  return `M${p} 0 H${width - p} ${corner(true, false, false)} V${height - q} ${corner(true, true, true)} ${bottomLeft} V${q} ${corner(false, false, true)} Z`;
}
