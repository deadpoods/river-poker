"use client";
import type { Playstyle, StyleMetric } from "@/lib/playstyle";
const percentage = (m: StyleMetric) => m.value === null ? "—" : `${Math.round(m.value)}%`;
const axes = [
  ["aggression", "Aggression", "Raises as a share of raises and calls."],
  ["vpip", "Participation", "Hands where you voluntarily called or raised before the flop (VPIP). Forced blinds are excluded."],
  ["pfr", "Pre-flop raise", "Hands with at least one pre-flop raise (PFR)."],
  ["bluff", "Bluff tendency", "Inferred: post-flop raises with high card only, including possible draws. This measures weak-hand pressure, not intent."],
  ["showdown", "Showdown wins", "Wins, including split pots, among hands where you reached showdown."],
  ["folds", "Fold frequency", "Folds as a share of all decisions."],
] as const;
export function PlaystyleCharts({ style }: { style: Playstyle }) {
  const point = (i: number, radius: number) => { const angle = -Math.PI / 2 + i * Math.PI / 3; return [160 + Math.cos(angle) * radius, 145 + Math.sin(angle) * radius]; };
  const polygon = (radius: number) => axes.map((_, i) => point(i, radius).join(",")).join(" ");
  const fingerprint = axes.map(([key], i) => point(i, (style[key].value ?? 0) * .95).join(",")).join(" ");
  return <section className="playstyle-panel" aria-label="Your playing style">
    <header><div><span className="eyebrow">YOUR PLAYING FINGERPRINT</span><h3>{style.label}</h3><p>{style.sample} completed hands · {style.sample < 20 ? "Early signals. Your style develops with play." : "An evolving picture of your decisions."}</p></div><span className="style-sample">{style.sample < 20 ? "BUILDING A SAMPLE" : "OBSERVED PLAY"}</span></header>
    <div className="playstyle-layout">
      <div className="style-radar"><svg viewBox="0 0 320 300" role="img" aria-label={axes.map(([key, label]) => `${label}: ${percentage(style[key])}`).join(". ")}>
        {[.25, .5, .75, 1].map(f => <polygon className="radar-grid" key={f} points={polygon(95 * f)} />)}
        {axes.map(([,label], i) => <line className="radar-axis" key={label} x1="160" y1="145" x2={point(i,95)[0]} y2={point(i,95)[1]} />)}
        <polygon className="radar-value" points={fingerprint} />
        {axes.map(([key,label], i) => { const [x,y] = point(i, 121); const [dx,dy] = point(i,(style[key].value ?? 0) * .95); return <g key={key}><circle className="radar-dot" cx={dx} cy={dy} r="3.5" /><text x={x} y={y} textAnchor="middle">{label === "Pre-flop raise" ? "PFR" : label === "Showdown wins" ? "Showdown" : label === "Fold frequency" ? "Folds" : label === "Bluff tendency" ? "Bluff*" : label}<tspan x={x} dy="15">{percentage(style[key])}</tspan></text></g>; })}
      </svg><small>* An inferred tendency, including draws.</small></div>
      <div className="style-metrics">{axes.map(([key,label,description]) => <div key={key}><div><span>{label}{key === "bluff" && <i>INFERRED</i>}</span><strong>{percentage(style[key])}</strong></div><div className="style-meter"><b style={{width:`${style[key].value ?? 0}%`}} /></div><small>{style[key].count} / {style[key].sample} {key === "vpip" || key === "pfr" ? "hands" : "observations"}</small><details><summary>How it’s measured</summary><p>{description}</p></details></div>)}</div>
    </div>
    <footer><div><strong>{percentage(style.threeBet)}</strong><span>3-bet rate</span><small>{style.threeBet.count} / {style.threeBet.sample} first decisions facing one pre-flop raise</small></div><div><strong>{percentage(style.continuation)}</strong><span>Continuation bet</span><small>{style.continuation.count} / {style.continuation.sample} unraised flop opportunities after your pre-flop raise</small></div><p>Your style describes past play. Keep adapting to the people and the hand in front of you.</p></footer>
  </section>;
}
