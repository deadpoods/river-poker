"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { X, ArrowUpRight, LoaderCircle } from "lucide-react";
import type { Card } from "@/lib/types";
import { RANKS, SUIT_SYMBOLS, cardText } from "@/lib/poker/evaluator";

export function RiverMark({
  className = "",
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={`river-mark ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <path
          key={i}
          d="M24 4C20 4 20 10 22 16L24 20L26 16C28 10 28 4 24 4Z"
          fill="currentColor"
          transform={`rotate(${i * 45} 24 24)`}
        />
      ))}
      <circle cx="24" cy="24" r="3.1" fill="currentColor" />
    </svg>
  );
}
export function Logo() {
  return (
    <div className="logo">
      <RiverMark size={34} />
      <span>
        river<span className="logo-period">.</span>
      </span>
    </div>
  );
}

const colors: Record<string, [string, string]> = {
  blue: ["#d9e3e9", "#3a596b"],
  sage: ["#e0e5d6", "#637157"],
  rose: ["#efdfd9", "#aa7163"],
  sand: ["#eee4d5", "#a18c6c"],
  lilac: ["#e7e1ef", "#7d7290"],
  orange: ["#f2dfcf", "#b4744f"],
};
export function Avatar({
  name,
  color = "blue",
  bot = false,
  className = "",
}: {
  name: string;
  color?: string;
  bot?: boolean;
  className?: string;
}) {
  const [bg, shirt] = colors[color] || colors.blue;
  const variant = name.charCodeAt(0) % 3;
  return (
    <div
      className={`avatar ${className}`}
      style={{ "--avatar-bg": bg, "--avatar-ink": shirt } as CSSProperties}
    >
      {bot ? (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <rect width="64" height="64" rx="32" fill={bg} />
          <path d="M9 64C10 48 20 44 32 44S54 48 55 64" fill={shirt} />
          <path d="M25 44V38H39V44L32 49Z" fill="#d9ac8d" />
          {variant === 0 && (
            <path
              d="M15 34C13 18 22 11 32 11C45 11 50 21 49 44L16 45Z"
              fill="#453d36"
            />
          )}
          <ellipse
            cx="32"
            cy="29"
            rx="13"
            ry="16"
            fill={variant === 2 ? "#c89675" : "#e6c4a6"}
          />
          <path
            d={
              variant === 0
                ? "M18 28C16 12 28 10 33 13C46 12 48 22 45 29L39 19C35 27 29 26 24 19L21 30Z"
                : variant === 1
                  ? "M19 23C18 12 37 8 44 19L44 25C35 21 30 25 22 21Z"
                  : "M18 25C16 14 26 9 35 12C45 12 47 23 44 27L38 20L21 27Z"
            }
            fill="#493e35"
          />
          <circle cx="27" cy="30" r="1.2" fill="#493e35" />
          <circle cx="37" cy="30" r="1.2" fill="#493e35" />
          <path
            d="M29 37C31 38.5 34 38.5 36 37"
            stroke="#aa7761"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          {variant === 1 && (
            <path
              d="M21 28H30V33H21ZM34 28H43V33H34ZM30 29H34"
              stroke="#665a4b"
              strokeWidth="1.6"
              fill="none"
            />
          )}
        </svg>
      ) : (
        <span>
          {name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </span>
      )}
    </div>
  );
}

export function PlayingCard({
  card,
  size = "",
  delay = 0,
  muted = false,
}: {
  card?: Card | null;
  size?: string;
  delay?: number;
  muted?: boolean;
}) {
  return (
    <div
      className={`playing-card ${card ? "face-up" : "card-back"} ${size} ${muted ? "muted" : ""}`}
      style={{ "--deal-delay": `${delay}ms` } as CSSProperties}
      aria-label={card ? cardText(card) : "Face-down card"}
    >
      {card ? (
        <>
          <span
            className={`card-corner ${card.suit === "h" || card.suit === "d" ? "red" : ""}`}
          >
            <b>{RANKS[card.rank]}</b>
            <i>{SUIT_SYMBOLS[card.suit]}</i>
          </span>
          <span
            className={`card-suit ${card.suit === "h" || card.suit === "d" ? "red" : ""}`}
          >
            {SUIT_SYMBOLS[card.suit]}
          </span>
          <span
            className={`card-bottom ${card.suit === "h" || card.suit === "d" ? "red" : ""}`}
          >
            {RANKS[card.rank]}
          </span>
        </>
      ) : (
        <div className="card-back-inner">
          <RiverMark size={20} />
        </div>
      )}
    </div>
  );
}

export function ChipStack({
  amount = 0,
  className = "",
}: {
  amount?: number;
  className?: string;
}) {
  const count = Math.max(2, Math.min(5, Math.ceil(amount / 50)));
  return (
    <span className={`chip-stack ${className}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i key={i} style={{ "--chip-i": i } as CSSProperties} />
      ))}
    </span>
  );
}
export function Spinner() {
  return <LoaderCircle size={17} className="spinner" aria-label="Loading" />;
}
export function Arrow({ size = 17 }: { size?: number }) {
  return <ArrowUpRight size={size} />;
}

export function Modal({
  title,
  eyebrow,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const close = () => closeRef.current();
    dialog?.addEventListener("cancel", close);
    return () => {
      dialog?.removeEventListener("cancel", close);
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      aria-label={title}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-heading">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
