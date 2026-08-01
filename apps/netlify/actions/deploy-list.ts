import type { ActionDefinition } from "@w6w/types";
import { netlifyFetch } from "../lib/client.ts";

/**
 * List deploys for a site.
 * `GET /sites/{site_id}/deploys` —
 * https://open-api.netlify.com/ (operationId `listSiteDeploys`)
 */
const action: ActionDefinition = {
  key: "deploy-list",
  type: "read",
  resource: "deploy",
  title: "List deploys",
  description: "List deploys for a site",
  params: [
    {
      key: "siteId",
      label: "Site ID",
      type: "string",
      required: true,
      default: "",
      hint: "The site's ID",
    },
    {
      key: "perPage",
      label: "Per Page",
      type: "number",
      default: 20,
      hint: "Max number of deploys to return",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      hint: "Page number (1-indexed)",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const siteId = String(p.siteId ?? "").trim();
    if (!siteId) throw new Error("`siteId` is required");

    const qs = new URLSearchParams();
    qs.set("per_page", String(Number(p.perPage ?? 20)));
    qs.set("page", String(Number(p.page ?? 1)));

    ctx.log("info", "listing Netlify deploys", { siteId });

    return await netlifyFetch(ctx, `/sites/${encodeURIComponent(siteId)}/deploys?${qs.toString()}`);
  },
};

export default action;
