import type { HandResult } from "./types";
import { evaluate } from "./poker/evaluator";

export type StyleMetric = { value: number | null; count: number; sample: number };
export type Playstyle = {
  label: string; sample: number; aggression: StyleMetric; vpip: StyleMetric;
  pfr: StyleMetric; bluff: StyleMetric; folds: StyleMetric; showdown: StyleMetric;
  threeBet: StyleMetric; continuation: StyleMetric;
};
const metric = (count: number, sample: number): StyleMetric => ({ count, sample, value: sample ? count / sample * 100 : null });

/** Personal records only. No opponent hole cards are needed or returned. */
export function summarizePlaystyle(hands: HandResult[], selfId: string): Playstyle {
  const records = hands.filter(h => h.players.some(p => p.id === selfId));
  let voluntary = 0, preflopRaises = 0, raises = 0, calls = 0, decisions = 0, folds = 0;
  let weakRaises = 0, postflopRaises = 0, showdowns = 0, showdownWins = 0;
  let threeBets = 0, threeBetOpportunities = 0, cbets = 0, cbetOpportunities = 0;
  for (const hand of records) {
    const self = hand.players.find(p => p.id === selfId)!;
    raises += self.actions.raise; calls += self.actions.call; folds += self.actions.fold;
    decisions += Object.values(self.actions).reduce((a, n) => a + n, 0);
    if (self.showdown) { showdowns++; if (self.won > 0) showdownWins++; }
    const events = hand.events.filter(e => e.playerId === selfId && ["fold", "check", "call", "raise"].includes(e.type));
    const preflop = events.filter(e => e.street === "preflop");
    if (preflop.some(e => e.type === "call" || e.type === "raise")) voluntary++;
    if (preflop.some(e => e.type === "raise")) preflopRaises++;
    const first = preflop[0];
    if (first) {
      const before = hand.events.slice(0, hand.events.findIndex(e => e.id === first.id));
      if (before.filter(e => e.street === "preflop" && e.type === "raise").length === 1) {
        threeBetOpportunities++; if (first.type === "raise") threeBets++;
      }
    }
    const lastRaise = hand.events.filter(e => e.street === "preflop" && e.type === "raise").at(-1);
    const flopAction = events.find(e => e.street === "flop");
    if (lastRaise?.playerId === selfId && flopAction) {
      const before = hand.events.slice(0, hand.events.findIndex(e => e.id === flopAction.id));
      if (!before.some(e => e.street === "flop" && e.type === "raise")) { cbetOpportunities++; if (flopAction.type === "raise") cbets++; }
    }
    for (const event of events.filter(e => e.type === "raise" && ["flop", "turn", "river"].includes(e.street))) {
      if (self.cards.length !== 2) continue;
      const board = hand.board.slice(0, event.street === "flop" ? 3 : event.street === "turn" ? 4 : 5);
      if (board.length < 3) continue;
      postflopRaises++;
      if (evaluate([...self.cards, ...board]).category === 0) weakRaises++;
    }
  }
  const vpip = metric(voluntary, records.length), aggression = metric(raises, raises + calls);
  const loose = (vpip.value ?? 0) >= 35, aggressive = (aggression.value ?? 0) >= 40;
  return {
    label: records.length < 20 ? "Finding your style" : `${loose ? "Open" : "Selective"} · ${aggressive ? "Aggressive" : "Patient"}`,
    sample: records.length, vpip, aggression, pfr: metric(preflopRaises, records.length),
    bluff: metric(weakRaises, postflopRaises), folds: metric(folds, decisions), showdown: metric(showdownWins, showdowns),
    threeBet: metric(threeBets, threeBetOpportunities), continuation: metric(cbets, cbetOpportunities),
  };
}
