# Suhba · صُحبة

A newcomer platform for moving to, settling in and building a future in Abu Dhabi. Independent hackathon project; no affiliation or endorsement by Experience Abu Dhabi, creators, employers or government authorities.

## Run locally

Use Node 22.13 or newer. `npm run install:ci`, `npm run db:generate`, apply the checked-in D1 migration with Wrangler locally, then `npm run dev`. Preview binds loopback. The Sites starter provides a local-only mock ChatGPT identity; production authentication comes from the Sites sign-in gateway. Client-supplied roles never grant moderator privileges.

`node node_modules/typescript/bin/tsc --noEmit` checks types. `npm run build` builds the Vinext React application and Cloudflare Worker. `node tests/planner.test.mjs` checks deterministic calculations. `python3 tests/integration.py` exercises a locally built Worker on port 8787 using controlled synthetic identities, actual D1 persistence and R2 bytes. Never expose that direct-header test Worker publicly.

## Actual architecture

Cloudflare Worker routes + D1 prepared statements, R2 private evidence storage, Sites ChatGPT sign-in. Ownership/membership checks protect every workspace/evidence route. Private notes and profile data are excluded from collaborator reads. Invitation codes are one use, expire after 24 hours and can be invalidated by owner revocation. Trash is recoverable; permanent erasure is not implemented.

Public browsing exposes curated source records only. Personal workspaces require sign-in. Helpers/asks/outcome anecdotes are opt-in and available to signed-in users; public ask projections exclude conversations. No external messages are sent. No platform scraping, fabricated availability, testimonials, prices or creators.

Discovery contains original editorial summaries and attributed original links. Review depth, unknown publication dates, separate editorial-check dates, commercial promotion and source conflicts remain visible. Native embeds are opt-in and require editorial approval and supported provider paths. Instagram and TikTok link-out is usable; direct playback was not verified.

## Delivery state

See [acceptance ledger](docs/acceptance-ledger.md) for exact verification and blockers. AI is intentionally deferred until last; the endpoint currently returns a truthful unavailable response. Workspace administration prevents installation of the required OpenAI Developers plugin. No credentials were created or requested in chat.

## Visual attribution

The editorial redesign takes structural inspiration from [Visit Abu Dhabi](https://visitabudhabi.ae/en): spacious typography, destination photography, simple navigation and dark teal accents. Suhba retains its own identity. [Photo licences and credits](public/images/CREDITS.md) are also visible in the application footer.
