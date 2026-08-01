import type { ActionDefinition } from "@w6w/types";
import { netlifyFetch } from "../lib/client.ts";

/**
 * List Netlify Forms detected on a site.
 * `GET /sites/{site_id}/forms` —
 * https://open-api.netlify.com/ (operationId `listSiteForms`)
 */
const action: ActionDefinition = {
  key: "form-list",
  type: "read",
  resource: "form",
  title: "List forms",
  description: "List forms detected on a site",
  params: [
    {
      key: "siteId",
      label: "Site ID",
      type: "string",
      required: true,
      default: "",
      hint: "The site's ID",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const siteId = String(p.siteId ?? "").trim();
    if (!siteId) throw new Error("`siteId` is required");

    ctx.log("info", "listing Netlify forms", { siteId });

    return await netlifyFetch(ctx, `/sites/${encodeURIComponent(siteId)}/forms`);
  },
};

export default action;
