# Testing

Use Node.js 24 and install dependencies with `npm ci`.

```sh
npm run typecheck
npm test
npm run build
```

The current suite contains 28 checks, including 600 evaluator comparisons and 500 randomized hands. It checks betting order, all-ins, side pots, odd chips, refunds, hidden cards, timeouts, assistant math, input validation, sounds, statistical proxies, PostgreSQL rollback/concurrency, archive-preserving live snapshots and denial of direct database access to untrusted roles.

## End-to-end multiplayer

Start the app, then run:

```sh
RIVER_VERIFY_URL=http://localhost:3000 node --import tsx scripts/verify-multiplayer.ts
RIVER_VERIFY_URL=http://localhost:3000 node --import tsx scripts/verify-bots.ts
```

Multiplayer verification creates isolated profiles and checks authorization, capacity, identity updates, concurrent preference saves, private streams, duplicate actions, stale requests, a full hand, chip conservation, history, statistics, refresh and recovery. The bot verifier creates a practice table with three bots and confirms completion and saved history. These are integration checks, not benchmarks, and leave their verification profiles/rooms in the target database.

For a public deployment, set `RIVER_VERIFY_URL` to its HTTPS origin. For a same-project protected Vercel preview, link your Vercel project, pull its development environment privately, and use:

```sh
RIVER_VERIFY_URL=https://YOUR-EXACT-PREVIEW.vercel.app \
RIVER_VERIFY_USE_VERCEL_OIDC=1 \
node --import tsx scripts/verify-multiplayer.ts
```

The short-lived token is loaded privately and sent only to the configured Vercel URL. Never upload environment files or authentication state as test artifacts. The bot script targets local or public URLs and does not supply protection headers.

## Browser review

Check all six directions on desktop and mobile. Confirm the active turn is visible, cards are readable, controls remain reachable, overlays do not overlap the seats, folded players are distinguishable, appearance preferences persist, and reduced motion is respected. Sound must be silent on initial load and must stop when muted.

Production verification on October 9, 2026 passed the multiplayer flow and a three-bot practice hand against the Supabase-backed public demo. This is point-in-time evidence, not a guarantee of perpetual provider availability or a load test.
