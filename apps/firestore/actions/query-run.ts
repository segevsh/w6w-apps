import type { ActionDefinition } from "@w6w/types";
import type { FirestoreDocument } from "../lib/client.ts";
import {
  decodeDocument,
  documentsRoot,
  FirestoreClient,
  pathSegments,
  resolveDatabase,
  resolveProject,
} from "../lib/client.ts";
import { buildStructuredQuery } from "../lib/query.ts";
import {
  COLLECTION_ID_PARAM,
  DATABASE_PARAM,
  PARENT_PATH_PARAM,
  PROJECT_PARAM,
} from "../lib/params.ts";

/** One element of the streamed `runQuery` response (a JSON array over REST). */
interface RunQueryResponse {
  document?: FirestoreDocument;
  readTime?: string;
  done?: boolean;
  transaction?: string;
}

/**
 * `POST /v1/{+parent}:runQuery` — verified against the discovery doc
 * (`documents.runQuery`, request `RunQueryRequest {structuredQuery}`, response
 * "the streamed response" `RunQueryResponse`).
 *
 * **This action takes a small, honest subset of `StructuredQuery`.** Building
 * the wire shape server-side is what keeps the input usable, but a simplified
 * surface that pretends to be the whole query DSL would be worse than a narrow
 * one that says what it covers. What is reachable:
 *
 *   - `from` — one `CollectionSelector` (`collectionId`; `allDescendants` turns
 *     it into a collection-group query),
 *   - `where` — an `AND` of `{field, op, value}` filters (one filter is sent
 *     bare; two or more become a `CompositeFilter`),
 *   - `orderBy` — `[{field, direction}]`,
 *   - `limit` — a non-negative integer.
 *
 * Deliberately NOT reachable, and listed again in the README: `OR` composites,
 * `unaryFilter`s outside the `is-null`/`is-nan` spellings, cursors
 * (`startAt`/`endAt`), `findNearest` vector search, `select` projections,
 * `offset`, `limitToLast`, and `explainOptions`. Each is either a different
 * workflow shape or would need its own vocabulary.
 *
 * **The response is a JSON array**, not one object: `runQuery` is a streaming
 * RPC and Google's REST transport maps the stream to a list (that is exactly how
 * Google's own generated clients read it). The last element carries a `readTime`
 * and no document.
 */
const action: ActionDefinition = {
  key: "query-run",
  type: "search",
  resource: "document",
  title: "Run a query",
  description: "Query a collection with equality/range filters, ordering and a limit.",
  params: [
    PROJECT_PARAM,
    DATABASE_PARAM,
    PARENT_PATH_PARAM,
    COLLECTION_ID_PARAM,
    {
      key: "filters",
      label: "Filters",
      type: "json",
      default: "[]",
      placeholder: '[{"field": "age", "op": ">=", "value": 18}]',
      hint: "Array of {field, op, value}. Combined with AND. Ops: <, <=, >, >=, ==, !=, " +
        "array-contains, array-contains-any, in, not-in, is-null, is-nan, is-not-null, " +
        "is-not-nan.",
    },
    {
      key: "orderBy",
      label: "Order By",
      type: "json",
      default: "[]",
      placeholder: '[{"field": "age", "direction": "descending"}]',
      hint: "Array of {field, direction}. A `!=`, `not-in` or `array-contains-any` filter " +
        "requires its field to be ordered first.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 0,
      hint: "0 (or blank) means no limit — Firestore then returns everything that matches.",
    },
    {
      key: "allDescendants",
      label: "Collection Group",
      type: "boolean",
      default: false,
      hint: "Match this collection id anywhere under the parent document, not just at its " +
        "immediate child.",
    },
  ],
  output: [
    { key: "documents", type: "array", label: "Matching documents (with `data` decoded)" },
    { key: "count", type: "number", label: "Documents returned" },
    { key: "readTime", type: "string", label: "Read time" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const database = resolveDatabase(ctx.connection, p.databaseId);
    const parentPath = pathSegments(String(p.parentPath ?? "")).join("/");
    const parent = parentPath
      ? `${documentsRoot(project, database)}/${parentPath}`
      : documentsRoot(project, database);
    const collectionId = String(p.collectionId ?? "").trim();
    if (!collectionId) throw new Error("`collectionId` is required");

    const structuredQuery = buildStructuredQuery({
      collectionId,
      allDescendants: p.allDescendants,
      filters: p.filters,
      orderBy: p.orderBy,
      limit: p.limit,
    });

    ctx.log("info", "running a Firestore query", { parent, collectionId });

    const responses = await new FirestoreClient(ctx).requestStream<RunQueryResponse>(
      `/${parent}:runQuery`,
      { method: "POST", body: { structuredQuery } },
    );

    const documents = responses
      .filter((r) => r?.document)
      .map((r) => decodeDocument(r.document));
    // The final element is a `readTime`-only sentinel, so the last readTime in
    // the stream is the one the whole query is consistent with.
    const readTime = responses.length ? responses[responses.length - 1].readTime : undefined;
    return { documents, count: documents.length, readTime };
  },
};

export default action;
