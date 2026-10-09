"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  KeyRound,
  Pencil,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import type { Analytics, Preferences, Profile } from "@/lib/types";
import { api, chips, signedChips } from "@/lib/client";
import { PlaystyleCharts } from "./playstyle";
import { Avatar, Modal, RiverMark, Spinner } from "./primitives";

export function ProfileView({
  profile,
  onEdit,
  onPractice,
  notify,
}: {
  profile: Profile;
  onEdit: () => void;
  onPractice: () => void;
  notify: (message: string) => void;
}) {
  const [stats, setStats] = useState<Analytics | null>(null);
  const [mode, setMode] = useState("all");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setError("");
    api<{ stats: Analytics }>(`/api/profile/stats?mode=${mode}`)
      .then((r) => {
        if (!cancelled) setStats(r.stats);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, profile.id, revision]);
  return (
    <div className="profile-view page-enter">
      <div className="profile-banner">
        <Avatar name={profile.name} color={profile.color} />
        <div>
          <span className="eyebrow">YOUR SEAT AT THE TABLE</span>
          <h2>{profile.name}</h2>
          <span>
            Member since{" "}
            {new Date(profile.createdAt).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
        <button className="button button-outline" onClick={onEdit}>
          <Pencil size={15} />
          Edit profile
        </button>
      </div>
      <div className="section-heading">
        <div>
          <h3>Your game, in perspective.</h3>
          <p>A personal record. A little room to improve.</p>
        </div>
        <div className="segmented-control" aria-label="Statistics filter">
          {[
            ["all", "All tables"],
            ["friends", "With friends"],
            ["practice", "Practice"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={mode === key ? "selected" : ""}
              onClick={() => {
                if (mode !== key) {
                  setStats(null);
                  setMode(key);
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <div className="inline-error" role="alert">
          {error}
          <button onClick={() => setRevision((r) => r + 1)}>Try again</button>
        </div>
      ) : !stats ? (
        <div className="content-loading">
          <Spinner />
          Reading your story…
        </div>
      ) : (
        <>
          <div className="stat-strip">
            {[
              {
                label: "Hands played",
                value: chips(stats.hands),
                small: `${stats.sessions} sessions at the table`,
              },
              {
                label: "Hands won",
                value: chips(stats.wins),
                small: `${stats.losses} hands without a win`,
              },
              {
                label: "Win rate",
                value: `${stats.winRate.toFixed(1)}%`,
                small: "Includes split pots",
              },
              {
                label: "Chip change",
                value: signedChips(stats.net),
                small: "Across completed hands",
              },
            ].map((s) => (
              <div key={s.label}>
                <span>{s.label}</span>
                <strong>{s.value}</strong>
                <small>{s.small}</small>
              </div>
            ))}
          </div>
          <PlaystyleCharts style={stats.playstyle} />
          {stats.hands ? (
            <div className="analytics-grid">
              <div className="chart-card">
                <div className="activity-heading">
                  <div>
                    <h3>The shape of your game.</h3>
                    <p>Cumulative chip change</p>
                  </div>
                  <span>{stats.trend.length} HANDS</span>
                </div>
                <TrendChart points={stats.trend} />
              </div>
              <div className="tendencies-card">
                <h3>Your decisions</h3>
                <p>
                  {chips(stats.totalDecisions)} decisions across completed hands
                </p>
                <div className="tendency-bars">
                  {(["fold", "check", "call", "raise"] as const).map((kind) => {
                    const percentage = stats.totalDecisions
                      ? (stats.actions[kind] / stats.totalDecisions) * 100
                      : 0;
                    return (
                      <div key={kind}>
                        <span>{kind}</span>
                        <strong>{percentage.toFixed(0)}%</strong>
                        <i>
                          <b
                            className={kind}
                            style={{ width: `${percentage}%` }}
                          />
                        </i>
                      </div>
                    );
                  })}
                </div>
                <small>Observe patterns. Keep your play flexible.</small>
              </div>
            </div>
          ) : (
            <div className="empty-state profile-empty">
              <RiverMark size={48} />
              <h3>Your story starts at the table.</h3>
              <p>
                Finish a hand and you’ll find your wins, decisions, and progress
                right here.
              </p>
              <button className="button button-dark" onClick={onPractice}>
                Play a practice hand
                <ArrowRight size={16} />
              </button>
            </div>
          )}
          <div className="detail-stat-grid">
            {[
              {
                label: "Average pot",
                value: chips(stats.averagePot),
                note: "Chips across hands played",
              },
              {
                label: "Average session",
                value: `${Math.round(stats.averageSessionMinutes)} min`,
                note: "Time spent at your tables",
              },
              {
                label: "Showdown wins",
                value: `${stats.showdownWins} / ${stats.showdowns}`,
                note: "Wins when cards are revealed",
              },
              {
                label: "Aggression factor",
                value:
                  stats.aggression === null
                    ? stats.actions.raise
                      ? "∞"
                      : "—"
                    : stats.aggression.toFixed(2),
                note: "Raises divided by calls",
              },
              {
                label: "Assistant reads",
                value: chips(stats.assistantUses),
                note: "Insights requested during play",
              },
            ].map((s) => (
              <div key={s.label}>
                <span>{s.label}</span>
                <strong>{s.value}</strong>
                <small>{s.note}</small>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TrendChart({ points }: { points: { hand: number; net: number }[] }) {
  const values = points.map((p) => p.net),
    min = Math.min(0, ...values),
    max = Math.max(1, ...values),
    range = max - min || 1;
  const y = (value: number) => 154 - ((value - min) / range) * 128;
  const x = (i: number) => 28 + (i / Math.max(1, points.length - 1)) * 604;
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.net)}`)
    .join(" ");
  const area = `${line} L${x(points.length - 1)},${y(0)} L28,${y(0)} Z`;
  return (
    <div className="trend-chart">
      <svg
        viewBox="0 0 660 195"
        role="img"
        aria-label={`Chip change over ${points.length} hands, ending at ${signedChips(values.at(-1) || 0)}`}
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#ab765b" stopOpacity=".13" />
            <stop offset="1" stopColor="#ab765b" stopOpacity=".015" />
          </linearGradient>
        </defs>
        {[min, (max + min) / 2, max].map((v, i) => (
          <g key={i}>
            <line
              x1="28"
              x2="632"
              y1={y(v)}
              y2={y(v)}
              stroke="#edece6"
              strokeDasharray="4 5"
            />
            <text x="28" y={y(v) - 6} fill="#94958c" fontSize="10">
              {Math.round(v)}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#trend-fill)" />
        <path
          d={line}
          fill="none"
          stroke="#a9775c"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.length > 0 && (
          <circle
            cx={x(points.length - 1)}
            cy={y(values.at(-1)!)}
            r="4"
            fill="#a9775c"
            stroke="#fff"
            strokeWidth="2"
          />
        )}
        <text x="28" y="185" fill="#94958c" fontSize="10">
          Hand {points[0]?.hand || 1}
        </text>
        <text x="632" y="185" textAnchor="end" fill="#94958c" fontSize="10">
          Hand {points.at(-1)?.hand || 1}
        </text>
      </svg>
    </div>
  );
}

export function ProfileDialog({
  profile,
  onClose,
  onSave,
  onRecover,
  onCopy,
}: {
  profile: Profile;
  onClose: () => void;
  onSave: (
    name: string,
    color: string,
    preferences: Preferences,
  ) => Promise<void>;
  onRecover: (key: string) => Promise<void>;
  onCopy: (value: string) => void;
}) {
  const [name, setName] = useState(profile.name),
    [color, setColor] = useState(profile.color);
  const [prefs, setPrefs] = useState(profile.preferences),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [key, setKey] = useState(""),
    [restore, setRestore] = useState(false),
    [recovery, setRecovery] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(name, color, prefs);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Make yourself at home."
      eyebrow="YOUR PROFILE & PREFERENCES"
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="edit-profile-identity">
          <Avatar name={name || "You"} color={color} />
          <label className="field-label">
            Your name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              required
            />
          </label>
        </div>
        <div className="color-options" aria-label="Profile color">
          {["blue", "sage", "rose", "sand", "lilac", "orange"].map((c) => (
            <button
              key={c}
              type="button"
              className={`color-option ${c} ${c === color ? "selected" : ""}`}
              onClick={() => setColor(c)}
              aria-label={`${c} profile color`}
              aria-pressed={c === color}
            >
              {c === color && <Check size={15} />}
            </button>
          ))}
        </div>
        <div className="preference-list">
          {[
            {
              key: "assistant" as const,
              label: "A little insight",
              text: "Estimated equity, pot odds, and the math behind them.",
            },
            {
              key: "sound" as const,
              label: "Table sounds",
              text: "Quiet cues for the deal, your decisions, and a win.",
            },
            {
              key: "reducedMotion" as const,
              label: "Less motion",
              text: "Keep the experience calm with minimal animation.",
            },
          ].map((p) => (
            <div key={p.key}>
              <div>
                <strong>{p.label}</strong>
                <small>{p.text}</small>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[p.key]}
                aria-label={p.label}
                className={`toggle ${prefs[p.key] ? "on" : ""}`}
                onClick={() => setPrefs({ ...prefs, [p.key]: !prefs[p.key] })}
              >
                <span />
              </button>
            </div>
          ))}
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="button button-dark full-width" disabled={busy}>
          {busy ? <Spinner /> : "Save my profile"}
          <ArrowRight size={16} />
        </button>
      </form>
      <div className="recovery-section">
        <h3>
          <ShieldCheck size={16} />
          Keep your seat.
        </h3>
        <p>
          Your profile is saved to this browser. A recovery key lets you bring
          your history to another device.
        </p>
        {key ? (
          <div className="recovery-key">
            <code>{key}</code>
            <button
              className="icon-button"
              onClick={() => onCopy(key)}
              aria-label="Copy recovery key"
            >
              <Copy size={16} />
            </button>
            <small>
              Save this privately. It grants access to your profile and replaces
              your previous recovery key.
            </small>
          </div>
        ) : (
          <button
            className="text-button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const r = await api<{ key: string }>(
                  "/api/profile/recovery",
                  "POST",
                  {},
                );
                setKey(r.key);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <KeyRound size={14} />
            Create a recovery key
          </button>
        )}
        <button
          className="text-button restore-button"
          onClick={() => setRestore(!restore)}
        >
          Already have a profile? Recover it
          <ArrowRight size={14} />
        </button>
        {restore && (
          <form
            className="restore-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await onRecover(recovery);
                onClose();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field-label">
              Recovery key
              <input
                value={recovery}
                onChange={(e) => setRecovery(e.target.value)}
                autoComplete="off"
                required
                maxLength={80}
                placeholder="Paste your private recovery key"
              />
            </label>
            <button
              className="button button-outline full-width"
              disabled={busy}
            >
              Recover my profile
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
