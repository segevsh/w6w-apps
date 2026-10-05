import type { ActionDefinition } from "@w6w/types";
import { HoneyBookClient } from "../lib/client.ts";

interface Input {
  page?: number;
  perPage?: number;
  projectId?: string;
  status?: string;
  kind?: string;
  archived?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  sort?: string;
}

const workspaceList: ActionDefinition<Input> = {
  key: "workspace-list",
  type: "read",
  resource: "workspace",
  title: "List Workspaces",
  description:
    "List the caller company's workspaces. Company-scoped: every workspace owned by the caller's company.",
  params: [
    { key: "page", label: "Page", type: "number", hint: "1-indexed page number (default 1)." },
    { key: "perPage", label: "Page size", type: "number", hint: "Page size, 1-100 (default 25)." },
    { key: "projectId", label: "Project ID", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { "value": "lead", "label": "Lead" },
        { "value": "lead_archived", "label": "Lead archived" },
        { "value": "client", "label": "Client" },
        { "value": "client_archived", "label": "Client archived" },
        { "value": "lead_sent", "label": "Lead sent" },
      ],
    },
    {
      key: "kind",
      label: "Kind",
      type: "select",
      options: [
        { "value": "general", "label": "General" },
        { "value": "team", "label": "Team" },
        { "value": "design", "label": "Design" },
        { "value": "all_vendors", "label": "All vendors" },
        { "value": "timeline", "label": "Timeline" },
      ],
    },
    { key: "archived", label: "Archived", type: "boolean" },
    { key: "createdAfter", label: "Created after", type: "datetime" },
    { key: "createdBefore", label: "Created before", type: "datetime" },
    { key: "sort", label: "Sort", type: "string", hint: 'Sort key; "-" prefix = descending.' },
  ],
  output: [
    { key: "data", type: "array", label: "Data" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const result = await new HoneyBookClient(ctx).request("GET", `/workspaces`, {
      query: {
        page: input.page,
        per_page: input.perPage,
        project_id: input.projectId,
        status: input.status,
        kind: input.kind,
        archived: input.archived,
        created_after: input.createdAfter,
        created_before: input.createdBefore,
        sort: input.sort,
      },
    });
    return result;
  },
};

export default workspaceList;
