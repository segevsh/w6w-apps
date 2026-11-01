import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { FORMAT_LIST_OUTPUT, FORMAT_SAMPLE, PAGINATION_SAMPLE } from "../lib/outputs.ts";

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
  output: [...FORMAT_LIST_OUTPUT],
  sample: { locale: "en_US", formats: [FORMAT_SAMPLE], pagination: PAGINATION_SAMPLE },

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request("/formats/", {
      query: { page: input.page, continuation: input.continuation },
    });
  },
};

export default action;
