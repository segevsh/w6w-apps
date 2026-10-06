import type { ActionDefinition } from "@w6w/types";
import { compact, type Page, pagingParams, SavvyCalClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  after?: string;
  before?: string;
  state?: string;
}

const linkList: ActionDefinition<Input> = {
  key: "link-list",
  type: "read",
  resource: "link",
  title: "List Scheduling Links",
  description: "List the authenticated user's scheduling links, one cursor page at a time.",
  params: [
    ...pagingParams,
    {
      key: "state",
      label: "State",
      type: "select",
      options: [{ value: "active", label: "active" }, { value: "disabled", label: "disabled" }],
    },
  ],
  output: [
    { key: "entries", type: "array", label: "Scheduling links" },
    { key: "metadata", type: "object", label: "Cursors: after, before, limit" },
  ],

  execute(input, ctx) {
    return new SavvyCalClient(ctx).json<Page<unknown>>("/links", {
      query: compact({
        limit: input.limit,
        after: input.after,
        before: input.before,
        state: input.state,
      }) as Record<string, string>,
    });
  },
};

export default linkList;
