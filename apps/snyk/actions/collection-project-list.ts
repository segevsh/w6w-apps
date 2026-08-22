import type { ActionDefinition } from "@w6w/types";
import { resolveOrg, SnykClient } from "../lib/client.ts";
import { LIST_PARAMS, ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /orgs/{org_id}/collections/{collection_id}/relationships/projects` —
 * verified against Snyk's own API document (`getProjectsOfCollection`).
 *
 * The JSON:API `relationships` path, which is how membership is read rather
 * than a nested `/projects` route.
 */
const action: ActionDefinition = {
  key: "collection-project-list",
  type: "read",
  resource: "collection",
  title: "List a collection's projects",
  description: "List the projects in one collection.",
  params: [
    ORG_PARAM,
    { key: "collectionId", label: "Collection ID", type: "string", required: true, default: "" },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collectionId = String(p.collectionId ?? "").trim();
    if (!collectionId) throw new Error("`collectionId` is required");

    const org = resolveOrg(ctx.connection, p.orgId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Snyk collection projects", { org, collectionId });

    return await new SnykClient(ctx).requestAll(
      `/orgs/${encodeURIComponent(org)}/collections/${
        encodeURIComponent(collectionId)
      }/relationships/projects`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
