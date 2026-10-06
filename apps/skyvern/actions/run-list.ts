import type { ActionDefinition } from "@w6w/types";
import { compact, list, SkyvernClient } from "../lib/client.ts";
import { paginationParams, runStatusOptions } from "../lib/params.ts";

/** `GET /v1/runs` — list task and agent runs, newest first, with filters. */
interface Input {
  page?: number;
  pageSize?: number;
  status?: string[] | string;
  searchKey?: string;
  agentIds?: string[] | string;
  tags?: string[] | string;
}

const runList: ActionDefinition<Input> = {
  key: "run-list",
  type: "search",
  resource: "run",
  title: "List Runs",
  description: "List task and agent runs, filterable by status, agent, tag or a search term.",
  params: [
    ...paginationParams(10, 100),
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: runStatusOptions,
      hint: "Only runs in one of these states.",
    },
    {
      key: "searchKey",
      label: "Search",
      type: "string",
      hint: "Case-insensitive substring across title, URL and run id (3+ characters).",
    },
    {
      key: "agentIds",
      label: "Agent IDs",
      type: "string",
      hint: "Comma-separated agent ids (`wpid_…`) — only runs of these agents.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated tag terms: a label (`production`), a group (`env:*`) or `env:prod`.",
    },
  ],
  output: [
    {
      key: "runs",
      type: "array",
      label: "Runs (run_id, status, title, task_run_type, created_at, …)",
    },
    { key: "count", type: "number", label: "Count on this page" },
  ],

  async execute(input, ctx) {
    const runs = await new SkyvernClient(ctx).json<unknown[]>("/v1/runs", {
      query: compact({
        page: input.page,
        page_size: input.pageSize,
        status: list(input.status),
        search_key: input.searchKey,
        workflow_permanent_id: list(input.agentIds),
        tags: list(input.tags),
      }),
    });
    return { runs: runs ?? [], count: (runs ?? []).length };
  },
};

export default runList;
