import type { ActionDefinition } from "@w6w/types";
import { FormsparkClient, seg } from "../lib/client.ts";
import { workspaceIdParam, workspaceOutput } from "../lib/params.ts";

interface Input {
  workspaceId: string;
  name: string;
}

/** `PATCH /workspaces/{workspaceId}` — rename a workspace (`name` is its only field). */
const workspaceUpdate: ActionDefinition<Input> = {
  key: "workspace-update",
  type: "perform",
  resource: "workspace",
  title: "Rename Workspace",
  description: "Rename a workspace.",
  idempotent: true,
  params: [
    workspaceIdParam(),
    {
      key: "name",
      label: "New name",
      type: "string",
      required: true,
      validation: { minLength: 1, maxLength: 128 },
    },
  ],
  output: workspaceOutput,

  execute(input, ctx) {
    return new FormsparkClient(ctx).request(
      `/workspaces/${seg(input.workspaceId, "workspaceId")}`,
      {
        method: "PATCH",
        body: { name: input.name },
      },
    );
  },
};

export default workspaceUpdate;
