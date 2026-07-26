/**
 * Salesforce — w6w app, seeded from n8n's `Salesforce` node.
 *
 * n8n's node ships a hand-written action set per object — account, contact,
 * lead, opportunity, case, task, and so on — each restating the same CRUD over
 * a different `sobject`. This port takes the other route: **generic record
 * actions plus the metadata to drive them**. `record-create` on `Lead` is the
 * same call as on `Invoice__c`, so one pair of actions covers every standard
 * and custom object, and `sobject-describe` / `sobject-list` supply the field
 * names instead of a form baking in one org's schema.
 *
 * Salesforce specifics that shape the code:
 *
 *   - **Per-org hosts.** Every org lives on its own My Domain, so the allowlist
 *     carries `*.salesforce.com` and `*.force.com`, and the instance URL is
 *     recorded on the connection's `display` by `afterConnect` — OAuth returns
 *     it with the token; the token method collects it.
 *   - **Errors come back as an ARRAY.** `lib/client.ts` flattens them and keeps
 *     `errorCode` and `fields`, which name the offending columns.
 *   - **`record-upsert` is the retry-safe write.** Keyed on an External ID
 *     field, it converges where `record-create` would duplicate.
 *
 * Deliberately absent: the Bulk API 2.0 (a different, job-based surface),
 * attachment upload (multipart), Lead conversion (SOAP only — the REST API has
 * no equivalent), and the streaming/platform-event trigger.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";
import oauth2 from "./auth/oauth2.ts";

import recordCreate from "./actions/record-create.ts";
import recordGet from "./actions/record-get.ts";
import recordUpdate from "./actions/record-update.ts";
import recordDelete from "./actions/record-delete.ts";
import recordUpsert from "./actions/record-upsert.ts";
import recordCreateMany from "./actions/record-create-many.ts";

import query from "./actions/query.ts";
import queryMore from "./actions/query-more.ts";
import search from "./actions/search.ts";

import sobjectDescribe from "./actions/sobject-describe.ts";
import sobjectList from "./actions/sobject-list.ts";
import limitsGet from "./actions/limits-get.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // record
    recordCreate,
    recordGet,
    recordUpdate,
    recordDelete,
    recordUpsert,
    recordCreateMany,
    // query
    query,
    queryMore,
    search,
    // metadata
    sobjectDescribe,
    sobjectList,
    limitsGet,
  ],
  auth: [accessToken, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
