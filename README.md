# Suhba · صُحبة

A newcomer platform for moving to, settling in and building a future in Abu Dhabi. Independent hackathon project; no affiliation or endorsement by Experience Abu Dhabi, creators, employers or government authorities.

## Why Suhba exists

Moving to Abu Dhabi means making connected decisions about housing, driving, schools, work and everyday life. Useful lived experiences are scattered across social platforms. Advice may be stale or written for different circumstances, and an interesting story rarely tells you what to do next.

**Suhba helps newcomers discover, decide and do.** Students, parents, professionals and founders can combine goals rather than enter a fixed demographic track. Find relevant real experiences, keep the original creator link, compare personal accounts with official sources, save evidence and plan your next action. Resolve an unresolved question through an opt-in in-app helper, contribute an outcome lesson, or build a work sample for a career opportunity.

For example: save a creator’s driving-licence journey, check the official licensing source, record what is still unknown for your situation and draft a precise inquiry. You retain the context and the evidence rather than treating somebody else’s outcome as a promise.

## What works today

- Search and filter 50 curated source links, including creator accounts and official tourism/guidance, with attribution, review depth, source status and uncertainty.
- Save collections and private goal workspaces with evidence, actions, prerequisites, deadlines, inquiry drafts and evidence-backed confirmation.
- Compare deterministic cash/time scenarios using your own facts or labelled assumptions; unknown values stay unknown.
- Create bounded sample-challenge work artifacts, map requirements, upload private evidence and request actual collaborator review.
- Use opt-in helper profiles and in-app ask/reply/resolution workflows; share selected workspaces through controlled viewer/editor invitations.
- Submit/correct/withdraw sources through moderation, export owned records and restore recoverable trash.

The difference is the connected journey from lived experience to an evidenced next step. This is a curated source collection, not exclusive owned creator data. Editorial summaries link to original publishers; media is not copied. Official sources do not imply an official partnership or establish personal eligibility. No live helper network, job guarantee or fabricated testimonial is claimed. Hosted AI is deferred and honestly unavailable.

## Preview and access

[Public source repository](https://github.com/jamesofoaye/hub71ai-suhba). Local preview: `http://127.0.0.1:5173/`. Sites publication is in progress; a hosted URL will be added only after a successful native deployment. Public discovery is designed for visitors; saving private workspaces requires ChatGPT sign-in. The local starter mock identity is development-only.

## Run locally

Use Node 22.13 or newer. `npm run install:ci`, `npm run db:generate`, apply the checked-in D1 migration with Wrangler locally, then `npm run dev`. Preview binds loopback. The Sites starter provides a local-only mock ChatGPT identity; production authentication comes from the Sites sign-in gateway. Client-supplied roles never grant moderator privileges.

`node node_modules/typescript/bin/tsc --noEmit` checks types. `npm run build` builds the Vinext React application and Cloudflare Worker. `node tests/planner.test.mjs` checks deterministic calculations. The private integration harness exercises a built Worker with controlled identities, D1 persistence and R2 bytes. Its fixture file is intentionally excluded from this public repository. The data-free report is [tests/integration-results.json](tests/integration-results.json). `node scripts/verify-integration.mjs` is available only in the private development checkout with that harness; it creates isolated local storage. Never expose the direct-header test Worker publicly. Public clones can run the type check, build and planner checks above.

## Actual architecture

Cloudflare Worker routes + D1 prepared statements, R2 private evidence storage, Sites ChatGPT sign-in. Ownership/membership checks protect every workspace/evidence route. Private notes and profile data are excluded from collaborator reads. Invitation codes are one use, expire after 24 hours and can be invalidated by owner revocation. Trash is recoverable; permanent erasure is not implemented.

Public browsing exposes curated source records only. Personal workspaces require sign-in. Helpers/asks/outcome anecdotes are opt-in and available to signed-in users; public ask projections exclude conversations. No external messages are sent. No platform scraping, fabricated availability, testimonials, prices or creators.

Discovery contains original editorial summaries and attributed original links. Review depth, unknown publication dates, separate editorial-check dates, commercial promotion and source conflicts remain visible. Native embeds are opt-in and require editorial approval and supported provider paths. Instagram and TikTok link-out is usable; direct playback was not verified.

## Delivery state

See [acceptance ledger](docs/acceptance-ledger.md) for exact verification and blockers. AI is intentionally deferred until last; the endpoint currently returns a truthful unavailable response. Workspace administration prevents installation of the required OpenAI Developers plugin. No credentials were created or requested in chat.

## Visual attribution

The editorial redesign takes structural inspiration from [Visit Abu Dhabi](https://visitabudhabi.ae/en): spacious typography, destination photography, simple navigation and dark teal accents. Suhba retains its own identity. [Photo licences and credits](public/images/CREDITS.md) are also visible in the application footer.
