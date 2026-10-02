# Feature acceptance ledger

Status is scoped to observed evidence, not a percentage of completion. Last revision: 2026-10-02.

| Capability | Built | Verified evidence | Remaining verification / dependency |
| --- | --- | --- | --- |
| Durable identity and owned profile | ChatGPT sign-in integration, D1 profile, optional composable roles/goals | Local sign-in and reload; API ownership checks | Production gateway and controlled second production identity |
| Discovery | Search/topic/platform/type filters, fit explanations, 50 attributed original links incl. 8 Instagram, 3 TikTok, 12 tourism guides | Prior browser search/filter/bookmark flows; new records have provenance | New redesign browser replay; external platform playback gated/unverified |
| Collections and goals | Private notes, evidence, actions/dependencies, confirmations with evidence, drafts | Integration suite persistence, duplicate submission, ACL, invalid deps, private-note exclusion | Latest regression suite and redesigned forms replay |
| Before You Say Yes | Cash/time totals, unknown inputs, what-if copies, machine-checked rules | Planner unit checks known/unknown, cash/time tradeoffs | New rule/dependency regression checks |
| First Yes | Illustrative bounded challenges, artifact editor, requirements mapping, R2 uploads, collaborator review, safe HTML export | Actual local R2 bytes/ACL; actual reviewer and invalidation checked | Expanded review-hash/version/upload-invalidation regression |
| Small Ask | Opt-in real profiles, matching explanations, stateful in-app replies/resolution, reopened-thread history | Controlled multiuser accept/reply/resolve flows | Expanded reopened-public-projection regression; no recruited live helpers |
| Household sharing | One-use expiring viewer/editor invitation, revoke, source/task collaboration | Viewer writes blocked, revoked reads blocked, private notes excluded | Production multiuser replay; task assignees are labels, not externally confirmed identities |
| Contribution and integrity | Moderation queue, explicit moderator allowlist, corrections/withdrawal/status flags | Ordinary user denied moderation; approval/correction/withdrawal checks | Latest stale-version and rejection source-propagation regression |
| Export and deletion | Owned-record JSON export, proof HTML, recoverable trash | Local export/private-note ACL and restore | Permanent erasure unsupported, honestly disclosed |
| Accessible entry | Keyboard dialogs, text fallback, explicit browser voice activation | Prior desktop keyboard/focus and core flows | Mobile/200% zoom and voice permission flow not verified |
| Editorial redesign | Top navigation, destination photography, editorial source layout, independent identity | Type/build checks pending | Computer browser-control timeouts prevent current screenshot confirmation |
| Hosting | Registered existing private Site, Worker/D1/R2 configured | Local built Worker runs | First private deployment and production auth verification pending; public demo authorized after gates |
| AI | Honest unavailable endpoint | 503 unavailable check | Deferred by user; required plugin disabled by admin, no key configured |

The existing `tests/integration-results.json` records 34 passing backend checks on the earlier build. It does not certify later changes. Current source requires another build and regression run before release. No live third-party communications, purchases or external invitations occurred.
