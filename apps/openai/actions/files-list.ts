import type { ActionDefinition } from "@w6w/types";
import { OpenAIClient } from "../lib/client.ts";

interface Input {
  purpose?: string;
  limit?: number;
  order?: "asc" | "desc";
}

const filesList: ActionDefinition<Input> = {
  key: "files-list",
  type: "read",
  resource: "file",
  title: "List Files",
  description: "List uploaded files.",
  params: [
    {
      key: "purpose",
      label: "Purpose",
      type: "string",
      hint: "Filter by purpose (e.g. `fine-tune`, `assistants`).",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      advanced: true,
      hint: "Max files to return (1-10000). Left unset, OpenAI's own default of 10000 applies.",
      validation: { integer: true, min: 1, max: 10000 },
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      advanced: true,
      options: [{ value: "desc", label: "Newest first" }, { value: "asc", label: "Oldest first" }],
      hint: "Sort by `created_at`. Left unset, OpenAI's own default (`desc`) applies.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Files" },
    { key: "object", type: "string", label: "Object type" },
  ],

  execute(input, ctx) {
    const client = new OpenAIClient(ctx);
    return client.request("/files", {
      query: { purpose: input.purpose, limit: input.limit, order: input.order },
    });
  },
};

export default filesList;
