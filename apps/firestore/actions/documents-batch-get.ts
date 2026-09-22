import type { ActionDefinition } from "@w6w/types";
import type { FirestoreDocument } from "../lib/client.ts";
import {
  databaseName,
  decodeDocument,
  documentName,
  FirestoreClient,
  resolveDatabase,
  resolveProject,
} from "../lib/client.ts";
import { DATABASE_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/** One element of the streamed `batchGet` response. */
interface BatchGetResponse {
  found?: FirestoreDocument;
  missing?: string;
  readTime?: string;
  transaction?: string;
}

/**
 * `POST /v1/{+database}/documents:batchGet` — verified against the discovery doc
 * (`documents.batchGet`, request `BatchGetDocumentsRequest {documents: string[]}`,
 * response "the streamed response" `BatchGetDocumentsResponse`).
 *
 * Fetches many documents in one round trip, and — unlike a loop of `document-get`
 * — reports **which of them do not exist** via `missing`, distinctly from a
 * document that exists but is empty. That distinction is the point: "absent" and
 * "present with no fields" are different answers, and only this call gives both.
 *
 * The names go out as full resource names
 * (`projects/{p}/databases/{d}/documents/{path}`), assembled here from the same
 * relative paths the other document actions take.
 */
const action: ActionDefinition = {
  key: "documents-batch-get",
  type: "read",
  resource: "document",
  title: "Get several documents",
  description: "Fetch a list of documents at once, reporting which of them do not exist.",
  params: [
    PROJECT_PARAM,
    DATABASE_PARAM,
    {
      key: "paths",
      label: "Document Paths",
      type: "array",
      required: true,
      item: { type: "string", placeholder: "users/alice" },
      hint: "Paths under `…/documents`, one per entry. A full `projects/…` name also works.",
    },
  ],
  output: [
    { key: "documents", type: "array", label: "Documents found (with `data` decoded)" },
    { key: "missing", type: "array", label: "Paths that do not exist" },
    { key: "readTime", type: "string", label: "Read time" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const database = resolveDatabase(ctx.connection, p.databaseId);

    const raw = p.paths;
    const rawPaths = Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw];
    const paths = rawPaths.map((path) => String(path ?? "").trim()).filter(Boolean);
    if (paths.length === 0) throw new Error("`paths` needs at least one document path");
    const names = paths.map((path) => documentName(project, database, path));

    ctx.log("info", "batch-getting Firestore documents", { count: names.length });

    const responses = await new FirestoreClient(ctx).requestStream<BatchGetResponse>(
      `/${databaseName(project, database)}/documents:batchGet`,
      { method: "POST", body: { documents: names } },
    );

    const documents: Array<Record<string, unknown>> = [];
    const missing: string[] = [];
    for (const item of responses) {
      if (item?.found) documents.push(decodeDocument(item.found));
      else if (item?.missing) missing.push(item.missing);
    }
    const readTime = responses.length ? responses[responses.length - 1].readTime : undefined;
    return { documents, missing, readTime };
  },
};

export default action;
