/**
 * SimpleTexting — SMS/MMS messaging, contacts, lists, campaigns and webhooks
 * over the SimpleTexting API v2 (`api-app2.simpletexting.com/v2`).
 *
 * Every path, verb, query parameter, body field and enum in this app was read
 * off the OpenAPI 3.0 document embedded in `https://api-doc.simpletexting.com/`
 * (extracted 2026-09-22 by a balanced-brace scan of the page's inline spec — the
 * page is a static renderer with no fetchable `.json`) and cross-checked against
 * live probes of the API and its status page on the same day. Nothing here came
 * from a third-party integration directory, and nothing was inferred from a
 * sibling app.
 *
 * The findings that shaped the design, each documented in full where it matters:
 *
 *  1. **Auth is a Bearer token, and the scheme is not optional**
 *     (`auth/api-key.ts`). The spec declares `securitySchemes.api_key` as
 *     `type: apiKey, name: Authorization`, but its own description and every
 *     sample say `Authorization: Bearer <token>` — and a token sent *without*
 *     the scheme is rejected as an invalid token, not as a malformed header.
 *  2. **Both credential failures are HTTP 401** (`auth/api-key.ts`). Missing
 *     and invalid tokens are told apart by `errorCode` in the
 *     `application/problem+json` body — `ERR_AUTH_TOKEN_MISSING` versus
 *     `ERR_AUTH_TOKEN_INVALID` — never by the status, which is why the probe
 *     classifies on the body.
 *  3. **One envelope, everywhere** (`lib/client.ts`). Collections answer
 *     `{content, totalPages, totalElements}`; every other read answers the
 *     entity itself; deletes answer `204` with no body at all.
 *  4. **The one non-idempotent risk is a message** (`actions/message-send.ts`,
 *     `actions/campaign-send.ts`). No write endpoint in this API declares an
 *     idempotency key, so sends, creates and webhook subscriptions are all
 *     `idempotent: false` — an honest retry would text a real person twice.
 *  5. **The vendor's prose examples contradict its own schema**
 *     (`actions/campaign-send.ts`, `actions/campaign-get.ts`). The campaign
 *     example sends `listsOrSegments` and a `title` inside `messageTemplate`,
 *     neither of which exists in the document's schemas, and one example URL is
 *     missing its `/campaigns/` segment. The schema is what the server
 *     validates, so the schema is what this app sends.
 *
 * Twenty-seven of the document's thirty-eight operations are covered — the full
 * messaging, contact, list, segment, custom-field and campaign-read surface,
 * plus webhooks. What is deliberately left out, and why, is listed by resource
 * in the README.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

// Tenant
import tenantInfoGet from "./actions/tenant-info-get.ts";
import phoneList from "./actions/phone-list.ts";

// Messages
import messageSend from "./actions/message-send.ts";
import messageList from "./actions/message-list.ts";
import messageGet from "./actions/message-get.ts";
import messageEvaluate from "./actions/message-evaluate.ts";

// Contacts
import contactList from "./actions/contact-list.ts";
import contactCreate from "./actions/contact-create.ts";
import contactGet from "./actions/contact-get.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";

// Contact lists
import contactListList from "./actions/contact-list-list.ts";
import contactListCreate from "./actions/contact-list-create.ts";
import contactListGet from "./actions/contact-list-get.ts";
import contactListUpdate from "./actions/contact-list-update.ts";
import contactListDelete from "./actions/contact-list-delete.ts";
import contactListAddContact from "./actions/contact-list-add-contact.ts";
import contactListRemoveContact from "./actions/contact-list-remove-contact.ts";

// Segments and custom fields
import segmentList from "./actions/segment-list.ts";
import customFieldList from "./actions/custom-field-list.ts";

// Campaigns
import campaignList from "./actions/campaign-list.ts";
import campaignSend from "./actions/campaign-send.ts";
import campaignGet from "./actions/campaign-get.ts";

// Webhooks
import webhookList from "./actions/webhook-list.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Tenant
    tenantInfoGet,
    phoneList,
    // Messages
    messageSend,
    messageEvaluate,
    messageList,
    messageGet,
    // Contacts
    contactList,
    contactCreate,
    contactGet,
    contactUpdate,
    contactDelete,
    // Contact lists
    contactListList,
    contactListCreate,
    contactListGet,
    contactListUpdate,
    contactListDelete,
    contactListAddContact,
    contactListRemoveContact,
    // Segments and custom fields
    segmentList,
    customFieldList,
    // Campaigns
    campaignList,
    campaignSend,
    campaignGet,
    // Webhooks
    webhookList,
    webhookCreate,
    webhookUpdate,
    webhookDelete,
  ],
  // A personal access token, sent as `Authorization: Bearer <token>`. The API
  // publishes no OAuth surface, so there is one method and one secret field.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
