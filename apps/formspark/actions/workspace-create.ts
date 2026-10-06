import type { ActionDefinition } from "@w6w/types";
import { FormsparkClient } from "../lib/client.ts";
import { workspaceOutput } from "../lib/params.ts";

interface Input {
  name: string;
}

/**
 * `POST /workspaces` — create a workspace (starts on the FREE plan). Not idempotent: the docs
 * warn "a repeated POST creates a second form or workspace", so check before retrying.
 */
const workspaceCreate: ActionDefinition<Input> = {
  key: "workspace-create",
  type: "perform",
  resource: "workspace",
  title: "Create Workspace",
  description: "Create a workspace. It starts on the FREE plan; upgrade it in the dashboard " +
    "before using the forms API on it.",
  idempotent: false,
  params: [{
    key: "name",
    label: "Name",
    type: "string",
    required: true,
    validation: { minLength: 1, maxLength: 128 },
  }],
  output: workspaceOutput,

  execute(input, ctx) {
    return new FormsparkClient(ctx).request("/workspaces", {
      method: "POST",
      body: { name: input.name },
    });
  },
};

export default workspaceCreate;
