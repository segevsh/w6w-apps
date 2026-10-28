/**
 * BigQuery — run SQL, stream rows in, and manage the datasets, tables and jobs
 * around them.
 *
 * Every path, parameter, required body field and response shape was taken from
 * the discovery document Google serves from the API's own host
 * (`https://bigquery.googleapis.com/$discovery/rest?version=v2`, fetched
 * 2026-08-18). The OAuth shape and the scope-namespace convention follow this
 * pack's `google-ads` and `google-analytics` apps.
 *
 * Three things about this API shape the app, and each is the kind of thing that
 * silently produces wrong results rather than an error:
 *
 *   - **Rows are positional, not named.** A query returns a schema plus rows
 *     shaped `{f: [{v: "ada"}, {v: "36"}]}` — every scalar a string, `null` for
 *     NULL, nested `{f: […]}` for a RECORD. The reading actions return that raw
 *     form *and* a decoded `rows` array. Values stay strings on purpose:
 *     BigQuery returns INT64 as a string precisely because it does not fit a
 *     JSON number.
 *   - **A query can "succeed" without finishing.** `timeoutMs` bounds how long
 *     BigQuery waits before replying, not the query. Past it you get
 *     `jobComplete: false` and a job reference, and `query-results-get` fetches
 *     the rows later. Likewise a job's `status.state: DONE` does **not** mean
 *     success — a failed job is DONE too, with the reason in
 *     `status.errorResult`.
 *   - **Streaming inserts fail partially with a 200.** `rows-insert` can be
 *     rejected per row, listed under `insertErrors`, while the request itself
 *     succeeds. It returns that array and an explicit `insertedRows` count.
 *
 * **On cost.** The project on the Connection is the one that gets *billed*,
 * which is not always the one that owns the data. `query-run` exposes both
 * guards BigQuery offers: `dryRun`, which prices a query without running or
 * billing it, and `maximumBytesBilled`, which makes BigQuery fail the query
 * rather than exceed a ceiling. `rows-list` reads a table with no query at all,
 * and so no bytes billed.
 *
 * Deliberately out of scope:
 *   - **Service-account auth.** Most production BigQuery access is a signed
 *     JWT assertion rather than a user OAuth flow. That is a different auth
 *     shape; this app ships OAuth and says so rather than half-implementing it.
 *   - **Cloud Storage load and export.** `job-insert` will carry a `load` or
 *     `extract` configuration, but those move data through GCS and need a
 *     `devstorage.*` scope this app deliberately does not request — it asks for
 *     the narrow `bigquery` scope, and that trade is documented on the action.
 *   - **IAM policies, row access policies, routines and ML models.** Each is
 *     its own surface with its own vocabulary.
 *   - **The Storage Read/Write API** — a separate gRPC service, not this REST
 *     one.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import queryRun from "./actions/query-run.ts";
import queryResultsGet from "./actions/query-results-get.ts";
import rowsList from "./actions/rows-list.ts";
import rowsInsert from "./actions/rows-insert.ts";
import jobInsert from "./actions/job-insert.ts";
import jobGet from "./actions/job-get.ts";
import jobList from "./actions/job-list.ts";
import jobCancel from "./actions/job-cancel.ts";
import datasetList from "./actions/dataset-list.ts";
import datasetGet from "./actions/dataset-get.ts";
import datasetCreate from "./actions/dataset-create.ts";
import datasetDelete from "./actions/dataset-delete.ts";
import tableList from "./actions/table-list.ts";
import tableGet from "./actions/table-get.ts";
import tableCreate from "./actions/table-create.ts";
import tableUpdate from "./actions/table-update.ts";
import tableDelete from "./actions/table-delete.ts";
import projectList from "./actions/project-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // query
    queryRun,
    queryResultsGet,
    // table data
    rowsList,
    rowsInsert,
    // job
    jobInsert,
    jobGet,
    jobList,
    jobCancel,
    // dataset
    datasetList,
    datasetGet,
    datasetCreate,
    datasetDelete,
    // table
    tableList,
    tableGet,
    tableCreate,
    tableUpdate,
    tableDelete,
    // project
    projectList,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
