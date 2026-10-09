"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ChevronDown,
  HelpCircle,
  Lightbulb,
  Sparkles,
  X,
} from "lucide-react";
import type { Assistant, Profile, PublicRoom } from "@/lib/types";
import { api, chips, signedChips } from "@/lib/client";
import { RiverMark, Spinner } from "./primitives";
import { directionById } from "@/lib/design-directions";
import { useDesignDirection } from "./direction-context";

export function AssistantPanel({
  room,
  profile,
  onToggle,
  onHistory,
  mobileOpen,
  onClose,
}: {
  room: PublicRoom | null;
  profile: Profile | null;
  onToggle: () => void;
  onHistory: () => void;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const direction = useDesignDirection();
  const [data, setData] = useState<Assistant | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const enabled = profile?.preferences.assistant ?? true;
  const hand = room?.hand;
  const folded =
    room?.players.find((p) => p.id === profile?.id)?.status === "folded";
  const eligible = !!hand && !hand.finishedAt && enabled && !folded;
  const contenders =
    room?.players.filter((p) => p.status === "active" || p.status === "all-in")
      .length || 0;
  const toCall = room?.legal.toCall;
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const element = panel.current;
    const buttons = () =>
      Array.from(
        element?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), a[href], input, select",
        ) || [],
      );
    buttons()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
      if (event.key !== "Tab") return;
      const items = buttons(),
        first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    element?.addEventListener("keydown", trap);
    return () => {
      element?.removeEventListener("keydown", trap);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [mobileOpen]);
  useEffect(() => {
    let cancelled = false;
    if (!eligible || !room) {
      setData(null);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    setData(null);
    api<{ assistant: Assistant; handNumber: number; street: string }>(
      `/api/rooms/${room.code}/assistant`,
    )
      .then((result) => {
        if (
          !cancelled &&
          result.handNumber === hand?.number &&
          result.street === hand?.street
        )
          setData(result.assistant);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    room?.code,
    hand?.number,
    hand?.street,
    hand?.pot,
    contenders,
    toCall,
    eligible,
  ]);
  const equity = data?.equity || 0;
  const events =
    room?.events
      .filter((e) => !["room", "ready"].includes(e.type))
      .slice(-4)
      .reverse() || [];

  return (
    <aside
      ref={panel}
      className={`insight-column ${mobileOpen ? "mobile-open" : ""}`}
      aria-label="Hand assistant"
      role={mobileOpen ? "dialog" : undefined}
      aria-modal={mobileOpen ? true : undefined}
    >
      {mobileOpen && (
        <div className="mobile-assistant-bar">
          <span>Hand assistant</span>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close assistant"
          >
            <X size={18} />
          </button>
        </div>
      )}
      <div className="insight-card">
        <div className="insight-heading">
          <span className="assistant-symbol">
            <Sparkles size={17} />
          </span>
          <h3>{directionById(direction)?.assistant || "A little insight."}</h3>
          <button
            className={`toggle ${enabled ? "on" : ""}`}
            role="switch"
            aria-checked={enabled}
            aria-label="Probability assistant"
            onClick={onToggle}
          >
            <span />
          </button>
        </div>
        <p className="insight-intro">
          A clearer picture of the hand.
          <br />
          The decision is always yours.
        </p>
        {enabled ? (
          data ? (
            <>
              <div
                className="equity-gauge"
                style={{ "--equity": `${equity}%` } as CSSProperties}
              >
                <div>
                  <strong>
                    {equity.toFixed(0)}
                    <small>%</small>
                  </strong>
                  <span>EST. EQUITY</span>
                </div>
                <span className="gauge-dot" />
              </div>
              <div className="equity-caption">
                Equity against remaining hands
                <small>
                  Against {data.opponents} random{" "}
                  {data.opponents === 1 ? "hand" : "hands"} · ±
                  {data.margin.toFixed(1)}%
                </small>
              </div>
              <div className="insight-metrics">
                <div>
                  <span>
                    {data.hasSidePots ? "Call price" : "Pot odds"}
                    <HelpCircle size={12} />
                  </span>
                  <strong>
                    {data.potOdds.toFixed(1)}
                    <small>%</small>
                  </strong>
                </div>
                <div>
                  <span>{data.draw ? "Draw outs" : "Your hand"}</span>
                  <strong className={data.draw ? "" : "hand-metric"}>
                    {data.draw ? data.outs : data.hand}
                  </strong>
                </div>
              </div>
              <div className="hand-insight">
                <span>
                  <Lightbulb size={14} />
                  {data.draw ||
                    (data.toCall
                      ? "The price of a call"
                      : "Read the situation")}
                </span>
                <p>
                  {data.draw
                    ? data.explanation
                    : data.toCall
                      ? data.hasSidePots
                        ? `A call costs ${chips(data.toCall)} chips. Short stacks contest fewer chips, so call value is calculated separately for each eligible pot.`
                        : `A call costs ${chips(data.toCall)} chips to contest ${chips(data.pot)} already in the pot. You need at least ${data.potOdds.toFixed(1)}% equity to break even if there are no further bets.`
                      : data.explanation}
                </p>
              </div>
              <button
                className="calculation-button"
                onClick={() => setMethod(!method)}
                aria-expanded={method}
              >
                How is this calculated?
                <ChevronDown size={14} className={method ? "rotated" : ""} />
              </button>
              {method && (
                <div className="calculation-detail">
                  <p>
                    <b>{data.trials.toLocaleString()} simulated deals.</b> We
                    sample unknown opponent cards and remaining board cards
                    without using anyone’s actual hidden cards. Ties divide the
                    win credit.
                  </p>
                  <p>
                    <b>Pot odds:</b> call ÷ (eligible pot + call).
                    <br />
                    <b>Call EV:</b>{" "}
                    {data.hasSidePots
                      ? "average simulated payout across eligible pots − call = "
                      : "equity × pot − (1 − equity) × call = "}
                    <b>{signedChips(data.callEV)} chips</b>.
                  </p>
                  <p>
                    This is a check-down estimate. Future bets, position, fold
                    equity, and an opponent’s playing range can change the
                    result. Draw outs may not all be winning outs.
                  </p>
                </div>
              )}
              <div className="probability-distribution">
                <span className="eyebrow">YOUR POSSIBLE RIVER HANDS</span>
                {data.distribution
                  .filter((d) => d.probability >= 2)
                  .slice(0, 4)
                  .map((d) => (
                    <div key={d.name}>
                      <span>{d.name}</span>
                      <small>{d.probability.toFixed(0)}%</small>
                      <i>
                        <b style={{ width: `${d.probability}%` }} />
                      </i>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="assistant-waiting">
              <div className="waiting-gauge">
                <RiverMark size={36} />
              </div>
              <span>
                {loading ? (
                  <>
                    <Spinner />
                    Reading the table…
                  </>
                ) : folded ? (
                  "You’re sitting this hand out."
                ) : hand?.finishedAt ? (
                  "A new hand. A fresh perspective."
                ) : (
                  "Ready for the first deal."
                )}
              </span>
              <p>
                {error ||
                  (folded
                    ? "Enjoy the rest of the hand. Your insights return with the next deal."
                    : "Equity, pot odds, and useful context will appear here as the hand unfolds.")}
              </p>
            </div>
          )
        ) : (
          <div className="assistant-waiting">
            <div className="waiting-gauge">
              <Sparkles size={30} />
            </div>
            <span>Trust your own read.</span>
            <p>
              The assistant is off. Turn it on whenever you’d like a little
              perspective.
            </p>
          </div>
        )}
        <div className="insight-footnote">
          <span className="tiny-dot" />
          Perspective, never a promise.
        </div>
      </div>
      <div className="activity-card">
        <div className="activity-heading">
          <h3>At the table</h3>
          <span>LIVE</span>
        </div>
        {events.length ? (
          <div className="activity-feed">
            {events.map((e, i) => (
              <div className="activity-event" key={e.id}>
                <span
                  className={`activity-icon ${e.type === "result" ? "result" : ""}`}
                >
                  {e.type === "result" ? (
                    <Sparkles size={13} />
                  ) : e.type === "street" || e.type === "deal" ? (
                    <RiverMark size={13} />
                  ) : (
                    <ArrowDownLeft size={13} />
                  )}
                </span>
                <p>
                  {e.message}
                  {e.amount && !e.message.includes(String(e.amount)) && (
                    <b>{chips(e.amount)} chips</b>
                  )}
                  <small>{i === 0 ? "Just now" : `Hand ${e.hand}`}</small>
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="activity-empty">
            <p>Pull up a chair.</p>
            <span>The best part is who’s around the table.</span>
          </div>
        )}
        <button className="text-button" onClick={onHistory}>
          Hand history
          <ArrowRight size={15} />
        </button>
      </div>
    </aside>
  );
}
