import type { Assistant, Card, Room } from "../types";
import {
  cardKey,
  evaluate,
  fullDeck,
  HAND_NAMES,
  seededRandom,
  shuffle,
} from "./evaluator";
import { GameError, legalActions } from "./engine";

export function calculateAssistant(
  room: Room,
  playerId: string,
  trials = 800,
): Assistant {
  const p = room.players.find((p) => p.id === playerId),
    h = room.hand;
  if (
    !p ||
    !h ||
    p.cards.length !== 2 ||
    h.finishedAt ||
    !["active", "all-in"].includes(p.status)
  )
    throw new GameError(
      "The assistant is available while you are in the hand.",
      409,
    );
  const visible = [...p.cards, ...h.board];
  const seen = new Set(visible.map(cardKey));
  const remaining = fullDeck().filter((c) => !seen.has(cardKey(c)));
  const opponentPlayers = room.players.filter(
    (o) =>
      o.id !== playerId && (o.status === "active" || o.status === "all-in"),
  );
  const opponents = opponentPlayers.length;
  const legal = legalActions(room, playerId);
  const cap = p.committed + legal.toCall;
  const pot =
    cap > 0
      ? room.players.reduce(
          (sum, other) => sum + Math.min(other.committed, cap),
          0,
        )
      : h.pot;
  const contributions = room.players.map((other) => ({
    player: other,
    amount: other.id === playerId ? cap : Math.min(other.committed, cap),
  }));
  const levels = [
    ...new Set(contributions.map((c) => c.amount).filter(Boolean)),
  ].sort((a, b) => a - b);
  let previous = 0;
  const slices = levels.map((level) => {
    const amount =
      (level - previous) *
      contributions.filter((c) => c.amount >= level).length;
    previous = level;
    // Active players can still match a live wager. Short all-ins can contest
    // only the levels they covered. Future contributions are excluded from EV.
    const eligible = opponentPlayers
      .filter((other) => other.status === "active" || other.committed >= level)
      .map((other) => other.id);
    return { amount, eligible };
  });
  const hasSidePots = opponentPlayers.some(
    (other) => other.status === "all-in" && other.committed < cap,
  );
  const random = seededRandom(
    visible.reduce(
      (a, c) => (a * 31 + c.rank * 13 + c.suit.charCodeAt(0)) >>> 0,
      1597,
    ) + opponents,
  );
  let equity = 0,
    expectedPayout = 0;
  const distribution = Array(9).fill(0) as number[];
  for (let i = 0; i < trials; i++) {
    const shuffled = shuffle(remaining, random);
    const board = [...h.board, ...shuffled.splice(0, 5 - h.board.length)];
    const hero = evaluate([...p.cards, ...board]);
    distribution[hero.category]++;
    const scores = [hero.score];
    for (let n = 0; n < opponents; n++)
      scores.push(evaluate([...shuffled.splice(0, 2), ...board]).score);
    const opponentScores = new Map(
      opponentPlayers.map((other, index) => [other.id, scores[index + 1]]),
    );
    for (const slice of slices) {
      const potScores = [
        hero.score,
        ...slice.eligible.map((id) => opponentScores.get(id)!),
      ];
      const best = Math.max(...potScores);
      if (hero.score === best)
        expectedPayout +=
          slice.amount / potScores.filter((score) => score === best).length;
    }
    const max = Math.max(...scores);
    if (hero.score === max)
      equity += 1 / scores.filter((s) => s === max).length;
  }
  equity /= trials;
  const made = evaluate(visible);
  const drawCards: Card[] = [];
  const fourFlush = ["s", "h", "d", "c"].find(
    (s) => visible.filter((c) => c.suit === s).length === 4,
  );
  const straightCards =
    h.board.length >= 3 && made.category < 4
      ? remaining.filter((c) => evaluate([...visible, c]).category === 4)
      : [];
  if (fourFlush && h.board.length >= 3 && made.category < 5)
    drawCards.push(...remaining.filter((c) => c.suit === fourFlush));
  drawCards.push(...straightCards);
  const outs = new Set(drawCards.map(cardKey)).size;
  const draws = 5 - h.board.length;
  const draw =
    outs && draws
      ? fourFlush && straightCards.length
        ? "Straight or flush draw"
        : fourFlush
          ? "Flush draw"
          : "Straight draw"
      : null;
  const drawChance = draw
    ? (draws === 2
        ? 1 -
          ((remaining.length - outs) / remaining.length) *
            ((remaining.length - outs - 1) / (remaining.length - 1))
        : outs / remaining.length) * 100
    : null;
  const potOdds = legal.toCall
    ? (legal.toCall / (pot + legal.toCall)) * 100
    : 0;
  const callEV = expectedPayout / trials - legal.toCall;
  const explanation = draw
    ? `${outs} unseen cards complete your ${draw.toLowerCase().replace(" draw", "")}. With ${draws} card${draws === 1 ? "" : "s"} to come, the chance of completing it is approximately ${drawChance!.toFixed(1)}%. Completing a draw does not guarantee the best hand.`
    : h.board.length
      ? `${made.name} is your current made hand. Equity estimates your chance of winning against ${opponents} uniformly random opponent hand${opponents === 1 ? "" : "s"}, with shared credit for ties. Short stacks may contest fewer chips.`
      : `Your equity is estimated across ${trials.toLocaleString()} possible boards against ${opponents} uniformly random opponent hand${opponents === 1 ? "" : "s"}. Position and opponents' actual ranges can change the decision.`;
  return {
    equity: equity * 100,
    margin: 1.96 * Math.sqrt((equity * (1 - equity)) / trials) * 100,
    trials,
    opponents,
    potOdds,
    toCall: legal.toCall,
    pot,
    callEV,
    hasSidePots,
    hand: made.name,
    outs,
    draw,
    drawChance,
    explanation,
    distribution: HAND_NAMES.map((name, i) => ({
      name,
      probability: (distribution[i] / trials) * 100,
    }))
      .filter((d) => d.probability > 0)
      .reverse(),
  };
}
