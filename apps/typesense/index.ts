/**
 * Typesense — search collections, index documents, and manage the
 * collections, aliases and keys around them.
 *
 * Two behaviours shape this app. A bulk import answers **200 with per-document
 * results**, so a step that checks the status reports success when every
 * record failed — `document-import` reads every line and fails on a partial
 * write. And search **quietly widens** when a result is thin, dropping query
 * words below ten hits and allowing more typos below a hundred, which is right
 * for a search box and a correctness problem for a workflow acting on the
 * answer — `document-search` exposes both and offers `strict`.
 *
 * Every deployment is its own host, so the health checks are connection-scoped
 * and the interesting one reads `/health`, which needs no key. See
 * `lib/client.ts`.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import service from "./health/service.ts";
import node from "./health/node.ts";
import capacity from "./health/capacity.ts";

import documentSearch from "./actions/document-search.ts";
import multiSearch from "./actions/multi-search.ts";
import documentGet from "./actions/document-get.ts";
import documentUpsert from "./actions/document-upsert.ts";
import documentImport from "./actions/document-import.ts";
import documentDelete from "./actions/document-delete.ts";
import collectionList from "./actions/collection-list.ts";
import collectionGet from "./actions/collection-get.ts";
import collectionCreate from "./actions/collection-create.ts";
import collectionDelete from "./actions/collection-delete.ts";
import aliasList from "./actions/alias-list.ts";
import aliasUpsert from "./actions/alias-upsert.ts";
import keyList from "./actions/key-list.ts";
import keyCreate from "./actions/key-create.ts";
import keyDelete from "./actions/key-delete.ts";
import nodeStats from "./actions/node-stats.ts";

const app: AppDefinition = {
  actions: [
    documentSearch,
    multiSearch,
    documentGet,
    documentUpsert,
    documentImport,
    documentDelete,
    collectionList,
    collectionGet,
    collectionCreate,
    collectionDelete,
    aliasList,
    aliasUpsert,
    keyList,
    keyCreate,
    keyDelete,
    nodeStats,
  ],
  auth: [apiKey],
  healthChecks: [service, node, capacity],
};

export default app;
