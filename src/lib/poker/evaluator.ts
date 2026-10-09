import type { Card, Suit } from "../types";

export const SUITS: Suit[] = ["s", "h", "d", "c"];
export const HAND_NAMES = [
  "High card",
  "One pair",
  "Two pair",
  "Three of a kind",
  "Straight",
  "Flush",
  "Full house",
  "Four of a kind",
  "Straight flush",
];
export const RANKS: Record<number, string> = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};
export const SUIT_SYMBOLS = { s: "♠", h: "♥", d: "♦", c: "♣" };

export function fullDeck(): Card[] {
  return SUITS.flatMap((suit) =>
    Array.from({ length: 13 }, (_, i) => ({ rank: i + 2, suit })),
  );
}
export const cardKey = (c: Card) => `${c.rank}${c.suit}`;
export const cardText = (c: Card) => `${RANKS[c.rank]}${SUIT_SYMBOLS[c.suit]}`;

function straightHigh(ranks: number[]): number {
  const unique = new Set(ranks);
  if (unique.has(14)) unique.add(1);
  for (let high = 14; high >= 5; high--) {
    if ([0, 1, 2, 3, 4].every((i) => unique.has(high - i))) return high;
  }
  return 0;
}

// A lexicographic score: category, then the five significant ranks.
// Evaluates 5–7 cards directly, including ace-low straights and double-trip full houses.
export function evaluate(cards: Card[]): {
  score: number;
  category: number;
  ranks: number[];
  name: string;
} {
  const counts = new Map<number, number>();
  const suits = new Map<Suit, number[]>();
  for (const c of cards) {
    counts.set(c.rank, (counts.get(c.rank) || 0) + 1);
    suits.set(c.suit, [...(suits.get(c.suit) || []), c.rank]);
  }
  const allRanks = [...counts.keys()].sort((a, b) => b - a);
  const groups = (n: number) => allRanks.filter((r) => counts.get(r)! >= n);
  const flush = [...suits.values()]
    .find((r) => r.length >= 5)
    ?.sort((a, b) => b - a);
  const straightFlush = flush ? straightHigh(flush) : 0;
  const four = groups(4),
    trips = groups(3),
    pairs = groups(2);
  let category = 0,
    ranks = allRanks.slice(0, 5);
  if (straightFlush) {
    category = 8;
    ranks = [straightFlush];
  } else if (four.length) {
    category = 7;
    ranks = [four[0], ...allRanks.filter((r) => r !== four[0]).slice(0, 1)];
  } else if (trips.length && pairs.some((r) => r !== trips[0])) {
    category = 6;
    ranks = [trips[0], pairs.find((r) => r !== trips[0])!];
  } else if (flush) {
    category = 5;
    ranks = flush.slice(0, 5);
  } else if (straightHigh(allRanks)) {
    category = 4;
    ranks = [straightHigh(allRanks)];
  } else if (trips.length) {
    category = 3;
    ranks = [trips[0], ...allRanks.filter((r) => r !== trips[0]).slice(0, 2)];
  } else if (pairs.length >= 2) {
    category = 2;
    ranks = [
      ...pairs.slice(0, 2),
      ...allRanks.filter((r) => !pairs.slice(0, 2).includes(r)).slice(0, 1),
    ];
  } else if (pairs.length) {
    category = 1;
    ranks = [pairs[0], ...allRanks.filter((r) => r !== pairs[0]).slice(0, 3)];
  }
  const padded = [...ranks, 0, 0, 0, 0, 0].slice(0, 5);
  const score = padded.reduce((s, rank) => s * 15 + rank, category);
  const name =
    category === 8 && ranks[0] === 14 ? "Royal flush" : HAND_NAMES[category];
  return { score, category, ranks, name };
}

export function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(values: T[], random: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
