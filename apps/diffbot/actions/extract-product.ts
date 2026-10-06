import { DISCUSSION_PARAM, extractAction } from "../lib/extract.ts";

/** `GET /v3/product` — e-commerce product page */
export default extractAction({
  key: "extract-product",
  api: "product",
  title: "Extract Product",
  description:
    "Extract price, availability, specs, brand, images and reviews from a product page. 1 credit per page (2 with a proxy).",
  params: [DISCUSSION_PARAM],
});
