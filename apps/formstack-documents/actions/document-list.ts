import type { ActionDefinition } from "@w6w/types";
import { WebMergeClient } from "../lib/client.ts";

interface Input {
  search?: string;
  folder?: string;
}

/**
 * List the documents (templates) in the account, optionally filtered by search term or folder (GET /documents).
 */
const documentList: ActionDefinition<Input> = {
  key: "document-list",
  type: "read",
  resource: "document",
  title: "List Documents",
  description:
    "List the documents (templates) in the account, optionally filtered by search term or folder (GET /documents).",
  params: [
    { key: "search", label: "Search", type: "string", hint: "Only documents matching this term." },
    {
      key: "folder",
      label: "Folder",
      type: "string",
      hint: "Only documents in this folder (by name).",
    },
  ],
  output: [
    { key: "documents", type: "array", label: "Array of documents" },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request("/documents", {
      query: { search: input.search, folder: input.folder },
    });
  },
};

export default documentList;
