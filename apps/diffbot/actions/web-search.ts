import type { ActionDefinition } from "@w6w/types";
import { compact, DiffbotClient, LLM_HOST } from "../lib/client.ts";

interface Input {
  text: string;
  size?: number;
  maxTokens?: number;
}

interface SearchResponse {
  query?: string[];
  search_results?: Array<{
    score?: number;
    pageUrl?: string;
    title?: string;
    content?: string;
    date?: string;
  }>;
  timeMs?: number;
}

/**
 * `POST https://llm.diffbot.com/api/v1/web_search` — search Diffbot's web index.
 * The one Diffbot API authenticated with `Authorization: Bearer` instead of a
 * `token` parameter (the Auth `sign` hook picks the form per host).
 */
const webSearch: ActionDefinition<Input> = {
  key: "web-search",
  type: "search",
  resource: "page",
  title: "Web Search",
  description: "Search Diffbot's web index and get ranked pages with a relevant content " +
    "highlight each. Supports the operators after:, before:, site: and url:.",
  params: [
    {
      key: "text",
      label: "Query",
      type: "string",
      required: true,
      hint: "e.g. diffbot site:wikipedia.org after:2025-01-01",
    },
    {
      key: "size",
      label: "Results",
      type: "number",
      default: 10,
      hint: "Number of results to return (vendor default 10).",
      validation: { min: 1, integer: true },
    },
    {
      key: "maxTokens",
      label: "Max tokens",
      type: "number",
      hint: "Cap the response size; highlight chunks are shortened evenly to fit.",
      validation: { min: 1, integer: true },
    },
  ],
  output: [
    { key: "count", type: "number", label: "Results returned" },
    { key: "results", type: "array", label: "Hits: score, pageUrl, title, content, date" },
    { key: "query", type: "array", label: "The parsed query terms" },
    { key: "timeMs", type: "number", label: "Server time in milliseconds" },
  ],

  async execute(input, ctx) {
    const { body } = await new DiffbotClient(ctx).request("/api/v1/web_search", {
      host: LLM_HOST,
      method: "POST",
      json: compact({ text: [input.text], size: input.size, maxTokens: input.maxTokens }),
    });
    const r = (body ?? {}) as SearchResponse;
    const results = Array.isArray(r.search_results) ? r.search_results : [];
    return { count: results.length, results, query: r.query ?? [], timeMs: r.timeMs };
  },
};

export default webSearch;
