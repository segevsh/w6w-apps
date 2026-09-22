/**
 * Firestore — read and write documents in a Google Cloud Firestore database
 * over the REST API (`firestore.googleapis.com`, v1).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-09-22 against the Cloud Firestore discovery document the API
 * serves from its own host
 * (`https://firestore.googleapis.com/$discovery/rest?version=v1`, `revision`
 * `20260911`, 320,319 bytes), cross-checked against the human REST reference.
 * Nothing here came from a third-party integration directory.
 *
 * Four findings shaped the design, and each is documented where it bites:
 *
 *  1. **Every value is a typed-union object** (`lib/client.ts`). Firestore has no
 *     bare-JSON shortcut: `fields: {age: {integerValue: "36"}}`, not
 *     `{age: 36}`. `toValue`/`fromValue` are the translation, and the whole
 *     document/query surface is built on them.
 *  2. **Every path parameter is a resource *name*, not an id**
 *     (`lib/client.ts`). A collection id is a separate request field from its
 *     `parent`, so a collection path has an odd number of segments and a document
 *     path an even one — a rule the client enforces rather than silently mangling.
 *  3. **`runQuery`, `runAggregationQuery` and `batchGet` answer as JSON arrays**
 *     (`lib/client.ts`, `actions/query-run.ts`). They are streaming RPCs, and
 *     Google's REST transport maps the stream to a list — this is how Google's
 *     own generated clients read them.
 *  4. **One mask decides an update** (`actions/document-update.ts`). With no
 *     `updateMask`, a patch replaces the document; with one, only the named
 *     fields change. The action exposes both, because both are real.
 *
 * The query surface is deliberately a small subset of `StructuredQuery` — AND
 * filters, ordering and a limit — instead of a half-mirror of the full DSL; the
 * README lists exactly what is left out. The `datastore` scope is the only one
 * requested, and the one auth method is OAuth: a service-account/JWT mode is a
 * natural follow-up, not a half-built extra.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import databaseGet from "./actions/database-get.ts";
import documentGet from "./actions/document-get.ts";
import documentCreate from "./actions/document-create.ts";
import documentUpdate from "./actions/document-update.ts";
import documentDelete from "./actions/document-delete.ts";
import documentList from "./actions/document-list.ts";
import collectionListIds from "./actions/collection-list-ids.ts";
import queryRun from "./actions/query-run.ts";
import queryRunAggregation from "./actions/query-run-aggregation.ts";
import documentsBatchGet from "./actions/documents-batch-get.ts";
import documentsBatchWrite from "./actions/documents-batch-write.ts";
import documentsCommit from "./actions/documents-commit.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // database
    databaseGet,
    // document CRUD
    documentGet,
    documentCreate,
    documentUpdate,
    documentDelete,
    documentList,
    // collections
    collectionListIds,
    // queries
    queryRun,
    queryRunAggregation,
    // batches
    documentsBatchGet,
    documentsBatchWrite,
    documentsCommit,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
