import type { ActionDefinition } from "@w6w/types";
import { HarvestClient } from "../lib/client.ts";

interface Input {
  isActive?: boolean;
  updatedSince?: string;
  perPage?: number;
}

/** GET /tasks — list tasks, optionally filtered. */
const taskGetMany: ActionDefinition<Input> = {
  key: "task-get-many",
  type: "read",
  resource: "task",
  title: "Get Many Tasks",
  description: "List tasks, optionally filtered by active status or update time.",
  params: [
    { key: "isActive", label: "Is active", type: "boolean" },
    { key: "updatedSince", label: "Updated since", type: "datetime" },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      hint: "1–2000. Defaults to Harvest's own default (2000).",
    },
  ],
  output: [
    { key: "tasks", type: "array", label: "Tasks" },
    { key: "total_entries", type: "number", label: "Total entries" },
  ],

  execute(input, ctx) {
    const client = new HarvestClient(ctx);
    return client.request("/tasks", {
      query: {
        is_active: input.isActive,
        updated_since: input.updatedSince,
        per_page: input.perPage,
      },
    });
  },
};

export default taskGetMany;
