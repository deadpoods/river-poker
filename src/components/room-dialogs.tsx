"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Link2,
  LockKeyhole,
  Settings2,
  Users,
} from "lucide-react";
import type { Profile, PublicRoom, Settings } from "@/lib/types";
import { chips } from "@/lib/client";
import { Avatar, Modal, RiverMark, Spinner } from "./primitives";

export function RoomForm({
  mode,
  busy,
  initialCode = "",
  onClose,
  onCreate,
  onJoin,
}: {
  mode: "create" | "join";
  busy: boolean;
  initialCode?: string;
  onClose: () => void;
  onCreate: (name: string, settings: Settings) => Promise<void>;
  onJoin: (code: string) => Promise<void>;
}) {
  const [name, setName] = useState("The Friday Club");
  const [code, setCode] = useState(initialCode);
  const [settings, setSettings] = useState<Settings>({
    maxPlayers: 6,
    startingStack: 2000,
    smallBlind: 25,
    turnSeconds: 45,
  });
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (mode === "join") await onJoin(code);
      else await onCreate(name, settings);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Modal
      title={
        mode === "create" ? "Make a night of it." : "There’s a seat for you."
      }
      eyebrow={
        mode === "create" ? "YOUR PEOPLE. YOUR TABLE." : "INVITATION ONLY"
      }
      onClose={onClose}
    >
      <p className="modal-description">
        {mode === "create"
          ? "Set the table. Send an invitation. Let the good hands begin."
          : "Enter the six-character code from your host to take a seat."}
      </p>
      <form onSubmit={submit}>
        {mode === "join" ? (
          <label className="field-label">
            Room code
            <input
              className="code-input"
              autoFocus
              placeholder="ABC123"
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z2-9]/g, "")
                    .slice(0, 6),
                )
              }
              maxLength={6}
              minLength={6}
              required
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        ) : (
          <>
            <label className="field-label">
              Give your table a name
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={36}
                required
                placeholder="The Friday Club"
              />
            </label>
            <SettingsFields settings={settings} setSettings={setSettings} />
            <div className="room-preview">
              <RiverMark size={25} />
              <div>
                <strong>No-limit Texas Hold’em</strong>
                <span>
                  {settings.maxPlayers} seats · {chips(settings.startingStack)}{" "}
                  starting chips · {settings.smallBlind} /{" "}
                  {settings.smallBlind * 2} blinds
                </span>
              </div>
              <LockKeyhole size={16} />
            </div>
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="button button-dark full-width"
          disabled={busy}
        >
          {busy ? (
            <Spinner />
          ) : (
            <>
              {mode === "create" ? "Create my table" : "Take my seat"}
              <ArrowRight size={17} />
            </>
          )}
        </button>
        <p className="form-footnote">
          <LockKeyhole size={12} />
          Private tables. Play chips only.
        </p>
      </form>
    </Modal>
  );
}

export function SettingsFields({
  settings,
  setSettings,
  minSeats = 2,
}: {
  settings: Settings;
  setSettings: (s: Settings) => void;
  minSeats?: number;
}) {
  return (
    <div className="settings-grid">
      <label className="field-label">
        Seats
        <select
          value={settings.maxPlayers}
          onChange={(e) =>
            setSettings({ ...settings, maxPlayers: Number(e.target.value) })
          }
        >
          {Array.from({ length: 9 - minSeats }, (_, i) => i + minSeats).map(
            (n) => (
              <option key={n} value={n}>
                {n} players
              </option>
            ),
          )}
        </select>
      </label>
      <label className="field-label">
        Starting stack
        <select
          value={settings.startingStack}
          onChange={(e) =>
            setSettings({ ...settings, startingStack: Number(e.target.value) })
          }
        >
          {[1000, 2000, 5000, 10_000, 20_000].map((n) => (
            <option key={n} value={n}>
              {chips(n)} chips
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        Small / big blind
        <select
          value={settings.smallBlind}
          onChange={(e) =>
            setSettings({ ...settings, smallBlind: Number(e.target.value) })
          }
        >
          {[5, 10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} / {n * 2}
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        Turn timer
        <select
          value={settings.turnSeconds}
          onChange={(e) =>
            setSettings({ ...settings, turnSeconds: Number(e.target.value) })
          }
        >
          {[15, 30, 45, 60, 90].map((n) => (
            <option key={n} value={n}>
              {n} seconds
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function InviteDialog({
  room,
  onClose,
  onCopy,
}: {
  room: PublicRoom;
  onClose: () => void;
  onCopy: (text: string) => void;
}) {
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/?room=${room.code}`;
  return (
    <Modal
      title="Good company, invited."
      eyebrow="KEEP IT IN YOUR CIRCLE"
      onClose={onClose}
    >
      <p className="modal-description">
        Share this code or link with your friends. Everyone gets their own seat
        and private cards.
      </p>
      <div className="invitation-card">
        <RiverMark size={38} />
        <span className="eyebrow">{room.name}</span>
        <strong>{room.code}</strong>
        <span>
          {room.settings.maxPlayers - room.players.length} open seats at the
          table
        </span>
      </div>
      <label className="field-label">
        Invitation link
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
      </label>
      <button
        className="button button-dark full-width"
        onClick={() => onCopy(url)}
      >
        <Link2 size={16} />
        Copy invitation link
        <Copy size={15} />
      </button>
      <button
        className="button button-outline full-width"
        onClick={() => onCopy(room.code)}
      >
        Copy room code
      </button>
      <p className="form-footnote">
        <LockKeyhole size={12} />
        Anyone with the code can join before the first deal.
      </p>
    </Modal>
  );
}

export function DetailsDialog({
  room,
  profile,
  busy,
  onClose,
  onAction,
  onInvite,
}: {
  room: PublicRoom;
  profile: Profile;
  busy: boolean;
  onClose: () => void;
  onAction: (type: string, extra?: Record<string, unknown>) => Promise<void>;
  onInvite: () => void;
}) {
  const [settings, setSettings] = useState(room.settings);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const host = room.hostId === profile.id;
  return (
    <Modal
      title={room.name}
      eyebrow={room.practice ? "YOUR PRACTICE TABLE" : "YOUR PRIVATE ROOM"}
      onClose={onClose}
    >
      <div className="details-meta">
        <span>
          <Users size={15} />
          {room.players.length} / {room.settings.maxPlayers} players
        </span>
        <span>
          <LockKeyhole size={14} />
          {room.code}
        </span>
      </div>
      <div className="lobby-players">
        {room.players.map((p) => (
          <div key={p.id}>
            <Avatar
              name={p.id === profile.id ? profile.name : p.name}
              color={p.color}
              bot={p.bot}
            />
            <div>
              <strong>
                {p.id === profile.id ? `${profile.name} (you)` : p.name}
                {p.id === room.hostId && <span>HOST</span>}
              </strong>
              <small>
                {p.bot
                  ? "Computer opponent"
                  : p.connected
                    ? "At the table"
                    : "Reconnecting"}
              </small>
            </div>
            {room.status === "lobby" ? (
              <span className={`ready-tag ${p.ready ? "is-ready" : ""}`}>
                {p.ready && <Check size={12} />}{" "}
                {p.ready ? "Ready" : "Not ready"}
              </span>
            ) : (
              <span className="lobby-stack">{chips(p.stack)}</span>
            )}
          </div>
        ))}
      </div>
      {editing ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            try {
              await onAction("settings", { settings });
              setEditing(false);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <SettingsFields
            settings={settings}
            setSettings={setSettings}
            minSeats={Math.max(2, room.players.length)}
          />
          {error && <p className="form-error">{error}</p>}
          <button className="button button-dark full-width" disabled={busy}>
            Save table settings
          </button>
        </form>
      ) : (
        <>
          <div className="room-settings-list">
            <span>
              Game<strong>No-limit Texas Hold’em</strong>
            </span>
            <span>
              Starting stack
              <strong>{chips(room.settings.startingStack)} chips</strong>
            </span>
            <span>
              Blinds
              <strong>
                {room.settings.smallBlind} / {room.settings.smallBlind * 2}
              </strong>
            </span>
            <span>
              Time to act<strong>{room.settings.turnSeconds} seconds</strong>
            </span>
          </div>
          <div className="modal-actions">
            {host && room.status === "lobby" && (
              <button
                className="button button-outline"
                onClick={() => setEditing(true)}
              >
                <Settings2 size={15} />
                Edit settings
              </button>
            )}
            {!room.practice && room.status === "lobby" && (
              <button className="button button-dark" onClick={onInvite}>
                Invite friends
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </>
      )}
      {error && !editing && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {host && room.hand?.finishedAt && room.status !== "finished" && (
        <button
          className="text-button end-session-button"
          disabled={busy}
          onClick={() =>
            void onAction("end")
              .then(onClose)
              .catch((e) => setError(e.message))
          }
        >
          End this session
        </button>
      )}
      {!host && (!room.hand || room.hand.finishedAt) && (
        <button
          className="text-button end-session-button"
          disabled={busy}
          onClick={() =>
            void onAction("leave")
              .then(onClose)
              .catch((e) => setError(e.message))
          }
        >
          Leave this table
        </button>
      )}
    </Modal>
  );
}
