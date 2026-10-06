import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/workspaces/add`
 *
 * Create a new workspace.
 *
 * Not idempotent: a retry repeats the side effect.
 */
interface Input {
  name: string;
  tempId?: number;
}

const workspaceCreate: ActionDefinition<Input> = {
  key: "workspace-create",
  type: "perform",
  resource: "workspace",
  title: "Create Workspace",
  description: "Create a new workspace.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "Name of the new workspace.",
    },
    { key: "tempId", label: "Temporary ID", type: "number", hint: "Negative temporary id." },
  ],
  output: [
    { key: "id", type: "number", label: "Workspace ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/workspaces/add",
      params: { "name": input.name, "temp_id": input.tempId },
    });
  },
};

export default workspaceCreate;
