import type { ActionDefinition } from "@w6w/types";
import { ZohoCreatorClient } from "../lib/client.ts";

interface Output {
  applications: Array<Record<string, unknown>>;
}

/**
 * `GET /creator/v2/meta/applications` — Get Applications. Needs
 * `ZohoCreator.dashboard.READ`. The one Creator endpoint that needs no
 * `account_owner_name`/`app_link_name` at all — the same role `auth/oauth2.ts`'s
 * `test` hook already uses it for. Each returned application's `workspace_name` is
 * the `accountOwnerName` and `link_name` is the `appLinkName` every other action's
 * params expect — run this first to find them. Verified against
 * `get-applications.html`.
 */
const applicationList: ActionDefinition<Record<string, never>, Output> = {
  key: "application-list",
  type: "read",
  resource: "application",
  title: "List Applications",
  description: "List every Zoho Creator application this connection can access, across every " +
    'workspace/owner. Use the returned "workspace_name" as Account Owner Name and ' +
    '"link_name" as App Link Name in every other action.',
  params: [],
  output: [{ key: "applications", type: "array", label: "Applications" }],

  async execute(_input, ctx) {
    const data = await new ZohoCreatorClient(ctx).request<
      { applications?: Array<Record<string, unknown>> }
    >("/meta/applications");
    return { applications: data.applications ?? [] };
  },
};

export default applicationList;
