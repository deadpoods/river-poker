"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Columns3,
  ExternalLink,
} from "lucide-react";
import {
  directions,
  directionById,
  type DirectionId,
} from "@/lib/design-directions";
import RiverApp from "./river-app";
import { Modal } from "./primitives";

export function DirectionsLab({
  initialDirection,
}: {
  initialDirection: DirectionId | null;
}) {
  const [selected, setSelected] = useState<DirectionId | null>(
    initialDirection,
  );
  const [comparing, setComparing] = useState(false);
  function select(id: DirectionId | null) {
    setSelected(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("direction", id);
    else url.searchParams.delete("direction");
    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search,
    );
  }
  useEffect(() => {
    const sync = () =>
      setSelected(
        directionById(
          new URLSearchParams(window.location.search).get("direction"),
        )?.id || null,
      );
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  return (
    <div className="design-lab">
      <header className="lab-toolbar">
        <button
          className="lab-home"
          onClick={() => select(null)}
          aria-label="All six directions"
        >
          <ArrowLeft size={15} />
          <span>River / Design study</span>
        </button>
        <nav className="lab-direction-tabs" aria-label="Design direction">
          {directions.map((d) => (
            <button
              key={d.id}
              className={selected === d.id ? "selected" : ""}
              onClick={() => select(d.id)}
              aria-pressed={selected === d.id}
            >
              <span>{d.number}</span>
              {d.name}
            </button>
          ))}
        </nav>
        <select
          className="lab-direction-select"
          aria-label="Design direction"
          value={selected || ""}
          onChange={(e) => select(directionById(e.target.value)?.id || null)}
        >
          <option value="">All six directions</option>
          {directions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.number} {d.name}
            </option>
          ))}
        </select>
        <button
          className="lab-compare-button"
          onClick={() => setComparing(true)}
        >
          <Columns3 size={15} />
          <span>Compare</span>
        </button>
        <a
          className="lab-original"
          href="/"
          aria-label="Open the current River design"
        >
          <ExternalLink size={15} />
        </a>
      </header>
      {selected ? (
        <RiverApp direction={selected} />
      ) : (
        <main className="lab-overview">
          <div className="lab-overview-title">
            <div className="lab-kicker">
              <span className="lab-dot" />
              RIVER / EXPLORATIONS 01—06
            </div>
            <h1>
              One game.
              <br />
              <em>Six ways to feel it.</em>
            </h1>
            <div className="lab-overview-caption">
              <p>
                Different worlds for the same people, cards and decisions.
                Explore each complete interface before choosing what River
                becomes.
              </p>
              <span>
                SIX DIRECTIONS
                <br />
                ONE SHARED GAME
                <br />
                NO DIRECTION COMMITTED
              </span>
            </div>
          </div>
          <div className="lab-cards">
            {directions.map((d) => (
              <article key={d.id} className={`lab-direction-card card-${d.id}`}>
                <div className="lab-card-index">
                  <span>
                    {d.number} / {d.category}
                  </span>
                  <span>RIVER ↗</span>
                </div>
                <button
                  className="lab-preview"
                  onClick={() => select(d.id)}
                  aria-label={`Preview ${d.name}`}
                >
                  <img
                    src={`/directions/${d.id}-desktop.jpg`}
                    alt={`${d.name} — working poker table interface`}
                    width={1624}
                    height={947}
                  />
                </button>
                <div className="lab-card-description">
                  <div>
                    <h2>{d.name}</h2>
                    <p>{d.line}</p>
                  </div>
                  <span>{d.geometry}</span>
                </div>
                <p className="lab-card-body">{d.description}</p>
                <button onClick={() => select(d.id)}>
                  Explore {d.name}
                  <ArrowUpRight size={17} />
                </button>
              </article>
            ))}
          </div>
          <div className="lab-method">
            <span>THE DESIGN QUESTION</span>
            <h2>
              What should a modern
              <br />
              poker night feel like?
            </h2>
            <div>
              <p>
                Each direction changes the composition, navigation, players,
                cards, controls, statistics and mobile experience. Switching
                directions keeps the same profile, room and authoritative game
                systems.
              </p>
              <p>
                The current River experience remains the default. These are
                working alternatives for evaluation, with the same real play,
                private cards and persistent history.
              </p>
              <button onClick={() => setComparing(true)}>
                Compare the directions
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
          <footer className="lab-footer">
            <span>RIVER — POKER, IN GOOD COMPANY.</span>
            <a href="/">
              Return to the current app
              <ArrowUpRight size={14} />
            </a>
          </footer>
        </main>
      )}
      {comparing && (
        <ComparisonDialog
          onClose={() => setComparing(false)}
          onExplore={(id) => {
            select(id);
            setComparing(false);
          }}
        />
      )}
    </div>
  );
}

function ComparisonDialog({
  onClose,
  onExplore,
}: {
  onClose: () => void;
  onExplore: (id: DirectionId) => void;
}) {
  return (
    <Modal
      title="Six distinct product identities."
      eyebrow="RIVER / DESIGN COMPARISON"
      onClose={onClose}
      wide
    >
      <p className="lab-comparison-intro">
        Compare the same table, profile and history across all six. These are
        complete presentation alternatives; the underlying game is shared.
      </p>
      <div className="lab-verdicts">
        <div>
          <span>Most premium</span>
          <strong>Royale / Salon</strong>
          <p>
            Royale brings the occasion of a grand casino. Salon offers quiet
            hospitality and the intimacy of a private club.
          </p>
        </div>
        <div>
          <span>Strongest usability</span>
          <strong>Vector</strong>
          <p>
            Aligned values, compact navigation and a clearly separated decision
            console.
          </p>
        </div>
        <div>
          <span>Most original</span>
          <strong>Fieldwork</strong>
          <p>
            An indexed roster and open board create a graphic instrument for
            play.
          </p>
        </div>
        <div>
          <span>Best on mobile</span>
          <strong>Vector</strong>
          <p>
            A compact participant grid, large personal cards and direct
            thumb-reachable controls.
          </p>
        </div>
        <div>
          <span>Modern reinterpretation</span>
          <strong>Folio</strong>
          <p>
            Poker as contemporary social culture, with a cast, a playing field
            and a column of insight.
          </p>
        </div>
        <div>
          <span>Most immersive</span>
          <strong>Afterhours</strong>
          <p>
            Selective light and a cinematic stage make the hand the centre of
            attention.
          </p>
        </div>
      </div>
      <div className="lab-recommendation">
        <span>RECOMMENDED TO PURSUE / FOLIO</span>
        <h3>A distinctive identity with room to grow.</h3>
        <p>
          Folio gives River a recognisable social character across play, rooms,
          profiles and history. Keep its editorial composition and large cards;
          bring Vector’s discipline to timers, betting controls and small-screen
          density. The compact masthead during play is essential. This is a
          recommendation, and all six remain available for comparison.
        </p>
        <button className="text-button" onClick={() => onExplore("folio")}>
          Explore the recommendation <ArrowRight size={15} />
        </button>
      </div>
      <div className="lab-comparison-list">
        {directions.map((d) => (
          <article key={d.id}>
            <header>
              <span>{d.number}</span>
              <h3>{d.name}</h3>
              <small>{d.category}</small>
            </header>
            <p>{d.idea}</p>
            <dl>
              <div>
                <dt>Structure</dt>
                <dd>{d.geometry}</dd>
              </div>
              <div>
                <dt>Strongest qualities</dt>
                <dd>{d.strengths.join(" · ")}</dd>
              </div>
              <div>
                <dt>Tradeoff</dt>
                <dd>{d.risk}</dd>
              </div>
            </dl>
            <button className="text-button" onClick={() => onExplore(d.id)}>
              Explore {d.name}
              <ArrowUpRight size={14} />
            </button>
          </article>
        ))}
      </div>
      <div className="lab-comparison-note">
        Design judgments are expert assessments of the implemented screens, not
        findings from user testing. The comparison keeps a distinction between
        visual identity, usability and product fit.
      </div>
    </Modal>
  );
}
