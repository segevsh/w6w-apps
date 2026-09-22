import type { ActionDefinition } from "@w6w/types";
import type { FirestoreValue } from "../lib/client.ts";
import {
  decodeFields,
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

/** One element of the streamed `runAggregationQuery` response. */
interface RunAggregationQueryResponse {
  result?: { aggregateFields?: Record<string, FirestoreValue> };
  readTime?: string;
}

/**
 * `POST /v1/{+parent}:runAggregationQuery` — verified against the discovery doc
 * (`documents.runAggregationQuery`, request `RunAggregationQueryRequest
 * {structuredAggregationQuery}`, response `RunAggregationQueryResponse`).
 *
 * This is the cheap way to answer "how many?" — `COUNT(*)` is billed as *one
 * document read per 1,000 matching index entries*, not one per document, which
 * is why it is an action rather than something a caller fakes by paging through
 * `query-run` and counting.
 *
 * The aggregation is a `Count`, `Sum` or `Avg` over the same simplified
 * `StructuredQuery` `query-run` builds (see there for exactly what subset of
 * the query DSL is reachable). `alias` names the result field; without it
 * Firestore picks one (`field_1`), so 'count' is used as the default for the
 * common case.
 *
 * The result arrives as a single-element JSON array (the streamed-response
 * mapping), with the aggregate values as typed `Value`s that are decoded here.
 */
const action: ActionDefinition = {
  key: "query-run-aggregation",
  type: "read",
  resource: "document",
  title: "Run an aggregation query",
  description: "Count, sum or average a collection's fields without reading every document.",
  params: [
    PROJECT_PARAM,
    DATABASE_PARAM,
    PARENT_PATH_PARAM,
    COLLECTION_ID_PARAM,
    {
      key: "aggregation",
      label: "Aggregation",
      type: "select",
      default: "count",
      options: [
        { value: "count", label: "Count — number of matching documents" },
        { value: "sum", label: "Sum — requires a numeric field" },
        { value: "avg", label: "Average — requires a numeric field" },
      ],
    },
    {
      key: "field",
      label: "Field",
      type: "string",
      default: "",
      placeholder: "amount",
      hint: "Required for Sum and Average; ignored by Count.",
    },
    {
      key: "alias",
      label: "Result Name",
      type: "string",
      default: "",
      placeholder: "total",
      hint: "Name of the result field. Blank uses the aggregation name.",
    },
    {
      key: "filters",
      label: "Filters",
      type: "json",
      default: "[]",
      placeholder: '[{"field": "status", "op": "==", "value": "paid"}]',
      hint: "Array of {field, op, value}, combined with AND.",
    },
    {
      key: "allDescendants",
      label: "Collection Group",
      type: "boolean",
      default: false,
      hint: "Aggregate this collection id anywhere under the parent document.",
    },
  ],
  output: [
    { key: "result", type: "object", label: "Aggregate values by alias" },
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

    const aggregation = String(p.aggregation ?? "count").trim().toLowerCase();
    const field = String(p.field ?? "").trim();
    const alias = String(p.alias ?? "").trim();

    const aggregator: Record<string, unknown> = {};
    if (aggregation === "count") {
      aggregator.count = {};
    } else if (aggregation === "sum" || aggregation === "avg") {
      if (!field) throw new Error(`\`field\` is required for a \`${aggregation}\` aggregation`);
      aggregator[aggregation] = { field: { fieldPath: field } };
    } else {
      throw new Error(`\`${aggregation}\` is not an aggregation — use count, sum or avg`);
    }
    if (alias) aggregator.alias = alias;

    const body = {
      structuredAggregationQuery: {
        structuredQuery: buildStructuredQuery({
          collectionId,
          allDescendants: p.allDescendants,
          filters: p.filters,
        }),
        aggregations: [aggregator],
      },
    };

    ctx.log("info", "running a Firestore aggregation", { parent, collectionId, aggregation });

    const responses = await new FirestoreClient(ctx).requestStream<RunAggregationQueryResponse>(
      `/${parent}:runAggregationQuery`,
      { method: "POST", body },
    );

    const last = responses.length ? responses[responses.length - 1] : undefined;
    return {
      result: decodeFields(last?.result?.aggregateFields),
      readTime: last?.readTime,
    };
  },
};

export default action;
