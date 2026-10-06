import type { ActionDefinition } from "@w6w/types";
import { MixmaxClient, page } from "../lib/client.ts";

interface Input {
  sort?: string;
  sortAscending?: boolean;
  limit?: number;
  next?: string;
}

const unsubscribeList: ActionDefinition<Input> = {
  key: "unsubscribe-list",
  type: "read",
  resource: "unsubscribe",
  title: "List Unsubscribes",
  description: "List contacts who unsubscribed from sequences.",
  params: [
    {
      key: "sort",
      label: "Sort field",
      type: "string",
      hint: "One of `name`, `email`, `createdAt`.",
    },
    { key: "sortAscending", label: "Sort ascending", type: "boolean", hint: "Sort A-Z." },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Maximum records per page (Mixmax paginates with `limit`/`next`).",
    },
    {
      key: "next",
      label: "Next cursor",
      type: "string",
      hint: "Opaque `next` cursor from a previous response.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Results" },
    { key: "next", type: "string", label: "Next cursor" },
    { key: "hasNext", type: "boolean", label: "More results available" },
  ],

  async execute(input, ctx) {
    const r = await new MixmaxClient(ctx).request("GET", "/unsubscribes", {
      query: {
        sort: input.sort,
        sortAscending: input.sortAscending,
        limit: input.limit,
        next: input.next,
      },
    });
    return page(r);
  },
};

export default unsubscribeList;
