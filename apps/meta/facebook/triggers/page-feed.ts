import { feedTrigger } from "../lib/triggers.ts";

export default feedTrigger({
  key: "page-feed",
  title: "Page Feed Activity",
  description:
    "Fires on any change in a Page's feed: a post, photo, video, comment or reaction added, edited or removed. The run gets the item, the verb, the post and comment IDs and the sender.",
});
