import type { ActionDefinition } from "@w6w/types";
import { BlueskyClient, postUri } from "../lib/client.ts";

/**
 * `com.atproto.repo.deleteRecord` for `app.bsky.feed.post`.
 *
 * ## Deleting removes your copy, not every copy
 *
 * The record goes from your repository and Bluesky's AppView stops serving it.
 * But the AT Protocol is a firehose others consume: relays, mirrors, third-party
 * AppViews and archivers may already hold it, and a delete is a request they
 * are free to honour late or not at all. This is materially different from a
 * centralised platform, and worth knowing before treating deletion as
 * retraction.
 *
 * ## You can only delete your own
 *
 * `deleteRecord` writes to a repository, and the session only holds one. There
 * is no moderation path here — someone else's post is reported, not deleted.
 */
const action: ActionDefinition = {
  key: "post-delete",
  type: "perform",
  resource: "post",
  title: "Delete a post",
  description:
    "Remove a post from your repository. Copies already pulled from the firehose by relays and " +
    "mirrors are outside anyone's control — a delete is a request, not an erasure.",
  idempotent: true,
  params: [
    {
      key: "uri",
      label: "Post",
      type: "string",
      required: true,
      default: "",
      hint: "An AT-URI or a bsky.app link. Must be your own post.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "uri", type: "string", label: "What was deleted" },
  ],

  async execute(input, ctx) {
    const client = new BlueskyClient(ctx);
    const p = input as Record<string, unknown>;
    const target = postUri(p.uri, "uri");

    if (target.did !== client.did) {
      throw new Error(
        `this post belongs to ${target.did}, and this connection is ${client.did}. A session ` +
          "writes to one repository only — someone else's post can be reported, not deleted",
      );
    }
    if (target.collection !== "app.bsky.feed.post") {
      throw new Error(
        `that URI is a ${target.collection} record, not a post. Use \`like-delete\` or ` +
          "`repost-delete` for those",
      );
    }

    await client.deleteRecord("app.bsky.feed.post", target.rkey);
    ctx.log("info", "deleted a Bluesky post", { rkey: target.rkey });
    return { deleted: true, uri: target.uri };
  },
};

export default action;
