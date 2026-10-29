import {
  defineSound,
  ensureReady,
  getMasterBus,
  type SoundDefinition,
} from "@web-kits/audio";

const contexts = new WeakMap<AudioContext, Map<string, Promise<AudioBuffer>>>();
let mediaBus: GainNode | null = null;

export async function prepareSound(definition: SoundDefinition) {
  const context = await ensureReady({ latencyHint: "interactive" });
  const bus = getMasterBus();
  if (mediaBus !== bus) {
    mediaBus = bus;
    bus.gain.value = 0.5;
  }
  let duration = 0;
  if (
    "source" in definition &&
    definition.source.type === "sample" &&
    definition.source.url
  ) {
    const source = definition.source;
    const url = source.url!;
    let samples = contexts.get(context);
    if (!samples) {
      samples = new Map();
      contexts.set(context, samples);
    }
    const cache = samples;
    let sample = cache.get(url);
    if (!sample) {
      sample = fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error(`Unable to load sound: ${url}`);
          return response.arrayBuffer();
        })
        .then((data) => context.decodeAudioData(data))
        .catch((error: unknown) => {
          cache.delete(url);
          throw error;
        });
      samples.set(url, sample);
    }
    const buffer = await sample;
    duration = buffer.duration;
    definition = {
      ...definition,
      source: { ...source, buffer, url: undefined },
      envelope: definition.envelope ?? { decay: duration, sustain: 1 },
    };
  }
  return { play: defineSound(definition), context, duration };
}
