import type { ActionDefinition } from "@w6w/types";
import { WebMergeClient } from "../lib/client.ts";

interface Input {
  id: string;
  name: string;
}

/**
 * Create a copy of a document under a new name (POST /documents/{id}/copy).
 */
const documentCopy: ActionDefinition<Input> = {
  key: "document-copy",
  type: "perform",
  resource: "document",
  title: "Copy Document",
  description: "Create a copy of a document under a new name (POST /documents/{id}/copy).",
  idempotent: false,
  params: [
    {
      key: "id",
      label: "Document ID",
      type: "string",
      required: true,
      hint: "The numeric document ID from Get a List of Documents.",
    },
    { key: "name", label: "New name", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "New document ID" },
    { key: "key", type: "string", label: "New merge key" },
    { key: "url", type: "string", label: "New merge URL" },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request(`/documents/${encodeURIComponent(input.id)}/copy`, {
      method: "POST",
      body: { name: input.name },
    });
  },
};

export default documentCopy;
