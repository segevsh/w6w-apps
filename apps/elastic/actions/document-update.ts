import type { ActionDefinition } from "@w6w/types";
import { ElasticClient } from "../lib/client.ts";

interface Input {
  index: string;
  id: string;
  doc: Record<string, unknown>;
  docAsUpsert?: boolean;
  refresh?: string;
}

/**
 * Partial update via `POST /<index>/_update/<id>`, merging `doc` into the
 * existing source. Re-applying the same `doc` is idempotent because this
 * action only ever sends a plain field merge, never a `script` block.
 */
const documentUpdate: ActionDefinition<Input> = {
  key: "document-update",
  type: "perform",
  resource: "document",
  title: "Update Document",
  description: "Partially update a document by merging fields into its existing `_source`.",
  idempotent: true,
  params: [
    { key: "index", label: "Index", type: "string", required: true },
    { key: "id", label: "Document ID", type: "string", required: true },
    { key: "doc", label: "Fields to merge", type: "json", required: true },
    {
      key: "docAsUpsert",
      label: "Upsert if missing",
      type: "boolean",
      default: false,
      hint: "If the document doesn't exist, index `doc` as a new document instead of failing.",
    },
    {
      key: "refresh",
      label: "Refresh",
      type: "select",
      options: [
        { value: "false", label: "False (default)" },
        { value: "true", label: "True — refresh immediately" },
        { value: "wait_for", label: "Wait for refresh" },
      ],
    },
  ],

  execute(input, ctx) {
    const client = ElasticClient.fromConnection(ctx);
    return client.request(
      `/${encodeURIComponent(input.index)}/_update/${encodeURIComponent(input.id)}`,
      {
        method: "POST",
        body: { doc: input.doc, doc_as_upsert: input.docAsUpsert ?? false },
        query: input.refresh ? { refresh: input.refresh } : undefined,
      },
    );
  },
};

export default documentUpdate;
