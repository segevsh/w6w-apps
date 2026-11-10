import { feedTrigger } from "../lib/triggers.ts";

export default feedTrigger({
  key: "post-removed",
  title: "Post Removed",
  description: "Fires when a post is removed from a Page's feed. The run gets the post ID.",
  keep: (e) =>
    ["status", "post", "share", "link"].includes(e.item ?? "") &&
    ["remove", "delete"].includes(e.verb ?? ""),
});
