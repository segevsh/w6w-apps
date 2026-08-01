import type { ActionDefinition } from "@w6w/types";
import { TogglClient } from "../lib/client.ts";

interface Input {
  workspaceId: number;
  name: string;
  clientId?: number;
  isPrivate?: boolean;
  active?: boolean;
  billable?: boolean;
  color?: string;
  startDate?: string;
  endDate?: string;
}

/** POST /workspaces/{workspace_id}/projects — create a project. */
const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create a project in a workspace.",
  idempotent: false,
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "clientId", label: "Client ID", type: "number" },
    { key: "isPrivate", label: "Private", type: "boolean", default: true },
    { key: "active", label: "Active", type: "boolean", default: true },
    { key: "billable", label: "Billable", type: "boolean", advanced: true },
    { key: "color", label: "Color", type: "string", placeholder: "#06AAF5", advanced: true },
    { key: "startDate", label: "Start date", type: "date", advanced: true },
    { key: "endDate", label: "End date", type: "date", advanced: true },
  ],
  output: [
    { key: "id", type: "number", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    const client = new TogglClient(ctx);
    const body: Record<string, unknown> = { name: input.name };
    if (input.clientId !== undefined) body.client_id = input.clientId;
    if (input.isPrivate !== undefined) body.is_private = input.isPrivate;
    if (input.active !== undefined) body.active = input.active;
    if (input.billable !== undefined) body.billable = input.billable;
    if (input.color !== undefined) body.color = input.color;
    if (input.startDate !== undefined) body.start_date = input.startDate;
    if (input.endDate !== undefined) body.end_date = input.endDate;

    return client.request(`/workspaces/${input.workspaceId}/projects`, {
      method: "POST",
      body,
    });
  },
};

export default projectCreate;
