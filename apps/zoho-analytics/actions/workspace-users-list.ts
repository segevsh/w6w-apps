import type { ActionDefinition } from "@w6w/types";
import { organizationIdFrom, ZohoAnalyticsClient } from "../lib/client.ts";
import { organizationId, workspaceId } from "../lib/params.ts";

interface Input {
  workspaceId: string;
  organizationId?: string;
}

interface Output {
  users: Array<Record<string, unknown>>;
}

/**
 * `GET /workspaces/<workspace-id>/users` — Get Workspace Users. Needs
 * `ZohoAnalytics.usermanagement.read`. Unlike the discovery/detail
 * workspace calls, this one DOES need the `ZANALYTICS-ORGID` header —
 * verified against `user-management-api/get-workspace-users.html`.
 */
const workspaceUsersList: ActionDefinition<Input, Output> = {
  key: "workspace-users-list",
  type: "read",
  resource: "user",
  title: "List Workspace Users",
  description: "List every user with access to a workspace, and their role.",
  params: [workspaceId, organizationId],
  output: [{ key: "users", type: "array", label: "Users" }],

  async execute(input, ctx) {
    const data = await new ZohoAnalyticsClient(ctx).request<
      { users?: Array<Record<string, unknown>> }
    >(
      `/workspaces/${encodeURIComponent(input.workspaceId)}/users`,
      { organizationId: organizationIdFrom(input, ctx) },
    );
    return { users: data.users ?? [] };
  },
};

export default workspaceUsersList;
