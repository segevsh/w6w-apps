import { feedTrigger } from "../lib/triggers.ts";

export default feedTrigger({
  key: "post-edited",
  title: "Post Edited",
  description:
    "Fires when a post on a Page's feed is edited. The run gets the post ID and the new text.",
  keep: (e) =>
    ["status", "post", "share", "link"].includes(e.item ?? "") &&
    ["edit", "edited"].includes(e.verb ?? ""),
});
