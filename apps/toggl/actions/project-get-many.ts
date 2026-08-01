import type { ActionDefinition } from "@w6w/types";
import { TogglClient } from "../lib/client.ts";

interface Input {
  workspaceId: number;
  active?: string;
  clientId?: number;
  billable?: boolean;
  perPage?: number;
  page?: number;
}

/**
 * GET /workspaces/{workspace_id}/projects — list a workspace's projects.
 * `active` is documented as accepting `true`, `false`, or `both`, so it's a
 * select rather than a boolean despite the vendor's Swagger typing it `bool`.
 */
const projectGetMany: ActionDefinition<Input, unknown[]> = {
  key: "project-get-many",
  type: "search",
  resource: "project",
  title: "List Projects",
  description: "List a workspace's projects, optionally filtered.",
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
    {
      key: "active",
      label: "Active",
      type: "select",
      options: [
        { value: "true", label: "Active only" },
        { value: "false", label: "Inactive only" },
        { value: "both", label: "Both" },
      ],
      hint: "Defaults to active only when left blank.",
    },
    { key: "clientId", label: "Client ID", type: "number" },
    { key: "billable", label: "Billable", type: "boolean" },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      hint: "Cannot exceed 200.",
      advanced: true,
    },
    { key: "page", label: "Page", type: "number", advanced: true },
  ],
  output: [{ key: "", type: "array", label: "Projects" }],

  execute(input, ctx) {
    const client = new TogglClient(ctx);
    return client.request<unknown[]>(`/workspaces/${input.workspaceId}/projects`, {
      query: {
        active: input.active,
        client_ids: input.clientId,
        billable: input.billable,
        per_page: input.perPage,
        page: input.page,
      },
    });
  },
};

export default projectGetMany;
