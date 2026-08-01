import type { ActionDefinition } from "@w6w/types";
import { cfFetch } from "../lib/client.ts";

/**
 * Get a single zone's details.
 * `GET /zones/{zone_id}` — https://developers.cloudflare.com/api/resources/zones/methods/get/
 */
const action: ActionDefinition = {
  key: "zone-get",
  type: "read",
  resource: "zone",
  title: "Get a zone",
  description: "Get details for a single zone by ID",
  params: [
    {
      key: "zoneId",
      label: "Zone ID",
      type: "string",
      required: true,
      default: "",
      hint: "The zone's ID, from the Zone List action or the Cloudflare dashboard",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const zoneId = String(p.zoneId ?? "").trim();
    if (!zoneId) throw new Error("`zoneId` is required");

    ctx.log("info", "fetching Cloudflare zone", { zoneId });

    const { result } = await cfFetch(ctx, `/zones/${encodeURIComponent(zoneId)}`);
    return result;
  },
};

export default action;
