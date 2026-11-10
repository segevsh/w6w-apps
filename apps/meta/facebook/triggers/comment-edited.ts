import { feedTrigger } from "../lib/triggers.ts";

export default feedTrigger({
  key: "comment-edited",
  title: "Comment Edited",
  description:
    "Fires when a comment on a Page post is edited. The run gets the comment ID, its post and the new text.",
  keep: (e) => e.item === "comment" && ["edit", "edited"].includes(e.verb ?? ""),
});
