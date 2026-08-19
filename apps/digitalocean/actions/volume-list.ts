import type { ActionDefinition } from "@w6w/types";
import { DigitalOceanClient, query } from "../lib/client.ts";

/**
 * `GET /v2/volumes` — block storage, and what is orphaned.
 *
 * ## An unattached volume is the archetypal DigitalOcean waste
 *
 * A volume bills per gigabyte per month whether or not any droplet is using it,
 * and volumes routinely outlive the droplets they were created for — because
 * destroying a droplet does not destroy its volumes and nothing afterwards
 * mentions them.
 *
 * `droplet_ids` is empty for an unattached volume. That is the whole check, and
 * it is the single most useful thing this app can tell somebody about their
 * bill, so it is counted and the total size is reported.
 *
 * ## A volume is tied to one region, and to one droplet at a time
 *
 * It can only attach to a droplet in the same region, and only to one at a
 * time. So an orphaned volume in a region with no droplets is not merely unused
 * — it is unusable without being moved, which means snapshotting and
 * recreating.
 */
const action: ActionDefinition = {
  key: "volume-list",
  type: "search",
  resource: "volume",
  title: "List volumes",
  description:
    "Block storage volumes, counting the UNATTACHED ones — which bill per gigabyte forever and " +
    "routinely outlive the droplets they were made for, because destroying a droplet does not " +
    "destroy them.",
  params: [
    {
      key: "region",
      label: "Region",
      type: "string",
      default: "",
      hint: "A volume can only attach to a droplet in its own region.",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      default: "",
      advanced: true,
    },
    { key: "perPage", label: "Page Size", type: "number", default: 100 },
  ],
  output: [
    { key: "volumes", type: "array", label: "The volumes" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "total", type: "number", label: "How many exist" },
    { key: "totalGb", type: "number", label: "Gigabytes across them, all billing" },
    { key: "unattached", type: "array", label: "Volumes attached to nothing" },
    { key: "unattachedCount", type: "number", label: "How many" },
    { key: "unattachedGb", type: "number", label: "Gigabytes billing for nothing" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const page = await new DigitalOceanClient(ctx).list<{
      id?: string;
      name?: string;
      size_gigabytes?: number;
      region?: { slug?: string };
      droplet_ids?: number[];
    }>("/v2/volumes", "volumes", {
      query: query({
        region: p.region,
        name: p.name,
        per_page: Math.min(200, Math.max(1, Number(p.perPage ?? 100))),
      }),
    });

    const gb = (volume: { size_gigabytes?: number }) => Number(volume?.size_gigabytes ?? 0) || 0;
    // Empty droplet_ids is the whole check.
    const unattached = page.items.filter((volume) => !(volume?.droplet_ids ?? []).length);
    const unattachedGb = unattached.reduce((sum, volume) => sum + gb(volume), 0);

    if (unattached.length) {
      ctx.log(
        "warn",
        "some volumes are attached to no droplet and are still billing per gigabyte",
        { unattachedCount: unattached.length, unattachedGb },
      );
    }

    return {
      volumes: page.items,
      count: page.items.length,
      total: page.total,
      totalGb: page.items.reduce((sum, volume) => sum + gb(volume), 0),
      unattached,
      unattachedCount: unattached.length,
      unattachedGb,
    };
  },
};

export default action;
