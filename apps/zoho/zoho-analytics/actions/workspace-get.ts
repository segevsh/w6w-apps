import type { ActionDefinition } from "@w6w/types";
import { ZohoAnalyticsClient } from "../lib/client.ts";
import { workspaceId as workspaceIdParam } from "../lib/params.ts";

interface Input {
  workspaceId: string;
}

/**
 * `GET /workspaces/<workspace-id>` — details of a single workspace. Also
 * needs no `ZANALYTICS-ORGID` header, since the workspace id alone already
 * identifies its organization — verified against
 * `metadata-api/workspace-details.html`. The response's `data.workspaces`
 * key holds a single object here (not an array, unlike the two List
 * actions), so this action returns it as-is.
 */
const workspaceGet: ActionDefinition<Input, Record<string, unknown>> = {
  key: "workspace-get",
  type: "read",
  resource: "workspace",
  title: "Get Workspace",
  description: "Get details of a single Zoho Analytics workspace by id.",
  params: [workspaceIdParam],
  output: [
    { key: "workspaceId", type: "string", label: "Workspace ID" },
    { key: "workspaceName", type: "string", label: "Workspace name" },
    { key: "orgId", type: "string", label: "Organization ID" },
  ],

  execute(input, ctx) {
    return new ZohoAnalyticsClient(ctx).request<Record<string, unknown>>(
      `/workspaces/${encodeURIComponent(input.workspaceId)}`,
    ).then((data) => (data as { workspaces?: Record<string, unknown> }).workspaces ?? data);
  },
};

export default workspaceGet;
