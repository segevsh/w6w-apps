/**
 * Granola — AI meeting notes. Read notes, transcripts and folders, manage
 * webhook endpoints, and administer legal holds and the audit log, over
 * Granola's public REST API (`public-api.granola.ai/v1`).
 *
 * Every path, verb, parameter, body field and enum here comes from Granola's own
 * OpenAPI 3.1 document (`docs.granola.ai/api-reference/openapi.json`, fetched
 * 2026-10-05) and live probes of `public-api.granola.ai`. All 17 operations in it
 * are implemented as actions.
 *
 * Findings that shaped the design:
 *
 *  1. **The host is `public-api.granola.ai`.** `api.granola.ai` is not the public API.
 *  2. **Auth is a plain HTTP bearer key** (`grn_...`), classified by the 401 body
 *     `code` (`MISSING_API_KEY` vs `INVALID_API_KEY`), not the status alone.
 *  3. **Get Note can answer 413 `TRANSCRIPT_TOO_LARGE`**; the action falls back to
 *     the note without a transcript, flags it, and Get Transcript pages the rest.
 *  4. **A webhook's signing secret is shown once**, in the create response.
 *  5. **Cursors are opaque** and `hasMore` is the stop signal, not the page length.
 *
 * Health: a `service` check on the `API and webhooks` component of
 * `status.granola.ai` and a declared-absent `quota` check.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

import noteList from "./actions/note-list.ts";
import noteGet from "./actions/note-get.ts";
import transcriptGet from "./actions/transcript-get.ts";
import folderList from "./actions/folder-list.ts";
import auditEventList from "./actions/audit-event-list.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import legalHoldCreate from "./actions/legal-hold-create.ts";
import legalHoldList from "./actions/legal-hold-list.ts";
import legalHoldGet from "./actions/legal-hold-get.ts";
import legalHoldUpdate from "./actions/legal-hold-update.ts";
import legalHoldRelease from "./actions/legal-hold-release.ts";
import custodianAdd from "./actions/custodian-add.ts";
import custodianList from "./actions/custodian-list.ts";
import custodianRemove from "./actions/custodian-remove.ts";

export default {
  actions: [
    noteList,
    noteGet,
    transcriptGet,
    folderList,
    auditEventList,
    webhookCreate,
    webhookList,
    webhookUpdate,
    webhookDelete,
    legalHoldCreate,
    legalHoldList,
    legalHoldGet,
    legalHoldUpdate,
    legalHoldRelease,
    custodianAdd,
    custodianList,
    custodianRemove,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
