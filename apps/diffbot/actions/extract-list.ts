import { extractAction } from "../lib/extract.ts";

/** `GET /v3/list` — listings page (beta) */
export default extractAction({
  key: "extract-list",
  api: "list",
  title: "Extract List (beta)",
  description:
    "Extract a listings page (news index, product listing, search results) into its items. Beta API. 1 credit per page.",
});
