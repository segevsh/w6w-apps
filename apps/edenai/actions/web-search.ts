import { defineUniversal } from "../lib/universal.ts";

/** `POST /v3/universal-ai` - model `web/search/{provider}`. */
interface Input {
  query: string;
  maxResults?: number;
  depth?: string;
  provider: string;
  fallbacks?: string;
  providerParams?: unknown;
}

export default defineUniversal<Input>({
  key: "web-search",
  title: "Search the Web",
  description:
    "Search the web for a query and return ranked results, optionally with a synthesized answer.",
  feature: "web",
  subfeature: "search",
  defaultProvider: "linkup",
  providerHint: "Provider such as linkup, firecrawl or tavily.",
  params: [
    { key: "query", label: "Query", type: "string", required: true },
    {
      key: "maxResults",
      label: "Max results",
      type: "number",
      validation: { min: 1, integer: true },
    },
    {
      key: "depth",
      label: "Depth",
      type: "select",
      options: [{ value: "standard", label: "Standard" }, { value: "deep", label: "Deep" }],
      hint: "Billed per tier; standard is the default. Not every provider accepts it.",
    },
  ],
  buildInput: (i) => ({
    query: i.query,
    max_results: i.maxResults || undefined,
    depth: i.depth || undefined,
  }),
  promote: [{ key: "results", type: "array", label: "Search results" }, {
    key: "answer",
    type: "string",
    label: "Answer",
  }],
});
