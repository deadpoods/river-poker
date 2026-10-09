"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  History,
  House,
  LayoutGrid,
  LockKeyhole,
  Menu,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import type {
  Preferences,
  Profile,
  PublicRoom,
  RoomSummary,
  Settings,
} from "@/lib/types";
import { api, chips, dateLabel, signedChips } from "@/lib/client";
import { playSound, setSoundEnabled, unlockSounds } from "@/lib/audio";
import { soundChanges } from "@/lib/sound-signals";
import { AppearanceContext, AppearanceControl, type Appearance } from "./appearance-control";
import { AssistantPanel } from "./assistant-panel";
import { PokerTable } from "./poker-table";
import {
  Avatar,
  Logo,
  Modal,
  PlayingCard,
  RiverMark,
  Spinner,
} from "./primitives";
import { DetailsDialog, InviteDialog, RoomForm } from "./room-dialogs";
import { ProfileDialog, ProfileView } from "./profile";
import { HistoryDialog, HistoryView } from "./history";
import { DirectionProvider } from "./direction-context";
import {
  DirectionIntro,
  DirectionMobileHeader,
  DirectionNavigation,
} from "./direction-navigation";
import { directionById, type DesignDirection } from "@/lib/design-directions";

type View = "table" | "rooms" | "profile" | "history";
type Dialog =
  | "create"
  | "join"
  | "invite"
  | "details"
  | "profile"
  | "history"
  | "help"
  | null;
type Boot = {
  profile: Profile;
  rooms: RoomSummary[];
  room: PublicRoom | null;
  invitation: string;
};
let bootstrapPromise: Promise<Boot> | null = null;
function bootstrap(): Promise<Boot> {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    const { profile } = await api<{ profile: Profile }>(
      "/api/session",
      "POST",
      {},
    );
    const { rooms } = await api<{ rooms: RoomSummary[] }>("/api/rooms");
    const invitation =
      new URLSearchParams(window.location.search).get("room")?.toUpperCase() ||
      "";
    const remembered = localStorage.getItem("river:last-room");
    const existing =
      rooms.find((r) => r.code === invitation) ||
      rooms.find((r) => r.code === remembered && r.status !== "finished") ||
      rooms.find((r) => r.status !== "finished");
    let room: PublicRoom | null = null;
    if (invitation && !rooms.some((r) => r.code === invitation))
      return { profile, rooms, room, invitation };
    if (existing) {
      try {
        room = (await api<{ room: PublicRoom }>(`/api/rooms/${existing.code}`))
          .room;
      } catch {
        /* An expired room remains in history; a fresh practice table is available. */
      }
    }
    if (!room) {
      room = (
        await api<{ room: PublicRoom }>("/api/rooms", "POST", {
          name: "The drawing room",
          practice: true,
          settings: {
            maxPlayers: 6,
            startingStack: 2000,
            smallBlind: 25,
            turnSeconds: 60,
          },
        })
      ).room;
      rooms.push({
        id: room.id,
        code: room.code,
        name: room.name,
        practice: true,
        status: room.status,
        players: room.players.length,
        maxPlayers: room.settings.maxPlayers,
        hands: room.history.length,
        createdAt: room.createdAt,
        startedAt: room.startedAt,
        endedAt: room.endedAt,
        host: true,
        net: 0,
        smallBlind: room.settings.smallBlind,
      });
    }
    return { profile, rooms, room, invitation: "" };
  })().catch((error) => {
    bootstrapPromise = null;
    throw error;
  });
  return bootstrapPromise;
}

const navigation = [
  { key: "table" as const, label: "The lounge", icon: House },
  { key: "rooms" as const, label: "My tables", icon: LayoutGrid },
  { key: "profile" as const, label: "My profile", icon: UserRound },
  { key: "history" as const, label: "Match history", icon: History },
];

export default function RiverApp({
  direction = "original",
}: {
  direction?: DesignDirection;
}) {
  const [profile, setProfile] = useState<Profile | null>(null),
    [room, setRoom] = useState<PublicRoom | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]),
    [view, setView] = useState<View>("table"),
    [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false),
    [booting, setBooting] = useState(true),
    [bootError, setBootError] = useState("");
  const [toast, setToast] = useState(""),
    [connection, setConnection] = useState<
      "online" | "reconnecting" | "offline"
    >("online");
  const [assistantOpen, setAssistantOpen] = useState(false),
    [menuOpen, setMenuOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState(""),
    [historyRoom, setHistoryRoom] = useState<PublicRoom | null>(null);
  const roomRef = useRef<PublicRoom | null>(null),
    mutationRef = useRef(false),
    toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 5500);
  }, []);
  const closeDialog = useCallback(() => setDialog(null), []);
  const selectRoom = useCallback((value: PublicRoom) => {
    roomRef.current = value;
    setRoom(value);
    localStorage.setItem("river:last-room", value.code);
    setConnection("online");
  }, []);
  const commitRoom = useCallback((value: PublicRoom) => {
    const current = roomRef.current;
    if (current?.code === value.code && value.version >= current.version) {
      roomRef.current = value;
      setRoom(value);
    }
  }, []);

  async function boot() {
    setBooting(true);
    setBootError("");
    try {
      const result = await bootstrap();
      setProfile(result.profile);
      setRooms(result.rooms);
      if (result.room) selectRoom(result.room);
      if (result.invitation) {
        setInviteCode(result.invitation);
        setDialog("join");
      }
    } catch (e) {
      setBootError((e as Error).message);
    } finally {
      setBooting(false);
    }
  }
  useEffect(() => {
    void boot();
    return () => clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    if (!room?.code || !profile) return;
    const code = room.code;
    let stream: EventSource | null = null,
      stopped = false,
      delay = 1000;
    let reconnect: ReturnType<typeof setTimeout>;
    let fallback: ReturnType<typeof setTimeout>;
    const connect = () => {
      if (stopped) return;
      stream = new EventSource(`/api/rooms/${code}/stream`);
      stream.onopen = () => {
        delay = 1000;
        setConnection("online");
        clearTimeout(fallback);
      };
      stream.addEventListener("state", (event) => {
        try {
          const state = JSON.parse((event as MessageEvent).data) as PublicRoom;
          commitRoom(state);
          setConnection("online");
        } catch {
          setConnection("reconnecting");
        }
      });
      stream.addEventListener("heartbeat", () => setConnection("online"));
      const failed = () => {
        stream?.close();
        if (stopped) return;
        setConnection(navigator.onLine ? "reconnecting" : "offline");
        reconnect = setTimeout(connect, delay);
        delay = Math.min(delay * 2, 15000);
        fallback = setTimeout(async () => {
          if (stopped || !navigator.onLine) return;
          try {
            const result = await api<{ room: PublicRoom }>(
              `/api/rooms/${code}`,
            );
            commitRoom(result.room);
          } catch {
            /* Reconnection remains visible and keeps backing off. */
          }
        }, 2000);
      };
      stream.onerror = failed;
      stream.addEventListener("unavailable", failed);
    };
    const online = () => {
        clearTimeout(reconnect);
        stream?.close();
        connect();
      },
      offline = () => setConnection("offline");
    connect();
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      stopped = true;
      stream?.close();
      clearTimeout(reconnect);
      clearTimeout(fallback);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [room?.code, profile?.id, commitRoom]);

  const previousSoundRoom = useRef<PublicRoom | null>(null);
  useEffect(() => {
    if (!room || !profile) return;
    const cues = soundChanges(previousSoundRoom.current, room, profile.id);
    previousSoundRoom.current = room;
    if (profile.preferences.sound) cues.forEach((cue, i) => playSound(cue, i * .23));
  }, [room, profile]);
  useEffect(() => {
    setSoundEnabled(!!profile?.preferences.sound);
    const unlock = () => unlockSounds();
    window.addEventListener("pointerup", unlock, true);
    window.addEventListener("click", unlock, true);
    window.addEventListener("keydown", unlock, true);
    return () => { window.removeEventListener("pointerup", unlock, true); window.removeEventListener("click", unlock, true); window.removeEventListener("keydown", unlock, true); };
  }, [profile?.preferences.sound]);
  useEffect(() => { if (dialog && profile?.preferences.sound) playSound("open"); }, [dialog, profile?.preferences.sound]);
  const [appearances, setAppearances] = useState<Partial<Record<DesignDirection, Appearance>>>({});
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem("river:appearances") || "{}"); if (saved && typeof saved === "object") setAppearances(saved); } catch { /* Optional device preference. */ } }, []);
  const appearance = direction === "afterhours" ? "dark" : appearances[direction] === "dark" ? "dark" : "light";
  function toggleAppearance() {
    setAppearances(previous => { const next = { ...previous, [direction]: appearance === "dark" ? "light" as const : "dark" as const }; try { localStorage.setItem("river:appearances", JSON.stringify(next)); } catch { /* Optional device preference. */ } return next; });
  }
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = profile?.preferences
      .reducedMotion
      ? "true"
      : "false";
  }, [profile?.preferences.reducedMotion]);

  async function refreshRooms() {
    try {
      setRooms((await api<{ rooms: RoomSummary[] }>("/api/rooms")).rooms);
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function onAction(type: string, extra: Record<string, unknown> = {}) {
    if (!roomRef.current || mutationRef.current) return;
    mutationRef.current = true;
    setBusy(true);
    const code = roomRef.current.code;
    try {
      const result = await api<{ room?: PublicRoom; left?: boolean }>(
        `/api/rooms/${code}/action`,
        "POST",
        { type, ...extra, requestId: crypto.randomUUID() },
      );
      if (result.room) commitRoom(result.room);
      if (result.left) {
        roomRef.current = null;
        setRoom(null);
        setView("rooms");
      }
      if (["start", "end", "leave"].includes(type)) void refreshRooms();
    } catch (e) {
      notify((e as Error).message);
      playSound("error");
      try {
        commitRoom(
          (await api<{ room: PublicRoom }>(`/api/rooms/${code}`)).room,
        );
      } catch {
        setConnection("reconnecting");
      }
      throw e;
    } finally {
      mutationRef.current = false;
      setBusy(false);
    }
  }
  const safeAction = async (type: string, extra?: Record<string, unknown>) => {
    try {
      await onAction(type, extra);
    } catch {
      /* The action error is shown in the toast, with refreshed state. */
    }
  };

  async function create(name: string, settings: Settings, practice = false) {
    if (mutationRef.current) return;
    mutationRef.current = true;
    setBusy(true);
    try {
      const r = await api<{ room: PublicRoom }>("/api/rooms", "POST", {
        name,
        settings,
        practice,
      });
      selectRoom(r.room);
      setView("table");
      setDialog(null);
      await refreshRooms();
    } finally {
      mutationRef.current = false;
      setBusy(false);
    }
  }
  async function join(code: string) {
    if (mutationRef.current) return;
    mutationRef.current = true;
    setBusy(true);
    try {
      const r = await api<{ room: PublicRoom }>("/api/rooms/join", "POST", {
        code,
      });
      selectRoom(r.room);
      setView("table");
      setDialog(null);
      setInviteCode("");
      window.history.replaceState(null, "", window.location.pathname);
      await refreshRooms();
    } finally {
      mutationRef.current = false;
      setBusy(false);
    }
  }
  async function practice() {
    const existing = rooms.find((r) => r.practice && r.status !== "finished");
    try {
      if (existing) {
        selectRoom(
          (await api<{ room: PublicRoom }>(`/api/rooms/${existing.code}`)).room,
        );
        setView("table");
      } else
        await create(
          "The drawing room",
          {
            maxPlayers: 6,
            startingStack: 2000,
            smallBlind: 25,
            turnSeconds: 60,
          },
          true,
        );
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function updateProfile(
    name: string,
    color: string,
    preferences: Preferences,
  ) {
    const r = await api<{ profile: Profile }>("/api/profile", "PATCH", {
      name,
      color,
      preferences,
    });
    setProfile(r.profile);
    notify("Your profile is saved.");
  }
  async function preference(key: keyof Preferences) {
    if (!profile) return;
    try {
      await updateProfile(profile.name, profile.color, {
        ...profile.preferences,
        [key]: !profile.preferences[key],
      });
    } catch (e) {
      if (key === "sound") setSoundEnabled(profile.preferences.sound);
      notify((e as Error).message);
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify("Copied. Good company is one invitation away.");
    } catch {
      notify(
        "Copy is unavailable in this browser. You can select the code or link in the invitation.",
      );
    }
  }
  async function review(code = room?.code) {
    if (!code) return;
    try {
      setHistoryRoom(
        (await api<{ room: PublicRoom }>(`/api/rooms/${code}/history`)).room,
      );
      setDialog("history");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  function navigate(target: View) {
    setView(target);
    setMenuOpen(false);
    if (target === "rooms") void refreshRooms();
  }
  const titles = {
    table: [
      "A little friendly competition.",
      "Your people. Your table. Your kind of poker.",
    ],
    rooms: [
      "A place for your people.",
      "Small circles. Good conversation. Great hands.",
    ],
    profile: [
      "Play. Learn. Make it yours.",
      "A personal perspective on the way you play.",
    ],
    history: [
      "The hands that made the night.",
      "Look back. Find your moments. Bring a better game.",
    ],
  };
  const hour = new Date().getHours(),
    greeting =
      hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";

  return (
    <AppearanceContext.Provider value={{ mode: appearance, toggle: toggleAppearance, available: direction !== "afterhours" }}>
    <DirectionProvider direction={direction}>
      <div
        className={`river-app ${view === "table" && !!room?.hand ? "at-play" : ""}`}
        data-direction={direction === "original" ? undefined : direction}
        data-view={view}
        data-appearance={appearance}
        onClickCapture={e => { if ((e.target as HTMLElement).closest("button") && profile?.preferences.sound) playSound("ui"); }}
      >
        {direction === "original" ? (
          <>
            <aside className={`sidebar ${menuOpen ? "menu-open" : ""}`}>
              <button
                className="brand-button"
                onClick={() => navigate("table")}
                aria-label="River lounge"
              >
                <Logo />
              </button>
              <span className="sidebar-tagline">POKER, IN GOOD COMPANY.</span>
              <div className="sidebar-section-label">YOUR CLUB</div>
              <nav aria-label="Main navigation">
                {navigation.map((n) => (
                  <button
                    key={n.key}
                    className={`nav-item ${view === n.key ? "active" : ""}`}
                    onClick={() => navigate(n.key)}
                  >
                    <n.icon size={19} />
                    <span>{n.label}</span>
                    {view === n.key && <i />}
                  </button>
                ))}
              </nav>
              <button
                className="button sidebar-create"
                onClick={() => setDialog("create")}
                disabled={!profile}
              >
                <Plus size={18} />
                <span>Create a table</span>
              </button>
              <button
                className="sidebar-join"
                onClick={() => {
                  setInviteCode("");
                  setDialog("join");
                }}
                disabled={!profile}
              >
                <LinkIcon />
                <span>Join with a code</span>
                <ArrowUpRight size={14} />
              </button>
              <div className="club-note">
                <div className="club-stamp">
                  <RiverMark size={31} />
                </div>
                <span>
                  A better kind
                  <br />
                  of poker night.
                </span>
                <p>
                  No crowds. No stakes.
                  <br />
                  Just your favorite people.
                </p>
                <button onClick={() => setDialog("help")}>
                  Get to know River
                  <ArrowRight size={13} />
                </button>
              </div>
              <div className="sidebar-bottom">
                <button
                  className="sidebar-help"
                  onClick={() => setDialog("help")}
                >
                  <CircleHelp size={17} />
                  <span>How to play</span>
                </button>
                <button
                  className="sidebar-help"
                  onClick={() => setDialog("profile")}
                  disabled={!profile}
                >
                  <Settings2 size={17} />
                  <span>Preferences</span>
                </button>
                <button
                  className="sidebar-profile"
                  onClick={() => setDialog("profile")}
                  disabled={!profile}
                >
                  <Avatar
                    name={profile?.name || "You"}
                    color={profile?.color}
                  />
                  <div>
                    <strong>{profile?.name || "Your seat"}</strong>
                    <span>Your personal club</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
              </div>
            </aside>
            {menuOpen && (
              <button
                className="menu-scrim"
                aria-label="Close navigation"
                onClick={() => setMenuOpen(false)}
              />
            )}
          </>
        ) : (
          <>
            <DirectionMobileHeader
              profile={profile}
              onHome={() => navigate("table")}
              onProfile={() => setDialog("profile")}
              onHelp={() => setDialog("help")}
            />
            <DirectionNavigation
              direction={direction}
              view={view}
              profile={profile}
              navigate={navigate}
              onCreate={() => setDialog("create")}
              onJoin={() => {
                setInviteCode("");
                setDialog("join");
              }}
              onProfile={() => setDialog("profile")}
              onHelp={() => setDialog("help")}
            />
          </>
        )}
        <div className="main-shell">
          {direction === "original" && (
            <header className="topbar">
              <div className="mobile-brand">
                <Logo />
              </div>
              <div className="topbar-breadcrumb">
                <span>Your club</span>
                <ChevronRight size={12} />
                <strong>{navigation.find((n) => n.key === view)?.label}</strong>
              </div>
              <div className="topbar-right">
                <AppearanceControl />
                <span className="private-pill">
                  <LockKeyhole size={12} />
                  Private by design
                </span>
                <button
                  className="topbar-avatar"
                  onClick={() => setDialog("profile")}
                  aria-label="Open your profile"
                  disabled={!profile}
                >
                  <Avatar
                    name={profile?.name || "You"}
                    color={profile?.color}
                  />
                </button>
                <button
                  className="icon-button mobile-menu"
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label="Open navigation"
                >
                  <Menu size={21} />
                </button>
              </div>
            </header>
          )}
          <main>
            {direction === "original" ? (
              <div className="page-header">
                <div>
                  <div className="greeting">
                    <span className="greeting-line" />
                    {greeting}
                    {profile ? `, ${profile.name}` : ""}
                  </div>
                  <h1>{titles[view][0]}</h1>
                  <p>{titles[view][1]}</p>
                </div>
                <div className="page-header-actions">
                  <button
                    className="button button-outline"
                    onClick={() => {
                      setInviteCode("");
                      setDialog("join");
                    }}
                    disabled={!profile}
                  >
                    <LinkIcon />
                    Join a table
                  </button>
                  <button
                    className="button button-dark"
                    onClick={() => setDialog("create")}
                    disabled={!profile}
                  >
                    <Plus size={16} />
                    Create a table
                  </button>
                </div>
              </div>
            ) : (
              <DirectionIntro
                direction={direction}
                view={view}
                profile={profile}
                room={room}
                onCreate={() => setDialog("create")}
                onJoin={() => {
                  setInviteCode("");
                  setDialog("join");
                }}
              />
            )}
            {connection !== "online" && room && (
              <div className="connection-banner" role="status">
                <WifiOff size={15} />
                {connection === "offline"
                  ? "You’re offline. Your seat and confirmed actions are saved."
                  : "Reconnecting. We’ll refresh the table before your next action."}
              </div>
            )}
            {bootError && (
              <div className="inline-error boot-error" role="alert">
                <span>{bootError}</span>
                <button onClick={() => void boot()}>
                  Try again
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
            {view === "table" ? (
              <>
                <div className="lounge-label">
                  <div>
                    <span className="eyebrow">AT THE TABLE</span>
                    {room?.practice && (
                      <span className="practice-label">
                        <span />
                        PRACTICE
                      </span>
                    )}
                  </div>
                  <button
                    className="text-button"
                    onClick={() => {
                      if (room && !room.practice) setDialog("invite");
                      else setDialog("create");
                    }}
                    disabled={!profile}
                  >
                    {room && !room.practice
                      ? "Invite a friend"
                      : "Bring your people"}
                    <ArrowUpRight size={14} />
                  </button>
                </div>
                <div className="game-grid">
                  {room && profile ? (
                    <PokerTable
                      room={room}
                      profile={profile}
                      busy={busy}
                      connected={connection === "online"}
                      onAction={safeAction}
                      onInvite={() => setDialog("invite")}
                      onDetails={() => setDialog("details")}
                      onAssistant={() => setAssistantOpen(true)}
                      onSound={() => void preference("sound")}
                      onNewRoom={() => setDialog("create")}
                    />
                  ) : (
                    <WelcomeTable
                      loading={booting}
                      onCreate={() => setDialog("create")}
                      disabled={!profile}
                    />
                  )}
                  <AssistantPanel
                    room={room}
                    profile={profile}
                    onToggle={() => void preference("assistant")}
                    onHistory={() => void review()}
                    mobileOpen={assistantOpen}
                    onClose={() => setAssistantOpen(false)}
                  />
                </div>
                <div className="lounge-footer">
                  <span>
                    <ShieldCheck size={13} />
                    Private rooms. Play chips only.
                  </span>
                  <span>
                    A good hand starts with good company.
                    <RiverMark size={13} />
                  </span>
                </div>
              </>
            ) : view === "rooms" ? (
              <div className="rooms-view page-enter">
                <div className="section-heading">
                  <div>
                    <h3>Your circle, around a table.</h3>
                    <p>Pick up where you left off or start something new.</p>
                  </div>
                  <div className="rooms-heading-actions">
                    <button className="text-button" onClick={() => { setInviteCode(""); setDialog("join"); }} disabled={!profile}>
                      Join with a code <ArrowUpRight size={15} />
                    </button>
                    <button className="text-button" onClick={() => void practice()}>
                      Practice on your own <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
                <div className="rooms-grid">
                  <button
                    className="new-room-card"
                    onClick={() => setDialog("create")}
                    disabled={!profile}
                  >
                    <span>
                      <Plus size={27} />
                    </span>
                    <h3>Set your own table.</h3>
                    <p>
                      A room for the people you like
                      <br />
                      to spend a little time with.
                    </p>
                    <strong>
                      Create a private table
                      <ArrowRight size={16} />
                    </strong>
                  </button>
                  {rooms
                    .filter((r) => r.status !== "finished")
                    .map((r) => (
                      <button
                        className="room-card"
                        key={r.id}
                        onClick={async () => {
                          try {
                            selectRoom(
                              (
                                await api<{ room: PublicRoom }>(
                                  `/api/rooms/${r.code}`,
                                )
                              ).room,
                            );
                            setView("table");
                          } catch (e) {
                            notify((e as Error).message);
                          }
                        }}
                      >
                        <div
                          className={`mini-table ${r.practice ? "practice" : ""}`}
                        >
                          <div>
                            <RiverMark size={30} />
                          </div>
                          {[0, 1, 2, 3].map((i) => (
                            <span
                              key={i}
                              style={{
                                transform: `rotate(${i * 90}deg) translateY(-70px)`,
                              }}
                            />
                          ))}
                        </div>
                        <div className="room-card-top">
                          <span className="eyebrow">
                            {r.practice ? "PRACTICE" : "PRIVATE TABLE"}
                          </span>
                          <span className="room-state">
                            <i />
                            {r.status === "lobby" ? "Taking seats" : "In play"}
                          </span>
                        </div>
                        <h3>{r.name}</h3>
                        <p>
                          {r.players} / {r.maxPlayers} seats · {r.smallBlind} /{" "}
                          {r.smallBlind * 2} blinds
                        </p>
                        <div className="room-card-bottom">
                          <span>{r.code}</span>
                          <strong>
                            Take your seat
                            <ArrowRight size={15} />
                          </strong>
                        </div>
                      </button>
                    ))}
                </div>
                {rooms.some((r) => r.status === "finished") && (
                  <button
                    className="text-button past-sessions-link"
                    onClick={() => setView("history")}
                  >
                    Find completed sessions in your history
                    <ArrowRight size={15} />
                  </button>
                )}
              </div>
            ) : view === "profile" && profile ? (
              <ProfileView
                profile={profile}
                onEdit={() => setDialog("profile")}
                onPractice={() => void practice()}
                notify={notify}
              />
            ) : view === "history" && profile ? (
              <HistoryView
                onSelect={(code) => void review(code)}
                onPlay={() => setView("table")}
              />
            ) : (
              <div className="content-loading">
                <Spinner />
                Making room for you…
              </div>
            )}
          </main>
        </div>
        <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
          {navigation.map((n) => (
            <button
              key={n.key}
              onClick={() => navigate(n.key)}
              className={view === n.key ? "active" : ""}
            >
              <n.icon size={19} />
              <span>
                {direction !== "original"
                  ? directionById(direction)!.navigation[
                      navigation.findIndex((item) => item.key === n.key)
                    ]
                  : n.key === "table"
                    ? "Lounge"
                    : n.key === "rooms"
                      ? "Tables"
                      : n.key === "profile"
                        ? "Profile"
                        : "History"}
              </span>
            </button>
          ))}
        </nav>
        {toast && (
          <div className="toast" role="status">
            <Check size={17} />
            <span>{toast}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setToast("")}
            >
              <X size={15} />
            </button>
          </div>
        )}
        {(dialog === "create" || dialog === "join") && (
          <RoomForm
            mode={dialog}
            busy={busy}
            initialCode={inviteCode}
            onClose={closeDialog}
            onCreate={create}
            onJoin={join}
          />
        )}
        {dialog === "invite" && room && (
          <InviteDialog
            room={room}
            onClose={closeDialog}
            onCopy={(value) => void copy(value)}
          />
        )}
        {dialog === "details" && room && profile && (
          <DetailsDialog
            room={room}
            profile={profile}
            busy={busy}
            onClose={closeDialog}
            onAction={onAction}
            onInvite={() => setDialog("invite")}
          />
        )}
        {dialog === "profile" && profile && (
          <ProfileDialog
            profile={profile}
            onClose={closeDialog}
            onSave={updateProfile}
            onCopy={(value) => void copy(value)}
            onRecover={async (key) => {
              const r = await api<{ profile: Profile }>(
                "/api/session",
                "POST",
                {
                  recoveryKey: key,
                },
              );
              setProfile(r.profile);
              roomRef.current = null;
              setRoom(null);
              setView("profile");
              bootstrapPromise = null;
              await refreshRooms();
              notify("Your profile and history are restored.");
            }}
          />
        )}
        {dialog === "history" && historyRoom && profile && (
          <HistoryDialog
            room={historyRoom}
            profile={profile}
            onClose={closeDialog}
          />
        )}
        {dialog === "help" && <HelpDialog onClose={closeDialog} />}
      </div>
    </DirectionProvider>
    </AppearanceContext.Provider>
  );
}

function LinkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
    >
      <path d="M10 13a5 5 0 0 0 7 .1l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.1l-3 3a5 5 0 0 0 7 7l2-2" />
    </svg>
  );
}
function WelcomeTable({
  loading,
  onCreate,
  disabled,
}: {
  loading: boolean;
  onCreate: () => void;
  disabled: boolean;
}) {
  return (
    <div className="welcome-table-panel">
      <div className="table-toolbar">
        <div className="table-title">
          <span className="table-icon">
            <LockKeyhole size={16} />
          </span>
          <div>
            <h2>The drawing room</h2>
            <span>Your next good night starts here</span>
          </div>
        </div>
      </div>
      <div className="welcome-empty-table">
        <div className="table-rail">
          <div className="table-felt">
            <div className="felt-stitch" />
          </div>
        </div>
        <div className="empty-table-message">
          <RiverMark size={45} />
          <h3>
            Good hands.
            <br />
            <em>Great company.</em>
          </h3>
          <span>
            {loading ? (
              <>
                <Spinner />
                Pulling up your chair…
              </>
            ) : (
              "Make a little time for your people."
            )}
          </span>
          {!loading && (
            <button
              className="table-start-button"
              onClick={onCreate}
              disabled={disabled}
            >
              Set your table
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="welcome-empty-footer">
        <LockKeyhole size={13} />A place for your people. Play chips only.
      </div>
    </div>
  );
}
function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="A better kind of poker night."
      eyebrow="WELCOME TO RIVER"
      onClose={onClose}
    >
      <p className="modal-description">
        A private place to play Texas Hold’em with people you know. Nothing to
        buy in. Nothing to cash out. Just good company and play chips.
      </p>
      <div className="help-steps">
        {[
          {
            number: "01",
            title: "Make room for your people.",
            text: "Create a table, choose your starting stacks and blinds, then share your six-character code or invitation link.",
          },
          {
            number: "02",
            title: "Take a seat. Ready up.",
            text: "When everyone is ready, the host deals. Each player gets two private cards. Five shared cards arrive over the flop, turn, and river.",
          },
          {
            number: "03",
            title: "Play your best five cards.",
            text: "Use any combination of your cards and the board to form the best five-card hand. Fold, check, call, or raise when it’s your turn.",
          },
          {
            number: "04",
            title: "Find a little perspective.",
            text: "The optional assistant estimates your equity and pot odds. Its calculations use visible cards and random opponent hands, so percentages are estimates.",
          },
        ].map((s) => (
          <div key={s.number}>
            <span>{s.number}</span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="hand-rank-guide">
        <span className="eyebrow">STRONGEST TO WEAKEST</span>
        <p>
          Straight flush · Four of a kind · Full house · Flush · Straight ·
          Three of a kind · Two pair · One pair · High card
        </p>
      </div>
      <p className="help-keyboard">
        At the table: <kbd>F</kbd> Fold <kbd>K</kbd> Check <kbd>C</kbd> Call{" "}
        <kbd>R</kbd> Raise. If your timer expires, you check when possible and
        fold otherwise.
      </p>
      <button className="button button-dark full-width" onClick={onClose}>
        See you at the table
        <ArrowRight size={16} />
      </button>
    </Modal>
  );
}
