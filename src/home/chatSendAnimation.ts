import bubblePath from "../components/messageBubblePath";
import { randomUUID } from "../lib/randomUUID";
import type { ChatOrigin } from "./chat";
import { cubicBezier } from "framer-motion";

export const chatComposerFocusEvent = "home-chat:composer-focus";
const animatedScrollers = new WeakMap<EventTarget, () => void>();

export function chatScroller(element: HTMLElement) {
  const reply = element.closest<HTMLElement>("[data-reply-preview-scroll]");
  const native =
    !reply && Boolean(element.closest("[data-home-native-scroll]"));
  const scroller = native
    ? document.documentElement
    : (reply ??
      element.closest<HTMLElement>("[data-home-scroll]") ??
      element
        .closest("[data-contained-viewport]")!
        .querySelector<HTMLElement>("[data-home-scroll]")!);
  const end = () =>
    Math.max(
      0,
      scroller.scrollHeight -
        (native ? window.innerHeight : scroller.clientHeight),
    );
  const source = native ? window : scroller;
  return {
    top: () => scroller.scrollTop,
    animating: () => animatedScrollers.has(source),
    end,
    atBottom: () => end() - scroller.scrollTop <= 96,
    bottom: () => {
      const layout =
        element.closest<HTMLElement>("[data-reply-preview]") ??
        element.closest<HTMLElement>("[data-home-thread]") ??
        scroller.querySelector<HTMLElement>("[data-home-thread]");
      // Follow the layout edge, not badges or animated photos overflowing it.
      if (layout) {
        const bottom = layout.getBoundingClientRect().bottom;
        if (native)
          return Math.max(0, bottom + window.scrollY - window.innerHeight);
        const rect = scroller.getBoundingClientRect();
        const zoom = rect.height / scroller.offsetHeight || 1;
        const padding =
          parseFloat(getComputedStyle(scroller).paddingBottom) || 0;
        return Math.max(
          0,
          (bottom - rect.top) / zoom +
            scroller.scrollTop +
            padding -
            scroller.clientHeight,
        );
      }
      return Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    },
    scroll: (top: number, behavior: ScrollBehavior = "instant") =>
      (native ? window : scroller).scrollTo({ top, behavior }),
    source,
  };
}

export function animateChatScroll(
  list: HTMLElement,
  onFinish: (completed: boolean) => void = () => {},
  update: (destination: number, progress: number) => void = () => {},
  getDestination?: () => number,
) {
  const scroller = chatScroller(list);
  animatedScrollers.get(scroller.source)?.();
  let from = scroller.top();
  const ease = cubicBezier(0.32, 0.72, 0, 1);
  let start: number | undefined;
  let destination = from;
  let frame = 0;
  let finished = false;
  const finish = (completed: boolean) => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    if (animatedScrollers.get(scroller.source) === cancel)
      animatedScrollers.delete(scroller.source);
    onFinish(completed);
  };
  const follow = (time: number) => {
    // Measure once after the composer has committed its cleared draft.
    if (start === undefined) {
      start = time;
      from = scroller.top();
      destination = scroller.bottom();
    }
    if (getDestination) destination = getDestination();
    destination = Math.max(0, Math.min(destination, scroller.end()));
    const progress = Math.min(1, (time - start) / 480);
    scroller.scroll(from + (destination - from) * ease(progress));
    update(destination, progress);
    if (progress === 1) finish(true);
    else frame = requestAnimationFrame(follow);
  };
  const cancel = () => finish(false);
  animatedScrollers.set(scroller.source, cancel);
  frame = requestAnimationFrame(follow);
  return cancel;
}

// One scroll trajectory owns sending while the list and composer resize.
export function animateChatSend(
  list: HTMLElement,
  target: HTMLElement,
  origin: ChatOrigin,
  onFinish: (completed: boolean) => void,
) {
  const photo = target.querySelector<HTMLElement>("[data-chat-photo-group]");
  const text = photo
    ? target.querySelector<HTMLElement>(
        "[data-outgoing-message]:not([data-chat-photo-group]):not([data-message-reaction])",
      )
    : target;
  const entrance = photo?.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 480,
    easing: "cubic-bezier(0.32, 0.72, 0, 1)",
    fill: "both",
  });
  entrance?.pause();
  const scroller = chatScroller(list);
  // Keep the real text hidden while its viewport destination follows layout.
  if (text) text.style.visibility = "hidden";
  let bubble: ReturnType<typeof animateBubble> | null = null;
  const viewportWidth = window.innerWidth;
  const resize = () => {
    if (
      matchMedia("(min-width: 640px)").matches ||
      window.innerWidth !== viewportWidth
    )
      cancel();
  };
  const cancel = animateChatScroll(
    list,
    (completed) => {
      entrance?.cancel();
      bubble?.cancel();
      if (text) text.style.visibility = "";
      window.removeEventListener("resize", resize);
      onFinish(completed);
    },
    (_destination, progress) => {
      if (entrance) entrance.currentTime = progress * 480;
      if (text && !bubble) bubble = animateBubble(list, text, origin);
      bubble?.update(progress);
    },
    scroller.bottom,
  );
  window.addEventListener("resize", resize);
  return cancel;
}

function animateBubble(
  list: HTMLElement,
  target: HTMLElement,
  origin: ChatOrigin,
) {
  const host = list.closest("[data-home-native-scroll]")
    ? document.body
    : (list.closest<HTMLElement>("[data-contained-viewport]") ?? document.body);
  const bounds = host.getBoundingClientRect();
  const zoom =
    host === document.body
      ? 1
      : list.getBoundingClientRect().width / list.offsetWidth || 1;
  const localRect = (rect: DOMRect) => ({
    left: (rect.left - (host === document.body ? 0 : bounds.left)) / zoom,
    top: (rect.top - (host === document.body ? 0 : bounds.top)) / zoom,
    width: rect.width / zoom,
    height: rect.height / zoom,
  });
  const source = localRect(origin.rect);
  const destination = localRect(target.getBoundingClientRect());
  const ghost = target.cloneNode(true) as HTMLElement;
  ghost.setAttribute("aria-hidden", "true");
  ghost.removeAttribute("data-chat-outgoing");
  ghost.removeAttribute("data-outgoing-message");
  // Cloned SVG definitions must not collide with the live bubble.
  const suffix = `-flight-${randomUUID()}`;
  const ids = [...ghost.querySelectorAll("[id]")].map((node) => node.id);
  for (const node of [ghost, ...ghost.querySelectorAll("*")]) {
    for (const attribute of [...node.attributes]) {
      let value = attribute.value;
      for (const id of ids)
        value = value.replaceAll(`url(#${id})`, `url(#${id}${suffix})`);
      if (attribute.name === "id") value += suffix;
      node.setAttribute(attribute.name, value);
    }
  }
  const shape = ghost.querySelector<SVGElement>("[data-bubble-radius]");
  if (shape) shape.style.height = "100%";
  const path = shape?.querySelector("[data-bubble-path]");
  const updateShape = () => {
    if (!shape || !path) return;
    const width = ghost.offsetWidth;
    const height = ghost.offsetHeight;
    shape.setAttribute("viewBox", `0 0 ${width} ${height}`);
    shape.setAttribute("data-bubble-ready", "");
    path.setAttribute("d", bubblePath(width, height, 20, true));
  };
  const flight = document.createElement("div");
  flight.inert = true;
  Object.assign(flight.style, {
    position: "fixed",
    left: `${destination.left}px`,
    top: `${destination.top}px`,
    width: `${destination.width}px`,
    height: `${destination.height}px`,
    zIndex: "20",
    pointerEvents: "none",
  });
  flight.setAttribute("aria-hidden", "true");
  const size = document.createElement("div");
  Object.assign(size.style, {
    position: "absolute",
    inset: "0",
    transformOrigin: "right bottom",
  });
  Object.assign(ghost.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: `${destination.width}px`,
    height: `${destination.height}px`,
    maxWidth: "none",
    margin: "0",
    visibility: "visible",
  });
  const computed = getComputedStyle(target);
  // Sync with the bubble's scroll-dependent colors to avoid a color jump on landing.
  const syncColor = () => {
    for (const token of ["--message-blue-top", "--message-blue-bottom"])
      ghost.style.setProperty(token, computed.getPropertyValue(token));
  };
  syncColor();
  size.append(ghost);
  flight.append(size);
  host.append(flight);
  target.style.visibility = "hidden";
  const riseEase = cubicBezier(0.77, 0, 0.175, 1);
  const update = (progress: number) => {
    // Remeasure after scrolling so the animation lands on the bubble as layout changes.
    reshape.currentTime = progress * 480;
    settle.currentTime = progress * 480;
    const current = localRect(target.getBoundingClientRect());
    const rise = riseEase(
      Math.max(0, Math.min(1, (progress * 480 - 75) / 365)),
    );
    flight.style.top = `${source.top + (current.top - source.top) * rise}px`;
    flight.style.left = `${current.left}px`;
    updateShape();
    syncColor();
  };
  const easing = "cubic-bezier(0.77, 0, 0.175, 1)";
  const reshape = ghost.animate(
    [
      {
        width: `${source.width}px`,
        height: `${source.height}px`,
        transform: `translate3d(${source.left - destination.left}px,0,0)`,
      },
      {
        width: `${destination.width}px`,
        height: `${destination.height}px`,
        transform: "translate3d(0,0,0)",
      },
    ],
    { delay: 30, duration: 170, easing, fill: "both" },
  );
  const settle = size.animate(
    [
      { transform: "scale(1)", easing, offset: 0 },
      { transform: "scale(0.83)", easing, offset: 0.33 },
      { transform: "scale(1)", offset: 1 },
    ],
    { duration: 480, fill: "both" },
  );
  reshape.pause();
  settle.pause();
  update(0);
  return {
    update,
    cancel: () => {
      for (const animation of [reshape, settle]) animation.cancel();
      target.style.visibility = "";
      flight.remove();
    },
  };
}
