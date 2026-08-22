import type { ActionDefinition } from "@w6w/types";
import { resolveOrg, SnykClient } from "../lib/client.ts";
import { ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /orgs/{org_id}` — verified against Snyk's own API document (`getOrg`).
 */
const action: ActionDefinition = {
  key: "org-get",
  type: "read",
  resource: "org",
  title: "Get an organization",
  description: "Retrieve one organization's details.",
  params: [ORG_PARAM],
  output: [
    { key: "data", type: "object", label: "Organization" },
    { key: "jsonapi", type: "object", label: "JSON:API metadata" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const org = resolveOrg(ctx.connection, p.orgId);
    ctx.log("info", "getting Snyk organization", { org });
    return await new SnykClient(ctx).request(`/orgs/${encodeURIComponent(org)}`);
  },
};

export default action;
