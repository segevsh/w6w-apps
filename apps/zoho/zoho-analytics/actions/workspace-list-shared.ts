import type { ActionDefinition } from "@w6w/types";
import { ZohoAnalyticsClient } from "../lib/client.ts";

interface Output {
  workspaces: Array<Record<string, unknown>>;
}

/**
 * `GET /workspaces/shared` — the workspaces other users shared with this
 * connection's account, as distinct from `workspace-list-owned`. Also
 * needs no `ZANALYTICS-ORGID` header — verified against
 * `metadata-api/shared-workspace.html`.
 */
const workspaceListShared: ActionDefinition<Record<string, never>, Output> = {
  key: "workspace-list-shared",
  type: "read",
  resource: "workspace",
  title: "List Shared Workspaces",
  description: "List every Zoho Analytics workspace that has been shared with this connection.",
  params: [],
  output: [{ key: "workspaces", type: "array", label: "Workspaces" }],

  async execute(_input, ctx) {
    const data = await new ZohoAnalyticsClient(ctx).request<
      { workspaces?: Array<Record<string, unknown>> }
    >("/workspaces/shared");
    return { workspaces: data.workspaces ?? [] };
  },
};

export default workspaceListShared;
