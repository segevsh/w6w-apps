import { feedTrigger } from "../lib/triggers.ts";

export default feedTrigger({
  key: "new-photo",
  title: "New Photo",
  description:
    "Fires when a photo is added to a Page's feed. The run gets the photo's post ID and sender.",
  keep: (e) => ["photo", "picture"].includes(e.item ?? "") && e.verb === "add",
});
