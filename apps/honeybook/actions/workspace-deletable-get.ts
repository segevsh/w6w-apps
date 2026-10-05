import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoneyBookClient } from "../lib/client.ts";

interface Input {
  workspaceId: string;
}

const workspaceDeletableGet: ActionDefinition<Input> = {
  key: "workspace-deletable-get",
  type: "read",
  resource: "workspace",
  title: "Check Workspace Deletable",
  description:
    "Whether a workspace can be deleted by the caller. Members only — matching deleteWorkspace itself, which is member-gated inside the manager.",
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      required: true,
      hint: "Workspace id (BSON ObjectId hex).",
    },
  ],
  output: [
    { key: "deletable", type: "boolean", label: "Deletable" },
    { key: "reason", type: "string", label: "Reason" },
  ],

  async execute(input, ctx) {
    const result = await new HoneyBookClient(ctx).request(
      "GET",
      `/workspaces/${encodeId(input.workspaceId)}/deletable`,
    );
    return result;
  },
};

export default workspaceDeletableGet;
