import type { ActionDefinition } from "@w6w/types";
import { HighLevelClient } from "../lib/client.ts";

interface Input {
  skip?: number;
  limit?: number;
  type?: string;
}

const listForms: ActionDefinition<Input> = {
  key: "list-forms",
  type: "read",
  resource: "form",
  title: "List Forms",
  description: "List the forms built on the connected location.",
  params: [
    { key: "skip", label: "Skip", type: "number" },
    { key: "limit", label: "Limit", type: "number", default: 10 },
    { key: "type", label: "Type", type: "string" },
  ],
  output: [{ key: "forms", type: "array", label: "Forms" }],

  execute(input, ctx) {
    const client = new HighLevelClient(ctx);
    return client.request("/forms/", {
      query: {
        locationId: client.locationId,
        skip: input.skip,
        limit: input.limit ?? 10,
        type: input.type,
      },
    });
  },
};

export default listForms;
