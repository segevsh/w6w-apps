/**
 * Pinecone — read and write a vector index from a workflow: upsert records,
 * search them by vector or by text, manage indexes and namespaces, and call
 * Pinecone's hosted embedding and reranking models.
 *
 * Every path, parameter, required body field and response shape here was taken
 * from the OpenAPI documents Pinecone publishes itself
 * (`pinecone-io/pinecone-api`, `2026-04/db_control`, `db_data` and `inference`,
 * fetched 2026-08-18), and the version negotiation and auth failure modes were
 * measured against `api.pinecone.io` the same day.
 *
 * ## Two planes, and only one has a fixed address
 *
 * The **control plane** is `https://api.pinecone.io` — indexes, backups, and
 * the whole Inference API. The **data plane** — upsert, query, fetch, delete,
 * stats — lives on a **per-index host** that only `GET /indexes/{name}` knows;
 * the data spec's `servers` block is literally `https://{index_host}`.
 *
 * So every data action takes an index **name** and resolves the host through
 * one describe call, cached for the run. Each also accepts an explicit **Index
 * Host** to skip it, which is what a hot loop should pass. This is why the
 * app's egress allowlist has to cover `*.pinecone.io` and not just the API
 * host.
 *
 * ## The API version header is not optional
 *
 * Measured 2026-08-18: omitting `X-Pinecone-Api-Version` does not get you the
 * latest API — it gets you **`2024-04`**, the oldest version Pinecone still
 * serves, echoed back in the response header. This app pins it on every
 * request, to `2026-04`: `2026-07` exists, but the only spec published for it
 * is Nexus, a different product, and `2026-04` is the newest version with
 * published `db_control`, `db_data` and `inference` documents.
 *
 * ## Two conventions on one host
 *
 * `/query`, `/vectors/*` and `/describe_index_stats` are **camelCase**
 * (`topK`, `includeMetadata`, `setMetadata`, `deleteAll`). `/records/*` and
 * the control plane are **snake_case** (`top_k`, `rank_fields`, `field_map`).
 * That is Pinecone's own history, not a mistake here, and each action follows
 * the convention of the route it calls.
 *
 * ## Text in, or vectors in
 *
 * An **integrated-embedding** index (`index-create-for-model`) has Pinecone own
 * the model: records go in as text (`record-upsert-text`) and queries go in as
 * text (`record-search`, which can also rerank). That removes the two failure
 * modes behind most vector-search bugs — embedding queries with a different
 * model from the documents, and a dimension mismatch nobody sees until upsert —
 * at the cost of fixing the model permanently.
 *
 * A plain index (`index-create`) takes vectors you produce yourself, which is
 * the right choice when the embeddings come from somewhere Pinecone does not
 * host.
 *
 * ## What is deliberately destructive, and what guards it
 *
 * `index-delete` and `namespace-delete` remove data with no undo and no export,
 * and `record-delete` by filter or by "everything" cannot say in advance how
 * much it will remove. All of them require an explicit confirmation flag.
 * Deleting a *named list of ids* does not: naming ids is itself the statement
 * of intent.
 *
 * Deliberately out of scope:
 *   - **Collections.** They only work with pod-based indexes, the legacy
 *     deployment model; backups are the serverless equivalent and are here.
 *   - **Pod-based and BYOC index creation.** Sizing an index in pods and
 *     replicas is a capacity-and-price decision that belongs in a console.
 *   - **Bulk imports from object storage.** They need a storage integration
 *     configured out of band, and they are an ingest-pipeline tool rather than
 *     a workflow step.
 *   - **The Admin API** (projects, API keys, service accounts). It
 *     authenticates with an OAuth service account, a different credential from
 *     the project API key this app holds.
 *   - **Assistant and Nexus.** Separate Pinecone products with their own
 *     specs, not the vector database.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import indexList from "./actions/index-list.ts";
import indexGet from "./actions/index-get.ts";
import indexCreate from "./actions/index-create.ts";
import indexCreateForModel from "./actions/index-create-for-model.ts";
import indexConfigure from "./actions/index-configure.ts";
import indexDelete from "./actions/index-delete.ts";
import indexStats from "./actions/index-stats.ts";

import recordUpsert from "./actions/record-upsert.ts";
import recordUpsertText from "./actions/record-upsert-text.ts";
import recordQuery from "./actions/record-query.ts";
import recordSearch from "./actions/record-search.ts";
import recordFetch from "./actions/record-fetch.ts";
import recordList from "./actions/record-list.ts";
import recordUpdate from "./actions/record-update.ts";
import recordDelete from "./actions/record-delete.ts";

import namespaceList from "./actions/namespace-list.ts";
import namespaceDelete from "./actions/namespace-delete.ts";

import embed from "./actions/embed.ts";
import rerank from "./actions/rerank.ts";
import modelList from "./actions/model-list.ts";
import modelGet from "./actions/model-get.ts";

import backupCreate from "./actions/backup-create.ts";
import backupList from "./actions/backup-list.ts";
import indexRestore from "./actions/index-restore.ts";

import service from "./health/service.ts";
import indexes from "./health/indexes.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // writing
    recordUpsert,
    recordUpsertText,
    recordUpdate,
    recordDelete,
    // reading
    recordQuery,
    recordSearch,
    recordFetch,
    recordList,
    indexStats,
    // the models behind both
    embed,
    rerank,
    modelList,
    modelGet,
    // indexes
    indexList,
    indexGet,
    indexCreate,
    indexCreateForModel,
    indexConfigure,
    indexDelete,
    // tenancy
    namespaceList,
    namespaceDelete,
    // safety net
    backupCreate,
    backupList,
    indexRestore,
  ],
  auth: [apiKey],
  healthChecks: [service, indexes, quota],
} satisfies AppDefinition;
