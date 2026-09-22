import type { ActionDefinition } from "@w6w/types";
import {
  collectionParent,
  decodeDocument,
  encodeFields,
  FirestoreClient,
  parseJson,
  resolveDatabase,
  resolveProject,
} from "../lib/client.ts";
import { COLLECTION_PATH_PARAM, DATABASE_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /v1/{+parent}/{collectionId}` — verified against the discovery doc
 * (`documents.createDocument`, request body `Document`).
 *
 * Two things this action exists to get right:
 *
 *   - **The collection id is its own path segment.** `parent` is
 *     `…/documents` for a top-level collection, or
 *     `…/documents/{parentDocumentPath}` for a subcollection — the id is never
 *     part of it. The caller gives the whole `collectionPath` and the split is
 *     done once, in `lib/client.ts`.
 *   - **`documentId` is optional.** Omitted, Firestore assigns a random 20-byte
 *     id and the created document's `name` carries it back. Supplied, the write
 *     fails if that id already exists (unlike a create-or-replace), so a
 *     workflow retry cannot silently clobber.
 *
 * The data is converted from plain JS to typed `Value`s by
 * `encodeFields` — see `toValue` for the one escape hatch (a single-key
 * `{timestampValue: …}` / `{geoPointValue: …}` object is taken as already typed).
 */
const action: ActionDefinition = {
  key: "document-create",
  type: "perform",
  resource: "document",
  title: "Create a document",
  description: "Create a document in a collection, with a chosen or auto-generated id.",
  idempotent: false,
  params: [
    PROJECT_PARAM,
    DATABASE_PARAM,
    COLLECTION_PATH_PARAM,
    {
      key: "documentId",
      label: "Document ID",
      type: "string",
      default: "",
      placeholder: "alice",
      hint: "Leave blank to let Firestore assign one. Set, the create fails if that id exists.",
    },
    {
      key: "data",
      label: "Fields",
      type: "json",
      required: true,
      default: "{}",
      placeholder: '{"name": "Ada", "age": 36}',
      hint: "Plain JSON. Whole numbers become int64, other numbers doubles — use " +
        '{"timestampValue": "…"} or {"geoPointValue": {…}} for typed values.',
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "data", type: "object", label: "Fields, decoded to plain JS" },
    { key: "fields", type: "object", label: "Raw typed fields" },
    { key: "createTime", type: "string", label: "Created" },
    { key: "updateTime", type: "string", label: "Last updated" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const database = resolveDatabase(ctx.connection, p.databaseId);
    const { parent, collectionId } = collectionParent(
      project,
      database,
      String(p.collectionPath ?? ""),
    );

    const data = parseJson(p.data, "data");
    if (data === undefined || data === null || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("`data` must be a JSON object of fields");
    }
    const documentId = String(p.documentId ?? "").trim();

    ctx.log("info", "creating a Firestore document", { parent, collectionId, documentId });

    const doc = await new FirestoreClient(ctx).request(`/${parent}/${collectionId}`, {
      method: "POST",
      query: { documentId: documentId || undefined },
      body: { fields: encodeFields(data as Record<string, unknown>) },
    });
    return decodeDocument(doc as never);
  },
};

export default action;
