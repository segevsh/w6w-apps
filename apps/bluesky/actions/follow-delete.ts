import type { ActionDefinition } from "@w6w/types";
import { BlueskyClient, parseAtUri } from "../lib/client.ts";

/**
 * Unfollow — delete the follow record.
 *
 * Accepts the follow record's own AT-URI, or the account, in which case the
 * existing follow is found through `viewer.following`. Deleting by DID directly
 * is not possible: `deleteRecord` addresses a record by rkey, and the rkey is
 * only in the follow's URI.
 */
const action: ActionDefinition = {
  key: "follow-delete",
  type: "perform",
  resource: "follow",
  title: "Unfollow an account",
  description:
    "Unfollow. Takes the FOLLOW record's URI, or a handle or DID — given an account it finds " +
    "your own follow record and deletes that.",
  idempotent: true,
  params: [
    {
      key: "actor",
      label: "Account or follow URI",
      type: "string",
      required: true,
      default: "",
      hint: "A handle, a DID, or the follow record's AT-URI.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Removed" },
    { key: "uri", type: "string", label: "The follow record that was removed" },
    { key: "wasFollowing", type: "boolean", label: "Whether there was a follow to remove" },
  ],

  async execute(input, ctx) {
    const client = new BlueskyClient(ctx);
    const p = input as Record<string, unknown>;
    const raw = String(p.actor ?? "").trim().replace(/^@/, "");
    if (!raw) throw new Error("`actor` is required");

    if (raw.startsWith("at://")) {
      const parsed = parseAtUri(raw, "actor");
      if (parsed.collection !== "app.bsky.graph.follow") {
        throw new Error(`that URI is a ${parsed.collection} record, not a follow`);
      }
      if (parsed.did !== client.did) {
        throw new Error(`that follow record belongs to ${parsed.did}, not to this connection`);
      }
      await client.deleteRecord("app.bsky.graph.follow", parsed.rkey);
      return { deleted: true, uri: raw, wasFollowing: true };
    }

    const profile = await client.call<{ viewer?: { following?: string } }>(
      "app.bsky.actor.getProfile",
      { query: { actor: raw } },
    );
    const existing = profile?.viewer?.following;
    if (!existing) {
      // Already not following: the desired state is the actual state.
      return { deleted: false, wasFollowing: false };
    }

    const parsed = parseAtUri(existing, "actor");
    await client.deleteRecord("app.bsky.graph.follow", parsed.rkey);
    ctx.log("info", "unfollowed a Bluesky account", { rkey: parsed.rkey });
    return { deleted: true, uri: existing, wasFollowing: true };
  },
};

export default action;
