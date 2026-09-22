import type { ActionDefinition } from "@w6w/types";
import {
  decodeDocument,
  documentName,
  encodeFields,
  FirestoreClient,
  parseJson,
  resolveDatabase,
  resolveProject,
} from "../lib/client.ts";
import {
  DATABASE_PARAM,
  DOCUMENT_PATH_PARAM,
  fieldPaths,
  MASK_PARAM,
  PROJECT_PARAM,
} from "../lib/params.ts";

/**
 * `PATCH /v1/{+name}` — verified against the discovery doc (`documents.patch`,
 * body `Document`, query `updateMask.fieldPaths` + `currentDocument.*`).
 *
 * **The mask is the whole story of an update.** Firestore's `Write` documentation
 * is explicit: with no `updateMask`, an update to an existing document
 * *overwrites it* — fields you did not send are gone. With a mask, the named
 * fields are written and every other field is left alone (and a masked field the
 * body omits is deleted, which is how a field is unset). So:
 *
 *   - a `mask` means "write exactly these fields" (a partial update), and
 *   - a blank `mask` means "replace the document" — the documented default, kept
 *     deliberately rather than invented away.
 *
 * `currentDocument.exists` is a precondition, not a filter: `true` makes the
 * patch fail unless the document exists, `false` makes it fail if it does.
 */
const action: ActionDefinition = {
  key: "document-update",
  type: "perform",
  resource: "document",
  title: "Update a document",
  description:
    "Patch a document — the fields named by a mask, or the whole document when no mask is given.",
  idempotent: true,
  params: [
    PROJECT_PARAM,
    DATABASE_PARAM,
    DOCUMENT_PATH_PARAM,
    {
      key: "data",
      label: "Fields",
      type: "json",
      required: true,
      default: "{}",
      placeholder: '{"age": 37}',
      hint: "Plain JSON. Whole numbers become int64, other numbers doubles.",
    },
    MASK_PARAM,
    {
      key: "exists",
      label: "Document Must",
      type: "select",
      default: "",
      options: [
        { value: "", label: "No precondition" },
        { value: "exists", label: "Already exist" },
        { value: "missing", label: "Not exist yet" },
      ],
      hint: "A precondition — the patch fails rather than writing to the wrong state.",
    },
    {
      key: "currentUpdateTime",
      label: "Must Have Update Time",
      type: "string",
      default: "",
      placeholder: "2026-09-22T10:00:00.123456Z",
      hint: "Optimistic concurrency: fail unless the document's updateTime is exactly this.",
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
    const name = documentName(project, database, String(p.path ?? ""));

    const data = parseJson(p.data, "data");
    if (data === undefined || data === null || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("`data` must be a JSON object of fields");
    }
    const mask = fieldPaths(p.mask);
    const exists = p.exists === "exists" ? true : p.exists === "missing" ? false : undefined;

    ctx.log("info", "updating a Firestore document", {
      name,
      partial: Boolean(mask),
      fields: mask?.length ?? 0,
    });

    const doc = await new FirestoreClient(ctx).request(`/${name}`, {
      method: "PATCH",
      query: {
        // Repeated, so a comma-joined single value would be one wrong field name.
        "updateMask.fieldPaths": mask,
        "currentDocument.exists": exists,
        "currentDocument.updateTime": (p.currentUpdateTime as string | undefined) || undefined,
      },
      body: { name, fields: encodeFields(data as Record<string, unknown>) },
    });
    return decodeDocument(doc as never);
  },
};

export default action;
