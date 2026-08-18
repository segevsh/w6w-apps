import { interactionDelete } from "../lib/interactions.ts";

/**
 * Unlike — delete the like record. Accepts the like's URI or the post's; given
 * the post, the existing like is found through `viewer.like`.
 */
export default interactionDelete({
  key: "like-delete",
  collection: "app.bsky.feed.like",
  verb: "like",
  viewerField: "like",
  title: "Unlike a post",
  description:
    "Remove a like. Takes the LIKE record's URI, or the post's — given a post it finds your own " +
    "like and removes that, because deleting by post URI is what fails confusingly.",
});
