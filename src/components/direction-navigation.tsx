"use client";
import {
  ArrowUpRight,
  CircleHelp,
  History,
  House,
  LayoutGrid,
  Plus,
  Settings2,
  UserRound,
} from "lucide-react";
import type { Profile, PublicRoom } from "@/lib/types";
import {
  directionById,
  type DirectionId,
  type ProductView,
} from "@/lib/design-directions";
import { AppearanceControl } from "./appearance-control";
import { Avatar, RiverMark } from "./primitives";

const links = [
  { key: "table", icon: House },
  { key: "rooms", icon: LayoutGrid },
  { key: "profile", icon: UserRound },
  { key: "history", icon: History },
] as const;
type Props = {
  direction: DirectionId;
  view: ProductView;
  profile: Profile | null;
  navigate: (v: ProductView) => void;
  onCreate: () => void;
  onJoin: () => void;
  onProfile: () => void;
  onHelp: () => void;
};

export function DirectionMobileHeader({
  profile,
  onHome,
  onProfile,
  onHelp,
}: {
  profile: Profile | null;
  onHome: () => void;
  onProfile: () => void;
  onHelp: () => void;
}) {
  return (
    <header className="direction-mobile-header">
      <button onClick={onHome} aria-label="River lounge">
        <RiverMark size={18} />
        river.
      </button>
      <div className="direction-mobile-actions">
        <AppearanceControl />
        <button onClick={onHelp} aria-label="How to play">
          <CircleHelp size={19} />
        </button>
        <button
          onClick={onProfile}
          aria-label="Open your profile"
          disabled={!profile}
        >
          <Avatar name={profile?.name || "You"} color={profile?.color} />
        </button>
      </div>
    </header>
  );
}

export function DirectionNavigation(props: Props) {
  const {
    direction,
    view,
    profile,
    navigate,
    onCreate,
    onJoin,
    onProfile,
    onHelp,
  } = props;
  const config = directionById(direction)!;
  const nav = (
    <nav className="direction-nav-links" aria-label="Main navigation">
      {links.map((n, i) => (
        <button
          key={n.key}
          onClick={() => navigate(n.key)}
          className={view === n.key ? "active" : ""}
          aria-current={view === n.key ? "page" : undefined}
        >
          <span className="nav-index">0{i + 1}</span>
          <n.icon size={19} />
          <span className="nav-name">{config.navigation[i]}</span>
          <span className="nav-arrow">↗</span>
        </button>
      ))}
    </nav>
  );
  const member = (
    <button
      className="direction-member"
      onClick={onProfile}
      disabled={!profile}
      aria-label="Open your profile"
    >
      <Avatar name={profile?.name || "You"} color={profile?.color} />
      <span>
        <strong>{profile?.name || "Your seat"}</strong>
        <small>
          {direction === "salon" ? "YOUR PRIVATE CLUB" : "PERSONAL PROFILE"}
        </small>
      </span>
      <Settings2 size={16} />
    </button>
  );
  const actions = (
    <div className="direction-nav-actions">
      <AppearanceControl />
      {direction === "folio" && (
        <button className="folio-play-help" onClick={onHelp} aria-label="How to play">
          <CircleHelp size={17} />
        </button>
      )}
      <button onClick={onJoin} disabled={!profile}>
        Join a room <ArrowUpRight size={14} />
      </button>
      <button
        className="direction-create"
        onClick={onCreate}
        disabled={!profile}
      >
        <Plus size={16} />
        New table
      </button>
    </div>
  );
  if (direction === "royale") return <header className="direction-navigation royale-navigation">
    <div className="royale-house-line"><span>PRIVATE COMPANY · EXCEPTIONAL PLAY</span><button onClick={onHelp}>The house rules ↗</button></div>
    <div className="royale-navigation-main"><button className="royale-wordmark" onClick={() => navigate("table")} aria-label="River lounge"><span className="royale-crest">♛</span><span>RIVER<small>THE ROYALE CLUB</small></span></button>{nav}<div className="royale-navigation-end">{member}{actions}</div></div>
  </header>;
  if (direction === "salon")
    return (
      <aside className="direction-navigation salon-navigation">
        <button
          className="direction-wordmark"
          onClick={() => navigate("table")}
          aria-label="River lounge"
        >
          <RiverMark size={28} />
          <span>
            river<span>.</span>
          </span>
        </button>
        <p className="navigation-caption">A PRIVATE POKER CLUB</p>
        {nav}
        <div className="salon-invitation">
          <RiverMark size={34} />
          <p>
            Good hands.
            <br />
            <em>Better company.</em>
          </p>
          <span>
            A little time,
            <br />
            exceptionally well spent.
          </span>
        </div>
        {actions}
        <button className="direction-help" onClick={onHelp}>
          <CircleHelp size={15} />
          The house rules
        </button>
        {member}
      </aside>
    );
  if (direction === "folio")
    return (
      <header className="direction-navigation folio-navigation">
        <div className="folio-publication">
          <span>AN INDEPENDENT POKER CLUB</span>
          <span>PLAY CHIPS · PRIVATE COMPANY</span>
          <button onClick={onHelp}>The house rules ↗</button>
        </div>
        <div className="folio-masthead">
          <span>
            Good company.
            <br />
            Excellent hands.
          </span>
          <button className="folio-brand" onClick={() => navigate("table")} aria-label="River lounge">
            river<span>.</span>
          </button>
          {member}
        </div>
        <div className="folio-navigation-line">
          {nav}
          {actions}
        </div>
      </header>
    );
  if (direction === "afterhours")
    return (
      <header className="direction-navigation cinema-navigation">
        <button
          className="direction-wordmark"
          onClick={() => navigate("table")}
          aria-label="River lounge"
        >
          <RiverMark size={26} />
          <span>RIVER</span>
        </button>
        {nav}
        <div className="cinema-menu-end">
          <button onClick={onHelp} aria-label="How to play">
            <CircleHelp size={18} />
          </button>
          {member}
          {actions}
        </div>
      </header>
    );
  if (direction === "fieldwork")
    return (
      <>
        <aside className="direction-navigation fieldwork-navigation">
          <button
            className="fieldword"
            onClick={() => navigate("table")}
            aria-label="River lounge"
          >
            R<span>↘</span>
          </button>
          {nav}
          <span className="field-strip-label">PRIVATE PLAY / RIVER</span>
          <button
            className="direction-help"
            onClick={onHelp}
            aria-label="How to play"
          >
            <CircleHelp size={20} />
          </button>
          {member}
        </aside>
        <div className="fieldwork-utility">
          <span>POKER / IN GOOD COMPANY</span>
          {actions}
        </div>
      </>
    );
  return (
    <aside className="direction-navigation vector-navigation">
      <button
        className="direction-wordmark"
        onClick={() => navigate("table")}
        aria-label="River lounge"
      >
        <span className="vector-brand-icon">r</span>
        <span>
          river<span>.</span>
        </span>
      </button>
      <span className="navigation-caption">YOUR WORKSPACE</span>
      {nav}
      {actions}
      <div className="vector-security">
        <span />
        PRIVATE · PLAY CHIPS ONLY
      </div>
      <button className="direction-help" onClick={onHelp}>
        <CircleHelp size={15} />
        How to play
      </button>
      {member}
    </aside>
  );
}

export function DirectionIntro({
  direction,
  view,
  profile,
  room,
  onCreate,
  onJoin,
}: {
  direction: DirectionId;
  view: ProductView;
  profile: Profile | null;
  room: PublicRoom | null;
  onCreate: () => void;
  onJoin: () => void;
}) {
  const config = directionById(direction)!;
  return (
    <div className={`direction-intro intro-${view}`}>
      <div className="direction-intro-index">
        <span>
          {direction === "folio"
            ? "THE RIVER EDITION"
            : direction === "afterhours"
              ? "PRIVATE SESSION"
              : direction === "salon"
                ? "WELCOME TO THE CLUB"
                : direction === "fieldwork"
                  ? "RIVER / SYSTEM 01"
                  : "PRIVATE POKER"}
        </span>
        <strong>
          {direction === "fieldwork"
            ? `0${links.findIndex((l) => l.key === view) + 1}`
            : direction === "folio"
              ? "A good night, in the making."
              : profile?.name || "Your seat"}
        </strong>
      </div>
      <div className="direction-intro-title">
        <h1>
          {direction === "vector" && view === "table"
            ? room?.name || config.titles[view]
            : config.titles[view]}
        </h1>
        <p>{config.subtitles[view]}</p>
      </div>
      <div className="direction-intro-side">
        <span>
          {room && view === "table"
            ? `${room.players.length} PLAYERS / ${room.practice ? "PRACTICE" : "PRIVATE"}`
            : "YOUR PERSONAL CLUB"}
        </span>
        <span>
          {room && view === "table"
            ? `${room.settings.smallBlind} / ${room.settings.smallBlind * 2} BLINDS`
            : "PLAY CHIPS ONLY"}
        </span>
        {direction === "salon" && (
          <button onClick={onCreate} disabled={!profile}>
            Host an evening <ArrowUpRight size={14} />
          </button>
        )}
        {direction === "vector" && (
          <div>
            <button onClick={onJoin} disabled={!profile}>
              Join a room
            </button>
            <button onClick={onCreate} disabled={!profile}>
              <Plus size={14} />
              New table
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
