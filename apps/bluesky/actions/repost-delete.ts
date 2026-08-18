import { interactionDelete } from "../lib/interactions.ts";

/** Remove a repost. Takes the repost's URI or the post's. */
export default interactionDelete({
  key: "repost-delete",
  collection: "app.bsky.feed.repost",
  verb: "repost",
  viewerField: "repost",
  title: "Remove a repost",
  description:
    "Remove a repost. Takes the REPOST record's URI, or the post's — given a post it finds your " +
    "own repost and removes that.",
});
