import type { ActionDefinition } from "@w6w/types";
import {
  decodeDocument,
  documentName,
  FirestoreClient,
  resolveDatabase,
  resolveProject,
} from "../lib/client.ts";
import {
  DATABASE_PARAM,
  DOCUMENT_PATH_PARAM,
  fieldPaths,
  MASK_PARAM,
  PROJECT_PARAM,
  READ_TIME_PARAM,
} from "../lib/params.ts";

/**
 * `GET /v1/{+name}` — verified against the discovery doc (`documents.get`,
 * response `Document`).
 *
 * `name` is a full resource name, not an id: the action takes the path under
 * `…/documents` (`users/alice`) and assembles it. The optional mask projects
 * fields, which on a large document is the difference between one field and
 * everything.
 *
 * The returned document carries the raw `fields` map (the exact wire types) and
 * a `data` map decoded to plain JS, because a workflow almost always wants the
 * latter — see `lib/client.ts` for the conversion.
 */
const action: ActionDefinition = {
  key: "document-get",
  type: "read",
  resource: "document",
  title: "Get a document",
  description: "Read one document by path, optionally projecting fields.",
  params: [PROJECT_PARAM, DATABASE_PARAM, DOCUMENT_PATH_PARAM, MASK_PARAM, READ_TIME_PARAM],
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
    const name = documentName(project, database, String(p.path ?? ""));

    ctx.log("info", "getting a Firestore document", { name });

    const doc = await new FirestoreClient(ctx).request(`/${name}`, {
      query: {
        // `mask.fieldPaths` is a REPEATED query parameter, so each field path is
        // its own occurrence — a comma-joined single value would read as one
        // field name with a comma in it.
        "mask.fieldPaths": fieldPaths(p.mask),
        readTime: p.readTime as string | undefined,
      },
    });
    return decodeDocument(doc as never);
  },
};

export default action;
