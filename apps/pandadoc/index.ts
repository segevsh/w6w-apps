/**
 * PandaDoc — document automation and e-signature via the public REST API
 * (`api.pandadoc.com/public/v1`).
 *
 * Covers the contract lifecycle a workflow actually drives: create a document
 * from a template, wait for it to become a draft, send it for signature, watch
 * its status, remind, download the signed PDF, and close it out — plus the
 * template, contact and webhook-subscription reads that feed those steps.
 *
 * **The one thing to know before wiring this up:** document creation is
 * asynchronous. `document-create-from-template` returns `document.uploaded`,
 * not a sendable document; PandaDoc merges the template in the background and
 * the document only becomes sendable at `document.draft`. Poll
 * `document-get-status` between Create and Send. See
 * `actions/document-create-from-template.ts` for the full reasoning, including
 * why this app does not sleep on the caller's behalf.
 *
 * Deliberately absent:
 *
 *   - **Webhook subscription writes** (create / update / delete, shared-key
 *     rotation) — registering a callback URL is a Trigger's `onSubscribe`, not
 *     an Action. An Action that registers a URL the workflow engine did not
 *     mint leaves an orphan subscription pointing at nothing. Listing them is
 *     kept, because that is a genuine read.
 *   - **Document creation from a file upload** (`multipart/form-data`) and from
 *     a public PDF URL — the multipart route needs a body shape a JSON param
 *     list cannot express, and both bypass the template model the rest of this
 *     app is built around.
 *   - **Document authoring internals** — sections, attachments, document
 *     fields, content-library items, quotes and catalog items. These edit the
 *     *inside* of a document, which is what PandaDoc's own editor is for; this
 *     app is for running documents through a workflow, not composing them.
 *   - **Download Completed Document** (`/download-protected`) — same binary as
 *     `document-download` but restricted to completed documents, so it would be
 *     a second way to say the same thing.
 *   - **Workspace and user administration** (workspaces, users, members, API
 *     key minting) and **notarization** — operator concerns, and minting API
 *     keys from inside a workflow is a credential-management anti-pattern.
 *   - **OAuth2** — supported by PandaDoc and a legitimate second auth method,
 *     but it targets a public application acting for other people's accounts
 *     and needs vendor approval. Not implemented on speculation; see
 *     `auth/api-key.ts`.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import documentGetMany from "./actions/document-get-many.ts";
import documentGetStatus from "./actions/document-get-status.ts";
import documentGet from "./actions/document-get.ts";
import documentCreateFromTemplate from "./actions/document-create-from-template.ts";
import documentSend from "./actions/document-send.ts";
import documentCreateSession from "./actions/document-create-session.ts";
import documentChangeStatus from "./actions/document-change-status.ts";
import documentSendReminder from "./actions/document-send-reminder.ts";
import documentDownload from "./actions/document-download.ts";
import documentDelete from "./actions/document-delete.ts";
import templateGetMany from "./actions/template-get-many.ts";
import templateGet from "./actions/template-get.ts";
import contactGetMany from "./actions/contact-get-many.ts";
import contactCreate from "./actions/contact-create.ts";
import webhookSubscriptionGetMany from "./actions/webhook-subscription-get-many.ts";
import memberGetCurrent from "./actions/member-get-current.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // document
    documentGetMany,
    documentGetStatus,
    documentGet,
    documentCreateFromTemplate,
    documentSend,
    documentCreateSession,
    documentChangeStatus,
    documentSendReminder,
    documentDownload,
    documentDelete,
    // template
    templateGetMany,
    templateGet,
    // contact
    contactGetMany,
    contactCreate,
    // webhook
    webhookSubscriptionGetMany,
    // member
    memberGetCurrent,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
