import type { ActionDefinition } from "@w6w/types";
import { csv, json, MeilisearchClient, resolveIndex } from "../lib/client.ts";
import { INDEX_PARAM, TASK_OUTPUT } from "../lib/params.ts";

/**
 * Three delete endpoints, one action — verified against Meilisearch's OpenAPI
 * document (`delete_document`, `delete_documents_batch`,
 * `delete_documents_by_filter`).
 *
 * They are one action because choosing between them is a single question — *how
 * do you name what to delete* — and three near-identical actions would invite
 * picking the wrong one:
 *
 *   - **By id** — `DELETE …/documents/{id}`.
 *   - **By ids** — `POST …/documents/delete-batch` with an array.
 *   - **By filter** — `POST …/documents/delete`, which deletes **everything
 *     the filter matches**. There is no dry run and no count returned up front;
 *     the task reports the damage afterwards.
 *
 * Clearing the whole index is deliberately *not* one of the choices — that is
 * `documents-clear`, so a blank filter here cannot empty an index.
 *
 * Like every write, this enqueues a task rather than doing the work.
 */
const action: ActionDefinition = {
  key: "document-delete",
  type: "perform",
  resource: "document",
  title: "Delete documents",
  description: "Enqueue a deletion by id, by a list of ids, or by filter.",
  idempotent: true,
  params: [
    INDEX_PARAM,
    {
      key: "by",
      label: "Delete By",
      type: "select",
      required: true,
      default: "id",
      options: [
        { value: "id", label: "One id" },
        { value: "ids", label: "A list of ids" },
        { value: "filter", label: "A filter — deletes everything it matches" },
      ],
    },
    {
      key: "documentId",
      label: "Document ID",
      type: "string",
      default: "",
      showIf: { "==": [{ var: "by" }, "id"] },
    },
    {
      key: "documentIds",
      label: "Document IDs",
      type: "string",
      default: "",
      hint: "Comma-separated primary key values.",
      showIf: { "==": [{ var: "by" }, "ids"] },
    },
    {
      key: "filter",
      label: "Filter",
      type: "string",
      default: "",
      placeholder: "genres = horror AND year < 2000",
      hint: "Deletes EVERY matching document. There is no dry run — check it with Search first.",
      showIf: { "==": [{ var: "by" }, "filter"] },
    },
  ],
  output: TASK_OUTPUT,

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const index = resolveIndex(ctx.connection, p.indexUid);
    const base = `/indexes/${encodeURIComponent(index)}/documents`;
    const by = String(p.by ?? "id");
    const client = new MeilisearchClient(ctx);

    if (by === "id") {
      const id = String(p.documentId ?? "").trim();
      if (!id) throw new Error("`documentId` is required when deleting by id");
      ctx.log("info", "enqueueing a Meilisearch document deletion", { index, by });
      return await client.request(`${base}/${encodeURIComponent(id)}`, { method: "DELETE" });
    }

    if (by === "ids") {
      const ids = csv(p.documentIds);
      if (!ids) throw new Error("`documentIds` is required when deleting by a list of ids");
      ctx.log("info", "enqueueing a Meilisearch document deletion", { index, by, ids: ids.length });
      return await client.request(`${base}/delete-batch`, { method: "POST", body: ids });
    }

    if (by === "filter") {
      // A Meilisearch filter is a string expression — `year < 2000` — not JSON.
      // It may also be an array of conditions, so an array is parsed and
      // anything else is passed through as the expression it is.
      const raw = String(p.filter ?? "").trim();
      const filter = raw.startsWith("[") ? json(raw, "filter") : raw;
      if (!filter) {
        throw new Error(
          "`filter` is required when deleting by filter — to empty an index, use Clear Documents",
        );
      }
      // Worth a warn: nothing here reports how many documents this matches.
      ctx.log("warn", "enqueueing a Meilisearch delete-by-filter", { index });
      return await client.request(`${base}/delete`, { method: "POST", body: { filter } });
    }

    throw new Error("`by` must be `id`, `ids` or `filter`");
  },
};

export default action;
