import type { ActionDefinition } from "@w6w/types";
import { organizationIdFrom, ZohoAnalyticsClient } from "../lib/client.ts";
import { organizationId } from "../lib/params.ts";

interface Input {
  organizationId?: string;
}

interface Output {
  orgAdmins: string[];
}

/**
 * `GET /orgadmins` — Get Org Admins. Needs `ZohoAnalytics.share.read`. DOES
 * need the `ZANALYTICS-ORGID` header (there's no other way to say which
 * organization) — verified against
 * `sharing-and-collaboration-api/org-admin.html`.
 */
const orgAdminList: ActionDefinition<Input, Output> = {
  key: "org-admin-list",
  type: "read",
  resource: "user",
  title: "List Organization Admins",
  description: "List the admin email addresses for a Zoho Analytics organization.",
  params: [organizationId],
  output: [{ key: "orgAdmins", type: "array", label: "Admin email addresses" }],

  async execute(input, ctx) {
    const data = await new ZohoAnalyticsClient(ctx).request<{ orgAdmins?: string[] }>(
      "/orgadmins",
      { organizationId: organizationIdFrom(input, ctx) },
    );
    return { orgAdmins: data.orgAdmins ?? [] };
  },
};

export default orgAdminList;
