import { extractAction } from "../lib/extract.ts";

/** `GET /v3/video` — video page */
export default extractAction({
  key: "extract-video",
  api: "video",
  title: "Extract Video",
  description:
    "Extract a video page: metadata, thumbnails, direct video URL, embed code and view count. 1 credit per page.",
});
