import { extractAction } from "../lib/extract.ts";

/** `GET /v3/image` — primary image(s) on a page */
export default extractAction({
  key: "extract-image",
  api: "image",
  title: "Extract Image",
  description:
    "Extract the primary image(s) of a page with dimensions, download URLs and recognition tags. 1 credit per page.",
});
