/**
 * Algolia — search indices, and keep their records, settings, synonyms and
 * rules in sync.
 *
 * Every path, parameter, required body field and required ACL was taken from
 * Algolia's own OpenAPI document
 * (https://raw.githubusercontent.com/algolia/api-clients-automation/main/specs/bundled/search.yml,
 * "Search API" v1.0.0, 60 paths, fetched 2026-08-18 — the `algolia` org's own
 * monorepo of "the Algolia API specs and their auto-generated clients", not a
 * fork).
 *
 * Four things about that document shape this app:
 *
 *   - **A third of its paths are not endpoints.** Everything outside the `/1/`
 *     prefix — `/saveObjects`, `/browseObjects`, `/replaceAllObjects`,
 *     `/waitForTask`, `/chunkedBatch`, `/generateSecuredApiKey` and the rest —
 *     is flagged `x-helper: true`: those are *client-library* methods the
 *     codegen emits into the SDKs, not HTTP routes. The giveaway is that
 *     `saveObjects` is declared `GET`. Building actions from them would call
 *     URLs Algolia does not serve, so a test asserts no action does.
 *   - **The host is per-application and split by direction.** `servers` is
 *     `https://{appId}.algolia.net` plus `{appId}-dsn.algolia.net` and three
 *     `{appId}-N.algolianet.com` fallbacks. Algolia's clients read through the
 *     DSN host and write to the primary; the spec marks reads
 *     `x-use-read-transporter`, and `lib/client.ts` honours that.
 *   - **Auth is two headers, not one** — `x-algolia-application-id` and
 *     `x-algolia-api-key` — which is why the auth method is `custom`.
 *   - **Every operation names its required ACL** (`x-acl`), and Algolia keys
 *     are ACL-scoped, so a search-only key will 403 on writes. Each action's
 *     doc comment records the ACL its endpoint needs.
 *
 * **Writes are asynchronous.** Every write answers immediately with a `taskID`
 * and is not searchable until that task is `published`. `task-get` is how a
 * workflow waits, and it is the single most common surprise with this API.
 *
 * Deliberately out of scope:
 *   - **API key management** (`/1/keys`). Creating a key returns a live
 *     credential that would land in step output and run logs — the same
 *     reasoning the `resend` app applies. The auth `test` hook reads
 *     `GET /1/keys/{key}` for the connected key's own ACLs, which is safe.
 *   - **Secured API key generation** — an SDK-side HMAC helper
 *     (`x-helper`), not an endpoint.
 *   - **Clusters and user-ID mapping** (`/1/clusters/*`) — multi-cluster
 *     tenant routing, an infrastructure concern with its own vocabulary.
 *   - **Dictionaries** (`/1/dictionaries/*`), **security sources**
 *     (`/1/security/sources`) and the **`/{path}` custom-request escape
 *     hatch**.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import search from "./actions/search.ts";
import searchMulti from "./actions/search-multi.ts";
import browse from "./actions/browse.ts";
import objectGet from "./actions/object-get.ts";
import objectSave from "./actions/object-save.ts";
import objectAdd from "./actions/object-add.ts";
import objectUpdate from "./actions/object-update.ts";
import objectDelete from "./actions/object-delete.ts";
import objectsBatch from "./actions/objects-batch.ts";
import objectsDeleteBy from "./actions/objects-delete-by.ts";
import indexList from "./actions/index-list.ts";
import indexClear from "./actions/index-clear.ts";
import indexDelete from "./actions/index-delete.ts";
import indexOperation from "./actions/index-operation.ts";
import settingsGet from "./actions/settings-get.ts";
import settingsSet from "./actions/settings-set.ts";
import synonymSave from "./actions/synonym-save.ts";
import synonymSearch from "./actions/synonym-search.ts";
import ruleSave from "./actions/rule-save.ts";
import ruleSearch from "./actions/rule-search.ts";
import taskGet from "./actions/task-get.ts";
import logList from "./actions/log-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // search
    search,
    searchMulti,
    browse,
    // record
    objectGet,
    objectSave,
    objectAdd,
    objectUpdate,
    objectDelete,
    objectsBatch,
    objectsDeleteBy,
    // index
    indexList,
    indexClear,
    indexDelete,
    indexOperation,
    settingsGet,
    settingsSet,
    // relevance configuration
    synonymSave,
    synonymSearch,
    ruleSave,
    ruleSearch,
    // operations
    taskGet,
    logList,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
