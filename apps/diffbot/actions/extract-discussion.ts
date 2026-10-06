import { extractAction } from "../lib/extract.ts";

/** `GET /v3/discussion` — threads of posts: forum threads, comment sections, reviews. */
export default extractAction({
  key: "extract-discussion",
  api: "discussion",
  title: "Extract Discussion",
  description: "Extract a thread of posts (forum thread, comment section, product reviews) with " +
    "authors, dates and replies. 1 credit per page; every extra page concatenated is a separate " +
    "billed call.",
  params: [
    {
      key: "paging",
      label: "Concatenate multi-page threads",
      type: "boolean",
      hint: "Follow the pages of a thread and return them as one.",
    },
    {
      key: "maxPages",
      label: "Max pages",
      type: "string",
      hint: "Pages to concatenate: a number, or `all`. Each page is a separate billed call.",
    },
  ],
  extraQuery: (i) => ({
    paging: i.paging === true ? true : undefined,
    maxPages: (i.maxPages as string | undefined)?.trim() || undefined,
  }),
});
