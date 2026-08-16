import type { ActionDefinition } from "@w6w/types";
import { PerplexityClient } from "../lib/client.ts";

interface Input {
  query: string | string[];
  maxResults?: number;
  searchDomainFilter?: string[];
  searchLanguageFilter?: string[];
  country?: string;
  searchContextSize?: "low" | "medium" | "high";
  maxTokens?: number;
  maxTokensPerPage?: number;
  searchRecencyFilter?: "hour" | "day" | "week" | "month" | "year";
  searchAfterDateFilter?: string;
  searchBeforeDateFilter?: string;
  lastUpdatedAfterFilter?: string;
  lastUpdatedBeforeFilter?: string;
}

/**
 * POST /search — Perplexity's standalone Search API: ranked web results with
 * extracted page content, no completion generated. A different, current
 * product from Sonar chat completions (not part of the September 2026
 * deprecation — see `chat-completion.ts` and the README).
 *
 * Verified against `https://docs.perplexity.ai/openapi.json` (`ApiSearchRequest`
 * / `ApiSearchResponse`, fetched 2026-08-16) and a live unauthenticated probe:
 * `POST /search` -> `401 application/json`, the same `invalid_api_key` shape
 * as every other endpoint.
 *
 * `search_context_size` and `max_tokens` / `max_tokens_per_page` both control
 * how much page content comes back per result; the API docs say to omit
 * `search_context_size` when using either token cap, so this action sends
 * whichever the caller set rather than both.
 */
const webSearch: ActionDefinition<Input> = {
  key: "web-search",
  type: "search",
  resource: "search",
  title: "Web Search",
  description: "Search the web and retrieve ranked results with extracted page content.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      hint: "A single query string, or a JSON array of strings for a multi-query search.",
    },
    {
      key: "maxResults",
      label: "Max results",
      type: "number",
      default: 10,
      hint: "1-20.",
    },
    {
      key: "searchDomainFilter",
      label: "Search domain filter",
      type: "string",
      repeat: true,
      hint: "Limit results to these domains (max 20). Prefix a domain with `-` to exclude it.",
    },
    {
      key: "searchLanguageFilter",
      label: "Search language filter",
      type: "string",
      repeat: true,
      hint: "ISO 639-1 codes (max 20), e.g. en, fr.",
    },
    {
      key: "country",
      label: "Country",
      type: "string",
      hint: "ISO 3166-1 alpha-2 country code, e.g. US.",
    },
    {
      key: "searchContextSize",
      label: "Search context size",
      type: "select",
      options: [
        { value: "low", label: "Low — short passages" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High — detailed content (default)" },
      ],
      hint: "Omit if setting either max-tokens field below.",
    },
    {
      key: "maxTokens",
      label: "Max total content tokens",
      type: "number",
      hint: "Cap across all results combined.",
    },
    {
      key: "maxTokensPerPage",
      label: "Max content tokens per page",
      type: "number",
    },
    {
      key: "searchRecencyFilter",
      label: "Search recency filter",
      type: "select",
      options: [
        { value: "hour", label: "Past hour" },
        { value: "day", label: "Past day" },
        { value: "week", label: "Past week" },
        { value: "month", label: "Past month" },
        { value: "year", label: "Past year" },
      ],
    },
    {
      key: "searchAfterDateFilter",
      label: "Search after date",
      type: "string",
      hint: "MM/DD/YYYY — only results published after this date.",
    },
    {
      key: "searchBeforeDateFilter",
      label: "Search before date",
      type: "string",
      hint: "MM/DD/YYYY — only results published before this date.",
    },
    {
      key: "lastUpdatedAfterFilter",
      label: "Last updated after",
      type: "string",
      hint: "MM/DD/YYYY — only results last updated after this date.",
    },
    {
      key: "lastUpdatedBeforeFilter",
      label: "Last updated before",
      type: "string",
      hint: "MM/DD/YYYY — only results last updated before this date.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Search ID" },
    { key: "results", type: "array", label: "Results" },
  ],

  execute(input, ctx) {
    const client = new PerplexityClient(ctx);
    const body: Record<string, unknown> = { query: input.query };
    if (input.maxResults !== undefined) body.max_results = input.maxResults;
    if (input.searchDomainFilter !== undefined && input.searchDomainFilter.length > 0) {
      body.search_domain_filter = input.searchDomainFilter;
    }
    if (input.searchLanguageFilter !== undefined && input.searchLanguageFilter.length > 0) {
      body.search_language_filter = input.searchLanguageFilter;
    }
    if (input.country) body.country = input.country;
    if (input.searchContextSize) body.search_context_size = input.searchContextSize;
    if (input.maxTokens !== undefined) body.max_tokens = input.maxTokens;
    if (input.maxTokensPerPage !== undefined) body.max_tokens_per_page = input.maxTokensPerPage;
    if (input.searchRecencyFilter) body.search_recency_filter = input.searchRecencyFilter;
    if (input.searchAfterDateFilter) body.search_after_date_filter = input.searchAfterDateFilter;
    if (input.searchBeforeDateFilter) {
      body.search_before_date_filter = input.searchBeforeDateFilter;
    }
    if (input.lastUpdatedAfterFilter) {
      body.last_updated_after_filter = input.lastUpdatedAfterFilter;
    }
    if (input.lastUpdatedBeforeFilter) {
      body.last_updated_before_filter = input.lastUpdatedBeforeFilter;
    }

    return client.request("/search", { method: "POST", body });
  },
};

export default webSearch;
