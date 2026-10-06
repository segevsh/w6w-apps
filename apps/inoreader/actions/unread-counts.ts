import type { ActionDefinition } from "@w6w/types";
import { InoreaderClient } from "../lib/client.ts";

/**
 * `GET /reader/api/0/unread-count` (zone 1) — unread counters for every folder, tag and feed.
 * `max` is the ceiling for this user's plan: a `count` equal to `max` means "max or more".
 * `user/-/state/com.google/reading-list` is the grand total.
 */
const unreadCounts: ActionDefinition<Record<string, never>> = {
  key: "unread-counts",
  type: "read",
  resource: "streams",
  title: "Get Unread Counts",
  description: "Unread counters for every feed, folder and tag, plus the overall total.",
  params: [],
  output: [
    { key: "max", type: "number", label: "Counter ceiling for this plan" },
    { key: "unreadcounts", type: "array", label: "Counters" },
    { key: "total", type: "number", label: "Total unread (reading-list counter)" },
  ],

  async execute(_input, ctx) {
    const body = await new InoreaderClient(ctx).json<{
      max?: number;
      unreadcounts?: Array<{ id?: string; count?: number }>;
    }>("/unread-count");
    const unreadcounts = body.unreadcounts ?? [];
    const total = unreadcounts.find((c) => /\/state\/com\.google\/reading-list$/.test(c.id ?? ""))
      ?.count;
    return { max: body.max, unreadcounts, total };
  },
};

export default unreadCounts;
