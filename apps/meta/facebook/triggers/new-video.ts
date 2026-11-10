import { feedTrigger } from "../lib/triggers.ts";

export default feedTrigger({
  key: "new-video",
  title: "New Video",
  description:
    "Fires when a video is added to a Page's feed. The run gets the video's post ID and sender.",
  keep: (e) => e.item === "video" && e.verb === "add",
});
