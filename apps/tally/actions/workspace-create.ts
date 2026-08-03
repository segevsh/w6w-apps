import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";

interface Input {
  name: string;
}

/** POST /workspaces — create a workspace. Responds 201 with the new workspace. */
const workspaceCreate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "workspace-create",
  type: "perform",
  resource: "workspace",
  title: "Create Workspace",
  description: "Create a new workspace.",
  // Tally does not de-duplicate on name: replaying this makes a second workspace.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Workspace ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "workspace", type: "object", label: "The created workspace" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating Tally workspace", { name: input.name });
    const workspace = await new TallyClient(ctx).request<Record<string, unknown>>("/workspaces", {
      method: "POST",
      body: { name: input.name },
    });
    return { id: workspace?.id, name: workspace?.name, workspace };
  },
};

export default workspaceCreate;
