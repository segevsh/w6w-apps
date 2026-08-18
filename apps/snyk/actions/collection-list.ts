import type { ActionDefinition } from "@w6w/types";
import { resolveOrg, SnykClient } from "../lib/client.ts";
import { LIST_PARAMS, ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /orgs/{org_id}/collections` — verified against Snyk's own API document
 * (`getCollections`).
 *
 * Collections group projects for reporting — "the payments services" across
 * several repositories.
 */
const action: ActionDefinition = {
  key: "collection-list",
  type: "read",
  resource: "collection",
  title: "List collections",
  description: "List an organization's project collections.",
  params: [ORG_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const org = resolveOrg(ctx.connection, p.orgId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Snyk collections", { org, returnAll, limit });

    return await new SnykClient(ctx).requestAll(
      `/orgs/${encodeURIComponent(org)}/collections`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
