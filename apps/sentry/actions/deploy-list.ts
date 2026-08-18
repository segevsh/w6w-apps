import type { ActionDefinition } from "@w6w/types";
import { SentryClient } from "../lib/client.ts";
import { LIST_PARAMS, ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /api/0/organizations/{org}/releases/{version}/deploys/` — verified
 * against Sentry's OpenAPI schema (`listOrganizationReleaseDeploys`).
 */
const action: ActionDefinition = {
  key: "deploy-list",
  type: "read",
  resource: "deploy",
  title: "List a release's deploys",
  description: "List the deploys recorded against one release.",
  params: [
    ORG_PARAM,
    { key: "version", label: "Version", type: "string", required: true, default: "" },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const version = String(p.version ?? "").trim();
    if (!version) throw new Error("`version` is required");

    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Sentry deploys", { org, version, returnAll, limit });

    return await client.requestAll(
      `/organizations/${encodeURIComponent(org)}/releases/${encodeURIComponent(version)}/deploys/`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
