import type { ActionDefinition } from "@w6w/types";
import { Document360Client, encodeId } from "../lib/client.ts";
import { projectIdParam, workspaceIdParam } from "../lib/params.ts";

/** Fetch one workspace, including its default language code and RTL flag. */
interface Input {
  projectId?: string;
  workspaceId: string;
}

const workspaceGet: ActionDefinition<Input> = {
  key: "workspace-get",
  type: "read",
  resource: "workspace",
  title: "Get Workspace",
  description: "Fetch one workspace, including its default language code and RTL flag.",
  params: [projectIdParam, workspaceIdParam],
  output: [{ key: "id", type: "string", label: "Workspace ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "language_code", type: "string", label: "Default language" }],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.data(
      "GET",
      c.projectPath(input.projectId, `/workspaces/${encodeId(input.workspaceId)}`),
    );
  },
};

export default workspaceGet;
