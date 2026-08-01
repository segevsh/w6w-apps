import type { ActionDefinition } from "@w6w/types";
import { TogglClient } from "../lib/client.ts";

interface Input {
  since?: number;
}

/**
 * GET /me/workspaces — list the workspaces the authenticated user belongs to.
 * No required params, so this is also safe to invoke with `{}`.
 */
const workspaceGetMany: ActionDefinition<Input, unknown[]> = {
  key: "workspace-get-many",
  type: "search",
  resource: "workspace",
  title: "List Workspaces",
  description: "List the authenticated user's workspaces.",
  params: [
    {
      key: "since",
      label: "Since",
      type: "number",
      hint: "UNIX timestamp. Workspaces created/modified/deleted on or after this time.",
    },
  ],
  output: [{ key: "", type: "array", label: "Workspaces" }],

  execute(input, ctx) {
    const client = new TogglClient(ctx);
    return client.request<unknown[]>("/me/workspaces", {
      query: { since: input.since },
    });
  },
};

export default workspaceGetMany;
