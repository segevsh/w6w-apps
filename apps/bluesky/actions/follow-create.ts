import type { ActionDefinition } from "@w6w/types";
import { BlueskyClient, nowIso } from "../lib/client.ts";
import { actorParam } from "../lib/params.ts";

/**
 * Follow — an `app.bsky.graph.follow` record in your repository whose subject
 * is the other account's **DID**.
 *
 * ## The subject is a DID, and this action resolves it
 *
 * A follow record stores the DID, not the handle, and that is the right choice:
 * handles are DNS names that change hands. But it means following
 * `@alice.bsky.social` requires resolving the handle first, and resolving it
 * *now* — a stale handle→DID mapping cached anywhere would follow whoever holds
 * the name today.
 *
 * ## Following twice makes a second record
 *
 * There is no uniqueness constraint. The follow already shows in
 * `viewer.following`, so this reports when one existed and warns that the
 * earlier record is now orphaned — it still exists in your repo, pointing at
 * the same person, and only the newest one is what `unfollow` will find.
 */
const action: ActionDefinition = {
  key: "follow-create",
  type: "perform",
  resource: "follow",
  title: "Follow an account",
  description:
    "Follow someone. The record stores their DID rather than their handle, so the handle is " +
    "resolved first — the DID is the account, the handle is a rented name.",
  idempotent: false,
  params: [
    actorParam("Account", "A handle or a DID. A handle is resolved to its DID before writing."),
  ],
  output: [
    { key: "uri", type: "string", label: "The follow record's own URI — what unfollowing needs" },
    { key: "cid", type: "string", label: "Its content hash" },
    { key: "did", type: "string", label: "The DID now followed" },
    { key: "handle", type: "string", label: "Their handle at the time of following" },
    { key: "alreadyFollowing", type: "boolean", label: "There was already a follow, now orphaned" },
  ],

  async execute(input, ctx) {
    const client = new BlueskyClient(ctx);
    const p = input as Record<string, unknown>;
    const actor = String(p.actor ?? "").trim().replace(/^@/, "");
    if (!actor) throw new Error("`actor` is required");

    const profile = await client.call<{
      did?: string;
      handle?: string;
      viewer?: { following?: string };
    }>("app.bsky.actor.getProfile", { query: { actor } });
    if (!profile?.did) throw new Error(`could not resolve ${actor} to a DID`);

    if (profile.did === client.did) {
      throw new Error("an account cannot follow itself");
    }

    const created = await client.createRecord<{ uri: string; cid: string }>(
      "app.bsky.graph.follow",
      { $type: "app.bsky.graph.follow", subject: profile.did, createdAt: nowIso() },
    );

    if (profile.viewer?.following) {
      ctx.log("warn", "this account was already followed — the previous record is now orphaned", {
        previous: profile.viewer.following,
      });
    }

    ctx.log("info", "followed a Bluesky account", { did: profile.did });
    return {
      ...created,
      did: profile.did,
      handle: profile.handle,
      alreadyFollowing: Boolean(profile.viewer?.following),
    };
  },
};

export default action;
