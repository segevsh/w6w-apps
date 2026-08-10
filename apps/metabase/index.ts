/**
 * Metabase — saved questions, ad-hoc MBQL/SQL queries, collections, dashboards
 * and schema discovery against a Metabase instance's REST API (`<site>/api/*`).
 *
 * Every path, verb, body field and enum in this app was verified against
 * Metabase's own sources on 2026-08-03 — its OpenAPI document
 * (`metabase/metabase`, `docs/api.json`, OpenAPI 3.1, 561 paths), the Clojure
 * source that document is generated from, and a live `metabase/metabase:latest`
 * container running **v0.63.2.7**. Nothing here came from a third-party
 * integration directory.
 *
 * The three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **A successful query returns HTTP 202, not 200** (`lib/client.ts`).
 *  2. **A query result carries its own `status`, and `failed` can ride a 2xx**
 *     (`lib/client.ts`, `runQuery`).
 *  3. **`/livez` returns 200 unconditionally** and is therefore useless as a
 *     health probe; `/api/health` is the one that checks the app-db
 *     (`health/instance.ts`).
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import questionRun from "./actions/question-run.ts";
import questionExport from "./actions/question-export.ts";
import questionList from "./actions/question-list.ts";
import questionGet from "./actions/question-get.ts";
import questionCreate from "./actions/question-create.ts";
import questionUpdate from "./actions/question-update.ts";

import queryRun from "./actions/query-run.ts";
import queryExport from "./actions/query-export.ts";

import collectionList from "./actions/collection-list.ts";
import collectionItems from "./actions/collection-items.ts";
import collectionCreate from "./actions/collection-create.ts";

import dashboardList from "./actions/dashboard-list.ts";
import dashboardGet from "./actions/dashboard-get.ts";
import dashboardCardRun from "./actions/dashboard-card-run.ts";

import databaseList from "./actions/database-list.ts";
import databaseMetadata from "./actions/database-metadata.ts";

import search from "./actions/search.ts";

import service from "./health/service.ts";
import instance from "./health/instance.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // question (card)
    questionRun,
    questionExport,
    questionList,
    questionGet,
    questionCreate,
    questionUpdate,
    // ad-hoc query (dataset)
    queryRun,
    queryExport,
    // collection
    collectionList,
    collectionItems,
    collectionCreate,
    // dashboard
    dashboardList,
    dashboardGet,
    dashboardCardRun,
    // database / discovery
    databaseList,
    databaseMetadata,
    search,
  ],
  // API key only. Metabase's older session-token flow still works, but `sign`
  // is network-less and a session token has to be fetched before it can be
  // attached — and it expires on a deadline nothing in the login response
  // reveals. See auth/api-key.ts for the full reasoning.
  auth: [apiKey],
  healthChecks: [service, instance, quota],
} satisfies AppDefinition;
