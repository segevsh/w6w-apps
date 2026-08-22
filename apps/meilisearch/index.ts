/**
 * Meilisearch — search an index, keep its documents current, and manage the
 * settings that decide what "relevant" means.
 *
 * Every path, parameter, required body field and response shape was taken from
 * the OpenAPI 3.1 document Meilisearch publishes in its own
 * `meilisearch/open-api` repository (engine v1.15.2, fetched 2026-08-18).
 *
 * ## There is no vendor host
 *
 * The spec's `servers` block is `/`, because a Meilisearch instance is wherever
 * you run it: your own machine, your own cluster, or a Meilisearch Cloud
 * project on a per-project hostname. So the base URL is a connection field and
 * the egress allowlist is `["*"]` — the posture this pack already uses for
 * `mattermost`, `ghost`, `grafana`, `jenkins` and the other self-hostable apps.
 * That is a deliberately wide allowlist, and it is the price of an app whose
 * server address only the operator knows.
 *
 * It also shapes the health checks: `instance` asks whether **this connection's
 * server** answers, which is the question that matters, and `service` reads
 * Meilisearch Cloud's incident feed while being explicit that it speaks only
 * for Cloud.
 *
 * ## Every write is a receipt, not a result
 *
 * This is the one thing to know before wiring anything downstream. Adding
 * documents, changing settings, creating an index and deleting one all answer
 * immediately with `{taskUid, indexUid, status: "enqueued", type, enqueuedAt}`.
 * The work has **not happened yet**.
 *
 * Two consequences, both quiet:
 *
 *   - A workflow that adds a document and then searches for it **finds
 *     nothing**, and neither call errors.
 *   - A task can **fail** — a malformed document, a filter naming an attribute
 *     that is not filterable — long after the write returned its 200. Nothing
 *     in the write's response can tell you.
 *
 * So every writing action returns the task verbatim with output labels that say
 * so, and `task-get` is documented as the other half of the operation rather
 * than as a utility. It also returns `finished` and `succeeded` booleans, since
 * "is it done" and "did it work" are what a branch actually tests.
 *
 * ## Three more places the shape surprises
 *
 *   - **Two paging contracts.** `/indexes`, `/keys` and the document listing
 *     page by `offset` and answer `{results, offset, limit, total}`; `/tasks`
 *     pages by a **cursor** and answers `{results, total, limit, from, next}`.
 *     `offset` is not a parameter on `/tasks` and is ignored rather than
 *     rejected, so the wrong walk re-reads page one forever. The client has two
 *     methods and the actions use the right one.
 *   - **Add can mean replace or merge.** `POST` replaces a document with the
 *     same primary key, dropping fields you did not send; `PUT` merges into it.
 *     Getting it backwards silently loses half a document, so `document-add`
 *     makes it a required choice rather than two similarly-named actions.
 *   - **The primary key is guessed once and then fixed.** On an empty index
 *     Meilisearch infers it from the first batch, and changing it afterwards
 *     means rebuilding the index. Both `index-create` and `document-add` offer
 *     it explicitly and say why.
 *
 * ## A spec defect worth recording
 *
 * The document declares the search body's properties in snake_case
 * (`attributes_to_retrieve`, `hits_per_page`, `matching_strategy`) while
 * declaring the *same fields* as camelCase query parameters on the GET form of
 * search (`attributesToRetrieve`, `hitsPerPage`, `matchingStrategy`). Both
 * cannot be what the engine accepts. The snake_case names are the Rust struct
 * fields the generator saw before serialization renamed them; the camelCase
 * ones are hand-written and match Meilisearch's own documentation. This app
 * sends camelCase.
 *
 * Deliberately out of scope:
 *   - **The thirty per-setting sub-paths.** `/settings/synonyms`,
 *     `/settings/stop-words` and the rest each have get/put/delete. Thirty
 *     near-identical actions would be a worse surface than one that matches how
 *     settings are actually reasoned about — as a single configuration.
 *   - **Dumps and snapshots.** Backup and restore is an operator task with real
 *     disk consequences, and triggering one from a workflow step invites doing
 *     it on a schedule nobody is watching.
 *   - **Key creation and deletion.** Minting a credential from inside a
 *     workflow is a different kind of act from using one; keys are readable
 *     here so a scope failure is diagnosable, and not writable.
 *   - **Log streaming, experimental features and the network topology
 *     endpoints** — operator surfaces, not workflow ones.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import search from "./actions/search.ts";
import multiSearch from "./actions/multi-search.ts";
import facetSearch from "./actions/facet-search.ts";
import similarDocuments from "./actions/similar-documents.ts";
import documentAdd from "./actions/document-add.ts";
import documentList from "./actions/document-list.ts";
import documentGet from "./actions/document-get.ts";
import documentDelete from "./actions/document-delete.ts";
import documentsClear from "./actions/documents-clear.ts";
import indexList from "./actions/index-list.ts";
import indexGet from "./actions/index-get.ts";
import indexCreate from "./actions/index-create.ts";
import indexUpdate from "./actions/index-update.ts";
import indexDelete from "./actions/index-delete.ts";
import indexStats from "./actions/index-stats.ts";
import settingsGet from "./actions/settings-get.ts";
import settingsUpdate from "./actions/settings-update.ts";
import settingsReset from "./actions/settings-reset.ts";
import taskGet from "./actions/task-get.ts";
import taskList from "./actions/task-list.ts";
import taskCancel from "./actions/task-cancel.ts";
import keyList from "./actions/key-list.ts";
import statsGet from "./actions/stats-get.ts";
import versionGet from "./actions/version-get.ts";

import instance from "./health/instance.ts";
import service from "./health/service.ts";

export default {
  actions: [
    // search — the reason the app exists
    search,
    multiSearch,
    facetSearch,
    similarDocuments,
    // documents
    documentAdd,
    documentList,
    documentGet,
    documentDelete,
    documentsClear,
    // indexes
    indexList,
    indexGet,
    indexCreate,
    indexUpdate,
    indexDelete,
    indexStats,
    // settings — what "relevant" means
    settingsGet,
    settingsUpdate,
    settingsReset,
    // tasks — the other half of every write
    taskGet,
    taskList,
    taskCancel,
    // instance
    keyList,
    statsGet,
    versionGet,
  ],
  auth: [apiKey],
  healthChecks: [instance, service],
} satisfies AppDefinition;
