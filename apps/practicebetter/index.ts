/**
 * Practice Better — the practice-management platform for health and wellness
 * practitioners: client records, the session calendar, packages, invoices,
 * tags, reminders and webhook subscriptions, over the Practice Better API v1
 * (`api.practicebetter.io`).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-09-22 against Practice Better's own OpenAPI 3.0 document
 * (`https://api-docs.practicebetter.io/swagger.json`, ~650 KB, `info.title`
 * "Practice Better API Documentation", `info.version` "v1", 69 paths). Nothing
 * here came from a third-party integration directory. `api-docs.practicebetter.io`
 * is the documentation host and is never called at runtime; the manifest's
 * allowlist names only the two hosts this app actually reaches.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Auth is OAuth2 client credentials, machine to machine** (`auth/client-credentials.ts`).
 *     A client id and secret are exchanged at `POST /oauth2/token` for a bearer
 *     token. The document declares no `grant_type` field, no `refresh_token` in
 *     the response and no refresh or revoke operation, so the token is re-minted
 *     from the same credentials when it expires and there is nothing to revoke
 *     on disconnect.
 *  2. **No error body is documented anywhere** (`lib/client.ts`). Every
 *     operation's 4xx/5xx responses declare a description and no schema, so
 *     failures are classified by status and the body is read defensively.
 *  3. **One pagination shape on every list** (`lib/client.ts`). The four
 *     controls (`after_id`, `before_id`, `limit`, `skip`) and the
 *     `{count, hasMore, items}` envelope are declared once and reused by all 13
 *     list actions.
 *  4. **Webhook mutations are scoped under `read`** (`actions/create-webhook-subscription.ts`).
 *     The document says so for both the create and the delete, unlike every
 *     other write in this API, and it is implemented as written.
 *  5. **No rate-limit surface of any kind** (`health/quota.ts`). The document
 *     contains no `ratelimit`/`retry-after`/`x-rate` text at all, so headroom is
 *     a declared absence rather than an invented header read.
 */
import type { AppDefinition } from "@w6w/types";
import clientCredentials from "./auth/client-credentials.ts";

import listClientRecords from "./actions/list-client-records.ts";
import getClientRecord from "./actions/get-client-record.ts";
import createClientRecord from "./actions/create-client-record.ts";
import updateClientRecord from "./actions/update-client-record.ts";
import deleteClientRecord from "./actions/delete-client-record.ts";

import listSessions from "./actions/list-sessions.ts";
import getSession from "./actions/get-session.ts";
import createSession from "./actions/create-session.ts";
import cancelSession from "./actions/cancel-session.ts";
import deleteSession from "./actions/delete-session.ts";

import listPackages from "./actions/list-packages.ts";
import listPackageInstances from "./actions/list-package-instances.ts";
import createPackageInstance from "./actions/create-package-instance.ts";

import listInvoices from "./actions/list-invoices.ts";
import getInvoice from "./actions/get-invoice.ts";

import listTags from "./actions/list-tags.ts";
import createTag from "./actions/create-tag.ts";
import deleteTag from "./actions/delete-tag.ts";

import listReminders from "./actions/list-reminders.ts";

import listWebhookSubscriptions from "./actions/list-webhook-subscriptions.ts";
import createWebhookSubscription from "./actions/create-webhook-subscription.ts";
import deleteWebhookSubscription from "./actions/delete-webhook-subscription.ts";
import listWebhookEventTypes from "./actions/list-webhook-event-types.ts";

import getConsultantProfile from "./actions/get-consultant-profile.ts";
import listServices from "./actions/list-services.ts";
import listTimezones from "./actions/list-timezones.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Client records
    listClientRecords,
    getClientRecord,
    createClientRecord,
    updateClientRecord,
    deleteClientRecord,
    // Sessions
    listSessions,
    getSession,
    createSession,
    cancelSession,
    deleteSession,
    // Packages
    listPackages,
    listPackageInstances,
    createPackageInstance,
    // Invoices (read-only)
    listInvoices,
    getInvoice,
    // Tags
    listTags,
    createTag,
    deleteTag,
    // Reminders (read-only)
    listReminders,
    // Webhook subscriptions
    listWebhookSubscriptions,
    createWebhookSubscription,
    deleteWebhookSubscription,
    listWebhookEventTypes,
    // Consultant, services and time zones
    getConsultantProfile,
    listServices,
    listTimezones,
  ],
  // One way in: the client-credentials grant. The document declares no
  // authorization-code flow (so there is no browser sign-in to offer) and no
  // other credential shape.
  auth: [clientCredentials],
  healthChecks: [service, quota],
} satisfies AppDefinition;
