import type { ActionDefinition } from "@w6w/types";
import { compact, list, SkyvernClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/** `GET /v1/agents` — list saved agents (workflows). */
interface Input {
  page?: number;
  pageSize?: number;
  searchKey?: string;
  status?: string[] | string;
  folderId?: string;
  onlyWorkflows?: boolean;
  onlyTemplates?: boolean;
  tags?: string[] | string;
}

const agentList: ActionDefinition<Input> = {
  key: "agent-list",
  type: "search",
  resource: "agent",
  title: "List Agents",
  description: "List saved Skyvern agents (workflows) with their ids, titles and versions.",
  params: [
    ...paginationParams(10),
    {
      key: "searchKey",
      label: "Search",
      type: "string",
      hint: "Case-insensitive substring across agent title, folder name and parameter metadata.",
    },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: [
        { value: "published", label: "Published" },
        { value: "draft", label: "Draft" },
        { value: "auto_generated", label: "Auto-generated" },
        { value: "importing", label: "Importing" },
        { value: "import_failed", label: "Import failed" },
      ],
    },
    { key: "folderId", label: "Folder ID", type: "string" },
    {
      key: "onlyWorkflows",
      label: "Only multi-step agents",
      type: "boolean",
      hint: "Skip saved single tasks.",
    },
    { key: "onlyTemplates", label: "Only templates", type: "boolean" },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated tag terms: a label (`production`), a group (`env:*`) or `env:prod`.",
    },
  ],
  output: [
    {
      key: "agents",
      type: "array",
      label: "Agents (workflow_permanent_id / agent_id, title, version, status, …)",
    },
    { key: "count", type: "number", label: "Count on this page" },
  ],

  async execute(input, ctx) {
    const agents = await new SkyvernClient(ctx).json<unknown[]>("/v1/agents", {
      query: compact({
        page: input.page,
        page_size: input.pageSize,
        search_key: input.searchKey,
        status: list(input.status),
        folder_id: input.folderId,
        only_workflows: input.onlyWorkflows,
        only_templates: input.onlyTemplates,
        tags: list(input.tags),
      }),
    });
    return { agents: agents ?? [], count: (agents ?? []).length };
  },
};

export default agentList;
