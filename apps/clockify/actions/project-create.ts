import type { ActionDefinition } from "@w6w/types";
import { ClockifyClient } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  name: string;
  clientId?: string;
  color?: string;
  billable?: boolean;
  isPublic?: boolean;
}

/** POST /workspaces/{workspaceId}/projects. Verified against n8n's `Clockify.node.ts`. */
const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create a project in a workspace.",
  idempotent: false,
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "clientId", label: "Client ID", type: "string" },
    { key: "color", label: "Color", type: "string", hint: "Hex color, e.g. #FF0000." },
    { key: "billable", label: "Billable", type: "boolean" },
    { key: "isPublic", label: "Public", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
  ],

  execute(input, ctx) {
    const client = new ClockifyClient(ctx);
    const body: Record<string, unknown> = { name: input.name };
    if (input.clientId !== undefined) body.clientId = input.clientId;
    if (input.color !== undefined) body.color = input.color;
    if (input.billable !== undefined) body.billable = input.billable;
    if (input.isPublic !== undefined) body.isPublic = input.isPublic;

    return client.request(`/workspaces/${input.workspaceId}/projects`, {
      method: "POST",
      body,
    });
  },
};

export default projectCreate;
