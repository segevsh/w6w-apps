import { feedTrigger } from "../lib/triggers.ts";

export default feedTrigger({
  key: "new-post",
  title: "New Post",
  description:
    "Fires when a post (status, link or share) is added to a Page's feed. The run gets the post ID, the text and who published it.",
  keep: (e) => ["status", "post", "share", "link"].includes(e.item ?? "") && e.verb === "add",
});
