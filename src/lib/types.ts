export type Suit = "s" | "h" | "d" | "c";
export type Card = { rank: number; suit: Suit };
export type Street = "preflop" | "flop" | "turn" | "river" | "showdown";
export type ActionKind = "fold" | "check" | "call" | "raise";
export type PlayerStatus = "waiting" | "active" | "folded" | "all-in" | "out";
export type Preferences = {
  assistant: boolean;
  sound: boolean;
  reducedMotion: boolean;
};
export type Profile = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  preferences: Preferences;
};
export type Settings = {
  maxPlayers: number;
  startingStack: number;
  smallBlind: number;
  turnSeconds: number;
};
export type Player = {
  id: string;
  name: string;
  color: string;
  bot: boolean;
  ready: boolean;
  lastSeen: number;
  stack: number;
  status: PlayerStatus;
  cards: Card[];
  bet: number;
  committed: number;
  lastAction: string;
  actions: Record<ActionKind, number>;
  assistantUses: number;
};
export type TableEvent = {
  id: string;
  at: number;
  hand: number;
  street: Street | "lobby";
  type: string;
  message: string;
  playerId?: string;
  amount?: number;
};
export type HandResult = {
  number: number;
  startedAt: number;
  endedAt: number;
  pot: number;
  board: Card[];
  winners: { id: string; name: string; amount: number; hand: string }[];
  players: {
    id: string;
    name: string;
    color: string;
    bot: boolean;
    cards: Card[];
    showdown: boolean;
    won: number;
    invested: number;
    net: number;
    hand: string;
    actions: Record<ActionKind, number>;
    assistantUses: number;
  }[];
  pots: { amount: number; winners: string[] }[];
  events: TableEvent[];
};
export type Hand = {
  number: number;
  street: Street;
  dealer: string;
  smallBlind: string;
  bigBlind: string;
  deck: Card[];
  board: Card[];
  pot: number;
  currentBet: number;
  minRaise: number;
  pending: string[];
  actedSinceRaise: string[];
  actedAtBet: Record<string, number>;
  actor: string | null;
  deadline: number;
  startedAt: number;
  finishedAt: number | null;
  result: HandResult | null;
  seed: string;
  botAt: number;
};
export type Room = {
  id: string;
  code: string;
  name: string;
  hostId: string;
  practice: boolean;
  settings: Settings;
  players: Player[];
  status: "lobby" | "playing" | "finished";
  hand: Hand | null;
  history: HandResult[];
  events: TableEvent[];
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  updatedAt: number;
  version: number;
  lastDealer: number;
  receipts: string[];
};
export type PublicPlayer = Omit<
  Player,
  "cards" | "actions" | "assistantUses"
> & { cards: (Card | null)[]; connected: boolean };
export type LegalActions = {
  turn: boolean;
  canCheck: boolean;
  canCall: boolean;
  canRaise: boolean;
  toCall: number;
  minRaiseTo: number;
  maxRaiseTo: number;
};
export type PublicRoom = Omit<
  Room,
  "players" | "hand" | "history" | "receipts" | "lastDealer"
> & {
  players: PublicPlayer[];
  hand: Omit<
    Hand,
    "deck" | "seed" | "pending" | "actedSinceRaise" | "actedAtBet" | "botAt"
  > | null;
  history: HandResult[];
  legal: LegalActions;
  serverTime: number;
};
export type RoomSummary = {
  id: string;
  code: string;
  name: string;
  practice: boolean;
  status: Room["status"];
  players: number;
  maxPlayers: number;
  hands: number;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  host: boolean;
  net: number;
  smallBlind: number;
};
export type Assistant = {
  equity: number;
  margin: number;
  trials: number;
  opponents: number;
  potOdds: number;
  toCall: number;
  pot: number;
  callEV: number;
  hasSidePots: boolean;
  hand: string;
  outs: number;
  draw: string | null;
  drawChance: number | null;
  explanation: string;
  distribution: { name: string; probability: number }[];
};
export type Analytics = {
  playstyle: import("./playstyle").Playstyle;
  hands: number;
  wins: number;
  losses: number;
  winRate: number;
  averagePot: number;
  totalDecisions: number;
  sessions: number;
  averageSessionMinutes: number;
  showdowns: number;
  showdownWins: number;
  assistantUses: number;
  actions: Record<ActionKind, number>;
  aggression: number | null;
  net: number;
  trend: { hand: number; net: number }[];
};
