import type { ActionDefinition } from "@w6w/types";
import { TaskadeClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /workspaces` */
const workspaceList: ActionDefinition<Input> = {
  key: "workspace-list",
  type: "search",
  resource: "workspace",
  title: "List Workspaces",
  description: "List the workspaces the token can access.",
  params: [],
  output: [
    {
      "key": "items",
      "type": "array",
      "label": "Items returned",
    },
    {
      "key": "count",
      "type": "number",
      "label": "Number of items returned",
    },
  ],

  async execute(_input, ctx) {
    const res = await new TaskadeClient(ctx).request<Record<string, unknown>>(
      "GET",
      `/workspaces`,
    );
    const items = Array.isArray(res.items) ? res.items : [];
    return { items, count: items.length };
  },
};

export default workspaceList;
