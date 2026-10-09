"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  LockKeyhole,
  Maximize2,
  Minimize2,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { ActionKind, Profile, PublicRoom } from "@/lib/types";
import { cardKey, evaluate } from "@/lib/poker/evaluator";
import { playSound } from "@/lib/audio";
import { turnKey } from "@/lib/sound-signals";
import { SoundControl } from "./sound-control";
import { chips } from "@/lib/client";
import { seatPlacement } from "@/lib/design-directions";
import { useDesignDirection } from "./direction-context";
import {
  Avatar,
  ChipStack,
  PlayingCard,
  RiverMark,
  Spinner,
} from "./primitives";

type Props = {
  room: PublicRoom;
  profile: Profile;
  busy: boolean;
  connected: boolean;
  onAction: (type: string, extra?: Record<string, unknown>) => Promise<void>;
  onInvite: () => void;
  onDetails: () => void;
  onAssistant: () => void;
  onSound: () => void;
  onNewRoom: () => void;
};

export function PokerTable({
  room,
  profile,
  busy,
  connected,
  onAction,
  onInvite,
  onDetails,
  onAssistant,
  onSound,
  onNewRoom,
}: Props) {
  const direction = useDesignDirection();
  const [now, setNow] = useState(Date.now());
  const [focus, setFocus] = useState(false);
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [raiseTo, setRaiseTo] = useState(0);
  const hand = room.hand,
    legal = room.legal;
  const self = room.players.find((p) => p.id === profile.id)!;
  const host = room.hostId === profile.id;
  const ordered = [
    self,
    ...room.players.slice(room.players.indexOf(self) + 1),
    ...room.players.slice(0, room.players.indexOf(self)),
  ];
  const timeLeft = hand?.deadline
    ? Math.max(0, Math.ceil((hand.deadline - now) / 1000))
    : 0;
  const timerPercent = Math.min(
    100,
    (timeLeft / room.settings.turnSeconds) * 100,
  );
  const current = room.players.find((p) => p.id === hand?.actor);
  const pending = room.status === "lobby";
  const finished = !!hand?.finishedAt;
  const allReady =
    room.players.length >= 2 && room.players.every((p) => p.ready);
  useEffect(() => {
    const offset = room.serverTime - Date.now();
    setNow(Date.now() + offset);
    const timer = setInterval(() => setNow(Date.now() + offset), 300);
    return () => clearInterval(timer);
  }, [room.serverTime]);
  useEffect(() => {
    setRaiseTo(legal.minRaiseTo);
    setRaiseOpen(false);
  }, [hand?.number, hand?.street, hand?.actor, legal.minRaiseTo]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (
        !legal.turn ||
        busy ||
        !connected ||
        document.querySelector("dialog[open]") ||
        /input|textarea|select/i.test((e.target as HTMLElement)?.tagName)
      )
        return;
      if (e.key.toLowerCase() === "f") void play("fold");
      if (e.key.toLowerCase() === "c" && legal.canCall) void play("call");
      if (e.key.toLowerCase() === "k" && legal.canCheck) void play("check");
      if (e.key.toLowerCase() === "r" && legal.canRaise) setRaiseOpen(true);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
    // Current authoritative state is intentionally captured for each turn.
  }, [room.version, busy, connected]);
  const warningTurn = useRef("");
  const turnSignature = turnKey(room);
  useEffect(() => {
    if (legal.turn && timeLeft > 0 && timeLeft <= 8 && warningTurn.current !== turnSignature) {
      warningTurn.current = turnSignature;
      if (profile.preferences.sound) playSound("warning");
    }
  }, [timeLeft, legal.turn, turnSignature, profile.preferences.sound]);
  const play = (kind: ActionKind, amount?: number) =>
    onAction("play", {
      kind,
      raiseTo: amount,
      handNumber: hand?.number,
      street: hand?.street,
      currentBet: hand?.currentBet,
    });
  const presets = [
    {
      label: "½ pot",
      amount: Math.max(
        legal.minRaiseTo,
        (hand?.currentBet || 0) +
          Math.floor(((hand?.pot || 0) + legal.toCall) / 2),
      ),
    },
    {
      label: "Pot",
      amount: Math.max(
        legal.minRaiseTo,
        (hand?.currentBet || 0) + (hand?.pot || 0) + legal.toCall,
      ),
    },
    { label: "All in", amount: legal.maxRaiseTo },
  ];
  const resultNames = hand?.result?.winners
    .map((p) =>
      p.name === profile.name && p.id === profile.id ? "You" : p.name,
    )
    .join(" & ");
  const selfWon = !!hand?.result?.winners.some(p => p.id === profile.id);
  const myWinnings = hand?.result?.winners.find(p => p.id === profile.id)?.amount || 0;
  const myCards = self.cards.filter(Boolean) as NonNullable<
    (typeof self.cards)[number]
  >[];
  const made = myCards.length
    ? evaluate([...myCards, ...(hand?.board || [])]).name
    : "";

  return (
    <section
      className={`table-experience ${focus ? "focus-mode" : ""}`}
      aria-label={room.name}
      data-turn={legal.turn ? "self" : "other"}
    >
      <div className="table-panel">
        <div className="table-toolbar">
          <div className="table-title">
            <span className="table-icon">
              <LockKeyhole size={16} />
            </span>
            <div>
              <h2>{room.name}</h2>
              <span>
                {room.practice
                  ? "Practice table · Computer opponents"
                  : "A private table for your people"}
              </span>
            </div>
          </div>
          <div className="table-toolbar-actions">
            <SoundControl enabled={profile.preferences.sound} onToggle={onSound} />
            <button
              className="icon-button"
              title="Table settings and players"
              aria-label="Table settings and players"
              onClick={onDetails}
            >
              <SlidersHorizontal size={18} />
            </button>
            <button
              className="icon-button desktop-only"
              title={focus ? "Leave focus mode" : "Focus on the table"}
              aria-label={focus ? "Leave focus mode" : "Focus on the table"}
              onClick={() => setFocus(!focus)}
            >
              {focus ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>
        <div className="table-meta">
          <div className="table-mode">
            <span className="tiny-dot" />
            No-limit Texas Hold’em<span className="meta-dot">·</span>
            <span>
              {room.players.length} / {room.settings.maxPlayers} seats
            </span>
          </div>
          <div className="blinds">
            Blinds{" "}
            <strong>
              {chips(room.settings.smallBlind)} /{" "}
              {chips(room.settings.smallBlind * 2)}
            </strong>
            <span className="meta-dot">·</span>
            <span>
              {pending
                ? "Before the first deal"
                : `Hand #${String(hand?.number || 1).padStart(2, "0")}`}
            </span>
          </div>
        </div>

        {!pending && !finished && <div className={`turn-announcement ${legal.turn ? "is-your-turn" : ""} ${legal.turn && timeLeft <= 8 ? "is-urgent" : ""}`} key={turnSignature}>
          <span className="turn-announcement-mark" aria-hidden="true">{legal.turn ? "↗" : "◌"}</span>
          <div role="status"><strong>{legal.turn ? "Your turn to make a move" : `${current?.name || "The table"} is thinking`}</strong><span>{legal.turn ? legal.toCall ? `${chips(legal.toCall)} to call · Make your decision below` : "You can check · Or set the pace" : "Watch the hand. Your next move is coming."}</span></div>
          {current?.bot
            ? <span className="turn-announcement-time bot-thinking">AI opponent</span>
            : <span className="turn-announcement-time" aria-label={`${timeLeft} seconds remaining`}><Clock3 size={14} />{timeLeft}s</span>}
          {!current?.bot && <i className="turn-announcement-progress" style={{width: `${timerPercent}%`}} />}
        </div>}
        <div
          className={`table-stage seats-${ordered.length} ${pending ? "before-deal" : ""}`}
        >
          <div className="table-shadow" />
          <div className="table-rail">
            <div className="table-felt">
              <div className="felt-stitch" />
              <div className="felt-brand">
                <RiverMark size={24} />
                <span>RIVER SOCIAL CLUB</span>
              </div>
            </div>
          </div>
          <div className="table-center">
            {pending ? (
              <div className="welcome-deck">
                <div className="deck-fan">
                  <PlayingCard />
                  <PlayingCard />
                  <PlayingCard />
                </div>
                <h3>
                  Good hands.
                  <br />
                  <em>Great company.</em>
                </h3>
                <span>
                  {room.practice
                    ? "A little practice before your next poker night."
                    : "A place for your people. Take your seats."}
                </span>
                {host && (
                  <button
                    className="table-start-button"
                    disabled={busy || !allReady || !connected}
                    onClick={() => void onAction("start")}
                  >
                    {busy ? (
                      <Spinner />
                    ) : (
                      <>
                        <span>
                          {room.practice ? "Deal me in" : "Deal the first hand"}
                        </span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className={`pot-display ${finished ? "pot-won" : ""}`}>
                  <span className="pot-label">
                    {finished ? "HAND COMPLETE" : "TOTAL POT"}
                  </span>
                  <div>
                    <ChipStack amount={hand?.pot} />
                    <strong key={hand?.pot}>{chips(hand?.pot || 0)}</strong>
                  </div>
                </div>
                <div className="community-cards" aria-label="Community cards">
                  {Array.from({ length: 5 }, (_, i) =>
                    hand?.board[i] ? (
                      <PlayingCard
                        key={`${hand.number}-${cardKey(hand.board[i])}`}
                        card={hand.board[i]}
                        delay={(i < 3 ? i : 0) * 90}
                      />
                    ) : (
                      <div className="board-placeholder" key={`empty-${i}`}>
                        <span>
                          {i === 3 ? "TURN" : i === 4 ? "RIVER" : "FLOP"}
                        </span>
                        <i>{["♠", "♥", "♣", "♦", "♠"][i]}</i>
                      </div>
                    ),
                  )}
                </div>
                {!finished && (
                  <div className="street-label" key={`${hand?.number}-${hand?.street}`}>
                    <span />
                    {hand?.street === "preflop"
                      ? "PRE-FLOP"
                      : hand?.street?.toUpperCase()}
                    <span />
                  </div>
                )}
              </>
            )}
          </div>

          {ordered.map((player, i) => {
            const { x, y, mx, my } = seatPlacement(
              direction,
              i,
              ordered.length,
            );
            const active = hand?.actor === player.id && !finished;
            const isSelf = i === 0;
            const winning = hand?.result?.winners.some(
              (p) => p.id === player.id,
            );
            const isOut = player.status === "out" || (finished && player.stack === 0 && !winning);
            return (
              <div
                key={player.id}
                className={`player-seat seat-${i} ${isSelf ? "self-seat" : ""} ${player.status === "folded" ? "folded" : isOut ? "out-seat" : ""} ${active ? "active-seat" : ""} ${winning ? "winning-seat" : ""} ${x < 40 ? "left-seat" : x > 60 ? "right-seat" : "center-seat"}`}
                style={
                  {
                    "--seat-x": `${x}%`,
                    "--seat-y": `${y}%`,
                    "--seat-mx": `${mx}%`,
                    "--seat-my": `${my}%`,
                    "--timer": `${timerPercent}%`,
                  } as CSSProperties
                }
                data-status={player.status}
                aria-label={`${isSelf ? "You" : player.name}, ${isOut ? "out of chips" : player.status}, ${chips(player.stack)} chips${active ? ", current turn" : ""}`}
              >
                {direction !== "original" && (
                  <span className="seat-number" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                )}
                {!!player.cards.length && (
                  <div
                    className="seat-cards"
                    key={`${hand?.number}-${player.id}`}
                  >
                    {player.cards.map((card, j) => (
                      <PlayingCard
                        key={j}
                        card={card}
                        size={isSelf ? "hero-card" : "mini-card"}
                        delay={i * 65 + j * 100}
                        muted={player.status === "folded" || isOut}
                      />
                    ))}
                  </div>
                )}
                {active && (
                  <span className="turn-label" key={turnSignature}>
                    {isSelf ? "YOUR TURN" : "THINKING"}
                  </span>
                )}
                {isOut && <span className="out-label">OUT</span>}
                {player.lastAction && !active && !pending && (
                  <span
                    key={`${hand?.number}-${player.lastAction}-${player.bet}`}
                    className={`action-bubble ${player.status === "folded" ? "fold-bubble" : ""}`}
                  >
                    {player.lastAction}
                  </span>
                )}
                <div className="seat-identity">
                  <div className="avatar-ring">
                    <Avatar
                      name={isSelf ? profile.name : player.name}
                      color={isSelf ? profile.color : player.color}
                      bot={
                        direction === "vector" || direction === "fieldwork"
                          ? false
                          : player.bot
                      }
                    />
                    {room.hand?.dealer === player.id && (
                      <span className="dealer-button" title="Dealer button">
                        D
                      </span>
                    )}
                    {pending && player.ready && (
                      <span className="ready-indicator" title="Ready">
                        <Check size={10} />
                      </span>
                    )}
                    {!player.connected && (
                      <span className="disconnected-dot" title="Reconnecting" />
                    )}
                  </div>
                  <div className="seat-info">
                    <span className="player-name">
                      {isSelf ? "You" : player.name}
                      {player.bot && <i title="Computer opponent">AI</i>}
                    </span>
                    <strong>
                      {chips(player.stack)}
                      <span> chips</span>
                    </strong>
                  </div>
                </div>
                {player.bet > 0 && (
                  <div className="seat-bet" key={`${player.id}-${player.bet}`}>
                    <ChipStack amount={player.bet} />
                    <span>{chips(player.bet)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {finished && <div className={`result-announcement ${selfWon ? "self-won" : ""}`} key={`${room.code}-${hand?.number}`} role="status">
          <span className="result-ornament" aria-hidden="true">{selfWon ? "✦" : "♠"}</span>
          <div><span className="eyebrow">{hand?.result?.winners.length! > 1 ? "SPLIT POT" : "HAND COMPLETE"}</span><h3>{selfWon ? "You win." : `${resultNames} wins.`}</h3><p>{hand?.result?.winners[0]?.hand || "The table has spoken."}</p></div>
          <div className="result-amount"><strong>{chips(selfWon ? myWinnings : hand?.result?.pot || 0)}</strong><span>{selfWon ? "CHIPS WON" : "TOTAL POT"}</span></div>
          {selfWon && <div className="victory-sparks" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{"--spark-i":i} as CSSProperties}/>)}</div>}
        </div>}
        <div className="table-bottom-line">
          <div>
            <span
              className={`tiny-dot ${connected ? "connected" : "disconnected"}`}
            />
            {connected ? "You’re at the table" : "Reconnecting to the table…"}
            <span className="meta-dot">·</span>
            <span>Play chips. Real connections.</span>
          </div>
          <div>
            <button
              className="icon-button mobile-assistant-button"
              onClick={onAssistant}
              aria-label="Open hand assistant"
            >
              <Sparkles size={17} />
            </button>
          </div>
        </div>
      </div>

      <div
        className="action-dock"
        data-phase={
          pending
            ? "lobby"
            : room.status === "finished"
              ? "ended"
              : finished
                ? "complete"
                : legal.turn
                  ? "turn"
                  : "waiting"
        }
      >
        {pending ? (
          <>
            <div className="action-caption">
              <span className="eyebrow">BEFORE THE FIRST HAND</span>
              <strong>
                {room.practice
                  ? "Your seat is waiting."
                  : `${room.players.filter((p) => p.ready).length} of ${room.players.length} players ready`}
              </strong>
            </div>
            <div className="dock-buttons">
              {!room.practice && (
                <button
                  className={`button ${self.ready ? "button-outline ready-button" : "button-dark"}`}
                  disabled={busy || !connected}
                  onClick={() => void onAction("ready")}
                >
                  {self.ready ? (
                    <>
                      <Check size={16} />
                      I’m ready
                      <ChevronDown size={14} />
                    </>
                  ) : (
                    "Ready up"
                  )}
                </button>
              )}
              {room.practice ? (
                <button className="button button-dark" onClick={onNewRoom}>
                  <Users size={16} />
                  Play with friends
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button className="button button-outline" onClick={onInvite}>
                  <Plus size={16} />
                  Invite friends
                </button>
              )}
            </div>
          </>
        ) : room.status === "finished" ? (
          <>
            <div className="action-caption">
              <span className="eyebrow">UNTIL NEXT TIME</span>
              <strong>A good night at the table.</strong>
            </div>
            <button className="button button-dark" onClick={onNewRoom}>
              Open a new table
              <ArrowRight size={16} />
            </button>
          </>
        ) : finished ? (
          <>
            <div className="action-caption">
              <span className="eyebrow">
                {hand?.result?.winners.some((p) => p.id === profile.id)
                  ? "NICELY PLAYED"
                  : "ON TO THE NEXT"}
              </span>
              <strong>
                {hand?.result?.winners.some((p) => p.id === profile.id)
                  ? "That one’s yours."
                  : "There’s always another hand."}
              </strong>
            </div>
            <div className="dock-buttons">
              {host ? (
                <>
                  <button
                    className="button button-outline"
                    disabled={busy}
                    onClick={() => void onAction("end")}
                  >
                    End session
                  </button>
                  <button
                    className="button button-dark"
                    disabled={busy || !connected}
                    onClick={() => void onAction("next")}
                  >
                    {busy ? <Spinner /> : "Next hand"}
                    <ArrowRight size={16} />
                  </button>
                </>
              ) : (
                <span className="waiting-text">
                  The host will deal the next hand.
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="action-caption">
              <span className="eyebrow">
                {legal.turn
                  ? "YOUR MOVE"
                  : `${current?.name || "THE TABLE"}’S TURN`}
              </span>
              <strong>
                {legal.turn
                  ? made
                  : self.status === "folded"
                    ? "You’re sitting this hand out."
                    : "A little patience pays."}
              </strong>
              {legal.turn && (
                <span className={`turn-time ${timeLeft < 10 ? "urgent" : ""}`}>
                  <Clock3 size={12} />
                  {timeLeft}s to act
                </span>
              )}
            </div>
            <div className="dock-buttons play-buttons">
              <button
                className="button button-fold"
                disabled={!legal.turn || busy || !connected}
                onClick={() => void play("fold")}
              >
                Fold<kbd>F</kbd>
              </button>
              <button
                className="button button-dark"
                disabled={
                  !(legal.canCheck || legal.canCall) || busy || !connected
                }
                onClick={() => void play(legal.canCheck ? "check" : "call")}
              >
                {busy ? (
                  <Spinner />
                ) : legal.canCheck ? (
                  "Check"
                ) : (
                  <>
                    Call <b>{chips(legal.toCall)}</b>
                  </>
                )}
                <kbd>{legal.canCheck ? "K" : "C"}</kbd>
              </button>
              <button
                className="button button-accent"
                disabled={!legal.canRaise || busy || !connected}
                onClick={() => setRaiseOpen(!raiseOpen)}
              >
                {hand?.currentBet ? "Raise" : "Bet"}
                <ChevronDown size={15} />
              </button>
            </div>
          </>
        )}
        {raiseOpen && legal.turn && (
          <div className="raise-controls">
            <div className="raise-heading">
              <label htmlFor="raise-amount">
                Total bet <strong>{chips(raiseTo)}</strong>
              </label>
              <div>
                {presets.map((p) => (
                  <button
                    key={p.label}
                    className={
                      raiseTo === Math.min(p.amount, legal.maxRaiseTo)
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      setRaiseTo(Math.min(p.amount, legal.maxRaiseTo))
                    }
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="raise-input-row">
              <input
                id="raise-amount"
                type="range"
                min={legal.minRaiseTo}
                max={legal.maxRaiseTo}
                step={1}
                value={raiseTo}
                onChange={(e) => setRaiseTo(Number(e.target.value))}
              />
              <button
                className="button button-accent"
                disabled={busy}
                onClick={() => void play("raise", raiseTo)}
              >
                {raiseTo === legal.maxRaiseTo
                  ? "All in"
                  : `Confirm ${hand?.currentBet ? "raise" : "bet"}`}{" "}
                {chips(raiseTo)}
                <ArrowRight size={15} />
              </button>
            </div>
            <small>
              Raises are the total amount committed this betting round.
            </small>
          </div>
        )}
      </div>
    </section>
  );
}
