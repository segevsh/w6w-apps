import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  page?: number;
  continuation?: string;
}

const action: ActionDefinition<Input> = {
  key: "list-formats",
  type: "search",
  resource: "format",
  title: "List Formats",
  description: "List all available event formats.",
  idempotent: true,
  params: [
    { key: "page", label: "Page number", type: "number" },
    { key: "continuation", label: "Continuation token", type: "string" },
  ],
  output: [
    { key: "locale", type: "string", label: "Locale" },
    { key: "formats", type: "array", label: "List Formats" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request("/formats/", {
      query: { page: input.page, continuation: input.continuation },
    });
  },
};

export default action;
