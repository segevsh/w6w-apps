import { DISCUSSION_PARAM, extractAction } from "../lib/extract.ts";

const API_OPTIONS = ["article", "product", "discussion", "image", "video", "list", "event"].map((
  v,
) => ({ value: v, label: v }));

/**
 * `GET /v3/analyze` — classify a page and, when it matches a page-type API,
 * extract it as that type. Pages that match nothing come back as type `other`
 * with just the default fields.
 */
export default extractAction({
  key: "extract-analyze",
  api: "analyze",
  title: "Analyze Page",
  description: "Let Diffbot classify any URL (article, product, discussion, image, video, …) " +
    "and extract it as that type in one call. Use Extract Article/Product/… instead to force a " +
    "specific schema. 1 credit per page (2 with a proxy).",
  params: [
    {
      key: "mode",
      label: "Only extract as",
      type: "select",
      options: API_OPTIONS,
      hint: "Extract only pages of this type; other pages return the default Analyze fields.",
    },
    {
      key: "fallback",
      label: "Fallback type",
      type: "select",
      options: API_OPTIONS,
      hint: "Extract pages Diffbot classifies as `other` with this API instead.",
    },
    DISCUSSION_PARAM,
  ],
  extraQuery: (i) => ({
    mode: (i.mode as string | undefined) || undefined,
    fallback: (i.fallback as string | undefined) || undefined,
  }),
});
