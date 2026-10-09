"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock3,
  Download,
  History,
  Sparkles,
} from "lucide-react";
import type { Profile, PublicRoom, RoomSummary } from "@/lib/types";
import { api, chips, dateLabel, signedChips } from "@/lib/client";
import { cardText } from "@/lib/poker/evaluator";
import { Avatar, Modal, PlayingCard, RiverMark, Spinner } from "./primitives";

type Session = RoomSummary & {
  duration: number;
  wins: number;
  biggestPot: number;
  opponents: { name: string; color: string; bot: boolean }[];
};
export function HistoryView({
  onSelect,
  onPlay,
}: {
  onSelect: (code: string) => void;
  onPlay: () => void;
}) {
  const [sessions, setSessions] = useState<Session[] | null>(null),
    [error, setError] = useState(""),
    [mode, setMode] = useState("all");
  useEffect(() => {
    let cancelled = false;
    api<{ sessions: Session[] }>("/api/history")
      .then((r) => {
        if (!cancelled) setSessions(r.sessions);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const filtered = sessions?.filter(
    (s) => mode === "all" || (mode === "friends" ? !s.practice : s.practice),
  );
  return (
    <div className="history-view page-enter">
      <div className="section-heading">
        <div>
          <h3>A night worth remembering.</h3>
          <p>Every session. Every decision. Your own perspective.</p>
        </div>
        <div className="segmented-control">
          {[
            ["all", "All sessions"],
            ["friends", "With friends"],
            ["practice", "Practice"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={mode === value ? "selected" : ""}
              onClick={() => setMode(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <p className="inline-error">{error}</p>
      ) : !sessions ? (
        <div className="content-loading">
          <Spinner />
          Opening your history…
        </div>
      ) : !filtered?.length ? (
        <div className="empty-state">
          <span className="empty-icon">
            <History size={32} />
          </span>
          <h3>Every hand has a story.</h3>
          <p>
            Your sessions will be saved here once you take a seat and start
            playing.
          </p>
          <button className="button button-dark" onClick={onPlay}>
            Back to the table
            <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div className="session-list">
          {filtered.map((s) => (
            <button
              key={s.id}
              className="session-row"
              onClick={() => onSelect(s.code)}
            >
              <div className="session-emblem">
                <RiverMark size={29} />
              </div>
              <div className="session-name">
                <strong>{s.name}</strong>
                <span>
                  {dateLabel(s.startedAt || s.createdAt)} ·{" "}
                  {s.practice ? "Practice" : "With friends"}
                  {s.status !== "finished" && " · In progress"}
                </span>
              </div>
              <div className="session-opponents">
                {s.opponents.slice(0, 4).map((p) => (
                  <Avatar
                    key={p.name}
                    name={p.name}
                    color={p.color}
                    bot={p.bot}
                  />
                ))}
                <span>{s.opponents.length} opponents</span>
              </div>
              <div className="session-number">
                <strong>{s.hands}</strong>
                <span>hands</span>
              </div>
              <div className="session-number">
                <strong>{Math.round(s.duration)}m</strong>
                <span>at the table</span>
              </div>
              <div className={`session-net ${s.net >= 0 ? "positive" : ""}`}>
                <strong>{signedChips(s.net)}</strong>
                <span>chips</span>
              </div>
              <ArrowRight size={19} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function HistoryDialog({
  room,
  profile,
  onClose,
}: {
  room: PublicRoom;
  profile: Profile;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(Math.max(0, room.history.length - 1));
  const history = room.history,
    hand = history[index];
  const net = history.reduce(
    (a, h) => a + (h.players.find((p) => p.id === profile.id)?.net || 0),
    0,
  );
  const wins = history.filter((h) =>
    h.winners.some((p) => p.id === profile.id),
  ).length;
  const duration = room.startedAt
    ? ((room.endedAt || Date.now()) - room.startedAt) / 60000
    : 0;
  const myResult = hand?.players.find((p) => p.id === profile.id);
  const largestHand = history.reduce(
    (largest, h, i) => (h.pot > (history[largest]?.pot || 0) ? i : largest),
    0,
  );
  const players = [
    ...new Set(history.flatMap((h) => h.players.map((p) => p.id))),
  ]
    .map((id) => {
      const results = history.flatMap((h) =>
        h.players.filter((p) => p.id === id),
      );
      const first = results[0];
      return {
        ...first,
        hands: results.length,
        wins: results.filter((p) => p.won > 0).length,
        net: results.reduce((sum, p) => sum + p.net, 0),
        decisions: results.reduce(
          (sum, p) => sum + Object.values(p.actions).reduce((a, n) => a + n, 0),
          0,
        ),
      };
    })
    .sort((a, b) => b.net - a.net);
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            schema: "river-hand-history-v1",
            session: {
              code: room.code,
              name: room.name,
              startedAt: room.startedAt,
            },
            hands: room.history,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `river-${room.code.toLowerCase()}-history.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Modal
      title={room.name}
      eyebrow={
        room.status === "finished"
          ? "A NIGHT AT THE TABLE"
          : "YOUR SESSION SO FAR"
      }
      onClose={onClose}
      wide
    >
      <div className="history-summary">
        <div>
          <span>Hands played</span>
          <strong>{history.length}</strong>
        </div>
        <div>
          <span>Hands won</span>
          <strong>{wins}</strong>
        </div>
        <div>
          <span>At the table</span>
          <strong>
            {Math.round(duration)}
            <small>min</small>
          </strong>
        </div>
        <div>
          <span>Chip change</span>
          <strong className={net >= 0 ? "positive" : ""}>
            {signedChips(net)}
          </strong>
        </div>
      </div>
      {!!history.length && (
        <>
          <details className="session-breakdown">
            <summary>
              Around the table <ChevronDown size={15} />
            </summary>
            <div className="session-player-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Hands</th>
                    <th>Wins</th>
                    <th>Decisions</th>
                    <th>Chip change</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Avatar name={p.name} color={p.color} bot={p.bot} />
                        <span>{p.id === profile.id ? "You" : p.name}</span>
                      </td>
                      <td>{p.hands}</td>
                      <td>{p.wins}</td>
                      <td>{p.decisions}</td>
                      <td className={p.net > 0 ? "positive" : ""}>
                        {signedChips(p.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <button className="major-hand" onClick={() => setIndex(largestHand)}>
            <Sparkles size={15} />
            <span>
              Largest pot{" "}
              <small>
                Hand {String(history[largestHand].number).padStart(2, "0")}
              </small>
            </span>
            <strong>{chips(history[largestHand].pot)} chips</strong>
            <ArrowRight size={16} />
          </button>
        </>
      )}
      {!hand ? (
        <div className="empty-state compact">
          <RiverMark size={38} />
          <h3>The story is still unfolding.</h3>
          <p>
            Complete your first hand to see the cards, decisions, and result.
          </p>
        </div>
      ) : (
        <>
          <div className="hand-review-heading">
            <div>
              <span className="eyebrow">
                HAND {String(hand.number).padStart(2, "0")}
              </span>
              <h3>
                {hand.winners
                  .map((p) => (p.id === profile.id ? "You" : p.name))
                  .join(" & ")}{" "}
                {hand.winners.length === 1 && hand.winners[0].id !== profile.id
                  ? "takes"
                  : "take"}{" "}
                the pot.
              </h3>
            </div>
            <div className="hand-pagination">
              <button
                className="icon-button"
                disabled={index === 0}
                onClick={() => setIndex(index - 1)}
                aria-label="Previous hand"
              >
                <ChevronLeft size={18} />
              </button>
              <span>
                {index + 1} / {history.length}
              </span>
              <button
                className="icon-button"
                disabled={index === history.length - 1}
                onClick={() => setIndex(index + 1)}
                aria-label="Next hand"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="review-cards">
            <div className="review-your-cards">
              <span className="eyebrow">YOUR HAND</span>
              <div>
                {myResult?.cards.map((c, i) => (
                  <PlayingCard
                    key={`${hand.number}-${i}`}
                    card={c}
                    size="review-card"
                  />
                ))}
              </div>
              <span>{myResult?.hand}</span>
            </div>
            <div className="review-board">
              <span className="eyebrow">THE BOARD</span>
              <div>
                {hand.board.length ? (
                  hand.board.map((c, i) => (
                    <PlayingCard
                      key={`${hand.number}-board-${i}`}
                      card={c}
                      size="review-card"
                    />
                  ))
                ) : (
                  <span className="no-board">Won before the flop.</span>
                )}
              </div>
              <span>
                {chips(hand.pot)} chips in the pot
                {hand.pots.length > 1 &&
                  ` · ${hand.pots.length - 1} side pot${hand.pots.length > 2 ? "s" : ""}`}
              </span>
            </div>
          </div>
          <div className="review-results">
            {hand.players.map((p) => (
              <div key={p.id}>
                <Avatar name={p.name} color={p.color} bot={p.bot} />
                <span>
                  {p.id === profile.id ? "You" : p.name}
                  <small>
                    {p.showdown
                      ? p.hand
                      : p.id === profile.id
                        ? p.hand
                        : "Cards kept private"}
                  </small>
                  {!!p.cards.length && (
                    <small
                      className="review-hole-cards"
                      aria-label={
                        p.id === profile.id
                          ? "Your cards"
                          : `${p.name}'s showdown cards`
                      }
                    >
                      {p.cards.map((card, i) => (
                        <b
                          key={i}
                          className={
                            card.suit === "h" || card.suit === "d" ? "red" : ""
                          }
                        >
                          {cardText(card)}
                        </b>
                      ))}
                    </small>
                  )}
                </span>
                <strong className={p.net > 0 ? "positive" : ""}>
                  {signedChips(p.net)}
                </strong>
              </div>
            ))}
          </div>
          <div className="hand-timeline">
            <span className="eyebrow">HOW THE HAND UNFOLDED</span>
            {hand.events.map((e) => (
              <div key={e.id}>
                <span
                  className={`timeline-dot ${e.type === "result" ? "winning" : ""}`}
                />
                <span>{e.message}</span>
                <small>{e.street === "preflop" ? "Pre-flop" : e.street}</small>
              </div>
            ))}
          </div>
        </>
      )}
      {!!history.length && (
        <button className="text-button export-history" onClick={download}>
          <Download size={14} />
          Export hand history
        </button>
      )}
    </Modal>
  );
}
