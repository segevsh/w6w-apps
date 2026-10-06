import type { ActionDefinition } from "@w6w/types";
import { LinkupClient } from "../lib/client.ts";
import { PAGED_OUTPUT, type PagingInput, pagingParams, pagingQuery } from "../lib/params.ts";

interface Input extends PagingInput {
  type?: string[];
  status?: string[];
}

const tasksList: ActionDefinition<Input, Record<string, unknown>> = {
  key: "tasks-list",
  type: "read",
  resource: "tasks",
  title: "List Tasks",
  description: "List the organisation's asynchronous tasks, filterable by type and status.",
  params: [
    {
      key: "type",
      label: "Type",
      type: "multiselect",
      options: ["search", "fetch", "research", "extract"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: ["pending", "processing", "completed", "failed"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    ...pagingParams,
  ],
  output: [
    ...PAGED_OUTPUT,
    { key: "quota", type: "object", label: "inFlight and limit of concurrent tasks" },
  ],

  async execute(input, ctx) {
    const body = await new LinkupClient(ctx).get<
      { data?: unknown[]; metadata?: unknown; quota?: unknown }
    >("/v1/tasks", { type: input.type, status: input.status, ...pagingQuery(input) });
    return { items: body?.data ?? [], metadata: body?.metadata, quota: body?.quota };
  },
};

export default tasksList;
