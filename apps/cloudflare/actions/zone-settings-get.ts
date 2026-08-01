import type { ActionDefinition } from "@w6w/types";
import { cfFetch } from "../lib/client.ts";

/**
 * Get every editable setting for a zone (SSL mode, cache level, always-use-https, …).
 * `GET /zones/{zone_id}/settings` —
 * https://developers.cloudflare.com/api/resources/zones/subresources/settings/methods/list/
 */
const action: ActionDefinition = {
  key: "zone-settings-get",
  type: "read",
  resource: "zone",
  title: "Get zone settings",
  description: "Get all settings for a zone (SSL mode, cache level, etc.)",
  params: [
    {
      key: "zoneId",
      label: "Zone ID",
      type: "string",
      required: true,
      default: "",
      hint: "The zone's ID",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const zoneId = String(p.zoneId ?? "").trim();
    if (!zoneId) throw new Error("`zoneId` is required");

    ctx.log("info", "fetching Cloudflare zone settings", { zoneId });

    const { result } = await cfFetch(ctx, `/zones/${encodeURIComponent(zoneId)}/settings`);
    return result;
  },
};

export default action;
