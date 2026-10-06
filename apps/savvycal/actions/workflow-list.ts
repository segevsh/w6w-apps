import type { ActionDefinition } from "@w6w/types";
import { compact, type Page, pagingParams, SavvyCalClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  after?: string;
  before?: string;
}

const workflowList: ActionDefinition<Input> = {
  key: "workflow-list",
  type: "read",
  resource: "workflow",
  title: "List Workflows",
  description:
    "List SavvyCal's own automation workflows (reminders, follow-ups) for scopes the user manages.",
  params: [...pagingParams],
  output: [
    { key: "entries", type: "array", label: "Workflows" },
    { key: "metadata", type: "object", label: "Cursors: after, before, limit" },
  ],

  execute(input, ctx) {
    return new SavvyCalClient(ctx).json<Page<unknown>>("/workflows", {
      query: compact({ limit: input.limit, after: input.after, before: input.before }) as Record<
        string,
        string
      >,
    });
  },
};

export default workflowList;
