import { interactionCreate } from "../lib/interactions.ts";

/**
 * Like a post — which creates an `app.bsky.feed.like` record in **your**
 * repository. See `lib/interactions.ts`: the URI this returns is the like's,
 * not the post's, and it is what `like-delete` wants.
 */
export default interactionCreate({
  key: "like-create",
  collection: "app.bsky.feed.like",
  verb: "like",
  viewerField: "like",
  title: "Like a post",
  description:
    "Like a post. This creates a LIKE RECORD in your own repository — the URI returned is the " +
    "like's, not the post's, and it is what unliking needs.",
});
