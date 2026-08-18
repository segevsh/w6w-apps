import type { ActionDefinition } from "@w6w/types";
import { MastodonClient, stripHtml } from "../lib/client.ts";

/**
 * `GET /api/v1/statuses/{id}/context` — the thread around a status.
 *
 * ## Two flat arrays, not a tree
 *
 * `ancestors` is everything above, oldest first; `descendants` is everything
 * below. Neither is nested — the shape of the reply tree has to be
 * reconstructed from each status's `in_reply_to_id`, which is the field to
 * follow if the branching matters.
 *
 * ## The thread is only as complete as this instance's copy
 *
 * A reply from a server this one does not federate with is simply absent. So a
 * conversation can look one-sided here and complete elsewhere, and there is no
 * way to tell from the response which is happening. That is the fediverse
 * working as designed, not a fault, but it makes "read the whole thread"
 * something no instance can promise.
 */
const action: ActionDefinition = {
  key: "status-context",
  type: "read",
  resource: "status",
  title: "Get a thread",
  description:
    "The statuses above and below one post, as two flat arrays. Replies from servers this " +
    "instance does not federate with are simply absent, with nothing to say so.",
  params: [
    {
      key: "id",
      label: "Status",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "ancestors", type: "array", label: "Everything above, oldest first" },
    { key: "descendants", type: "array", label: "Everything below" },
    { key: "count", type: "number", label: "Statuses in the thread, excluding the one asked for" },
    { key: "texts", type: "array", label: "The whole thread's text, in order, HTML stripped" },
    { key: "participants", type: "array", label: "The distinct accounts taking part" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.id ?? "").trim();
    if (!id) throw new Error("`id` is required");

    const context = await new MastodonClient(ctx).request<{
      ancestors?: Array<{ content?: string; account?: { acct?: string } }>;
      descendants?: Array<{ content?: string; account?: { acct?: string } }>;
    }>(`/api/v1/statuses/${encodeURIComponent(id)}/context`);

    const ancestors = context?.ancestors ?? [];
    const descendants = context?.descendants ?? [];
    const all = [...ancestors, ...descendants];

    ctx.log("info", "read a Mastodon thread", {
      ancestors: ancestors.length,
      descendants: descendants.length,
    });

    return {
      ancestors,
      descendants,
      count: all.length,
      texts: all.map((status) => stripHtml(status?.content)),
      participants: [...new Set(all.map((status) => status?.account?.acct).filter(Boolean))],
    };
  },
};

export default action;
