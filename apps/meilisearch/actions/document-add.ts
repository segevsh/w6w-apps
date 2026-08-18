import type { ActionDefinition } from "@w6w/types";
import { json, MeilisearchClient, resolveIndex } from "../lib/client.ts";
import { INDEX_PARAM, TASK_OUTPUT } from "../lib/params.ts";

/**
 * `POST` and `PUT /indexes/{indexUid}/documents` — verified against
 * Meilisearch's OpenAPI document (`replace_documents`, `update_documents`).
 *
 * **The verb decides whether existing fields survive.** Both take the same body
 * and differ only in that:
 *
 *   - `POST` **replaces** a document with the same primary key. Fields you did
 *     not send are gone.
 *   - `PUT` **merges** into it. Fields you did not send are kept.
 *
 * Getting this backwards does not error — it quietly drops half a document — so
 * the choice is a required parameter here rather than two similarly-named
 * actions someone picks between by autocomplete.
 *
 * **This returns a task, not a result.** The documents are *enqueued*. A
 * workflow that adds a document and then searches for it will not find it, and
 * neither call fails. `task-get` is the other half of this operation.
 *
 * **The primary key is inferred once and then fixed.** On an empty index
 * Meilisearch guesses it from the first batch — an attribute named `id`, or one
 * ending in `Id`. Guessing wrong is not recoverable by sending a different
 * batch; naming it explicitly the first time is.
 */
const action: ActionDefinition = {
  key: "document-add",
  type: "perform",
  resource: "document",
  title: "Add or update documents",
  description: "Enqueue documents into an index, replacing or merging by primary key.",
  // The write is enqueued; sending twice enqueues twice, though the result is
  // the same document state.
  idempotent: true,
  params: [
    INDEX_PARAM,
    {
      key: "documents",
      label: "Documents",
      type: "json",
      required: true,
      default: "",
      placeholder: '[{"id":1,"title":"Dune","genres":["scifi"]}]',
      hint: "An array of objects. Each needs the index's primary key.",
    },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      required: true,
      default: "merge",
      options: [
        { value: "merge", label: "Merge — keep fields you did not send (PUT)" },
        { value: "replace", label: "Replace — drop fields you did not send (POST)" },
      ],
      hint: "Getting this wrong does not error; it silently drops the fields you omitted.",
    },
    {
      key: "primaryKey",
      label: "Primary Key",
      type: "string",
      default: "",
      hint: "Only used when the index has none yet. Meilisearch otherwise GUESSES from the " +
        "first batch, and the guess is permanent.",
    },
  ],
  output: TASK_OUTPUT,

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const index = resolveIndex(ctx.connection, p.indexUid);
    const documents = json(p.documents, "documents");
    if (!Array.isArray(documents) || documents.length === 0) {
      throw new Error("`documents` is required — a non-empty array of objects");
    }
    // The host applies `default`, but a bare execute() call does not.
    const mode = String(p.mode ?? "merge");
    if (mode !== "merge" && mode !== "replace") {
      throw new Error("`mode` must be `merge` or `replace`");
    }

    const primaryKey = String(p.primaryKey ?? "").trim();
    ctx.log("info", "enqueueing Meilisearch documents", {
      index,
      mode,
      documents: documents.length,
    });

    return await new MeilisearchClient(ctx).request(
      `/indexes/${encodeURIComponent(index)}/documents`,
      {
        method: mode === "merge" ? "PUT" : "POST",
        query: primaryKey ? { primaryKey } : undefined,
        body: documents,
      },
    );
  },
};

export default action;
