/**
 * Splunk Cloud Platform — search jobs, saved searches and indexes.
 *
 * **Scoped to Splunk Cloud Platform only** (`*.splunkcloud.com`), not
 * self-hosted/on-prem Splunk. w6w's sandbox can only reach hosts declared
 * statically at publish time; a self-hosted Splunk install lives at an
 * arbitrary customer-chosen domain a manifest cannot enumerate, so honest
 * support for it is not possible from a single published App. Splunk Cloud
 * instances all live under the fixed `*.splunkcloud.com` suffix, which is
 * what makes a wildcard `network.allow` entry legitimate here. See README.md.
 *
 * The thing that shapes this app, same as Zendesk's per-account subdomain:
 * every Splunk Cloud stack has its own host — `acme.splunkcloud.com`, with
 * the management/REST API on port 8089. So:
 *
 *   - `w6w.network.allow` declares `*.splunkcloud.com`.
 *   - the stack hostname is an Auth field, not an Action param: it
 *     identifies the tenant, so it belongs to the Connection. `afterConnect`
 *     records it on the connection's redacted `display`, and `lib/client.ts`
 *     reads it from there.
 *
 * Deliberately absent: HTTP Event Collector (event ingestion). HEC lives on
 * a DIFFERENT hostname than the management API — `http-inputs-<host>` on
 * AWS, `http-inputs.<host>` on GCP/Azure/GovCloud (verified against
 * Splunk's own HEC docs) — a transform that depends on which cloud the
 * customer's stack runs on, which this app has no way to know from the
 * stack hostname alone. HEC also authenticates with its own per-input HEC
 * token via `Authorization: Splunk <token>`, a different scheme from the
 * management API's `Authorization: Bearer <token>` — a second credential
 * this app's single Auth method does not collect. Guessing either would
 * violate the "don't invent endpoints" rule this app was built under, so
 * event ingestion is left out rather than modeled dishonestly.
 */
import type { AppDefinition } from "@w6w/types";
import token from "./auth/token.ts";

import searchCreate from "./actions/search-create.ts";
import searchOneshot from "./actions/search-oneshot.ts";
import searchGet from "./actions/search-get.ts";
import searchGetResults from "./actions/search-get-results.ts";
import searchGetMany from "./actions/search-get-many.ts";
import searchDelete from "./actions/search-delete.ts";
import savedSearchGetMany from "./actions/saved-search-get-many.ts";
import indexGetMany from "./actions/index-get-many.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // search jobs
    searchCreate,
    searchOneshot,
    searchGet,
    searchGetResults,
    searchGetMany,
    searchDelete,
    // saved searches
    savedSearchGetMany,
    // indexes
    indexGetMany,
  ],
  auth: [token],
  healthChecks: [service],
} satisfies AppDefinition;
