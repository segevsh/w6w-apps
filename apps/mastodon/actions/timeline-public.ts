import type { ActionDefinition } from "@w6w/types";
import { MastodonClient, query, stripHtml } from "../lib/client.ts";
import { limitParam, MAX_ID_PARAM, MIN_ID_PARAM } from "../lib/params.ts";

/**
 * `GET /api/v1/timelines/public` and `/tag/{hashtag}` — the firehose, as this
 * instance sees it.
 *
 * ## Local and federated are very different questions
 *
 * `local` is what this instance's own members posted — a small, coherent
 * community feed. Federated (the default) is everything that arrived from
 * anywhere, which on a large server is thousands of posts an hour from people
 * nobody here follows.
 *
 * Neither is "the fediverse". A hashtag search on one instance and the same
 * search on another return different posts, both correctly, because each has
 * seen a different slice of the network.
 *
 * ## Many instances require a token for this now
 *
 * Public timelines used to be readable by anyone. A great many servers have
 * since closed them to authenticated requests only, to reduce scraping —
 * `mastodon.social` among them, verified live. The request here is
 * authenticated, so this works; an unauthenticated equivalent may not.
 */
const action: ActionDefinition = {
  key: "timeline-public",
  type: "read",
  resource: "timeline",
  title: "Get a public or hashtag timeline",
  description:
    "The instance's public firehose, or one hashtag. `local` is this server's own members; " +
    "federated is whatever arrived here — and neither is the whole network.",
  params: [
    {
      key: "hashtag",
      label: "Hashtag",
      type: "string",
      default: "",
      hint: "Without the #. Blank reads the general public timeline.",
    },
    {
      key: "scope",
      label: "Scope",
      type: "select",
      default: "federated",
      options: [
        { value: "federated", label: "Federated — everything that reached this server" },
        { value: "local", label: "Local — only this instance's own members" },
        { value: "remote", label: "Remote — only what arrived from elsewhere" },
      ],
    },
    {
      key: "onlyMedia",
      label: "Only With Media",
      type: "boolean",
      default: false,
    },
    limitParam(20),
    MAX_ID_PARAM,
    MIN_ID_PARAM,
  ],
  output: [
    { key: "statuses", type: "array", label: "The posts" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "texts", type: "array", label: "Their text, HTML stripped" },
    { key: "newestId", type: "string", label: "The newest id in this page" },
    { key: "nextMaxId", type: "string", label: "Pass as Older Than to keep paging back" },
    { key: "nextMinId", type: "string", label: "Pass as Newer Than on the next run" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const hashtag = String(p.hashtag ?? "").trim().replace(/^#/, "");
    const scope = String(p.scope ?? "federated");

    const path = hashtag
      ? `/api/v1/timelines/tag/${encodeURIComponent(hashtag)}`
      : "/api/v1/timelines/public";

    const page = await new MastodonClient(ctx).paged<Array<{ id?: string; content?: string }>>(
      path,
      {
        query: query({
          local: scope === "local" ? true : undefined,
          remote: scope === "remote" ? true : undefined,
          only_media: p.onlyMedia === true ? true : undefined,
          limit: Math.min(40, Math.max(1, Number(p.limit ?? 20))),
          max_id: p.maxId,
          min_id: p.minId,
        }),
      },
    );

    const statuses = page.items ?? [];
    ctx.log("info", "read a Mastodon public timeline", {
      count: statuses.length,
      scope,
      hashtag: Boolean(hashtag),
    });

    return {
      statuses,
      count: statuses.length,
      texts: statuses.map((status) => stripHtml(status?.content)),
      newestId: statuses[0]?.id,
      nextMaxId: page.maxId,
      nextMinId: page.minId,
    };
  },
};

export default action;
