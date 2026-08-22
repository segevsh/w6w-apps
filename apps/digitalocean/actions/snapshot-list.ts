import type { ActionDefinition } from "@w6w/types";
import { DigitalOceanClient, query } from "../lib/client.ts";

/**
 * `GET /v2/snapshots` — snapshots, and what they are quietly costing.
 *
 * ## Snapshots are forever, and nothing prompts you about them
 *
 * A snapshot is charged per gigabyte per month and has no expiry. It outlives
 * the droplet or volume it came from, appears in no droplet listing, and is
 * mentioned by nothing after it is taken. A team that snapshots before every
 * deploy accumulates them indefinitely.
 *
 * So this reports the total size and the oldest one, because "how much is this
 * costing and how far back does it go" is the question and neither figure is
 * anywhere else.
 *
 * ## A snapshot of a destroyed droplet is not obviously that
 *
 * `resource_id` points at something that may no longer exist. There is no flag
 * for "the source is gone" — so the oldest snapshots in an account are usually
 * the orphans, and the age is the only clue.
 *
 * ## Snapshots are regional for restore purposes
 *
 * `regions` lists where a snapshot can be used. Restoring into a region not on
 * that list requires transferring it first, which is a separate operation and
 * is charged.
 */
const action: ActionDefinition = {
  key: "snapshot-list",
  type: "search",
  resource: "snapshot",
  title: "List snapshots",
  description:
    "Snapshots with their total size and age. They are charged per gigabyte per month, have NO " +
    "EXPIRY, outlive whatever they were taken from, and nothing mentions them afterwards.",
  params: [
    {
      key: "resourceType",
      label: "Type",
      type: "select",
      default: "",
      options: [
        { value: "", label: "All" },
        { value: "droplet", label: "Droplet snapshots" },
        { value: "volume", label: "Volume snapshots" },
      ],
    },
    { key: "perPage", label: "Page Size", type: "number", default: 100 },
  ],
  output: [
    { key: "snapshots", type: "array", label: "The snapshots" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "total", type: "number", label: "How many exist" },
    { key: "totalGb", type: "number", label: "Gigabytes, all billing monthly and indefinitely" },
    { key: "oldest", type: "object", label: "The oldest — usually an orphan" },
    { key: "oldestAgeDays", type: "number", label: "How long it has been billing" },
    { key: "byType", type: "object", label: "How many of each kind" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const page = await new DigitalOceanClient(ctx).list<{
      id?: string;
      name?: string;
      created_at?: string;
      size_gigabytes?: number;
      resource_type?: string;
      resource_id?: string;
      regions?: string[];
    }>("/v2/snapshots", "snapshots", {
      query: query({
        resource_type: p.resourceType,
        per_page: Math.min(200, Math.max(1, Number(p.perPage ?? 100))),
      }),
    });

    const snapshots = page.items;
    const totalGb = snapshots.reduce(
      (sum, snapshot) => sum + (Number(snapshot?.size_gigabytes ?? 0) || 0),
      0,
    );

    const dated = snapshots
      .filter((snapshot) => typeof snapshot?.created_at === "string")
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const oldest = dated[0];
    const oldestAgeDays = oldest?.created_at
      ? Math.floor((Date.now() - Date.parse(oldest.created_at)) / 86_400_000)
      : undefined;

    const byType: Record<string, number> = {};
    for (const snapshot of snapshots) {
      const type = String(snapshot?.resource_type ?? "unknown");
      byType[type] = (byType[type] ?? 0) + 1;
    }

    ctx.log("info", "listed DigitalOcean snapshots", { count: snapshots.length, totalGb });

    return {
      snapshots,
      count: snapshots.length,
      total: page.total,
      totalGb,
      // The oldest are usually the orphans; nothing flags a missing source.
      oldest,
      oldestAgeDays,
      byType,
    };
  },
};

export default action;
