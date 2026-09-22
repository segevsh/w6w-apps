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
 * `POST /v1/{+database}/documents:commit` — verified against the discovery doc
 * (`documents.commit`, request `CommitRequest {writes: Write[], transaction?}`,
 * response `CommitResponse {writeResults, commitTime}`).
 *
 * This is the **atomic** batch: every write applies or none does, in order. That
 * is the difference from `documents-batch-write`, which applies them
 * independently — and why this is the action to reach for when two documents
 * have to agree.
 *
 * Each entry is one of three shapes, all mapped to the wire `Write` by
 * `buildWrites`:
 *
 * ```jsonc
 * [{ "op": "set",    "path": "users/alice", "data": { "name": "Ada" } },
 *  { "op": "update", "path": "users/alice", "mask": "age", "data": { "age": 37 } },
 *  { "op": "delete", "path": "users/bob",   "exists": true }]
 * ```
 *
 * `set` replaces the document; `update` writes only `mask`'s fields (deleting any
 * masked field `data` omits); `delete` removes it. Optional `exists` /
 * `updateTime` are preconditions. Field transforms (`increment`, `arrayUnion`,
 * `serverTimestamp`) are a separate `Write.transform` arm and are **not**
 * exposed here — see the README.
 */
const action: ActionDefinition = {
  key: "documents-commit",
  type: "perform",
  resource: "document",
  title: "Commit a batch of writes",
  description: "Apply an array of set/update/delete writes atomically, in order.",
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
      placeholder: '[{"op": "set", "path": "users/alice", "data": {"name": "Ada"}}]',
      hint: "Array of {op, path, data?, mask?, exists?, updateTime?}, applied atomically.",
    },
    {
      key: "transaction",
      label: "Transaction",
      type: "string",
      default: "",
      hint: "Optional base64 transaction id from `beginTransaction`. Blank commits on its own.",
    },
  ],
  output: [
    { key: "writeResults", type: "array", label: "One result per write, in order" },
    { key: "commitTime", type: "string", label: "Commit time" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const database = resolveDatabase(ctx.connection, p.databaseId);
    const writes = buildWrites(
      parseJson(p.writes, "writes"),
      (path) => documentName(project, database, path),
    );

    ctx.log("info", "committing Firestore writes", { count: writes.length });

    return await new FirestoreClient(ctx).request(
      `/${databaseName(project, database)}/documents:commit`,
      {
        method: "POST",
        body: {
          writes,
          transaction: (p.transaction as string | undefined) || undefined,
        },
      },
    );
  },
};

export default action;
