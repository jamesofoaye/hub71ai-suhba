# AI handling and verification

The goal, Small Ask and First Yes editors include an explicit AI proposal panel. The user enters selected context, chooses up to six source records and presses Generate. Returned text is a proposal to review; applying it changes the editable draft, and saving remains a separate action. AI does not confirm a goal, invent evidence, mark actions complete or grant human-review status.

## Data and credentials

The server receives 1–6,000 characters of selected text, the mode, selected source IDs and an optional workspace ID used only to check access. It reads bounded public source summaries, caveats and claims from D1. Profile fields, household/private notes, evidence files and other workspace fields are not automatically sent. A user can deliberately type personal information into the selected context; the panel discloses that this context is sent to OpenAI.

`OPENAI_API_KEY` belongs in the native Site settings as a secret variable. It is used only by the Worker when contacting the Responses API. The request rejects unexpected private fields and client-supplied credentials. No key, prompt or returned AI text is persisted in the attempt table. The app uses `store: false`; this setting does not assert that all provider processing or retention is absent. OpenAI's applicable account data handling still applies.

## Provider request and bounded usage

The configured model is `gpt-5.4-mini-2026-03-17` through `https://api.openai.com/v1/responses`, with strict structured output, no tools, no automatic retries, a 35-second server timeout, reasoning effort `none` and at most 1,800 output tokens. The combined instructions and selected context are capped at 32,000 UTF-8 bytes; incoming request bodies are capped at 40,000 bytes.

An atomic D1 reservation enforces at most one attempt per person in 20 seconds, 10 attempts per person per UTC day and 100 attempts across this preview's lifetime. Failed provider attempts count conservatively. The table stores only an attempt ID, user ID, timestamp and UTC day. These are application limits, not a provider billing cutoff. The owner's USD5 funding does not authorize further purchases or billing changes.

Only selected source IDs may appear in structured citations. Source-based actions require a cited source with a fit/uncertainty explanation; user-input and assumption actions cannot claim source citations. Unknowns and differing circumstances remain explicit. Deterministic scenario arithmetic stays outside AI. Structured validation prevents invented citation IDs, but cannot guarantee that every sentence is factually correct; the user must review proposals and confirm applicable guidance.

## Current evidence

TypeScript and the AI contract/application unit checks passed during local release validation on 2026-10-02. Provider responses in unit checks are mocked and are not evidence of a live model connection. Actual stream-parser checks cover dishonest or missing Content-Length, malformed bodies and bounded input. Actual SQLite checks cover the cooldown, daily/lifetime limits, failed-attempt accounting and competing reservations.

All 80 local built-Worker integration checks passed at 10:52 UTC on 2026-10-02. They include authentication, cross-origin rejection, workspace ownership and rejected unexpected private context, duplicate sources, oversized bodies and malformed input. The oversized-body path was repaired after a reproduced local runtime restart; the complete follow-up request sequence then passed. The report records exact completed checks. Production dispatcher authentication with a second real user remains a separate unverified boundary.

Native Site metadata confirmed `OPENAI_API_KEY` configured as a secret at 10:46 UTC on 2026-10-02. Its value was not read. A configured variable alone is not a successful connection. A deployed model call, returned usage metadata, review/apply/save/reload flow and account usage within the funded budget still require live verification. No live call or actual charge is claimed here.

Reference: [OpenAI model documentation](https://developers.openai.com/api/docs/models/gpt-5.4-mini) and [structured output documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).
