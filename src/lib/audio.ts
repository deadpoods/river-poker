import type { SoundCue } from "./sound-signals";

type AudioState = "idle" | "ready" | "locked" | "unavailable" | "error";
type Note = [number, number, number, number?]; // frequency, offset, length, gain
export const soundRecipes: Record<SoundCue, Note[]> = {
  deal: [[920, 0, .07], [670, .06, .07], [480, .12, .1]],
  flop: [[520, 0, .12], [650, .09, .12], [780, .18, .18]],
  "turn-card": [[630, 0, .14], [945, .12, .24]],
  "river-card": [[470, 0, .16], [705, .1, .17], [940, .22, .3]],
  fold: [[240, 0, .12], [130, .08, .18]],
  check: [[1050, 0, .045], [790, .065, .07]],
  call: [[650, 0, .065], [850, .045, .08], [540, .1, .13]],
  raise: [[440, 0, .12], [660, .06, .14], [880, .14, .22]],
  "all-in": [[220, 0, .26], [440, .07, .28], [660, .15, .3], [880, .24, .4]],
  "your-turn": [[740, 0, .18, .2], [988, .2, .28, .2]],
  "other-turn": [[410, 0, .08, .07]],
  warning: [[880, 0, .09, .21], [880, .16, .09, .21], [1175, .32, .17, .21]],
  win: [[523, 0, .3], [659, .12, .3], [784, .24, .3], [1047, .4, .65], [1318, .43, .5, .07]],
  result: [[440, 0, .25], [330, .2, .4]],
  join: [[587, 0, .12], [880, .12, .25]],
  ready: [[780, 0, .09], [1040, .1, .16]],
  end: [[660, 0, .2], [495, .15, .25], [330, .3, .45]],
  ui: [[1200, 0, .035, .055]],
  open: [[390, 0, .09, .06], [590, .055, .1, .06]],
  error: [[230, 0, .11], [200, .15, .17]],
};
let context: AudioContext | null = null;
let master: GainNode | null = null;
let state: AudioState = "idle";
let enabled = false;
let volume = .65;
let pending: { cue: SoundCue; expires: number } | null = null;
const listeners = new Set<() => void>();
const nodes = new Set<AudioScheduledSourceNode>();
function publish(next: AudioState) { if (state !== next) { state = next; listeners.forEach(fn => fn()); } }
export const subscribeAudio = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const audioSnapshot = () => state;
export const audioServerSnapshot = () => "idle" as AudioState;
export function setSoundEnabled(value: boolean) {
  enabled = value;
  if (!value) {
    pending = null;
    for (const node of nodes) { try { node.stop(); } catch { /* Already ended. */ } }
    nodes.clear();
  }
}
export function setSoundVolume(value: number) {
  volume = Math.min(1, Math.max(.05, value));
  if (master && context) master.gain.setTargetAtTime(volume, context.currentTime, .015);
}

/** Called synchronously by real pointer/key gestures, before any network await. */
export function unlockSounds(): Promise<void> {
  if (!enabled) return Promise.resolve();
  try {
    if (!context || context.state === "closed") {
      const Constructor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) { publish("unavailable"); return Promise.resolve(); }
      context = new Constructor();
      master = context.createGain();
      master.gain.value = volume;
      const limiter = context.createDynamicsCompressor();
      master.connect(limiter); limiter.connect(context.destination);
      context.onstatechange = () => publish(context?.state === "running" ? "ready" : "locked");
    }
    if (context.state === "running") {
      publish("ready"); const queued = pending; pending = null;
      if (queued && queued.expires > Date.now() && enabled) playSound(queued.cue);
      return Promise.resolve();
    }
    const active = context;
    const resume = active.resume();
    publish(active.state === "running" ? "ready" : "locked");
    return resume.then(() => {
      publish(active.state === "running" ? "ready" : "locked");
      const queued = pending; pending = null;
      if (queued && queued.expires > Date.now() && enabled) playSound(queued.cue);
    }).catch(() => publish("error"));
  } catch { publish("error"); return Promise.resolve(); }
}

function noise(at: number, length: number, level: number) {
  const ctx = context!;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / samples.length, 3);
  const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  source.buffer = buffer; filter.type = "bandpass"; filter.frequency.value = 1800; gain.gain.value = level;
  source.connect(filter); filter.connect(gain); gain.connect(master!);
  nodes.add(source); source.onended = () => { nodes.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
  source.start(at); source.stop(at + length);
}

export function playSound(cue: SoundCue, offset = 0): boolean {
  if (!enabled) return false;
  if (["other-turn", "deal", "result", "win", "end"].includes(cue)) pending = null;
  if (!context || context.state !== "running") {
    if (cue === "your-turn" || cue === "warning") pending = { cue, expires: Date.now() + 3000 };
    if (state !== "unavailable" && state !== "error") publish("locked");
    return false;
  }
  try {
    const ctx = context, start = ctx.currentTime + offset;
    for (const [frequency, delay, length, level = .13] of soundRecipes[cue]) {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.type = ["deal", "fold", "call", "check"].includes(cue) ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start + delay);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * (cue === "fold" ? .5 : .98), start + delay + length);
      gain.gain.setValueAtTime(.0001, start + delay);
      gain.gain.exponentialRampToValueAtTime(level, start + delay + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, start + delay + length);
      oscillator.connect(gain); gain.connect(master!); nodes.add(oscillator);
      oscillator.onended = () => { nodes.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start + delay); oscillator.stop(start + delay + length + .015);
    }
    if (["deal", "flop", "turn-card", "river-card", "fold"].includes(cue)) noise(start, .15, .25);
    if (["call", "raise", "all-in"].includes(cue)) { noise(start, .05, .2); noise(start + .07, .04, .12); }
    return true;
  } catch { publish("error"); return false; }
}
