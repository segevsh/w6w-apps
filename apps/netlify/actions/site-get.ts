import type { ActionDefinition } from "@w6w/types";
import { netlifyFetch } from "../lib/client.ts";

/**
 * Get a single site by ID.
 * `GET /sites/{site_id}` — https://open-api.netlify.com/ (operationId `getSite`)
 */
const action: ActionDefinition = {
  key: "site-get",
  type: "read",
  resource: "site",
  title: "Get a site",
  description: "Get details for a single site by ID",
  params: [
    {
      key: "siteId",
      label: "Site ID",
      type: "string",
      required: true,
      default: "",
      hint: "The site's ID (or its full name.netlify.app domain)",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const siteId = String(p.siteId ?? "").trim();
    if (!siteId) throw new Error("`siteId` is required");

    ctx.log("info", "getting Netlify site", { siteId });

    return await netlifyFetch(ctx, `/sites/${encodeURIComponent(siteId)}`);
  },
};

export default action;
