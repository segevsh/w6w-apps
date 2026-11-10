import { feedTrigger } from "../lib/triggers.ts";

export default feedTrigger({
  key: "comment-removed",
  title: "Comment Removed",
  description:
    "Fires when a comment on a Page post is removed. The run gets the comment ID and its post.",
  keep: (e) => e.item === "comment" && ["remove", "delete"].includes(e.verb ?? ""),
});
