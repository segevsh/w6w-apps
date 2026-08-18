/**
 * Resend — transactional email, plus the domains, audiences, contacts and
 * broadcasts around it.
 *
 * Every path, parameter, required body field and response shape was taken from
 * Resend's own OpenAPI document (https://resend.com/openapi.json, v1.5.0,
 * fetched 2026-08-18 — 47 paths), and the account-level facts from its API
 * reference: one base URL (`https://api.resend.com`), bearer auth, and **no
 * versioning system today** ("we plan to add versioning via calendar-based
 * headers in the future"), which is why no path here carries a version segment.
 *
 * Two things worth knowing before reading the actions:
 *
 *   - **Idempotency is real here.** Both send endpoints accept an
 *     `Idempotency-Key` header, described by the schema as ensuring "emails are
 *     not sent twice". `email-send` and `email-send-batch` default it to the
 *     step's invocation id, which is what makes their `idempotent: true`
 *     honest rather than aspirational.
 *   - **Not every list paginates.** `/emails`, `/domains`, `/broadcasts` and
 *     `/api-keys` take the shared `limit`/`after`/`before` cursors and answer
 *     `{ object, has_more, data }`. `/audiences` and `/contacts` answer
 *     `{ object, data }` with no `has_more` and no cursor params at all, so
 *     those actions return the response as-is instead of pretending to page.
 *
 * Deliberately out of scope:
 *   - **API key creation** (`POST /api-keys`). It returns a live credential,
 *     and an action that does that writes a secret into a workflow's step
 *     output and its run logs. Listing keys is safe and is included.
 *   - **Inbound email** (`/emails/receiving/*`) and **attachment download**.
 *     Both hand back message bodies and binary payloads that belong in a
 *     trigger and a file surface respectively, not in an action's JSON result.
 *   - **Templates, automations, segments, topics, contact properties, events
 *     and webhooks.** Each is its own coherent surface in the 47-path document
 *     and deserves its own action set rather than a token endpoint here;
 *     `segment_id` is still accepted where Resend requires it.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import emailSend from "./actions/email-send.ts";
import emailSendBatch from "./actions/email-send-batch.ts";
import emailGet from "./actions/email-get.ts";
import emailList from "./actions/email-list.ts";
import emailUpdate from "./actions/email-update.ts";
import emailCancel from "./actions/email-cancel.ts";
import domainCreate from "./actions/domain-create.ts";
import domainList from "./actions/domain-list.ts";
import domainGet from "./actions/domain-get.ts";
import domainVerify from "./actions/domain-verify.ts";
import domainUpdate from "./actions/domain-update.ts";
import audienceCreate from "./actions/audience-create.ts";
import audienceList from "./actions/audience-list.ts";
import audienceGet from "./actions/audience-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import broadcastCreate from "./actions/broadcast-create.ts";
import broadcastList from "./actions/broadcast-list.ts";
import broadcastGet from "./actions/broadcast-get.ts";
import broadcastSend from "./actions/broadcast-send.ts";
import apiKeyList from "./actions/api-key-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // email
    emailSend,
    emailSendBatch,
    emailGet,
    emailList,
    emailUpdate,
    emailCancel,
    // domain
    domainCreate,
    domainList,
    domainGet,
    domainVerify,
    domainUpdate,
    // audience
    audienceCreate,
    audienceList,
    audienceGet,
    // contact
    contactCreate,
    contactList,
    contactGet,
    contactUpdate,
    contactDelete,
    // broadcast
    broadcastCreate,
    broadcastList,
    broadcastGet,
    broadcastSend,
    // api key
    apiKeyList,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
