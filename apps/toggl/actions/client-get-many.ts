import type { ActionDefinition } from "@w6w/types";
import { TogglClient } from "../lib/client.ts";

interface Input {
  workspaceId: number;
  status?: string;
  name?: string;
}

/** GET /workspaces/{workspace_id}/clients — list a workspace's clients. */
const clientGetMany: ActionDefinition<Input, unknown[]> = {
  key: "client-get-many",
  type: "search",
  resource: "client",
  title: "List Clients",
  description: "List a workspace's clients, optionally filtered.",
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "archived", label: "Archived" },
        { value: "both", label: "Both" },
      ],
      hint: "Defaults to active only when left blank.",
    },
    {
      key: "name",
      label: "Name contains",
      type: "string",
      hint: "Case-insensitive substring filter.",
    },
  ],
  output: [{ key: "", type: "array", label: "Clients" }],

  execute(input, ctx) {
    const client = new TogglClient(ctx);
    return client.request<unknown[]>(`/workspaces/${input.workspaceId}/clients`, {
      query: { status: input.status, name: input.name },
    });
  },
};

export default clientGetMany;
