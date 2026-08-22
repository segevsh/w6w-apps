import type { ActionDefinition } from "@w6w/types";
import { DigitalOceanClient, query } from "../lib/client.ts";

/**
 * `GET /v2/droplets` — the account's droplets.
 *
 * ## A droplet that is off is a droplet that is billing
 *
 * `status` is `active`, `off`, `new` or `archive`. Only `archive` stops the
 * charge; **`off` does not**. A droplet powered down over a weekend costs the
 * same as one running, because the disk and the reservation are still held.
 *
 * That is the single most common misunderstanding of DigitalOcean's billing,
 * and a list of droplets is exactly where it becomes visible — so this counts
 * the powered-off ones and says what they are still costing.
 *
 * ## Tags are the only grouping there is
 *
 * DigitalOcean has no projects-as-namespaces in the API sense: a tag is how a
 * fleet is identified, and `tag_name` is the only server-side filter here. A
 * workflow that manages "the staging droplets" is a workflow that tags them.
 *
 * ## `meta.total` is the count; the array is a page
 *
 * Twenty by default. Counting the array counts the page.
 */
const action: ActionDefinition = {
  key: "droplet-list",
  type: "search",
  resource: "droplet",
  title: "List droplets",
  description:
    "The account's droplets. A droplet with status `off` is STILL BILLING — only destroying it " +
    "stops the charge — so this counts them, because powering things down to save money is the " +
    "commonest misunderstanding here.",
  params: [
    {
      key: "tag",
      label: "Tag",
      type: "string",
      default: "",
      hint: "The only server-side filter, and the only grouping DigitalOcean has.",
    },
    {
      key: "name",
      label: "Name Contains",
      type: "string",
      default: "",
      hint: "Matched here — the API has no name filter.",
    },
    { key: "perPage", label: "Page Size", type: "number", default: 100 },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "droplets", type: "array", label: "The droplets" },
    { key: "count", type: "number", label: "Returned in this page, after filtering" },
    { key: "total", type: "number", label: "How many exist — not the array's length" },
    { key: "ids", type: "array", label: "Just the droplet ids" },
    { key: "activeCount", type: "number", label: "How many are running" },
    { key: "offCount", type: "number", label: "How many are off AND still billing" },
    { key: "regions", type: "array", label: "The distinct regions in use" },
    { key: "nextPage", type: "string", label: "Absent on the last page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const page = await new DigitalOceanClient(ctx).list<{
      id?: number;
      name?: string;
      status?: string;
      region?: { slug?: string };
      size_slug?: string;
    }>("/v2/droplets", "droplets", {
      query: query({
        tag_name: p.tag,
        per_page: Math.min(200, Math.max(1, Number(p.perPage ?? 100))),
        page: Math.max(1, Number(p.page ?? 1)),
      }),
    });

    const needle = String(p.name ?? "").trim().toLowerCase();
    const droplets = needle
      ? page.items.filter((droplet) => String(droplet?.name ?? "").toLowerCase().includes(needle))
      : page.items;

    // Only `archive` stops the charge; `off` does not.
    const off = droplets.filter((droplet) => droplet?.status === "off");
    if (off.length) {
      ctx.log(
        "warn",
        "some droplets are powered off and still billing — only destroying a droplet stops the " +
          "charge",
        { offCount: off.length },
      );
    }

    return {
      droplets,
      count: droplets.length,
      // The array is one page; this is how many exist.
      total: page.total,
      ids: droplets.map((droplet) => droplet?.id).filter((id) => id !== undefined),
      activeCount: droplets.filter((droplet) => droplet?.status === "active").length,
      offCount: off.length,
      regions: [
        ...new Set(droplets.map((droplet) => droplet?.region?.slug).filter(Boolean) as string[]),
      ].sort(),
      nextPage: page.nextPage,
    };
  },
};

export default action;
