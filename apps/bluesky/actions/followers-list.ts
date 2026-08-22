import type { ActionDefinition } from "@w6w/types";
import { BlueskyClient, query } from "../lib/client.ts";
import { actorParam, CURSOR_PARAM, limitParam } from "../lib/params.ts";

/**
 * `app.bsky.graph.getFollowers` — who follows an account.
 *
 * ## One page is not the answer
 *
 * The cap is 100 per page and popular accounts have hundreds of thousands of
 * followers. A workflow that reads one page and calls it the follower list is
 * wrong by orders of magnitude, so this reports `hasMore` explicitly rather
 * than leaving it to be inferred from a cursor's presence.
 *
 * ## The count on a profile and this list disagree
 *
 * `followersCount` on a profile is an AppView aggregate that includes accounts
 * this list will not show — blocked, deactivated, or moderated ones. The two
 * numbers not matching is normal.
 */
const action: ActionDefinition = {
  key: "followers-list",
  type: "read",
  resource: "follow",
  title: "List followers",
  description:
    "Who follows an account, 100 at a time. The profile's `followersCount` will not match the " +
    "number of accounts this returns — it counts some that are not shown.",
  params: [actorParam("Account", "A handle or a DID."), limitParam(50), CURSOR_PARAM],
  output: [
    { key: "followers", type: "array", label: "Accounts in this page" },
    { key: "subject", type: "object", label: "The account being asked about" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "cursor", type: "string", label: "Pass back for the next page" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const actor = String(p.actor ?? "").trim().replace(/^@/, "");
    if (!actor) throw new Error("`actor` is required");

    const result = await new BlueskyClient(ctx).call<{
      followers?: unknown[];
      subject?: unknown;
      cursor?: string;
    }>("app.bsky.graph.getFollowers", {
      query: query({
        actor,
        limit: Math.min(100, Math.max(1, Number(p.limit ?? 50))),
        cursor: p.cursor,
      }),
    });

    const followers = result?.followers ?? [];
    return {
      followers,
      subject: result?.subject,
      count: followers.length,
      cursor: result?.cursor,
      hasMore: Boolean(result?.cursor),
    };
  },
};

export default action;
