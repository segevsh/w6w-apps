/**
 * Read AI — the AI meeting assistant. Reads meeting reports (summary, chapters,
 * action items, key questions, topics, transcript, metrics, recording download)
 * over the public REST API at `api.read.ai` (open beta).
 *
 * Verified 2026-10-05 against Read AI's help-center API Reference and
 * authentication articles, the OIDC discovery document at `authn.read.ai`, and
 * unauthenticated probes. Findings that shaped the design:
 *
 *  1. **OAuth only, and you register your own client** (`auth/oauth2.ts`). No
 *     static keys; access tokens last 10 minutes; refresh tokens rotate.
 *  2. **Page size is capped at 10** (`actions/list-meetings.ts`), so a cursor
 *     walk (`actions/list-all-meetings.ts`) is the only way to read history.
 *  3. **The API is read-only and three endpoints wide.** Nothing that writes,
 *     uploads, or manages webhooks is documented, so none is implemented.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import listMeetings from "./actions/list-meetings.ts";
import listAllMeetings from "./actions/list-all-meetings.ts";
import getMeeting from "./actions/get-meeting.ts";
import getLiveMeeting from "./actions/get-live-meeting.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [listMeetings, listAllMeetings, getMeeting, getLiveMeeting],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
