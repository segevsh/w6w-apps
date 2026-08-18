import type { ActionDefinition } from "@w6w/types";
import { MastodonClient, query, stripHtml } from "../lib/client.ts";
import { limitParam, MAX_ID_PARAM, MIN_ID_PARAM } from "../lib/params.ts";

/**
 * `GET /api/v1/accounts/{id}/statuses` — one account's posts.
 *
 * ## For a remote account this is a cache, not their history
 *
 * The instance holds whatever federated in — which for an account nobody here
 * follows may be almost nothing, and for one followed by hundreds may be years.
 * Two instances asked the same question return different answers, both
 * correctly. There is no way to ask for the rest.
 *
 * ## Boosts are other people's posts
 *
 * By default the feed includes what the account boosted, and those entries are
 * the *original author's* status with a `reblog` wrapper. Reading
 * `status.account.acct` and assuming it is the account you asked about is wrong
 * for every boost, so this counts them and can exclude them.
 *
 * ## `exclude_replies` matters more than it looks
 *
 * A conversational account's feed is mostly replies, which is rarely what
 * "watch this account for announcements" means. Mastodon includes them by
 * default; this action excludes them by default and says so.
 */
const action: ActionDefinition = {
  key: "account-statuses",
  type: "read",
  resource: "account",
  title: "Get an account's posts",
  description:
    "One account's posts. For a REMOTE account this is whatever federated in, not their history " +
    "— and boosts arrive as the original author's post.",
  params: [
    {
      key: "id",
      label: "Account",
      type: "string",
      required: true,
      default: "",
      hint: "An account id from `account-lookup` — not a handle.",
    },
    {
      key: "excludeReplies",
      label: "Exclude Replies",
      type: "boolean",
      default: true,
      hint: "On by default, against Mastodon's own default: a chatty account's feed is mostly " +
        "replies.",
    },
    {
      key: "excludeReblogs",
      label: "Exclude Boosts",
      type: "boolean",
      default: false,
      hint: "Boosts are somebody else's post wrapped — they are counted either way.",
    },
    {
      key: "onlyMedia",
      label: "Only With Media",
      type: "boolean",
      default: false,
    },
    {
      key: "tagged",
      label: "Tagged",
      type: "string",
      default: "",
      advanced: true,
      hint: "A hashtag, without the #.",
    },
    limitParam(20),
    MAX_ID_PARAM,
    MIN_ID_PARAM,
  ],
  output: [
    { key: "statuses", type: "array", label: "The posts" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "boostCount", type: "number", label: "How many were boosts, not original posts" },
    { key: "texts", type: "array", label: "Their text, HTML stripped" },
    { key: "nextMaxId", type: "string", label: "Pass as Older Than for the next page" },
    { key: "nextMinId", type: "string", label: "Pass as Newer Than to walk forward next run" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.id ?? "").trim();
    if (!id) throw new Error("`id` is required");

    const page = await new MastodonClient(ctx).paged<
      Array<{ content?: string; reblog?: unknown }>
    >(`/api/v1/accounts/${encodeURIComponent(id)}/statuses`, {
      query: query({
        exclude_replies: p.excludeReplies === false ? undefined : true,
        exclude_reblogs: p.excludeReblogs === true ? true : undefined,
        only_media: p.onlyMedia === true ? true : undefined,
        tagged: p.tagged,
        limit: Math.min(40, Math.max(1, Number(p.limit ?? 20))),
        max_id: p.maxId,
        min_id: p.minId,
      }),
    });

    const statuses = page.items ?? [];
    // A boost's `account` is the original author's, not the account asked about.
    const boostCount = statuses.filter((status) => status?.reblog).length;

    ctx.log("info", "read a Mastodon account's posts", {
      count: statuses.length,
      boostCount,
    });

    return {
      statuses,
      count: statuses.length,
      boostCount,
      texts: statuses.map((status) => stripHtml(status?.content)),
      nextMaxId: page.maxId,
      nextMinId: page.minId,
    };
  },
};

export default action;
