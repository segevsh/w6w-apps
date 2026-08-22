import type { ActionDefinition } from "@w6w/types";
import { BlueskyClient, query } from "../lib/client.ts";
import { actorParam, CURSOR_PARAM, limitParam } from "../lib/params.ts";

/**
 * `app.bsky.graph.getFollows` — who an account follows.
 *
 * The mirror of `followers-list`, and the direction is worth being careful
 * about: this is the accounts *they* follow, not the accounts that follow them.
 * The two endpoint names differ by one letter and return the same shape, so a
 * mix-up produces a plausible list of the wrong people.
 */
const action: ActionDefinition = {
  key: "follows-list",
  type: "read",
  resource: "follow",
  title: "List who an account follows",
  description:
    "The accounts someone follows — the opposite direction from `followers-list`, which the two " +
    "endpoint names make easy to confuse.",
  params: [actorParam("Account", "A handle or a DID."), limitParam(50), CURSOR_PARAM],
  output: [
    { key: "follows", type: "array", label: "Accounts in this page" },
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
      follows?: unknown[];
      subject?: unknown;
      cursor?: string;
    }>("app.bsky.graph.getFollows", {
      query: query({
        actor,
        limit: Math.min(100, Math.max(1, Number(p.limit ?? 50))),
        cursor: p.cursor,
      }),
    });

    const follows = result?.follows ?? [];
    return {
      follows,
      subject: result?.subject,
      count: follows.length,
      cursor: result?.cursor,
      hasMore: Boolean(result?.cursor),
    };
  },
};

export default action;
