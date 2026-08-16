/**
 * tl;dv — AI meeting recorder and notetaker.
 *
 * Reads meetings, transcripts and AI-generated notes, and imports external
 * recordings, over the tl;dv Public API (`v1alpha1`, an explicitly ALPHA
 * surface — see the README).
 *
 * Verified against the vendor's own OpenAPI 3.0 document — embedded as
 * `__redoc_state.spec.data` in the rendered page at `https://doc.tldv.io/`
 * (284,855 bytes, `info.version` `v1alpha1`), fetched 2026-08-16 — plus live
 * probes against `pasta.tldv.io`. Nothing here came from a third-party
 * integration directory or a sibling app's guess.
 *
 * Three things about this vendor that shape the code, all measured against
 * the live API on 2026-08-16 rather than assumed:
 *
 *   - **The real host is `pasta.tldv.io`, not `api.tldv.io`.** The latter
 *     resolves and answers a bare `Not Found` for every path, including this
 *     API's own — a working host with the wrong paths, which is the trap. See
 *     `lib/client.ts`.
 *   - **A missing key and a wrong key answer the identical error body.**
 *     `{"name":"AuthorizationRequiredError", ...}` for no header, an empty
 *     header, and a garbage key alike — there is no sharper signal to build a
 *     health probe or an error message on top of.
 *   - **Query-param validation can run before the auth guard.** An invalid
 *     `meetingType` short-circuits to `400` even with a garbage key, so a
 *     `400` is never proof a credential was fine. `auth/api-key.ts` probes
 *     with no query string at all to sidestep this entirely.
 *
 * Deliberately absent: the `highlights` endpoint (the vendor's own OpenAPI
 * document marks it `deprecated: true` in favor of `notes`) and a
 * "download recording" action (the endpoint 302-redirects to a short-lived
 * signed URL, and this runtime's sandboxed `ctx.fetch` transparently follows
 * redirects with no way to read the `Location` header or stop before the
 * — potentially multi-gigabyte — media body, so there is no way to expose the
 * link itself rather than downloading the whole recording through the
 * sandbox). See the README.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import meetingList from "./actions/meeting-list.ts";
import meetingGet from "./actions/meeting-get.ts";
import transcriptGet from "./actions/transcript-get.ts";
import notesGet from "./actions/notes-get.ts";
import meetingImport from "./actions/meeting-import.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    meetingList,
    meetingGet,
    transcriptGet,
    notesGet,
    meetingImport,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
