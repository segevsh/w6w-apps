import type { ActionDefinition } from "@w6w/types";
import { DocuMergeClient } from "../lib/client.ts";

type Input = Record<string, never>;

const documentList: ActionDefinition<Input> = {
  key: "document-list",
  type: "search",
  resource: "document",
  title: "List Documents",
  description: "List the documents (merge templates) in the account.",
  params: [],
  output: [
    { key: "data", type: "array", label: "Documents" },
  ],

  async execute(_input, ctx) {
    return await new DocuMergeClient(ctx).json(`/api/documents`, { method: "GET" });
  },
};

export default documentList;
