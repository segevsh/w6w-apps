import { feedTrigger } from "../lib/triggers.ts";

export default feedTrigger({
  key: "new-comment",
  title: "New Comment",
  description:
    "Fires when someone comments on a Page post. The run gets the comment ID and text, the post it belongs to and who wrote it.",
  keep: (e) => e.item === "comment" && e.verb === "add",
});
