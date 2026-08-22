import { interactionCreate } from "../lib/interactions.ts";

/** Repost — an `app.bsky.feed.repost` record in your repository. */
export default interactionCreate({
  key: "repost-create",
  collection: "app.bsky.feed.repost",
  verb: "repost",
  viewerField: "repost",
  title: "Repost",
  description:
    "Repost. Like a like, this is a RECORD IN YOUR REPOSITORY pointing at the post — the URI " +
    "returned is the repost's own. To add a comment, quote it with `post-create` instead.",
});
