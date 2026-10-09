import { randomBytes, randomUUID } from "node:crypto";
import type {
  ActionKind,
  Card,
  HandResult,
  LegalActions,
  Player,
  Profile,
  PublicRoom,
  Room,
  Settings,
  Street,
} from "../types";
import { evaluate, fullDeck, seededRandom, shuffle } from "./evaluator";

export class GameError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export const emptyActions = (): Record<ActionKind, number> => ({
  fold: 0,
  check: 0,
  call: 0,
  raise: 0,
});
export function createPlayer(
  profile: Pick<Profile, "id" | "name" | "color">,
  stack: number,
  bot = false,
  now = Date.now(),
): Player {
  return {
    ...profile,
    bot,
    ready: bot,
    lastSeen: now,
    stack,
    status: "waiting",
    cards: [],
    bet: 0,
    committed: 0,
    lastAction: "",
    actions: emptyActions(),
    assistantUses: 0,
  };
}

export function createRoom(
  profile: Profile,
  name: string,
  settings: Settings,
  practice = false,
  now = Date.now(),
): Room {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from(
    randomBytes(6),
    (b) => alphabet[b % alphabet.length],
  ).join("");
  const players = [createPlayer(profile, settings.startingStack, false, now)];
  if (practice) {
    [
      ["Nina", "rose"],
      ["Oliver", "sage"],
      ["Theo", "sand"],
      ["Mia", "lilac"],
      ["Jamie", "blue"],
    ]
      .slice(0, settings.maxPlayers - 1)
      .forEach(([botName, color]) =>
        players.push(
          createPlayer(
            { id: `bot-${randomUUID()}`, name: botName, color },
            settings.startingStack,
            true,
            now,
          ),
        ),
      );
    players[0].ready = true;
  }
  const room: Room = {
    id: randomUUID(),
    code,
    name,
    hostId: profile.id,
    practice,
    settings,
    players,
    status: "lobby",
    hand: null,
    history: [],
    events: [],
    createdAt: now,
    startedAt: null,
    endedAt: null,
    updatedAt: now,
    version: 1,
    lastDealer: players.length - 2,
    receipts: [],
  };
  log(
    room,
    "room",
    `${profile.name} opened the table`,
    undefined,
    undefined,
    now,
  );
  return room;
}

export function log(
  room: Room,
  type: string,
  message: string,
  playerId?: string,
  amount?: number,
  now = Date.now(),
) {
  room.events.push({
    id: randomUUID(),
    at: now,
    hand: room.hand?.number || 0,
    street: room.hand?.street || "lobby",
    type,
    message,
    playerId,
    amount,
  });
  if (room.events.length > 250) room.events = room.events.slice(-250);
}

const playing = (p: Player) => p.status === "active" || p.status === "all-in";
const actionable = (p: Player) => p.status === "active" && p.stack > 0;
function nextIndex(
  room: Room,
  index: number,
  predicate: (p: Player) => boolean,
): number {
  for (let n = 1; n <= room.players.length; n++) {
    const i = (index + n + room.players.length) % room.players.length;
    if (predicate(room.players[i])) return i;
  }
  return -1;
}

function contribute(room: Room, p: Player, amount: number) {
  const chips = Math.min(p.stack, amount);
  if (chips < 0 || !Number.isSafeInteger(chips))
    throw new GameError("Invalid chip amount.");
  p.stack -= chips;
  p.bet += chips;
  p.committed += chips;
  room.hand!.pot += chips;
  if (p.stack === 0) p.status = "all-in";
  return chips;
}

export function startHand(room: Room, now = Date.now(), suppliedSeed?: string) {
  if (room.status === "finished")
    throw new GameError("This session has ended.", 409);
  if (room.hand && !room.hand.finishedAt)
    throw new GameError("Finish the current hand first.", 409);
  const eligible = room.players.filter((p) => p.stack > 0);
  if (eligible.length < 2) {
    finishSession(room, now);
    return;
  }
  if (room.history.length >= 300) {
    finishSession(room, now);
    return;
  }
  if (!room.startedAt) room.startedAt = now;
  room.status = "playing";
  for (const p of room.players) {
    p.status = p.stack > 0 ? "active" : "out";
    p.cards = [];
    p.bet = 0;
    p.committed = 0;
    p.lastAction = "";
    p.actions = emptyActions();
    p.assistantUses = 0;
  }
  const dealerIndex = nextIndex(room, room.lastDealer, playing);
  room.lastDealer = dealerIndex;
  const sbIndex =
    eligible.length === 2 ? dealerIndex : nextIndex(room, dealerIndex, playing);
  const bbIndex = nextIndex(room, sbIndex, playing);
  const seed = suppliedSeed || randomBytes(32).toString("hex");
  // Fisher–Yates with cryptographic random integers in live hands. A test seed makes
  // reproducible fixtures possible without making production shuffles predictable.
  const random = suppliedSeed
    ? seededRandom(parseInt(seed.slice(0, 8), 16) || 1)
    : () => randomBytes(4).readUInt32BE(0) / 4294967296;
  const deck = shuffle(fullDeck(), random);
  for (let round = 0; round < 2; round++) {
    for (let n = 1; n <= room.players.length; n++) {
      const p = room.players[(dealerIndex + n) % room.players.length];
      if (playing(p)) p.cards.push(deck.pop()!);
    }
  }
  room.hand = {
    number: room.history.length + 1,
    street: "preflop",
    dealer: room.players[dealerIndex].id,
    smallBlind: room.players[sbIndex].id,
    bigBlind: room.players[bbIndex].id,
    deck,
    board: [],
    pot: 0,
    currentBet: room.settings.smallBlind * 2,
    minRaise: room.settings.smallBlind * 2,
    pending: eligible.map((p) => p.id),
    actedSinceRaise: [],
    actedAtBet: {},
    actor: null,
    deadline: 0,
    startedAt: now,
    finishedAt: null,
    result: null,
    seed,
    botAt: 0,
  };
  log(
    room,
    "deal",
    `Hand ${room.hand.number} · ${room.players[dealerIndex].name} has the button`,
    undefined,
    undefined,
    now,
  );
  const sb = contribute(room, room.players[sbIndex], room.settings.smallBlind);
  const bb = contribute(
    room,
    room.players[bbIndex],
    room.settings.smallBlind * 2,
  );
  log(
    room,
    "blind",
    `${room.players[sbIndex].name} posted the small blind`,
    room.players[sbIndex].id,
    sb,
    now,
  );
  log(
    room,
    "blind",
    `${room.players[bbIndex].name} posted the big blind`,
    room.players[bbIndex].id,
    bb,
    now,
  );
  room.hand.pending = room.hand.pending.filter((id) =>
    actionable(room.players.find((p) => p.id === id)!),
  );
  advance(room, bbIndex, now);
}

function setActor(room: Room, index: number, now: number) {
  const hand = room.hand!;
  hand.actor = room.players[index].id;
  hand.deadline = now + room.settings.turnSeconds * 1000;
  hand.botAt = room.players[index].bot
    ? now + 1000 + Math.floor((index % 3) * 280)
    : 0;
}

function advance(room: Room, from: number, now: number) {
  const hand = room.hand!;
  if (room.players.filter(playing).length <= 1) {
    settle(room, now);
    return;
  }
  hand.pending = hand.pending.filter((id) =>
    actionable(room.players.find((p) => p.id === id)!),
  );
  const active = room.players.filter(actionable);
  if (active.length === 1) {
    // A short all-in blind cannot require an unmatchable call from the only
    // player with chips. Keep the nominal big-blind bring-in while multiple
    // players can still bet, then cap the last decision at the actual wager.
    hand.currentBet = Math.min(
      hand.currentBet,
      Math.max(
        0,
        ...room.players
          .filter((p) => p.id !== active[0].id && playing(p))
          .map((p) => p.bet),
      ),
    );
  }
  // A single active player still has to answer a live all-in bet. Once matched,
  // no player can wager against an opponent without chips, so run the board out.
  if (
    active.length <= 1 &&
    (!active.length || active[0].bet >= hand.currentBet)
  ) {
    hand.pending = [];
    while (hand.board.length < 5) dealStreet(room, now);
    settle(room, now);
    return;
  }
  if (hand.pending.length) {
    const next = nextIndex(room, from, (p) => hand.pending.includes(p.id));
    setActor(room, next, now);
    return;
  }
  if (hand.street === "river") {
    settle(room, now);
    return;
  }
  dealStreet(room, now);
  for (const p of room.players) {
    p.bet = 0;
    if (p.status === "active") p.lastAction = "";
  }
  hand.currentBet = 0;
  hand.minRaise = room.settings.smallBlind * 2;
  hand.actedSinceRaise = [];
  hand.actedAtBet = {};
  hand.pending = room.players.filter(actionable).map((p) => p.id);
  advance(
    room,
    room.players.findIndex((p) => p.id === hand.dealer),
    now,
  );
}

function dealStreet(room: Room, now: number) {
  const h = room.hand!;
  h.deck.pop(); // Burn card is private server state.
  if (h.board.length === 0) {
    h.street = "flop";
    h.board.push(h.deck.pop()!, h.deck.pop()!, h.deck.pop()!);
  } else if (h.board.length === 3) {
    h.street = "turn";
    h.board.push(h.deck.pop()!);
  } else {
    h.street = "river";
    h.board.push(h.deck.pop()!);
  }
  log(room, "street", `The ${h.street} is dealt`, undefined, undefined, now);
}

export function legalActions(room: Room, playerId: string): LegalActions {
  const h = room.hand,
    p = room.players.find((p) => p.id === playerId);
  const turn =
    !!h && !h.finishedAt && h.actor === playerId && !!p && actionable(p);
  const toCall =
    p && h ? Math.min(p.stack, Math.max(0, h.currentBet - p.bet)) : 0;
  const maxRaiseTo = p ? p.stack + p.bet : 0;
  const minimum = h ? h.currentBet + h.minRaise : 0;
  return {
    turn,
    toCall,
    canCheck: turn && toCall === 0,
    canCall: turn && toCall > 0,
    canRaise:
      turn &&
      maxRaiseTo > (h?.currentBet || 0) &&
      (!h!.actedSinceRaise.includes(playerId) ||
        h!.currentBet - (h!.actedAtBet[playerId] || 0) >= h!.minRaise) &&
      room.players.some((o) => o.id !== playerId && actionable(o)),
    minRaiseTo: Math.min(maxRaiseTo, minimum),
    maxRaiseTo,
  };
}

export function act(
  room: Room,
  playerId: string,
  kind: ActionKind,
  raiseTo?: number,
  now = Date.now(),
) {
  const h = room.hand;
  const p = room.players.find((p) => p.id === playerId);
  if (!h || h.finishedAt || !p)
    throw new GameError("There is no active hand.", 409);
  if (h.actor !== playerId || !actionable(p))
    throw new GameError(
      "It is not your turn. The table has been refreshed.",
      409,
    );
  const legal = legalActions(room, playerId);
  let amount = 0;
  if (kind === "fold") {
    p.status = "folded";
    p.lastAction = "Folded";
  } else if (kind === "check") {
    if (!legal.canCheck) throw new GameError("You need to call or fold.");
    p.lastAction = "Checked";
  } else if (kind === "call") {
    if (!legal.canCall)
      throw new GameError("There is nothing to call. You can check.");
    amount = contribute(room, p, legal.toCall);
    p.lastAction = p.stack ? `Called ${amount}` : "All in";
  } else if (kind === "raise") {
    if (!legal.canRaise)
      throw new GameError("The betting has not reopened for a raise.");
    if (
      !Number.isSafeInteger(raiseTo) ||
      raiseTo! <= h.currentBet ||
      raiseTo! > legal.maxRaiseTo
    )
      throw new GameError("Choose a valid total bet.");
    if (raiseTo! < h.currentBet + h.minRaise && raiseTo !== legal.maxRaiseTo)
      throw new GameError(
        `The minimum total bet is ${h.currentBet + h.minRaise}.`,
      );
    const raiseSize = raiseTo! - h.currentBet;
    amount = contribute(room, p, raiseTo! - p.bet);
    if (raiseSize >= h.minRaise) {
      h.minRaise = raiseSize;
      h.actedSinceRaise = [];
    }
    h.currentBet = raiseTo!;
    h.pending = room.players
      .filter((o) => o.id !== playerId && actionable(o))
      .map((o) => o.id);
    p.lastAction = p.stack ? `Raised to ${raiseTo}` : "All in";
  } else throw new GameError("Unknown action.");
  p.actions[kind]++;
  h.actedSinceRaise.push(playerId);
  h.actedAtBet[playerId] = h.currentBet;
  h.pending = h.pending.filter((id) => id !== playerId);
  log(
    room,
    kind,
    `${p.name} ${p.lastAction.toLowerCase()}`,
    playerId,
    amount || undefined,
    now,
  );
  advance(room, room.players.indexOf(p), now);
}

export function settle(room: Room, now = Date.now()) {
  const h = room.hand!;
  if (h.finishedAt) return;
  const contenders = room.players.filter(playing);
  const showdown = contenders.length > 1;
  // Return unmatched contributions. This makes side pots exact and avoids
  // charging a player for a bet that nobody called.
  const ordered = [...room.players].sort((a, b) => b.committed - a.committed);
  if (ordered[0].committed > (ordered[1]?.committed || 0)) {
    const refund = ordered[0].committed - (ordered[1]?.committed || 0);
    ordered[0].committed -= refund;
    ordered[0].stack += refund;
    h.pot -= refund;
    log(
      room,
      "refund",
      `${ordered[0].name} received an uncalled bet back`,
      ordered[0].id,
      refund,
      now,
    );
  }
  const invested = new Map(room.players.map((p) => [p.id, p.committed]));
  const levels = [
    ...new Set(room.players.map((p) => p.committed).filter(Boolean)),
  ].sort((a, b) => a - b);
  const won = new Map<string, number>();
  const pots: HandResult["pots"] = [];
  let previous = 0;
  for (const level of levels) {
    const contributors = room.players.filter((p) => p.committed >= level);
    const amount = (level - previous) * contributors.length;
    previous = level;
    const eligible = contributors.filter(playing);
    if (!eligible.length)
      throw new Error("A side pot has no eligible contender.");
    const best = Math.max(
      ...eligible.map((p) =>
        showdown ? evaluate([...p.cards, ...h.board]).score : 0,
      ),
    );
    const winners = eligible.filter(
      (p) => !showdown || evaluate([...p.cards, ...h.board]).score === best,
    );
    // Odd chips go clockwise from the dealer, following standard button order.
    const dealerIndex = room.players.findIndex((p) => p.id === h.dealer);
    winners.sort(
      (a, b) =>
        ((room.players.indexOf(a) - dealerIndex - 1 + room.players.length) %
          room.players.length) -
        ((room.players.indexOf(b) - dealerIndex - 1 + room.players.length) %
          room.players.length),
    );
    winners.forEach((p, i) => {
      const share =
        Math.floor(amount / winners.length) +
        (i < amount % winners.length ? 1 : 0);
      p.stack += share;
      won.set(p.id, (won.get(p.id) || 0) + share);
    });
    pots.push({ amount, winners: winners.map((p) => p.id) });
  }
  h.actor = null;
  h.finishedAt = now;
  h.street = showdown ? "showdown" : h.street;
  const winners = contenders
    .filter((p) => won.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      amount: won.get(p.id)!,
      hand: showdown ? evaluate([...p.cards, ...h.board]).name : "Uncontested",
    }));
  log(
    room,
    "result",
    winners
      .map(
        (p) =>
          `${p.name} won ${p.amount.toLocaleString()}${showdown ? ` with ${p.hand.toLowerCase()}` : ""}`,
      )
      .join(" · "),
    winners[0]?.id,
    h.pot,
    now,
  );
  const result: HandResult = {
    number: h.number,
    startedAt: h.startedAt,
    endedAt: now,
    pot: h.pot,
    board: [...h.board],
    winners,
    pots,
    players: room.players
      .filter((p) => p.cards.length)
      .map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        bot: p.bot,
        cards: [...p.cards],
        showdown: showdown && playing(p),
        won: won.get(p.id) || 0,
        invested: invested.get(p.id) || 0,
        net: (won.get(p.id) || 0) - (invested.get(p.id) || 0),
        hand: evaluate([...p.cards, ...h.board]).name,
        actions: { ...p.actions },
        assistantUses: p.assistantUses,
      })),
    events: room.events
      .filter((e) => e.hand === h.number)
      .map((e) => ({ ...e })),
  };
  h.result = result;
  room.history.push(result);
  for (const p of room.players) p.bet = 0;
}

export function finishSession(room: Room, now = Date.now()) {
  if (room.hand && !room.hand.finishedAt)
    throw new GameError("Finish this hand before ending the session.", 409);
  room.status = "finished";
  room.endedAt = now;
  log(
    room,
    "session",
    "The session has ended. See you at the next table.",
    undefined,
    undefined,
    now,
  );
}

export function tick(room: Room, now = Date.now()): boolean {
  let changed = false;
  // Deadlines live in PostgreSQL. If a quiet room wakes on another instance,
  // resolve overdue decisions at their original times instead of granting a
  // fresh timer to every absent player. Bound the work for a single request.
  for (let n = 0; n < 64; n++) {
    const hand = room.hand;
    if (!hand || hand.finishedAt || room.status !== "playing" || !hand.actor)
      break;
    const player = room.players.find((p) => p.id === hand.actor)!;
    const due = player.bot ? hand.botAt : hand.deadline;
    if (now < due || !tickOnce(room, due)) break;
    changed = true;
  }
  return changed;
}

function tickOnce(room: Room, now: number): boolean {
  const h = room.hand;
  if (!h || h.finishedAt || room.status !== "playing" || !h.actor) return false;
  const p = room.players.find((p) => p.id === h.actor)!;
  if (p.bot && now >= h.botAt) {
    const legal = legalActions(room, p.id);
    const rng = seededRandom(
      (parseInt(h.seed.slice(0, 8), 16) || 1) + room.events.length * 137,
    );
    const strength = evaluate([...p.cards, ...h.board]);
    const preflopStrong =
      p.cards[0].rank === p.cards[1].rank || p.cards.every((c) => c.rank >= 11);
    const strong = h.board.length ? strength.category >= 2 : preflopStrong;
    if (
      legal.canRaise &&
      strong &&
      rng() < 0.32 &&
      h.currentBet < room.settings.smallBlind * 16
    ) {
      const target = Math.min(
        legal.maxRaiseTo,
        Math.max(legal.minRaiseTo, h.currentBet + room.settings.smallBlind * 4),
      );
      act(room, p.id, "raise", target, now);
    } else if (legal.canCheck) act(room, p.id, "check", undefined, now);
    else if (!strong && legal.toCall > p.stack * 0.25 && rng() < 0.75)
      act(room, p.id, "fold", undefined, now);
    else act(room, p.id, "call", undefined, now);
    return true;
  }
  if (now >= h.deadline) {
    const kind = legalActions(room, p.id).canCheck ? "check" : "fold";
    log(room, "timeout", `${p.name}'s time expired`, p.id, undefined, now);
    act(room, p.id, kind, undefined, now);
    return true;
  }
  return false;
}

export function projectRoom(
  room: Room,
  playerId: string,
  now = Date.now(),
  formerMember = false,
): PublicRoom {
  if (!formerMember && !room.players.some((p) => p.id === playerId))
    throw new GameError("You need an invitation to join this table.", 403);
  const reveal = (result: HandResult): HandResult => ({
    ...result,
    players: result.players.map((p) => ({
      ...p,
      cards: p.id === playerId || p.showdown ? p.cards : [],
      hand: p.id === playerId || p.showdown ? p.hand : "Hidden",
    })),
  });
  const {
    deck: _deck,
    seed: _seed,
    pending: _pending,
    actedSinceRaise: _acted,
    actedAtBet: _atBet,
    botAt: _botAt,
    ...publicHand
  } = room.hand || ({} as NonNullable<Room["hand"]>);
  const {
    receipts: _receipts,
    lastDealer: _dealer,
    hand: _hand,
    players: _players,
    history: _history,
    ...meta
  } = room;
  return {
    ...meta,
    players: room.players.map(
      ({ actions: _actions, assistantUses: _assistant, cards, ...p }) => ({
        ...p,
        cards: cards.map((c) =>
          p.id === playerId ||
          room.hand?.result?.players.some((r) => r.id === p.id && r.showdown)
            ? c
            : null,
        ),
        connected: p.bot || now - p.lastSeen < 25_000,
      }),
    ),
    hand: room.hand
      ? ({
          ...publicHand,
          result: room.hand.result ? reveal(room.hand.result) : null,
        } as PublicRoom["hand"])
      : null,
    history: room.history.map(reveal),
    legal: legalActions(room, playerId),
    serverTime: now,
  };
}
