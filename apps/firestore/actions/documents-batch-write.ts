import type { ActionDefinition } from "@w6w/types";
import {
  databaseName,
  documentName,
  FirestoreClient,
  parseJson,
  resolveDatabase,
  resolveProject,
} from "../lib/client.ts";
import { buildWrites } from "../lib/query.ts";
import { DATABASE_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /v1/{+database}/documents:batchWrite` — verified against the discovery
 * doc (`documents.batchWrite`, request `BatchWriteRequest {writes, labels}`,
 * response `BatchWriteResponse {writeResults, status}`).
 *
 * The non-atomic counterpart to `documents-commit`. Two documented differences
 * matter and are surfaced rather than hidden:
 *
 *   - **Each write succeeds or fails independently.** The response carries a
 *     `status` array, one entry per write, so a partial failure is visible —
 *     `documents-commit` would instead have failed the whole batch.
 *   - **One write per document per request.** Naming the same document twice is
 *     rejected by the API.
 *
 * The entry vocabulary is the same `set`/`update`/`delete` shape
 * `documents-commit` takes, mapped by the same `buildWrites`.
 */
const action: ActionDefinition = {
  key: "documents-batch-write",
  type: "perform",
  resource: "document",
  title: "Batch write documents",
  description: "Apply many writes independently — each may succeed or fail on its own.",
  idempotent: false,
  params: [
    PROJECT_PARAM,
    DATABASE_PARAM,
    {
      key: "writes",
      label: "Writes",
      type: "json",
      required: true,
      default: "[]",
      placeholder: '[{"op": "update", "path": "users/alice", "mask": "age", "data": {"age": 37}}]',
      hint: "Array of {op, path, data?, mask?, exists?, updateTime?}. One write per document.",
    },
    {
      key: "labels",
      label: "Labels",
      type: "json",
      default: "{}",
      placeholder: '{"job": "nightly-import"}',
      hint: "Optional string→string labels attached to the batch write.",
    },
  ],
  output: [
    { key: "writeResults", type: "array", label: "One result per write, in order" },
    { key: "status", type: "array", label: "Per-write status — empty means success" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const database = resolveDatabase(ctx.connection, p.databaseId);
    const writes = buildWrites(
      parseJson(p.writes, "writes"),
      (path) => documentName(project, database, path),
    );
    const labels = parseJson(p.labels, "labels") as Record<string, string> | undefined;

    ctx.log("info", "batch-writing Firestore documents", { count: writes.length });

    return await new FirestoreClient(ctx).request(
      `/${databaseName(project, database)}/documents:batchWrite`,
      { method: "POST", body: { writes, labels } },
    );
  },
};

export default action;
