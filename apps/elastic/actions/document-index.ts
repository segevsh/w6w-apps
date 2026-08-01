import type { ActionDefinition } from "@w6w/types";
import { ElasticClient } from "../lib/client.ts";

interface Input {
  index: string;
  id?: string;
  document: Record<string, unknown>;
  refresh?: string;
}

/**
 * "Indexing" in Elasticsearch terms means create-or-replace. With an `id`
 * this is `PUT /<index>/_doc/<id>` (replaces if it exists); without one it's
 * `POST /<index>/_doc` and Elasticsearch assigns the id. Only the first form
 * is safe to retry, so the action stays `idempotent: false` overall — an
 * honest reflection of its worst case, not its best.
 */
const documentIndex: ActionDefinition<Input> = {
  key: "document-index",
  type: "perform",
  resource: "document",
  title: "Index Document",
  description: "Create a document, or replace it if `id` already exists.",
  idempotent: false,
  params: [
    { key: "index", label: "Index", type: "string", required: true },
    {
      key: "id",
      label: "Document ID",
      type: "string",
      hint: "Leave empty to let Elasticsearch generate one.",
    },
    { key: "document", label: "Document", type: "json", required: true },
    {
      key: "refresh",
      label: "Refresh",
      type: "select",
      options: [
        { value: "false", label: "False (default)" },
        { value: "true", label: "True — refresh immediately" },
        { value: "wait_for", label: "Wait for refresh" },
      ],
      hint: "Whether/how to make this write visible to search immediately.",
    },
  ],

  execute(input, ctx) {
    const client = ElasticClient.fromConnection(ctx);
    const query = input.refresh ? { refresh: input.refresh } : undefined;
    return input.id
      ? client.request(`/${encodeURIComponent(input.index)}/_doc/${encodeURIComponent(input.id)}`, {
        method: "PUT",
        body: input.document,
        query,
      })
      : client.request(`/${encodeURIComponent(input.index)}/_doc`, {
        method: "POST",
        body: input.document,
        query,
      });
  },
};

export default documentIndex;
