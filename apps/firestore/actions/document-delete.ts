import type { ActionDefinition } from "@w6w/types";
import { documentName, FirestoreClient, resolveDatabase, resolveProject } from "../lib/client.ts";
import { DATABASE_PARAM, DOCUMENT_PATH_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `DELETE /v1/{+name}` — verified against the discovery doc (`documents.delete`,
 * query `currentDocument.exists` / `currentDocument.updateTime`, response
 * `Empty`).
 *
 * Delete is atomic per document but is **not** recursive: subcollections under
 * the document become unreachable without being deleted. This action says so
 * rather than implying otherwise, and `bulkDeleteDocuments` (a database-admin
 * RPC with its own longer-running operation) is out of scope — see the README.
 *
 * The precondition is what makes a delete safe in a workflow: `Exists` refuses
 * to delete a document that is already gone, so a retry surfaces the difference
 * between "I deleted it" and "someone else did".
 */
const action: ActionDefinition = {
  key: "document-delete",
  type: "perform",
  resource: "document",
  title: "Delete a document",
  description: "Delete one document, with an optional existence precondition.",
  // Deleting the same path twice is not the same outcome, but it is the same
  // end state — and the precondition is how a caller asks for the stricter one.
  idempotent: true,
  params: [
    PROJECT_PARAM,
    DATABASE_PARAM,
    DOCUMENT_PATH_PARAM,
    {
      key: "exists",
      label: "Document Must",
      type: "select",
      default: "exists",
      options: [
        { value: "exists", label: "Already exist (fail if already gone)" },
        { value: "missing", label: "Not exist yet (fail if present)" },
        { value: "", label: "No precondition" },
      ],
      hint: "The default refuses to delete a document that is already gone.",
    },
    {
      key: "currentUpdateTime",
      label: "Must Have Update Time",
      type: "string",
      default: "",
      placeholder: "2026-09-22T10:00:00.123456Z",
      hint: "Fail unless the document's updateTime is exactly this.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Deleted resource name" },
    { key: "deleted", type: "boolean", label: "Delete applied" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const database = resolveDatabase(ctx.connection, p.databaseId);
    const name = documentName(project, database, String(p.path ?? ""));
    // The documented default is "must already exist"; only `missing` and the
    // explicit blank opt out of a precondition.
    const exists = p.exists === "missing" ? false : p.exists === "" ? undefined : true;

    ctx.log("info", "deleting a Firestore document", { name, exists });

    await new FirestoreClient(ctx).request(`/${name}`, {
      method: "DELETE",
      query: {
        "currentDocument.exists": exists,
        "currentDocument.updateTime": (p.currentUpdateTime as string | undefined) || undefined,
      },
    });
    return { deleted: true, name };
  },
};

export default action;
