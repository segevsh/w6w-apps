import type { ActionDefinition } from "@w6w/types";
import { ElasticClient } from "../lib/client.ts";

interface Input {
  index: string;
  id: string;
  refresh?: string;
}

const documentDelete: ActionDefinition<Input> = {
  key: "document-delete",
  type: "perform",
  resource: "document",
  title: "Delete Document",
  description: "Delete a document by ID.",
  idempotent: true,
  params: [
    { key: "index", label: "Index", type: "string", required: true },
    { key: "id", label: "Document ID", type: "string", required: true },
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
      `/${encodeURIComponent(input.index)}/_doc/${encodeURIComponent(input.id)}`,
      {
        method: "DELETE",
        query: input.refresh ? { refresh: input.refresh } : undefined,
      },
    );
  },
};

export default documentDelete;
