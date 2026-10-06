import type { ActionDefinition } from "@w6w/types";
import { WebMergeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * Get one document's details, including its HTML when it is an HTML document (GET /documents/{id}).
 */
const documentGet: ActionDefinition<Input> = {
  key: "document-get",
  type: "read",
  resource: "document",
  title: "Get Document",
  description:
    "Get one document's details, including its HTML when it is an HTML document (GET /documents/{id}).",
  params: [
    {
      key: "id",
      label: "Document ID",
      type: "string",
      required: true,
      hint: "The numeric document ID from Get a List of Documents.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Document ID" },
    { key: "key", type: "string", label: "Merge key" },
    { key: "url", type: "string", label: "Merge URL" },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request(`/documents/${encodeURIComponent(input.id)}`);
  },
};

export default documentGet;
