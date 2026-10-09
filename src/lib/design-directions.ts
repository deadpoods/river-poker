export type DirectionId =
  | "salon"
  | "folio"
  | "vector"
  | "afterhours"
  | "fieldwork"
  | "royale";
export type DesignDirection = DirectionId | "original";
export type ProductView = "table" | "rooms" | "profile" | "history";

export const directions = [
  {
    id: "salon",
    number: "01",
    name: "Salon",
    category: "Private Club",
    line: "An evening, exceptionally well spent.",
    description:
      "A quiet social ritual. A circular table, a membership rail, intimate portraits and a discreet companion for the mathematics.",
    idea: "People first. The table is a place, not a dashboard.",
    geometry: "Round table · radial seats · restrained controls",
    strengths: ["Intimacy", "Material richness", "Social clarity"],
    risk: "The generous spacing makes dense eight-player rooms less efficient.",
    titles: {
      table: "The evening is yours.",
      rooms: "A room for your circle.",
      profile: "A player, in good company.",
      history: "Evenings worth remembering.",
    },
    subtitles: {
      table: "Take your time. Enjoy the company.",
      rooms: "A private invitation. A familiar face. A good night.",
      profile: "Your membership and a considered record of your play.",
      history: "Your guestbook of hands, people and small victories.",
    },
    navigation: ["The salon", "Your rooms", "Membership", "Guestbook"],
    assistant: "Your companion.",
  },
  {
    id: "folio",
    number: "02",
    name: "Folio",
    category: "Modern Editorial",
    line: "The art of a good hand.",
    description:
      "Poker as contemporary culture. A publication masthead, a wide graphic playing field, a cast of players and a marginal column of insight.",
    idea: "The session is a story. Every hand is a new page.",
    geometry: "Horizontal cast · flat playing field · editorial margins",
    strengths: [
      "Distinct identity",
      "Readable hierarchy",
      "Cultural character",
    ],
    risk: "The masthead needs to recede during play, especially on smaller screens.",
    titles: {
      table: "The art of a good hand.",
      rooms: "An open invitation.",
      profile: "Portrait of a player.",
      history: "Notes from the table.",
    },
    subtitles: {
      table: "A private game. An excellent cast. An evening in the making.",
      rooms: "Choose a setting. Bring your own company.",
      profile: "The numbers tell a story. Yours is still being written.",
      history: "Every session has its moments. Revisit yours.",
    },
    navigation: ["The table", "Rooms", "Player", "The archive"],
    assistant: "In the margins.",
  },
  {
    id: "vector",
    number: "03",
    name: "Vector",
    category: "Neo-Fintech",
    line: "Clarity at every decision.",
    description:
      "A precise workspace for a social game. A compact rail, rectangular board, participant rows, aligned chip values and an explicit decision panel.",
    idea: "Reduce the cost of understanding the next move.",
    geometry: "Rectangular arena · participant panels · decision console",
    strengths: ["Action clarity", "Data legibility", "Mobile efficiency"],
    risk: "Its operational precision can feel more like a tool than a night with friends.",
    titles: {
      table: "Your table.",
      rooms: "Room overview.",
      profile: "Player overview.",
      history: "Session records.",
    },
    subtitles: {
      table: "The state of play, clearly presented.",
      rooms: "Your active rooms, capacity and settings in one place.",
      profile: "A transparent record of decisions and outcomes.",
      history: "Review completed hands and reconcile every chip.",
    },
    navigation: ["Play", "Rooms", "Overview", "Records"],
    assistant: "Decision insight",
  },
  {
    id: "afterhours",
    number: "04",
    name: "Afterhours",
    category: "Cinematic Table",
    line: "Let the rest of the world fade.",
    description:
      "A full-stage experience. Selective light, a deep elliptical table, oversized cards, floating player portraits and a small heads-up display.",
    idea: "The room becomes the interface. The hand becomes the moment.",
    geometry: "Immersive stage · floating portraits · game HUD",
    strengths: ["Atmosphere", "Presence", "Memorable play"],
    risk: "Atmosphere must never weaken card contrast or hide secondary controls.",
    titles: {
      table: "Make your move.",
      rooms: "Choose your scene.",
      profile: "The player behind the hand.",
      history: "The nights. The moments.",
    },
    subtitles: {
      table: "Just the table. Just your people. Just this hand.",
      rooms: "Step inside a private game.",
      profile: "Your decisions leave a trace.",
      history: "Revisit the hands that changed the night.",
    },
    navigation: ["Play", "The rooms", "Player", "Revisit"],
    assistant: "The read",
  },
  {
    id: "fieldwork",
    number: "05",
    name: "Fieldwork",
    category: "Experimental Minimal",
    line: "Less theatre. More play.",
    description:
      "A graphic instrument for poker. An indexed player roster, an open board plane, oversized rank-and-suit cards and a modular action strip.",
    idea: "Keep the relationships. Remove the furniture.",
    geometry: "Roster + board · symbolic chips · modular controls",
    strengths: ["Originality", "Graphic economy", "Scannable structure"],
    risk: "The abstract seating system needs orientation cues for people learning poker.",
    titles: {
      table: "Play / together.",
      rooms: "Room / index.",
      profile: "Player / record.",
      history: "Hand / archive.",
    },
    subtitles: {
      table: "A game between people. Everything else is optional.",
      rooms: "Private spaces, indexed for easy return.",
      profile: "A set of decisions. A changing pattern.",
      history: "A chronological record of what happened.",
    },
    navigation: ["Play", "Rooms", "Player", "Archive"],
    assistant: "Probability / notes",
  },
  {
    id: "royale", number: "06", name: "Royale", category: "Grand Casino",
    line: "The grand art of a good evening.",
    description: "A contemporary grand casino. An emerald baize arena, lacquered rail, brass inlays, engraved cards and a ceremonial house navigation.",
    idea: "Poker as an occasion. Material richness with modern clarity.",
    geometry: "Grand oval · brass seat medallions · ceremonial result ribbon",
    strengths: ["Casino character", "Premium materials", "Sense of occasion"],
    risk: "Ornament must stay outside the decision hierarchy and leave room for eight players.",
    titles: { table: "An exceptional evening.", rooms: "The private gaming rooms.", profile: "The character of your game.", history: "The house ledger." },
    subtitles: { table: "Take your seat. Make it a night to remember.", rooms: "A room of your own. An invitation to your circle.", profile: "Your playing fingerprint, considered in every detail.", history: "A record of the hands that made the evening." },
    navigation: ["The table", "Gaming rooms", "Membership", "The ledger"],
    assistant: "The house perspective",
  },
] as const;

export function directionById(id: string | null | undefined) {
  return directions.find((d) => d.id === id);
}

/** Visual placement only. Betting order and dealer authority remain in the shared engine. */
export function seatPlacement(
  direction: DesignDirection,
  index: number,
  count: number,
) {
  const angle = (index / count) * Math.PI * 2;
  let x = 50 - Math.sin(angle) * 38,
    y = 49 + Math.cos(angle) * 38;
  let mx = x,
    my = y;
  if (direction === "salon") {
    x = 50 - Math.sin(angle) * 35;
    y = 48 + Math.cos(angle) * 40;
    mx = 50 - Math.sin(angle) * 38;
    my = 47 + Math.cos(angle) * 39;
  } else if (direction === "folio") {
    x = index === 0 ? 20 : 8 + ((index - 1) / Math.max(1, count - 2)) * 84;
    y = index === 0 ? 83 : 19;
    const columns = count > 6 ? 4 : 3;
    mx =
      index === 0
        ? 23
        : count <= 3
          ? 25 + (index - 1) * 50
          : 12 + ((index - 1) % columns) * (76 / (columns - 1));
    my = index === 0 ? 86 : 12 + Math.floor((index - 1) / columns) * 22;
  } else if (direction === "vector") {
    const left = Math.ceil((count - 1) / 2);
    x = index === 0 ? 50 : index <= left ? 13 : 87;
    y =
      index === 0
        ? 88
        : 24 +
          (index <= left ? index - 1 : index - left - 1) *
            (53 / Math.max(2, left - 1));
    const columns = count > 6 ? 4 : 3;
    mx = index === 0 ? 50 : 12 + ((index - 1) % columns) * (76 / (columns - 1));
    my = index === 0 ? 87 : 12 + Math.floor((index - 1) / columns) * 19;
  } else if (direction === "afterhours" || direction === "royale") {
    x = 50 - Math.sin(angle) * 39;
    y = 49 + Math.cos(angle) * 39;
    mx = 50 - Math.sin(angle) * 38;
    my = 46 + Math.cos(angle) * 38;
  } else if (direction === "fieldwork") {
    x = index === 0 ? 67 : 15;
    y = index === 0 ? 84 : 13 + (index - 1) * (66 / Math.max(4, count - 2));
    const columns = count > 6 ? 4 : 3;
    mx = index === 0 ? 50 : 12 + ((index - 1) % columns) * (76 / (columns - 1));
    my = index === 0 ? 87 : 9 + Math.floor((index - 1) / columns) * 17;
  }
  return { x, y, mx, my };
}
