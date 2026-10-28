/**
 * Zoho CRM — w6w app.
 *
 * Scoped to Zoho CRM specifically, not Zoho's wider SMB suite (Zoho Books,
 * Zoho Desk, Zoho Mail, ...) — those are separate potential apps. Six modules
 * are covered with dedicated actions — Leads, Contacts, Deals, Accounts,
 * Tasks, Notes — plus one generic `search-records` action that reaches any
 * module (including a custom one) through Zoho's uniform `/search` endpoint.
 *
 * Zoho specifics that shape the code:
 *
 *   - **Get Records requires an explicit field list.** Unlike most vendors'
 *     "give me everything" default, Zoho's list/get endpoints 400 without a
 *     `fields` query param — every read action ships a module-appropriate
 *     default (`lib/params.ts`'s `listFields`) so it stays usable out of the
 *     box.
 *   - **Insert/update/delete/convert all answer with a `data` array of
 *     per-record results**, batch-style, even for the single record this app
 *     always submits — `lib/client.ts#unwrapRecordResult` unwraps that and
 *     turns a per-item `status: "error"` into a thrown error even when the
 *     HTTP status was 2xx.
 *   - **Per-data-centre hosts**, resolved the same way Salesforce's
 *     `instance_url` is in this pack's `salesforce` app: Zoho's OAuth token
 *     response carries `api_domain`, which `afterConnect` records on the
 *     connection so `lib/client.ts` addresses the right regional host. This
 *     app's `oauth2` method only offers the US authorization/token endpoints,
 *     so in practice every connection resolves to the US host — see the
 *     README's "Regional accounts" section.
 *
 * Deliberately absent: bulk/mass-update APIs (a different, job-based
 * surface), attachment upload (multipart), and blueprint/approval-process
 * actions — none of those are core CRUD-and-convert workflow automation.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import leadList from "./actions/lead-list.ts";
import leadGet from "./actions/lead-get.ts";
import leadCreate from "./actions/lead-create.ts";
import leadUpdate from "./actions/lead-update.ts";
import leadDelete from "./actions/lead-delete.ts";
import leadConvert from "./actions/lead-convert.ts";

import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";

import dealList from "./actions/deal-list.ts";
import dealGet from "./actions/deal-get.ts";
import dealCreate from "./actions/deal-create.ts";
import dealUpdate from "./actions/deal-update.ts";
import dealDelete from "./actions/deal-delete.ts";

import accountList from "./actions/account-list.ts";
import accountGet from "./actions/account-get.ts";

import taskCreate from "./actions/task-create.ts";
import noteCreate from "./actions/note-create.ts";
import searchRecords from "./actions/search-records.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  auth: [oauth2],
  actions: [
    // lead
    leadList,
    leadGet,
    leadCreate,
    leadUpdate,
    leadDelete,
    leadConvert,
    // contact
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    // deal
    dealList,
    dealGet,
    dealCreate,
    dealUpdate,
    dealDelete,
    // account
    accountList,
    accountGet,
    // task / note
    taskCreate,
    noteCreate,
    // search
    searchRecords,
  ],
  healthChecks: [service, quota],
} satisfies AppDefinition;
