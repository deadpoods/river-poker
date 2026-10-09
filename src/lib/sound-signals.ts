import type { PublicRoom, TableEvent } from "./types";

export type SoundCue = "deal" | "flop" | "turn-card" | "river-card" | "fold" | "check" | "call" | "raise" | "all-in" | "your-turn" | "other-turn" | "warning" | "win" | "result" | "join" | "ready" | "end" | "ui" | "open" | "error";

export function eventCue(event: TableEvent, room: PublicRoom, selfId: string): SoundCue | null {
  if (event.type === "result") return room.hand?.result?.winners.some(p => p.id === selfId) ? "win" : "result";
  if (event.type === "street") return event.street === "flop" ? "flop" : event.street === "turn" ? "turn-card" : "river-card";
  if (["call", "raise"].includes(event.type) && event.message.toLowerCase().includes("all in")) return "all-in";
  return ({ deal: "deal", fold: "fold", check: "check", call: "call", raise: "raise", join: "join", ready: "ready", end: "end" } as Record<string, SoundCue>)[event.type] || null;
}

export function turnKey(room: PublicRoom | null): string {
  const hand = room?.hand;
  return hand?.actor && !hand.finishedAt ? `${room!.code}:${hand.number}:${hand.street}:${hand.actor}:${hand.deadline}` : "";
}

/** A fresh mount is silent. Only recent authoritative changes produce feedback. */
export function soundChanges(previous: PublicRoom | null, next: PublicRoom, selfId: string, now = Date.now()): SoundCue[] {
  if (!previous || previous.code !== next.code) return [];
  const known = new Set(previous.events.map(e => e.id));
  const cues = next.events.filter(e => !known.has(e.id) && now - e.at < 5000).map(e => eventCue(e, next, selfId)).filter((c): c is SoundCue => !!c);
  const result = cues.find(c => c === "win" || c === "result");
  const output: SoundCue[] = result ? [result] : cues.slice(-2);
  if (turnKey(next) && next.hand!.deadline! > now && turnKey(next) !== turnKey(previous)) output.push(next.hand!.actor === selfId ? "your-turn" : "other-turn");
  return output;
}
