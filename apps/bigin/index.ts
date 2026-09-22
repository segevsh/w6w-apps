/**
 * Bigin by Zoho CRM — w6w app.
 *
 * Bigin (https://www.bigin.com) is Zoho's lightweight pipeline CRM for small
 * teams. This app covers the records a pipeline is made of — Contacts,
 * Companies (the API calls the module **Accounts**), Pipelines (the API's name
 * for deals), and Tasks — at full CRUD, plus one generic search action and the
 * two user endpoints.
 *
 * Everything here was verified on 2026-09-22 against Bigin's own documentation
 * under `https://www.bigin.com/developer/docs/apis/v2/` (records, users,
 * multi-DC, status codes, API limits) and against live probes of the API and
 * the StatusIQ feed. Nothing came from a third-party integration directory.
 *
 * The vendor facts that shape the code, each documented where it matters:
 *
 *   - **Eight regional data centres, and one of them breaks the naming
 *     pattern** (`lib/regions.ts`). Each region has its own API host
 *     (`www.zohoapis.<tld>`) and its own OAuth host (`accounts.zoho.<tld>`) —
 *     except Canada, where the API host is the expected `www.zohoapis.ca` but
 *     the OAuth host is `accounts.zohocloud.ca`. `afterConnect` records the
 *     token response's `api_domain` on the connection so later calls land on
 *     the account's own region, and the US host is only a fallback.
 *   - **Authorization always starts at the US OAuth host** for every region
 *     except China, which is why `auth/oauth2.ts` wires the US
 *     authorization/token endpoints only (the `zoho` sibling's shape) while
 *     `network.allow` still names all eight API hosts. See the README.
 *   - **List/read require an explicit `fields` list** (max 50 names); there is
 *     no "give me everything" default, so every list action ships a
 *     module-appropriate default field set.
 *   - **Insert/update/delete answer a per-record `data` result array**, even for
 *     one record — `lib/client.ts#unwrapRecordResult` unwraps it and turns a
 *     per-item `status: "error"` into a thrown error even on a 2xx.
 *   - **Search needs a second scope** (`ZohoSearch.securesearch.READ`) on top of
 *     a module scope, and takes exactly one of `criteria` / `email` / `phone` /
 *     `word`.
 *
 * Deliberately narrow in this first pass — see the README's "What is not here"
 * section: the Products, Calls, Events and Notes modules; the approval-status
 * (`approved`) and bulk/upsert surfaces; attachments; and the metadata
 * (modules / fields / layouts / custom views / tags) endpoints. Users are
 * read-only, because Bigin's API documents no user write.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";

import companyList from "./actions/company-list.ts";
import companyGet from "./actions/company-get.ts";
import companyCreate from "./actions/company-create.ts";
import companyUpdate from "./actions/company-update.ts";
import companyDelete from "./actions/company-delete.ts";

import pipelineList from "./actions/pipeline-list.ts";
import pipelineGet from "./actions/pipeline-get.ts";
import pipelineCreate from "./actions/pipeline-create.ts";
import pipelineUpdate from "./actions/pipeline-update.ts";
import pipelineDelete from "./actions/pipeline-delete.ts";

import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskCreate from "./actions/task-create.ts";
import taskUpdate from "./actions/task-update.ts";
import taskDelete from "./actions/task-delete.ts";

import searchRecords from "./actions/search-records.ts";
import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  auth: [oauth2],
  actions: [
    // contacts
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    // companies (the API's `Accounts` module)
    companyList,
    companyGet,
    companyCreate,
    companyUpdate,
    companyDelete,
    // pipelines (the API's name for deals)
    pipelineList,
    pipelineGet,
    pipelineCreate,
    pipelineUpdate,
    pipelineDelete,
    // tasks
    taskList,
    taskGet,
    taskCreate,
    taskUpdate,
    taskDelete,
    // generic search, any module
    searchRecords,
    // users
    userList,
    userGet,
  ],
  healthChecks: [service, quota],
} satisfies AppDefinition;
