import type { ActionDefinition } from "@w6w/types";
import { OtterClient, type OtterMeta, type OtterWorkspace } from "../lib/client.ts";

interface Output {
  meta: OtterMeta;
  data: OtterWorkspace;
}

const workspaceGet: ActionDefinition<Record<string, never>, Output> = {
  key: "workspace-get",
  type: "read",
  resource: "workspace",
  title: "Get Workspace",
  description: "Get the authenticated user's Otter workspace — id, name, owner, member count, " +
    "handle and type.",
  params: [],
  output: [
    { key: "data.id", type: "number", label: "Workspace ID" },
    { key: "data.name", type: "string", label: "Name" },
    { key: "data.member_count", type: "number", label: "Member count" },
    { key: "data.handle", type: "string", label: "Handle" },
    { key: "data.type", type: "string", label: "Type" },
  ],

  execute(_input, ctx) {
    return new OtterClient(ctx).get<Output>("/workspace");
  },
};

export default workspaceGet;
