# Feature acceptance ledger

Status is scoped to observed evidence, not a percentage of completion. Last revision: 2026-10-02.

| Capability | Built | Verified evidence | Remaining verification / dependency |
| --- | --- | --- | --- |
| Durable identity and owned profile | ChatGPT sign-in integration, D1 profile, optional composable roles/goals | Local sign-in and reload; API ownership checks | Production gateway and controlled second production identity |
| Discovery | Search/topic/platform/type filters, fit explanations, 50 attributed original links incl. 8 Instagram, 3 TikTok, 12 tourism guides | Prior browser search/filter/bookmark flows; new records have provenance | Mobile search at y=373 on 390px viewport; no overflow; 48 current sources and no QA submission. External playback gated/unverified |
| Collections and goals | Private notes, evidence, actions/dependencies, confirmations with evidence, drafts | Integration suite persistence, duplicate submission, ACL, invalid deps, private-note exclusion | 49 backend checks passed; redesigned prerequisite selectors need browser replay |
| Before You Say Yes | Cash/time totals, unknown inputs, what-if copies, machine-checked rules | Planner unit checks known/unknown, cash/time tradeoffs | Cash/time/unknown, duplicate IDs and self-cycle regressions passed |
| First Yes | Illustrative bounded challenges, artifact editor, requirements mapping, R2 uploads, collaborator review, safe HTML export | Actual local R2 bytes/ACL; actual reviewer and invalidation checked | Review hash/version/upload invalidation passed; production replay pending |
| Small Ask | Opt-in real profiles, matching explanations, stateful in-app replies/resolution, reopened-thread history | Controlled multiuser accept/reply/resolve flows | Reopened public projection and former helper isolation passed; no recruited live helpers |
| Household sharing | One-use expiring viewer/editor invitation, revoke, source/task collaboration | Viewer writes blocked, revoked reads blocked, private notes excluded | Production multiuser replay; task assignees are labels, not externally confirmed identities |
| Contribution and integrity | Moderation queue, explicit moderator allowlist, corrections/withdrawal/status flags | Ordinary user denied moderation; approval/correction/withdrawal checks | Stale-version and rejection propagation regressions passed |
| Export and deletion | Owned-record JSON export, proof HTML, recoverable trash | Local export/private-note ACL and restore | Permanent erasure unsupported, honestly disclosed |
| Accessible entry | Keyboard dialogs, text fallback, explicit browser voice activation | Prior desktop keyboard/focus and core flows | Mobile/200% zoom and voice permission flow not verified |
| Editorial redesign | Top navigation, destination photography, editorial source layout, independent identity | TypeScript passed; desktop and mobile screenshots saved | About and mobile Menu expose all nine destinations; exact release build pending |
| Hosting | Registered existing private Site, Worker/D1/R2 configured | Local built Worker runs | Publishing helpers restored; first private deployment and production auth verification in progress. Public demo authorized after gates |
| AI | Honest unavailable endpoint | 503 unavailable check | Deferred by user; required plugin disabled by admin, no key configured |

The private integration harness passed 49 checks at 08:11 UTC, including review invalidation, stale moderation writes, request-history isolation and deterministic scenario validation. The data-free results are in `tests/integration-results.json`. Later About/mobile/form changes passed TypeScript checking; their exact release build and backend regression replay are in progress. No live third-party communications, purchases or external invitations occurred.
