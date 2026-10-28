import type { ActionDefinition } from "@w6w/types";
import { ZohoAnalyticsClient } from "../lib/client.ts";

interface Output {
  workspaces: Array<Record<string, unknown>>;
}

/**
 * `GET /workspaces/owned` — the one Analytics endpoint every other action's
 * `organizationId` fallback (`lib/client.ts#organizationIdFrom`) is built
 * around: it needs no `ZANALYTICS-ORGID` header, and each returned
 * workspace carries its own `orgId`. `auth/oauth2.ts`'s `afterConnect`
 * already calls this once to record a default; this action exists for the
 * multi-organization/multi-workspace case, or simply to look up a
 * workspace/view id to pass to the row and export actions.
 */
const workspaceListOwned: ActionDefinition<Record<string, never>, Output> = {
  key: "workspace-list-owned",
  type: "read",
  resource: "workspace",
  title: "List Owned Workspaces",
  description: "List every Zoho Analytics workspace this connection owns, across every " +
    "organization it can access.",
  params: [],
  output: [{ key: "workspaces", type: "array", label: "Workspaces" }],

  async execute(_input, ctx) {
    const data = await new ZohoAnalyticsClient(ctx).request<
      { workspaces?: Array<Record<string, unknown>> }
    >("/workspaces/owned");
    return { workspaces: data.workspaces ?? [] };
  },
};

export default workspaceListOwned;
