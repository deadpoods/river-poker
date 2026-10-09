# River: six directions for a modern poker night

Six working interfaces are available in the [design gallery](https://river-private-poker.vercel.app/directions). Switch between them during the same session to compare the same people, hand, pot, controls and private information. The gallery does not select a permanent direction. The current River design remains the default.

The design brief is a private, social browser poker platform: serious about clarity and fair play, relaxed about presentation, and played with virtual chips. The table and cards now carry substantially more visual weight. Personal cards are larger than before, introductory content recedes during play, and the phone layouts keep the betting controls close to the hand.

## Assessment

| Question | Strongest direction | Reason and tradeoff |
|---|---|---|
| Most premium | **Royale / Salon** | Royale delivers a grand casino occasion through an emerald oval, lacquered rail, brass inlays and ceremonial navigation. Salon is the quieter private-club expression. |
| Strongest usability | **Vector** | Navigation, participant values, board and decision controls occupy predictable regions. It has the least expressive social character. |
| Most original | **Fieldwork** | The indexed roster and open board feel like a purpose-built graphic instrument. Its abstract seating requires more orientation than a traditional table. |
| Best on mobile | **Vector** | Compact participant groups and direct controls accommodate large personal cards well. Folio is a close second, with a stronger identity but more editorial structure to manage. |
| Best modern reinterpretation of poker | **Folio** | It treats poker as contemporary social culture. The cast, flat playing field and margin of insight make a recognisable product without casino styling. |
| Most immersive | **Afterhours** | Depth, selective light and a restrained game HUD make the hand feel consequential. Dark surfaces demand careful contrast checks. |
| Recommended to pursue | **Folio** | It offers the strongest balance of distinct identity, social warmth, clear play and room to grow. |

These are expert design judgments from the implemented screens and interactions, not results from a user study. “Best” refers to this product brief, not a universal ranking.

## 01 — Salon / Private Club

[Explore Salon](https://river-private-poker.vercel.app/directions?direction=salon)

**The idea:** an evening, exceptionally well spent. A place for familiar people, with a discreet mathematical companion.

| Dimension | Direction |
|---|---|
| Table composition | A substantial round table makes the group the centre of the interface. Its edge and felt suggest material without decorative casino props. |
| Navigation | A fixed membership rail with quiet text links, a small active marker and invitations below. |
| Lobby | Generous room invitations and circular table previews; more like choosing a room in a club than scanning a dashboard. |
| Player seats | Radial portraits or initials, separate nameplates and clear dealer/turn indicators. |
| Cards | Warm paper, familiar rank-and-suit hierarchy and a large personal hand. |
| Chips | Small gold-toned stacks next to exact chip values; the numbers remain authoritative. |
| Typography | Cormorant Garamond establishes warmth; Manrope handles supporting information and controls. |
| Controls | Restrained outlined actions and a strong primary action in a separate dock. |
| Statistics | Open rows of figures, light rules and generous spacing around the chart. |
| Probability assistant | “Your companion”: a quiet ring, useful context and a column that stays secondary to the table. |
| Profile | A membership portrait and personal record rather than a dense dashboard. |
| Match history | A guestbook of evenings: names, people and outcomes in spacious rows. |
| Motion | A short, soft fade for page changes; familiar dealing cues stay subordinate to the hand. |
| Transitions | Deliberate continuity between club spaces; no theatrical page movement. |
| Spatial hierarchy | People → shared cards → personal hand and action → supporting insight. |
| Mobile | A portrait oval preserves the social seating relationship; the large personal cards sit above the action dock. |

**Critical view:** this is the strongest expression of premium hospitality, but its circle consumes space. Eight-person rooms work, yet the roster-based alternatives are more efficient on phones. Preserve the calm material treatment; resist adding ornamental badges, excessive leather effects or more club language than the task needs.

## 02 — Folio / Modern Editorial

[Explore Folio](https://river-private-poker.vercel.app/directions?direction=folio)

**The idea:** the art of a good hand. Each session is a story, and every hand turns a page.

| Dimension | Direction |
|---|---|
| Table composition | A broad, flat graphic playing field replaces the conventional oval. The community board and personal hand occupy separate zones. |
| Navigation | A publication masthead and ruled horizontal navigation, with the masthead compacted automatically during play. |
| Lobby | Unequal editorial columns, broad room previews and an invitation panel; large room names carry the hierarchy. |
| Player seats | A horizontal cast on desktop, arranged in a compact grid on mobile. Dealer and active-player markers preserve orientation. |
| Cards | Large paper rectangles with restrained red suits, graphic backs and a small offset shadow. |
| Chips | A red dot and crisp values for the pot; small physical stacks for wagers. |
| Typography | Instrument Serif gives headlines and key figures a recognisable editorial voice; DM Sans keeps reading and actions clear. |
| Controls | A ruled action strip with contiguous Fold, Call/Check and Raise/Bet buttons. |
| Statistics | Large typeset figures, open columns and editorial rules instead of repeated dashboard containers. |
| Probability assistant | “In the margins”: an oversized equity figure, paired facts and plain-language interpretation. |
| Profile | A portrait of the player with a large name and a progressively revealed statistical story. |
| Match history | Session stories in editorial columns, with a complete shared hand record behind each entry. |
| Motion | Brief page-like arrival and card appearance; restrained movement supports a change of state. |
| Transitions | The publication chrome contracts when play begins, making room for the larger table. |
| Spatial hierarchy | Cast → playing field → hand and decision; insight remains a genuine margin. |
| Mobile | The full masthead becomes a compact wordmark. Players form two rows, and the large hand sits in the lower left of the playing field. |

**Critical view:** the strongest identity for River, provided the editorial framing knows when to recede. The compact play header is essential. The horizontal cast makes turn order less immediately familiar than a radial table, so the dealer and active-player cues must remain explicit. Preserve the composition and distinctive typography; apply Vector’s precision to the small numbers and betting states.

## 03 — Vector / Neo-Fintech

[Explore Vector](https://river-private-poker.vercel.app/directions?direction=vector)

**The idea:** clarity at every decision. Reduce the effort required to understand the next move.

| Dimension | Direction |
|---|---|
| Table composition | A rectangular arena, with participants in side panels and the board centred between them. |
| Navigation | A compact workspace rail with familiar icons, explicit labels and stable destinations. |
| Lobby | A concise room ledger: room, capacity, blinds, invite code and return action in aligned rows. |
| Player seats | Small, structured participant panels; monograms replace decorative portraits, and exact stacks remain easy to compare. |
| Cards | Clear white faces, large rank/pip hierarchy and an unrotated personal pair. |
| Chips | Wagers become compact markers with aligned numerical values. |
| Typography | DM Sans for navigation and explanation; IBM Plex Mono for equity and numerical comparisons. |
| Controls | A distinct decision console with clear primary actions, visible countdown and explicit raise presets. |
| Statistics | A conventional summary strip, aligned figures and a chart area designed for quick review. |
| Probability assistant | “Decision insight”: a large aligned percentage, linear progress treatment and structured pot-odds facts. |
| Profile | A compact player overview with statistics close to the identity and filters. |
| Match history | Scannable session records, with information aligned across rows. |
| Motion | Short state fades; feedback arrives quickly and avoids decorative travel. |
| Transitions | Stable panels maintain orientation when navigating or switching game states. |
| Spatial hierarchy | Current state → legal decision → numerical context → broader record. |
| Mobile | Participant groups move above the board; the personal pair is centred directly over the accessible action area. |

**Critical view:** the clearest utility and the strongest mobile baseline. Its weakness is memorability: the workspace could belong to a number of precise tools. Preserve its numerical discipline and decision hierarchy, but do not let poker become a financial terminal. This is the best source of interaction refinements for the recommended Folio direction.

## 04 — Afterhours / Cinematic Table

[Explore Afterhours](https://river-private-poker.vercel.app/directions?direction=afterhours)

**The idea:** let the rest of the world fade. The room becomes the interface, and the hand becomes the moment.

| Dimension | Direction |
|---|---|
| Table composition | A deep elliptical stage, selective light and a large shared board. Introductory content disappears during play. |
| Navigation | A small horizontal game HUD with a restrained wordmark, destinations and player access. |
| Lobby | Scene-like room panels, with dark table previews and large room titles. |
| Player seats | Floating portraits or initials, firm nameplates and visible dealer/turn cues around the stage. |
| Cards | Large, high-contrast ivory cards with strong suit symbols, graphic backs and a prominent personal hand. |
| Chips | Small illuminated stacks, with numerical totals clearly separated from the atmosphere. |
| Typography | Bebas Neue gives short headings and pot values presence; Manrope carries readable supporting text. |
| Controls | A dark control dock with contrasting Check/Call and Bet/Raise actions. Fold has its own legible outlined treatment. |
| Statistics | Bold figures and dark analytical panels preserve the stage’s visual language. |
| Probability assistant | “The read”: a lit ring, compact HUD facts and a readable context panel. |
| Profile | A player identity with larger portrait emphasis and a dark record of outcomes. |
| Match history | Scene-like session panels, with detailed hand review using clear light cards. |
| Motion | A brief card lift and fade creates presence without delaying actions. |
| Transitions | Short fades between states, with the table remaining the visual anchor. |
| Spatial hierarchy | Cards and pot → active player → personal hand and control dock → quiet HUD. |
| Mobile | A tall immersive table, persistent clear cards and a compact lower action dock. |

**Critical view:** the most memorable game atmosphere, and a strong option if River becomes more entertainment-led. The tradeoff is constant contrast vigilance: disabled controls, form labels and historical cards must remain readable. The stage uses lightweight CSS/SVG rather than a heavy 3D scene. Preserve the focus and depth; avoid ambient motion that competes with decisions.

## 05 — Fieldwork / Experimental Minimal

[Explore Fieldwork](https://river-private-poker.vercel.app/directions?direction=fieldwork)

**The idea:** less theatre, more play. Keep the relationships and remove the furniture.

| Dimension | Direction |
|---|---|
| Table composition | An indexed player roster on the left and an open board plane on the right. The furniture metaphor is replaced by relationships and rules. |
| Navigation | A slim numbered rail and a small utility line, with clear labels for each indexed destination. |
| Lobby | A room index in a ruled grid, with an unmistakable create-room block. |
| Player seats | Numbered rows with player, exact stack and private-card indicators; an active rule makes the current actor stand out. |
| Cards | Large central rank-and-suit symbols; conventional corner repetition is removed. |
| Chips | Symbolic circles and exact values replace physical stacks. |
| Typography | DM Sans creates the main graphic hierarchy; IBM Plex Mono reinforces the index and record. |
| Controls | A modular, contiguous action strip reads like an instrument panel. |
| Statistics | A vertical ledger beside the chart, rather than a horizontal set of summary cards. |
| Probability assistant | “Probability / notes”: a graphic number, ruled context and a linear/barcode-like measure. |
| Profile | A player record with indexed sections and open analytical space. |
| Match history | A chronological archive with strong rules and compact aligned records. |
| Motion | Immediate card appearance and very brief state fades. |
| Transitions | Crisp changes of content with little movement; the grid remains stable. |
| Spatial hierarchy | Roster → shared board → personal cards → modular action; the page behaves like a graphic system. |
| Mobile | The roster becomes a compact grid above the board, using four columns in seven/eight-player rooms. |

**Critical view:** the most original system, and the strongest design experiment. Its restraint is meaningful because it changes the composition, not merely the decoration. It is less welcoming to someone who uses physical seating to understand poker. Preserve the indexed clarity and oversized rank/suit cards; test orientation with new players before choosing it for the main product.

## Reference principles

Real rendered interfaces were inspected. The following transfers are design interpretations, not claims that River reproduces those products.

| Reference | Observed principle | Transfer to River |
|---|---|---|
| [Aman](https://www.aman.com/) | Quiet navigation, reserved typography and a deliberate relationship between spaces. | Salon’s hospitality and restraint; property imagery and destination branding stay specific to Aman. |
| [Monocle](https://monocle.com/) | A strong masthead, ruled navigation and clear editorial grouping. | Folio’s hierarchy and rhythm; its layouts and poker interactions are independently designed. |
| [Linear’s UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui) | A clear relationship between application chrome, workspace and information density. | Vector’s stable regions and numerical discipline; no copied product components or branding. |
| [Playdead / INSIDE](https://playdead.com/games/inside/) | Selective light, atmosphere and a small amount of strong typography. | Afterhours’ focus and depth; the game’s imagery and horror identity do not transfer. |
| [Teenage Engineering](https://teenage.engineering/products/op-1) | Graphic instrument logic and visible relationships between controls and functions. | Fieldwork’s index, symbolic values and modular control language. |

## Critic’s review and next decision

The three most consequential improvements made during review were increasing the actual rendered card sizes, reducing competing chrome during play, and resolving collisions between the participant roster, pot, personal cards and controls on mobile. The review also corrected dark-interface control contrast, small history-card ranks, oversized numerical decoration in miniature cards, and inconsistent profile/history treatments.

Removing the River name still leaves a distinct composition in each: a social circle, a publication, a workspace, a stage, and a graphic instrument. Vector is the least distinctive under that test, but its familiar structure is useful to this brief.

**Pursue Folio next.** Refine that one language without averaging the six: preserve its cast, flat field, large cards, editorial margins and social voice. Improve decision density using Vector’s alignment, timer treatment and control clarity. The next evaluation should involve real players completing an invitation, their first hand and a history review on desktop and mobile. Check turn-order understanding, time to find the legal action, mis-taps, card recognition and return to the same room. No user-test findings are asserted here.

## Implementation and validation

All six use the same application state, room subscriptions, session identity, profile preferences, game engine, legal-action calculation, private-card projection, database, probability endpoint and history/export system. Only visual placement, navigation composition, language and presentation vary. No hand is restarted when switching between directions.

The initial five-direction exploration preserved all shared game, server, authentication and probability files. The refinement adds personal playstyle aggregation to the statistics response; game rules, authentication, private-card projection, multiplayer commands and probability calculations remain shared and unchanged. The original 20 automated checks and six feedback/statistics checks cover this release. Switching directions preserves the same visible hand.

Real local six-person practice play and an eight-person multiplayer hand were inspected, together with every direction’s table, rooms, profile and session history. Phone layouts were checked at 390 × 844, including the expanded betting panel and the assistant’s open/close and Escape behaviour. The enlarged current design was also checked on a smaller laptop. System and profile reduced-motion settings remain respected.

Screenshots show real local test play with sample player names, not invented equity or chip data. Desktop previews and phone captures are saved in the companion `outputs/directions` folder; the desktop previews also appear in the live gallery. Visual rankings remain a design assessment; a formal accessibility audit and a player usability study have not been completed.


## 06 / Royale — Grand Casino

A contemporary interpretation of a grand gaming room. The reference is an occasion with architecture and material detail, interpreted as original interface design rather than a copy of a casino’s branding.

| Dimension | Royale’s treatment |
|---|---|
| Table composition | Grand emerald oval with a layered lacquered rail and brass inlays. The board remains large and central. |
| Navigation | A formal house line, a crest and wordmark, and a horizontal ceremonial navigation. |
| Lobby | Gaming-room invitations with a double brass rule and a baize preview. |
| Player seats | Portrait medallions, engraved nameplates and an explicit dealer marker. Eight-seat phone positions leave the board clear. |
| Cards | Ivory stock, fine engraving, serif ranks, deep green black suits and muted vermilion red suits. |
| Chips | Brass tokens with pale edge detail and a short wager arrival. |
| Typography | Cormorant Garamond for display and engraved values; DM Sans for instructions and controls. |
| Controls | Direct green check/call controls, brass betting controls and a clearly separate turn banner. |
| Statistics | A personal playing fingerprint, measured bars and traditional numerical records, presented like a membership ledger. |
| Probability assistant | The house perspective in a framed margin, preserving the same calculation and uncertainty explanations. |
| Profile | A double-ruled membership card, playstyle metrics and mode filters. |
| Match history | A house ledger with brass dividers and shared hand review/export. |
| Motion | Cards land and reveal, wagers arrive, pots pulse on change and a result ribbon celebrates the hand. |
| Transitions | Restrained entrances, tactile hover responses and a strong two-note turn cue. |
| Spatial hierarchy | The game is the main attraction; house details frame the decision rather than occupy it. |
| Mobile layout | A compact house header, a tall oval, large private cards, separate results and direct bottom controls. |

**Critical view:** Royale is the strongest literal casino identity and shares the premium category with Salon. It is deliberately more ceremonial, so the title recedes during play. Its ornamental rail is confined to the table perimeter. Vector still offers the clearest operational baseline; Folio remains the recommendation for a distinctly modern social poker identity. All six remain available. This is expert judgment, not a claim of user testing.

## Refinement / game feedback and appearance

- Replaced three quiet generic tones with 20 distinct sound cues. One reusable audio context is resumed synchronously from pointer and click/key gestures, before asynchronous room requests. Current turn alerts may be queued briefly; old hand events and duplicate state updates do not replay. Mute stops already scheduled sources. Volume is remembered on the device.
- Table-header sound settings expose previews for turns, cards, chips, all-in and victory, plus actual browser audio readiness. The game remains usable when browser audio is blocked or unavailable.
- Every new turn receives a new visual announcement and seat highlight. Your turn has a distinctive cue, an explicit call/check prompt, a countdown and an eight-second warning.
- Folded and eliminated seats become darker and desaturated. A live all-in player remains bright until settlement establishes that they are out of chips.
- Removed the small in-table winner label. Results now occupy a separate, large ribbon beneath the playing surface, with the actual personal award and a split-pot label. The completed-hand dock returns to normal flow so it cannot obscure results.
- Added card reveals, wager entrances, pot updates, action bubbles, result sparks, control hover/tap responses and chart entrances. System and profile reduced-motion preferences disable these effects.
- Added a remembered Day/Night option for Original, Salon, Folio, Vector, Fieldwork and Royale. Afterhours remains a fixed dark direction. Preferences vary by direction without resetting the hand or changing the shared sound/profile settings.
- Afterhours uses a continuous deep room background, softer rail lighting, smoother ivory cards, translucent seat plates and more coherent assistant/action surfaces.

## Playstyle / observations rather than invented certainty

The fingerprint is computed from completed personal hand records and honours the existing All / Friends / Practice filters. It shows aggression, voluntary pre-flop participation (VPIP), pre-flop raising (PFR), inferred bluff tendency, showdown win rate, fold frequency, 3-bet rate and continuation betting. Every metric includes its numerator, denominator and expandable definition. No observations produce an unknown value rather than a fabricated zero.

“Bluff tendency” is an explicitly inferred proxy: post-flop raises with a high-card-only made hand, evaluated on the board available at that betting street. Draws are included. It cannot establish intent, compare against an opponent’s unknown hand, or measure a true bluff success rate. Early samples are labelled “Finding your style”; the descriptive label develops after 20 hands. The graph is a portrait of past decisions, not a performance grade or advice.

The visual principle borrowed from [Offsuit’s public App Store presentation](https://apps.apple.com/us/app/offsuit-texas-holdem-poker/id6446099491) is quick numerical comprehension and a personal record of play. Its published version notes describe professional metrics and playing styles. River’s chart, wording and measurement definitions are original. [Monte-Carlo’s official casino presentation](https://www.montecarlosbm-corporate.com/brands/casinos/) informed Royale’s sense of symmetry and formal hospitality; the material interpretation is our design judgment. [MDN’s Web Audio guidance](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API) informed gesture-based audio activation and reuse of one context.

## Refinement validation

Actual desktop and 320/390 CSS-pixel phone previews were inspected, including a full eight-player hand, a win, folded seats, sound previews, optional dark appearances, the personal fingerprint and the shared table creation/join flow. Result ribbons clear the personal seat, and inspected phone views do not overflow horizontally. All six desktop gallery previews were refreshed; current screenshots are saved in the companion `outputs/refinements` folder. Audio readiness and scheduling were verified in Chrome, with automated coverage for gesture unlocking and stopping scheduled sources on mute. This does not verify the user’s speaker, output device or browser-tab mute setting. Safari audio is handled through standard/WebKit constructors and gesture resumption but was not directly tested here.

The optimized production build and all 27 automated checks pass. Multiplayer verification passes against both the development server and the optimized production build, covering room permissions, streams, private-card projection, simultaneous/repeated actions, complete play, history, recovery and the new playstyle statistics. The production check used a fresh isolated database after repeated development checks reached the older test database’s sign-in rate limit; the limiter was preserved. Eight shared engine, evaluator, assistant, authentication, database and multiplayer-command files match their original checksums. The shared room service adds statistics aggregation and the archive-preserving live-read optimization described below.

The publishing connection was refreshed through the user's signed-in Chrome session, and the refinement was published to the existing `river-private-poker` project in the `deadpoods` workspace on 9 October 2026. Vercel reported a ready production deployment and assigned the existing canonical domain. The live gallery was inspected and shows all six directions, including Royale. No alternate project was created and no security protections were changed.

Live multiplayer verification encountered HTTP 503 responses. Production logs identify the Neon database error: “Your account or project has exceeded the quota. Upgrade your plan to increase limits.” The connected `river-poker-db` resource is on the Free plan. This blocks database-backed live play despite successful deployment; exact usage/reset details were not available in Vercel's usage view. Local production multiplayer verification remains passing. No database was replaced, no user data was deleted and no paid plan was activated.

## Database transfer recovery — 9 October 2026

Neon Console reports 7.4 GB network transfer, 1.75 CU-hours and 0.03 GB storage since October 8. Its billing page shows the current period ending November 1. The free plan includes 5 GB outbound transfer per month ([Neon guidance](https://neon.com/blog/how-to-make-the-most-of-neons-free-plan)). The user explicitly chose to retain the free plan and wait for the next period; no payment method or upgrade was added. Reset is provider-controlled and future live availability has not been verified.

Live polling now checks only committed version, membership/presence and deadline scalars when nothing changes. Changed-state reads request only the newest archived hand from PostgreSQL. Heartbeats and overdue bot/human decisions retain the existing transaction and row lock; any newly completed result is appended atomically to the full archive. Starting hands and explicit history requests still load full records. No cards, rules, timers or user history were changed. The live route also reuses its initial authorized snapshot instead of immediately fetching it twice.

A new database regression test covers a 250-hand archive, private cards, membership rejection, unchanged/version-changed probes, concurrent heartbeats, exactly-once timeout completion and later retrieval of every original record. The test snapshot was over 90% smaller than the full projection. All 27 checks, type checking, production build and isolated local production multiplayer verification pass. These results do not establish a measured cloud traffic reduction or cloud multiplayer availability while the existing quota remains exhausted.

## Detail polish — 9 October 2026

Salon uses a wider playing surface within a bounded stage, a shorter introduction and explicit top-seat clearance from the turn announcement. Folio's title/meta and action caption share deliberate inner padding. Vector's dark-mode opponents use dark seat surfaces and differentiated name/stack/badge colors rather than white seat cards. Appearance controls have an intrinsic width, icon/label spacing and a 44px minimum target; Fieldwork and Royale retain their own control shapes. Royale and Afterhours top seats also clear the announcement when their turn labels appear.

The local eight-player visual fixture had mistakenly been populated with human test profiles. Only this local fixture was corrected to seven AI opponents and labelled Practice, preserving its stacks and history. Invited human seats and production records were not converted. Browser inspection observed AI calls, subsequent checks and a completed showdown. AI turns now show “AI opponent” rather than the misleading human 90-second countdown; human turn timing remains unchanged.

All six layouts were checked at 390 CSS pixels with no horizontal overflow. Desktop checks measured a 20px Folio title/caption inset and separated timer/top-seat bounds in Salon and Royale. All 27 automated checks, type checking and the production build pass. At that release, production multiplayer remained blocked by Neon’s free-plan transfer quota. The subsequent Supabase switch below restores database-backed play.


## Supabase switch — October 9

The user authorized a fresh Free-plan Supabase project (`river-side`, Singapore) while preserving Neon. The published site now uses the dedicated server connection with verified TLS and transaction pooling; no game rules or design direction were changed. Row-level security protects all five River tables, and browser-facing database roles have no direct table access. All 28 automated checks and type checking pass. Preview and public production multiplayer checks pass; a cloud practice hand with three bots completed with conserved chips and persisted history. The live Royale browser view also received successive bot actions and accepted a player call.

Existing Neon profiles and match history were not exported because its quota prevents read access. They remain in Neon for later recovery; Supabase starts with new profiles and new history. No paid plan was enabled.
