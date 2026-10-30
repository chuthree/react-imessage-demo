import { useLayoutEffect, type RefObject } from "react";

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
};
type Point = [number, number];

function distance(x: number, y: number, box: Box) {
  const dx = Math.abs(x - box.x - box.width / 2) - box.width / 2 + box.radius;
  const dy = Math.abs(y - box.y - box.height / 2) - box.height / 2 + box.radius;
  return (
    Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) +
    Math.min(Math.max(dx, dy), 0) -
    box.radius
  );
}

// Only the narrow neighbourhood of the facing edges changes under this union.
function field(x: number, y: number, boxes: Box[], blend: number) {
  const a = distance(x, y, boxes[0]);
  const b = distance(x, y, boxes[1]);
  const h = Math.max(blend - Math.abs(a - b), 0) / blend;
  return Math.min(a, b) - (h * h * blend) / 4;
}

function contour(boxes: Box[], blend: number): Point[][] {
  const step = 0.75;
  const left = Math.min(...boxes.map((b) => b.x)) - 2;
  const top = Math.min(...boxes.map((b) => b.y)) - 2;
  const width = Math.ceil(
    (Math.max(...boxes.map((b) => b.x + b.width)) - left + 2) / step,
  );
  const height = Math.ceil(
    (Math.max(...boxes.map((b) => b.y + b.height)) - top + 2) / step,
  );
  const values = new Float32Array((width + 1) * (height + 1));
  for (let y = 0; y <= height; y++) {
    for (let x = 0; x <= width; x++) {
      values[y * (width + 1) + x] = field(
        left + x * step,
        top + y * step,
        boxes,
        blend,
      );
    }
  }
  const points = new Map<number, Point>();
  const links = new Map<number, number[]>();
  const connect = (a: number, b: number) => {
    links.set(a, [...(links.get(a) ?? []), b]);
    links.set(b, [...(links.get(b) ?? []), a]);
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * (width + 1) + x;
      const corners = [index, index + 1, index + width + 2, index + width + 1];
      const ids = [
        index * 2,
        (index + 1) * 2 + 1,
        (index + width + 1) * 2,
        index * 2 + 1,
      ];
      const crossings: number[] = [];
      for (let edge = 0; edge < 4; edge++) {
        const a = corners[edge];
        const b = corners[(edge + 1) % 4];
        if (values[a] < 0 === values[b] < 0) continue;
        const id = ids[edge];
        crossings.push(id);
        if (!points.has(id)) {
          const t = values[a] / (values[a] - values[b]);
          points.set(id, [
            left + ((a % (width + 1)) * (1 - t) + (b % (width + 1)) * t) * step,
            top +
              (Math.floor(a / (width + 1)) * (1 - t) +
                Math.floor(b / (width + 1)) * t) *
                step,
          ]);
        }
      }
      if (crossings.length === 2) connect(crossings[0], crossings[1]);
      if (crossings.length === 4) {
        const centreInside =
          field(left + (x + 0.5) * step, top + (y + 0.5) * step, boxes, blend) <
          0;
        const offset = centreInside === values[index] < 0 ? 0 : 1;
        connect(crossings[offset], crossings[(offset + 1) % 4]);
        connect(crossings[(offset + 2) % 4], crossings[(offset + 3) % 4]);
      }
    }
  }
  const loops: Point[][] = [];
  const visited = new Set<number>();
  // Never close an incomplete contour with an arbitrary long SVG segment.
  if ([...links.values()].some((neighbours) => neighbours.length !== 2))
    return [];
  for (const start of links.keys()) {
    if (visited.has(start)) continue;
    const loop: Point[] = [];
    let current: number | undefined = start;
    let last = start;
    while (current !== undefined && !visited.has(current)) {
      last = current;
      visited.add(current);
      loop.push(points.get(current)!);
      current = links.get(current)?.find((next) => !visited.has(next));
    }
    if (!links.get(last)?.includes(start)) return [];
    if (loop.length > 2) loops.push(loop);
  }
  return loops;
}

function path(loops: Point[][], box: Box, scale: number, offset = 0) {
  return loops
    .map(
      (loop) =>
        loop
          .map(
            ([x, y], i) =>
              `${i ? "L" : "M"}${((x - box.x) / scale + offset).toFixed(3)} ${((y - box.y) / scale).toFixed(3)}`,
          )
          .join(" ") + "Z",
    )
    .join(" ");
}

function roundedPath(box: Box, origin: Box, scale: number, offset: number) {
  const x = (box.x - origin.x) / scale + offset;
  const y = (box.y - origin.y) / scale;
  const w = box.width / scale;
  const h = box.height / scale;
  const r = box.radius / scale;
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

export default function useComposerFusion(
  formRef: RefObject<HTMLFormElement | null>,
) {
  useLayoutEffect(() => {
    const form = formRef.current;
    const surfaces = Array.from(
      form?.querySelectorAll<HTMLElement>("[data-composer-glass]") ?? [],
    );
    if (!form || surfaces.length !== 2) return;
    const attachment =
      surfaces[0].closest<HTMLElement>("[data-composer-attachment-expanded]") ??
      surfaces[0].parentElement?.parentElement;
    if (!attachment) return;
    const materials = surfaces.map(
      (surface) =>
        surface.querySelector<HTMLElement>("[data-profile-glass-material]")!,
    );
    const outlines = surfaces.map(
      (surface) =>
        surface.querySelector<SVGSVGElement>("[data-composer-fusion-outline]")!,
    );
    const nativeOutlines = surfaces.map(
      (surface) =>
        surface.querySelector<SVGSVGElement>(
          "[data-profile-glass-outline]:not([data-composer-fusion-outline])",
        )!,
    );
    const originals = new Map<Element, Set<string>>();
    const patches = new Map<HTMLElement, SVGFEImageElement>();
    let activePressed: number | undefined;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const undo: (() => void)[] = [];
    const style = (
      element: HTMLElement | SVGElement,
      property: string,
      value: string,
    ) => {
      let saved = originals.get(element);
      if (!saved) originals.set(element, (saved = new Set()));
      const key = `style:${property}`;
      if (!saved.has(key)) {
        saved.add(key);
        const old = element.style.getPropertyValue(property);
        const priority = element.style.getPropertyPriority(property);
        undo.push(() =>
          old
            ? element.style.setProperty(property, old, priority)
            : element.style.removeProperty(property),
        );
      }
      element.style.setProperty(property, value, "important");
    };
    const attribute = (element: Element, name: string, value: string) => {
      let saved = originals.get(element);
      if (!saved) originals.set(element, (saved = new Set()));
      if (!saved.has(name)) {
        saved.add(name);
        const old = element.getAttribute(name);
        undo.push(() =>
          old === null
            ? element.removeAttribute(name)
            : element.setAttribute(name, old),
        );
      }
      element.setAttribute(name, value);
    };
    const reset = () => {
      while (undo.length) undo.pop()!();
      originals.clear();
      patches.clear();
      activePressed = undefined;
    };
    let frame = 0;
    let signature = "";
    let lastPressed = 1;
    const paint = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      const rects = surfaces.map((surface) => surface.getBoundingClientRect());
      const unit = form.getBoundingClientRect().width / form.offsetWidth;
      const scales = rects.map(
        (rect, i) => rect.width / surfaces[i].offsetWidth,
      );
      const boxes = rects.map((rect, i) => ({
        x: (rect.left - rects[0].left) / unit,
        y: (rect.top - rects[0].top) / unit,
        width: rect.width / unit,
        height: rect.height / unit,
        radius: Math.min(
          (Number(surfaces[i].dataset.profileGlassRadius) * scales[i]) / unit,
          rect.width / unit / 2,
          rect.height / unit / 2,
        ),
      }));
      const excluded =
        attachment.hasAttribute("data-composer-attachment-expanded") ||
        form.hasAttribute("data-entering") ||
        form.hasAttribute("data-mobile-hidden");
      const gap = boxes[1].x - boxes[0].x - boxes[0].width;
      const next = JSON.stringify([boxes, excluded, lastPressed]);
      if (next === signature) return;
      signature = next;
      if (excluded || !Number.isFinite(gap) || gap >= 4.5 || gap < -8) {
        reset();
        return;
      }
      if (activePressed !== lastPressed) reset();
      activePressed = lastPressed;
      const blend = 7;
      const loops = contour(boxes, blend);
      if (!loops.length) {
        reset();
        return;
      }
      const pressed = lastPressed;
      const resting = 1 - pressed;
      const pressedBox = boxes[pressed];
      // The attachment is normally above the input for its menu. When
      // extending its glass toward a pressed input, it must sample the
      // page before the input is painted, not refract its text and tint.
      if (pressed === 1) style(surfaces[1], "z-index", "41");
      // One material owns each pixel. The resting glass extends into the neck;
      // the pressed glass keeps its own brightness and original hit geometry.
      for (let i = 0; i < 2; i++) {
        const box = boxes[i];
        const scale = scales[i] / unit;
        const width = box.width / scale;
        const height = box.height / scale;
        const extension =
          i === resting
            ? Math.max(
                0,
                (i === 0
                  ? pressedBox.x + pressedBox.radius - box.x - box.width
                  : box.x -
                    pressedBox.x -
                    pressedBox.width +
                    pressedBox.radius) / scale,
              )
            : 0;
        const offset = i === 1 ? extension : 0;
        const fullPath = path(loops, box, scale, offset);
        const material = materials[i];
        const outline = outlines[i];
        const image = material.querySelector("feImage");
        const expandedWidth = width + extension;
        if (i === resting) {
          const partition = `${fullPath} ${roundedPath(pressedBox, box, scale, offset)}`;
          const clip = outline.querySelector<SVGPathElement>(
            "[data-composer-material-clip]",
          )!;
          attribute(clip, "d", partition);
          const clipUrl = `url(#${clip.parentElement!.id})`;
          style(material, "clip-path", clipUrl);
          style(material, "-webkit-clip-path", clipUrl);
          style(material, "border-radius", "0px");
          style(material, "width", `${expandedWidth}px`);
          style(material, "left", `${-offset}px`);
          const content = material.querySelector<HTMLElement>(
            "[data-profile-glass-content]",
          )!;
          style(content, "width", `${width}px`);
          style(content, "left", `${offset}px`);
          // Keep the original lens map anchored to its original box.
          if (image) attribute(image, "x", `${offset}`);
        }
        // Replace only the lens-map pixels around the join. Native maps,
        // dispersion and backdrop filters remain intact everywhere else.
        const merge = material.querySelector('feComposite[result="map"]');
        const displacement = material.querySelector("feDisplacementMap");
        // The pressed input retains its circular lens; only the resting
        // attachment's extension needs refraction along the fused edge.
        if (
          context &&
          image &&
          merge &&
          displacement &&
          !(pressed === 1 && i === pressed)
        ) {
          const x = boxes[0].x + boxes[0].width - 10;
          const y = Math.max(boxes[0].y, boxes[1].y);
          const patchWidth = Math.max(1, boxes[1].x - x + 10);
          const patchHeight = Math.max(
            1,
            Math.min(
              boxes[0].y + boxes[0].height,
              boxes[1].y + boxes[1].height,
            ) - y,
          );
          canvas.width = Math.ceil(patchWidth * 2);
          canvas.height = Math.ceil(patchHeight * 2);
          const pixels = context.createImageData(canvas.width, canvas.height);
          const displacementScale =
            (Number(displacement.getAttribute("scale")) / 1.22) * scale;
          for (let row = 0; row < canvas.height; row++) {
            for (let col = 0; col < canvas.width; col++) {
              const px = x + ((col + 0.5) / canvas.width) * patchWidth;
              const py = y + ((row + 0.5) / canvas.height) * patchHeight;
              const d = field(px, py, boxes, blend);
              const original = distance(px, py, box);
              const alpha = Math.min(1, Math.max(0, (original - d) / 0.5));
              const dx =
                field(px + 0.1, py, boxes, blend) -
                field(px - 0.1, py, boxes, blend);
              const dy =
                field(px, py + 0.1, boxes, blend) -
                field(px, py - 0.1, boxes, blend);
              const length = Math.hypot(dx, dy);
              const edge = Math.max(0, 1 + Math.min(0, d) / 5);
              const amount =
                length > 0.001 && displacementScale > 0
                  ? (4 * edge) / displacementScale / length
                  : 0;
              const index = (row * canvas.width + col) * 4;
              pixels.data[index] = Math.max(
                0,
                Math.min(255, (0.5 - dx * amount) * 255),
              );
              pixels.data[index + 1] = Math.max(
                0,
                Math.min(255, (0.5 - dy * amount) * 255),
              );
              pixels.data[index + 2] = 128;
              pixels.data[index + 3] = alpha * 255;
            }
          }
          context.putImageData(pixels, 0, 0);
          let patch = patches.get(material);
          if (!patch) {
            patch = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "feImage",
            );
            const composite = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "feComposite",
            );
            composite.setAttribute("in", "composerNeck");
            composite.setAttribute("in2", "rawMap");
            composite.setAttribute("operator", "over");
            composite.setAttribute("result", "composerMap");
            merge.before(patch, composite);
            attribute(merge, "in", "composerMap");
            patches.set(material, patch);
            undo.push(() => {
              patch!.remove();
              composite.remove();
            });
          }
          for (const [name, value] of Object.entries({
            href: canvas.toDataURL(),
            x: (x - box.x) / scale + offset,
            y: (y - box.y) / scale,
            width: patchWidth / scale,
            height: patchHeight / scale,
            preserveAspectRatio: "none",
            result: "composerNeck",
          }))
            patch.setAttribute(name, String(value));
        }
        style(outline, "left", `${-offset - 1}px`);
        style(outline, "width", `${expandedWidth + 2}px`);
        attribute(
          outline,
          "viewBox",
          `-1 -1 ${expandedWidth + 2} ${height + 2}`,
        );
        // Open edge runs can have a zero-width bounding box. Use the
        // material's coordinates for masks, independent of those runs.
        const mask = outline.querySelector("mask")!;
        for (const target of [mask, mask.querySelector("rect")!]) {
          for (const [key, value] of Object.entries({
            width: expandedWidth + 2,
            height: height + 2,
          })) {
            attribute(target, key, String(value));
          }
        }
        const edgeRuns: Point[][] = [];
        for (const loop of loops) {
          let run: Point[] | undefined;
          for (let index = 0; index < loop.length; index++) {
            const previous = loop[(index + loop.length - 1) % loop.length];
            const current = loop[index];
            const nativeEdge =
              distance(
                (previous[0] + current[0]) / 2,
                (previous[1] + current[1]) / 2,
                pressedBox,
              ) < 0.02;
            if (nativeEdge === (i === pressed)) {
              if (!run) {
                run = [previous];
                edgeRuns.push(run);
              }
              run.push(current);
            } else run = undefined;
          }
        }
        const edgePath = path(edgeRuns, box, scale, offset).replaceAll("Z", "");
        for (const shape of outline.querySelectorAll<SVGPathElement>(
          "path:not([data-composer-material-clip])",
        )) {
          const edge =
            shape.hasAttribute("data-profile-glass-border") ||
            shape.hasAttribute("data-profile-glass-rim");
          attribute(shape, "d", edge ? edgePath : fullPath);
        }
        // Gradients remain in each control's original vertical coordinates.
        for (const gradient of outline.querySelectorAll("linearGradient")) {
          attribute(gradient, "y2", `${height}`);
        }
        style(nativeOutlines[i], "display", "none");
        style(outline, "display", "block");
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onPress = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (attachment.contains(event.target)) lastPressed = 0;
      else if (surfaces[1].contains(event.target)) lastPressed = 1;
      schedule();
    };
    // Motion writes transforms in rAF; read them before that same frame paints.
    const observer = new MutationObserver(paint);
    for (const element of [...surfaces, attachment, form])
      observer.observe(element, {
        attributes: true,
        attributeFilter: [
          "style",
          "data-composer-attachment-expanded",
          "data-entering",
          "data-mobile-hidden",
        ],
      });
    const resize = new ResizeObserver(schedule);
    surfaces.forEach((surface) => resize.observe(surface));
    form.addEventListener("pointerdown", onPress, true);
    window.addEventListener("resize", schedule);
    document.addEventListener("scroll", schedule, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      form.removeEventListener("pointerdown", onPress, true);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("scroll", schedule, true);
      reset();
    };
  }, [formRef]);
}
