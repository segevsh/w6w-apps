import type { ActionDefinition } from "@w6w/types";
import { MastodonClient, query, stripHtml } from "../lib/client.ts";
import { limitParam, MAX_ID_PARAM, MIN_ID_PARAM } from "../lib/params.ts";

/**
 * `GET /api/v1/timelines/home` — what the connected account follows.
 *
 * ## For "what is new since last run", use `minId`
 *
 * This is the distinction the two forward-paging parameters exist for, and it
 * is easy to get wrong in exactly the way that loses data:
 *
 * - `since_id` returns the **newest** posts after that id. If more arrived than
 *   the limit, the middle is silently dropped.
 * - `min_id` returns the **oldest** posts after it, so calling repeatedly walks
 *   forward and misses nothing.
 *
 * A scheduled workflow storing the newest id it saw and passing it back wants
 * `min_id` every time. This action exposes that one and returns the next value
 * for it, and does not offer `since_id` at all — there is no use for it here
 * that is not a bug.
 */
const action: ActionDefinition = {
  key: "timeline-home",
  type: "read",
  resource: "timeline",
  title: "Get the home timeline",
  description:
    "What the connected account follows. For 'everything since last run', pass the previous " +
    "`nextMinId` — it walks forward without gaps, which `since_id` does not.",
  params: [limitParam(20), MAX_ID_PARAM, MIN_ID_PARAM],
  output: [
    { key: "statuses", type: "array", label: "The posts" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "texts", type: "array", label: "Their text, HTML stripped" },
    { key: "newestId", type: "string", label: "The newest id in this page — store this" },
    { key: "nextMaxId", type: "string", label: "Pass as Older Than to keep paging back" },
    { key: "nextMinId", type: "string", label: "Pass as Newer Than on the next run" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const page = await new MastodonClient(ctx).paged<Array<{ id?: string; content?: string }>>(
      "/api/v1/timelines/home",
      {
        query: query({
          limit: Math.min(40, Math.max(1, Number(p.limit ?? 20))),
          max_id: p.maxId,
          min_id: p.minId,
        }),
      },
    );

    const statuses = page.items ?? [];
    ctx.log("info", "read the Mastodon home timeline", { count: statuses.length });

    return {
      statuses,
      count: statuses.length,
      texts: statuses.map((status) => stripHtml(status?.content)),
      // Newest first, so the first entry is the high-water mark.
      newestId: statuses[0]?.id,
      nextMaxId: page.maxId,
      nextMinId: page.minId,
    };
  },
};

export default action;
