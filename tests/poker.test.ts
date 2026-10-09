import { test } from "node:test";
import assert from "node:assert/strict";
import {
  act,
  createPlayer,
  createRoom,
  finishSession,
  legalActions,
  projectRoom,
  settle,
  startHand,
  tick,
} from "../src/lib/poker/engine";
import {
  cardKey,
  evaluate,
  fullDeck,
  seededRandom,
  shuffle,
} from "../src/lib/poker/evaluator";
import { calculateAssistant } from "../src/lib/poker/assistant";
import type { Card, Profile, Room, Suit } from "../src/lib/types";

const profile: Profile = {
  id: "alice",
  name: "Alice",
  color: "blue",
  createdAt: 1,
  preferences: { assistant: true, sound: false, reducedMotion: false },
};
const cards = (text: string): Card[] =>
  text.split(" ").map((c) => ({
    rank: "23456789TJQKA".indexOf(c[0]) + 2,
    suit: c[1] as Suit,
  }));
function table(seats = 3, stacks?: number[]): Room {
  const room = createRoom(
    profile,
    "Rules test",
    { maxPlayers: seats, startingStack: 2000, smallBlind: 25, turnSeconds: 15 },
    false,
    1000,
  );
  for (let i = 1; i < seats; i++)
    room.players.push(
      createPlayer(
        { id: `p${i}`, name: `Player ${i}`, color: "sage" },
        2000,
        false,
        1000,
      ),
    );
  if (stacks)
    room.players.forEach((p, i) => {
      p.stack = stacks[i];
    });
  startHand(room, 2000, "c0ffee11");
  return room;
}
function doAction(
  room: Room,
  kind: "check" | "call" | "fold" | "raise",
  amount?: number,
) {
  act(room, room.hand!.actor!, kind, amount, 3000 + room.events.length);
}

test("all hand classes, ace-low straights, double trips, and kickers", () => {
  const fixtures = [
    ["As Ks Qs Js Ts 2d 3h", 8, [14]],
    ["9s 8s 7s 6s 5s Ad Ac", 8, [9]],
    ["Ah As Ad Ac Ks 2h 3h", 7, [14, 13]],
    ["Ah As Ad Kh Ks Kd 2c", 6, [14, 13]],
    ["Ah Jh 8h 5h 2h Ks Qc", 5, [14, 11, 8, 5, 2]],
    ["Ah 2s 3d 4c 5h Kd Qs", 4, [5]],
    ["As Ah Ad Ks Qd 2c 3h", 3, [14, 13, 12]],
    ["As Ah Ks Kh Qd 2c 3h", 2, [14, 13, 12]],
    ["As Ah Ks Qh Jd 2c 3h", 1, [14, 13, 12, 11]],
    ["As Kd Qh 9c 7s 4d 2h", 0, [14, 13, 12, 9, 7]],
  ] as const;
  for (const [text, category, ranks] of fixtures) {
    assert.equal(evaluate(cards(text)).category, category, text);
    assert.deepEqual(evaluate(cards(text)).ranks, [...ranks], text);
  }
  assert.ok(
    evaluate(cards("As Ah Ks Qd Jh")).score >
      evaluate(cards("Ac Ad Kh Qs Th")).score,
  );
  assert.equal(
    evaluate(cards("As Kh Qd Jc Ts 2h 3c")).score,
    evaluate(cards("Ah Kd Qc Js Th 4c 5h")).score,
  );
});

test("seven-card evaluation agrees with the best five-card subset in 600 shuffled hands", () => {
  const rng = seededRandom(98);
  for (let n = 0; n < 600; n++) {
    const seven = shuffle(fullDeck(), rng).slice(0, 7);
    let best = 0;
    for (let a = 0; a < 6; a++)
      for (let b = a + 1; b < 7; b++)
        best = Math.max(
          best,
          evaluate(seven.filter((_, i) => i !== a && i !== b)).score,
        );
    assert.equal(evaluate(seven).score, best);
  }
});

test("heads-up dealer posts small blind, acts first preflop, and last after the flop", () => {
  const room = table(2);
  assert.equal(room.hand!.dealer, "alice");
  assert.equal(room.hand!.smallBlind, "alice");
  assert.equal(room.hand!.actor, "alice");
  doAction(room, "call");
  assert.equal(room.hand!.actor, "p1");
  assert.equal(room.hand!.street, "preflop");
  assert.equal(legalActions(room, "p1").canCheck, true);
  doAction(room, "check");
  assert.equal(room.hand!.street, "flop");
  assert.equal(room.hand!.actor, "p1");
});

test("the big blind retains its option after limped calls", () => {
  const room = table();
  doAction(room, "call");
  doAction(room, "call");
  assert.equal(room.hand!.actor, "p2");
  assert.equal(room.hand!.board.length, 0);
  doAction(room, "raise", 150);
  assert.equal(room.hand!.actor, "alice");
  assert.equal(room.hand!.currentBet, 150);
});

test("invalid and out-of-turn actions leave the hand unchanged", () => {
  const room = table();
  const before = JSON.stringify(room);
  assert.throws(() => act(room, "p1", "call"), /not your turn/);
  assert.throws(() => doAction(room, "check"), /call or fold/);
  assert.throws(() => doAction(room, "raise", 75), /minimum total bet/);
  assert.throws(() => doAction(room, "raise", NaN), /valid total bet/);
  assert.equal(JSON.stringify(room), before);
});

test("short all-in does not reopen a raise for a player who already acted", () => {
  const room = table(4, [2000, 2000, 2000, 130]);
  doAction(room, "call"); // p3 calls 50, retaining 80
  doAction(room, "raise", 100); // Alice full raise of 50
  doAction(room, "call");
  doAction(room, "call");
  doAction(room, "raise", 130); // p3 short all-in of 30
  assert.equal(room.hand!.actor, "alice");
  assert.equal(legalActions(room, "alice").canRaise, false);
  assert.throws(() => doAction(room, "raise", 200), /not reopened/);
  doAction(room, "call");
  doAction(room, "call");
  doAction(room, "call");
  assert.equal(room.hand!.street, "flop");
});

test("multiple short all-ins cumulatively reopen betting after a full raise has been faced", () => {
  const room = table(5, [2000, 2000, 170, 2000, 130]);
  // UTG p3 opens to 100. p4 raises short to 130; Alice calls, p1 calls,
  // p2 raises short to 170. p3 has now faced a cumulative 70-chip raise.
  doAction(room, "raise", 100);
  doAction(room, "raise", 130);
  doAction(room, "call");
  doAction(room, "call");
  doAction(room, "raise", 170);
  assert.equal(room.hand!.actor, "p3");
  assert.equal(legalActions(room, "p3").canRaise, true);
  assert.equal(legalActions(room, "alice").canRaise, false); // not Alice's turn
  doAction(room, "raise", 250);
  assert.equal(room.hand!.currentBet, 250);
});

test("main pot, side pot, and unmatched refund conserve every chip", () => {
  const room = table(3, [100, 300, 500]);
  room.hand!.board = cards("2d 7h 9c Js 3h");
  room.hand!.street = "river";
  const hands = ["Ac As", "Kh Kd", "Qc Qd"];
  room.players.forEach((p, i) => {
    p.cards = cards(hands[i]);
    p.committed = [100, 300, 500][i];
    p.stack = 0;
    p.status = "all-in";
  });
  room.hand!.pot = 900;
  settle(room, 4000);
  assert.deepEqual(
    room.players.map((p) => p.stack),
    [300, 400, 200],
  );
  assert.deepEqual(
    room.hand!.result!.pots.map((p) => p.amount),
    [300, 400],
  );
  assert.equal(
    room.hand!.result!.players.reduce((a, p) => a + p.net, 0),
    0,
  );
});

test("tied pots award odd chips clockwise from the dealer; folded cards stay private", () => {
  const room = table();
  room.hand!.board = cards("As Ks Qs Js Ts");
  room.hand!.street = "river";
  room.players.forEach((p, i) => {
    p.cards = cards(["2h 3h", "4h 5h", "6h 7h"][i]);
    p.committed = 5;
    p.stack = 1995;
    p.status = i === 2 ? "folded" : "active";
  });
  room.hand!.pot = 15;
  settle(room, 4000);
  assert.deepEqual(
    room.players.map((p) => p.stack),
    [2002, 2003, 1995],
  );
  const view = projectRoom(room, "alice");
  assert.deepEqual(view.history[0].players[2].cards, []);
  assert.equal(view.history[0].players[2].hand, "Hidden");
  assert.ok(view.history[0].players[1].cards.length === 2);
});

test("fold wins refund an uncalled wager and do not reveal the winner’s private cards", () => {
  const room = table(2);
  doAction(room, "raise", 200);
  doAction(room, "fold");
  assert.deepEqual(
    room.players.map((p) => p.stack),
    [2050, 1950],
  );
  const view = projectRoom(room, "p1");
  assert.deepEqual(view.players[0].cards, [null, null]);
  assert.deepEqual(view.history[0].players[0].cards, []);
});

test("short all-in blind automatically runs out when no further bet can be matched", () => {
  const room = table(2, [100, 10]);
  assert.ok(room.hand!.finishedAt);
  assert.equal(room.hand!.board.length, 5);
  assert.equal(
    room.players.reduce((a, p) => a + p.stack, 0),
    110,
  );
});

test("timeout folds when facing a call and checks when checking is legal", () => {
  const room = table(2);
  tick(room, room.hand!.deadline + 1);
  assert.equal(room.players[0].status, "folded");
  assert.ok(room.hand!.finishedAt);
  const other = table(2);
  doAction(other, "call");
  tick(other, other.hand!.deadline + 1);
  assert.equal(other.hand!.street, "flop");
  assert.equal(other.players[1].actions.check, 1);
});

test("a quiet room catches up expired deadlines without granting absent players new timers", () => {
  const room = table(6);
  tick(room, 2000 + 15_000 * 8);
  assert.ok(room.hand!.finishedAt);
  assert.equal(room.history.length, 1);
  assert.ok(room.history[0].endedAt <= 2000 + 15_000 * 6);
  assert.equal(
    room.players.reduce((a, p) => a + p.stack, 0),
    12_000,
  );
});

test("projection and the assistant never use or expose opponents’ private cards or the deck", () => {
  const room = table();
  const view = projectRoom(room, "alice");
  assert.equal("deck" in view.hand!, false);
  assert.equal("seed" in view.hand!, false);
  assert.equal("pending" in view.hand!, false);
  assert.equal("receipts" in view, false);
  assert.deepEqual(view.players[1].cards, [null, null]);
  const before = calculateAssistant(room, "alice", 300);
  room.players[1].cards = cards("As Ah");
  room.players[2].cards = cards("Ks Kh");
  room.hand!.deck.reverse();
  assert.deepEqual(calculateAssistant(room, "alice", 300), before);
});

test("flush draw math and eligible-pot call odds use visible cards", () => {
  const room = table(2);
  room.players[0].cards = cards("Ah Kh");
  room.hand!.board = cards("2h 7h Qs");
  room.hand!.street = "flop";
  room.players[0].committed = 25;
  room.players[1].committed = 50;
  const result = calculateAssistant(room, "alice", 200);
  assert.equal(result.outs, 9);
  assert.ok(Math.abs(result.drawChance! - 34.9676) < 0.01);
  assert.equal(result.potOdds, 25);
  assert.equal(result.toCall, 25);
  assert.ok(
    Math.abs(result.distribution.reduce((a, p) => a + p.probability, 0) - 100) <
      0.001,
  );
  room.players[0].status = "folded";
  assert.throws(() => calculateAssistant(room, "alice"), /in the hand/);
});

test("500 randomized hands preserve chips, unique cards, valid actors, and zero-sum results", () => {
  const rng = seededRandom(8123);
  for (let n = 0; n < 500; n++) {
    const seats = 2 + Math.floor(rng() * 7);
    const stacks = Array.from(
      { length: seats },
      () => 10 + Math.floor(rng() * 1990),
    );
    const initial = stacks.reduce((a, n) => a + n, 0),
      room = table(seats, stacks);
    let actions = 0;
    while (!room.hand!.finishedAt) {
      assert.ok(++actions < 500, "hand must terminate");
      assert.equal(
        room.players.reduce((a, p) => a + p.stack, 0) + room.hand!.pot,
        initial,
      );
      assert.ok(room.hand!.actor);
      const visible = [
        ...room.players.flatMap((p) => p.cards),
        ...room.hand!.board,
        ...room.hand!.deck,
      ].map(cardKey);
      assert.equal(new Set(visible).size, visible.length);
      const legal = legalActions(room, room.hand!.actor!),
        r = rng();
      if (legal.canRaise && r < 0.23) {
        const amount = r < 0.05 ? legal.maxRaiseTo : legal.minRaiseTo;
        doAction(room, "raise", amount);
      } else if (r < 0.32) doAction(room, "fold");
      else doAction(room, legal.canCheck ? "check" : "call");
    }
    assert.equal(
      room.players.reduce((a, p) => a + p.stack, 0),
      initial,
    );
    assert.equal(
      room.history[0].players.reduce((a, p) => a + p.net, 0),
      0,
    );
    finishSession(room, 9000);
    assert.equal(room.status, "finished");
  }
});

test("assistant EV weights tied main and side pots against their eligible players", () => {
  const room = table(3);
  room.hand!.board = cards("As Ks Qs Js Ts");
  room.hand!.street = "river";
  room.hand!.actor = "alice";
  room.hand!.currentBet = 300;
  room.hand!.pot = 600;
  room.players[0].cards = cards("2d 3d");
  room.players[0].committed = 200;
  room.players[0].bet = 200;
  room.players[1].status = "all-in";
  room.players[1].stack = 0;
  room.players[1].committed = 100;
  room.players[2].committed = 300;
  const result = calculateAssistant(room, "alice", 100);
  assert.equal(result.hasSidePots, true);
  assert.ok(Math.abs(result.equity - 100 / 3) < 0.0001);
  assert.equal(result.callEV, 200); // 100 from main + 200 from side - 100 call
});
