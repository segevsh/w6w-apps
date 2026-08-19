import type { ActionDefinition } from "@w6w/types";
import { DigitalOceanClient, query } from "../lib/client.ts";

/**
 * `GET /v2/reserved_ips` — reserved IPs, and the one whose billing is
 * backwards.
 *
 * ## An unassigned reserved IP is the one that costs
 *
 * This is the inverse of every intuition about cloud billing. A reserved IP
 * attached to a droplet is **free**; one attached to nothing is **charged
 * hourly**, because the charge is for holding an address out of the pool while
 * not using it.
 *
 * So the state that looks idle and harmless — a reserved IP sitting unassigned
 * after its droplet was destroyed — is the state that bills, and destroying a
 * droplet creates exactly that state automatically.
 *
 * That makes this the second half of `droplet-delete`'s warning, and the count
 * here is a direct answer to "what is this account paying for that nobody is
 * using".
 */
const action: ActionDefinition = {
  key: "reserved-ip-list",
  type: "search",
  resource: "reserved-ip",
  title: "List reserved IPs",
  description:
    "Reserved IPs, counting the UNASSIGNED ones — which is the inverse of the usual rule: an " +
    "assigned reserved IP is free and an unassigned one is charged hourly, and destroying a " +
    "droplet creates that state automatically.",
  params: [
    { key: "perPage", label: "Page Size", type: "number", default: 100 },
  ],
  output: [
    { key: "reservedIps", type: "array", label: "The reserved IPs" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "total", type: "number", label: "How many exist" },
    { key: "assignedCount", type: "number", label: "Attached to a droplet — these are free" },
    { key: "unassignedCount", type: "number", label: "Attached to nothing — these are charged" },
    { key: "unassignedIps", type: "array", label: "The addresses that are costing money" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const page = await new DigitalOceanClient(ctx).list<{
      ip?: string;
      droplet?: { id?: number } | null;
      region?: { slug?: string };
    }>("/v2/reserved_ips", "reserved_ips", {
      query: query({ per_page: Math.min(200, Math.max(1, Number(p.perPage ?? 100))) }),
    });

    // Assigned is free; unassigned is charged. This way round.
    const unassigned = page.items.filter((entry) => !entry?.droplet);

    if (unassigned.length) {
      ctx.log(
        "warn",
        "some reserved IPs are assigned to nothing and are therefore being charged — an " +
          "assigned reserved IP is free and an unassigned one is not",
        { unassignedCount: unassigned.length },
      );
    }

    return {
      reservedIps: page.items,
      count: page.items.length,
      total: page.total,
      assignedCount: page.items.length - unassigned.length,
      unassignedCount: unassigned.length,
      unassignedIps: unassigned.map((entry) => entry?.ip).filter(Boolean),
    };
  },
};

export default action;
