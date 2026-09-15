/**
 * Parseur — AI-powered email and document parsing, over its public REST API
 * (`api.parseur.com`).
 *
 * Every path, verb, parameter, body field, and enum in this app was verified
 * on 2026-09-15 against Parseur's own machine-readable OpenAPI 3.1 document
 * (`https://api.parseur.com/openapi.json`, 120,307 bytes, `info.title`
 * "Parseur", 21 paths / 29 operations) plus the hand-written guides at
 * `developer.parseur.com` and live probes against `api.parseur.com`. Nothing
 * here came from a third-party integration directory.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The generated OpenAPI security description is stale.** It says to
 *     send `Authorization: Token YOUR_API_KEY`; the current, hand-written
 *     authentication guide explicitly supersedes that — the `Token ` prefix
 *     "still works" but "is not required any longer" — and this app follows
 *     the current guide (`auth/api-key.ts`, `lib/client.ts`).
 *  2. **Two operations answer an async acknowledgement, never the result**
 *     (`document-reprocess.ts`, `mailbox-delete.ts`) — `{"notification_set":
 *     {"info": [...]}}`, not the reprocessed Document or a confirmation the
 *     mailbox is gone.
 *  3. **An upload's `DocumentID` is not a document's `id`** (`document-upload.ts`,
 *     `lib/client.ts`) — a hex correlation string for the vendor's own
 *     "DocumentID Metadata field" mechanism, distinct from the numeric `id`
 *     every read/write action uses.
 *  4. **`POST /email` silently drops a document with the wrong recipient**
 *     (`email-create.ts`) — the target mailbox's own address must appear in
 *     `recipient`, `to`, `cc` or `bcc`, or the call still answers `201` and
 *     the document goes nowhere.
 *  5. **No plan-usage or rate-limit-headroom endpoint is reachable at all**
 *     (`health/quota.ts`) — the OpenAPI document's own `Account` schema names
 *     the billing fields, but no path exposes them, and no rate-limit header
 *     was observed on the wire.
 *  6. **Parseur publishes no status page** (`health/service.ts`) —
 *     `status.parseur.com` doesn't resolve, and both `parseur.statuspage.io`
 *     and `parseur.instatus.com` are unclaimed decoys.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

// Mailboxes
import mailboxList from "./actions/mailbox-list.ts";
import mailboxCreate from "./actions/mailbox-create.ts";
import mailboxGet from "./actions/mailbox-get.ts";
import mailboxUpdate from "./actions/mailbox-update.ts";
import mailboxDelete from "./actions/mailbox-delete.ts";
import mailboxSchemaGet from "./actions/mailbox-schema-get.ts";
import mailboxCopy from "./actions/mailbox-copy.ts";

// Documents
import documentList from "./actions/document-list.ts";
import documentGet from "./actions/document-get.ts";
import documentDelete from "./actions/document-delete.ts";
import documentLogList from "./actions/document-log-list.ts";
import documentUpload from "./actions/document-upload.ts";
import emailCreate from "./actions/email-create.ts";
import documentReprocess from "./actions/document-reprocess.ts";
import documentSkip from "./actions/document-skip.ts";
import documentCopy from "./actions/document-copy.ts";

// Templates
import templateList from "./actions/template-list.ts";
import templateGet from "./actions/template-get.ts";
import templateDelete from "./actions/template-delete.ts";
import templateCopy from "./actions/template-copy.ts";

// Webhooks
import webhookCreate from "./actions/webhook-create.ts";
import webhookEnable from "./actions/webhook-enable.ts";
import webhookDisable from "./actions/webhook-disable.ts";
import webhookDelete from "./actions/webhook-delete.ts";

// Custom downloads (export configs)
import exportConfigList from "./actions/export-config-list.ts";
import exportConfigCreate from "./actions/export-config-create.ts";
import exportConfigUpdate from "./actions/export-config-update.ts";
import exportConfigDelete from "./actions/export-config-delete.ts";

// Account
import bootstrapGet from "./actions/bootstrap-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Mailboxes
    mailboxList,
    mailboxCreate,
    mailboxGet,
    mailboxUpdate,
    mailboxDelete,
    mailboxSchemaGet,
    mailboxCopy,
    // Documents
    documentList,
    documentGet,
    documentDelete,
    documentLogList,
    documentUpload,
    emailCreate,
    documentReprocess,
    documentSkip,
    documentCopy,
    // Templates
    templateList,
    templateGet,
    templateDelete,
    templateCopy,
    // Webhooks
    webhookCreate,
    webhookEnable,
    webhookDisable,
    webhookDelete,
    // Custom downloads
    exportConfigList,
    exportConfigCreate,
    exportConfigUpdate,
    exportConfigDelete,
    // Account
    bootstrapGet,
  ],
  // A single account-wide API key is the whole authentication story — Parseur
  // publishes no OAuth surface for third-party apps.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
