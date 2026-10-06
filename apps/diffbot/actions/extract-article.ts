import { DISCUSSION_PARAM, extractAction } from "../lib/extract.ts";

const NL_OPTIONS = [
  "entities",
  "sentiment",
  "summary",
  "facts",
  "openFacts",
  "records",
  "categories",
  "sentences",
  "language",
];

/** `GET /v3/article` — news articles, blog posts and other text-heavy pages. */
export default extractAction({
  key: "extract-article",
  api: "article",
  title: "Extract Article",
  description: "Extract the clean text, author, date, sentiment, tags, categories and images " +
    "of an article or blog post. 1 credit per page (2 with a proxy); the optional Natural " +
    "Language add-ons bill extra.",
  params: [
    {
      key: "paging",
      label: "Concatenate multi-page articles",
      type: "boolean",
      hint: "Follow the pages of a multi-page article and return them as one.",
    },
    {
      key: "maxTags",
      label: "Max tags",
      type: "number",
      hint: "Maximum automatically generated tags (vendor default 10).",
      validation: { min: 0, integer: true },
    },
    {
      key: "tagConfidence",
      label: "Tag confidence",
      type: "number",
      hint: "Minimum tag relevance 0.0-1.0 (vendor default 0.5).",
      validation: { min: 0, max: 1 },
    },
    {
      key: "categoryConfidence",
      label: "Category confidence",
      type: "number",
      hint: "Minimum category relevance 0.0-1.0 (vendor default 0.5).",
      validation: { min: 0, max: 1 },
    },
    {
      key: "naturalLanguage",
      label: "Natural Language add-ons",
      type: "string",
      hint: `Comma-separated, run on the extracted text: ${NL_OPTIONS.join(", ")}.`,
    },
    {
      key: "summaryNumSentences",
      label: "Summary length (sentences)",
      type: "number",
      hint: "With the summary add-on. Vendor default 3.",
      validation: { min: 1, integer: true },
    },
    DISCUSSION_PARAM,
  ],
  extraQuery: (i) => ({
    paging: i.paging === true ? true : undefined,
    maxTags: i.maxTags as number | undefined,
    tagConfidence: i.tagConfidence as number | undefined,
    categoryConfidence: i.categoryConfidence as number | undefined,
    naturalLanguage: (i.naturalLanguage as string | undefined)?.replace(/\s+/g, "") || undefined,
    summaryNumSentences: i.summaryNumSentences as number | undefined,
  }),
});
