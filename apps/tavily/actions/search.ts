import type { ActionDefinition } from "@w6w/types";
import { TavilyClient, toList } from "../lib/client.ts";

/**
 * `POST /search` — web search optimised for LLM agents. Costs 1 credit
 * (`basic`, `fast`, `ultra-fast`) or 2 (`advanced`), so the default is `basic`
 * with a small result count.
 */
interface Input {
  query: string;
  searchDepth?: string;
  topic?: string;
  maxResults?: number;
  chunksPerSource?: number;
  timeRange?: string;
  startDate?: string;
  endDate?: string;
  includeAnswer?: string;
  includeRawContent?: string;
  includeImages?: boolean;
  includeDomains?: string;
  excludeDomains?: string;
  country?: string;
  autoParameters?: boolean;
}

const search: ActionDefinition<Input> = {
  key: "search",
  type: "search",
  resource: "result",
  title: "Search",
  description: "Search the web and get ranked, cleaned results, optionally with an LLM answer.",
  params: [
    { key: "query", label: "Query", type: "string", required: true },
    {
      key: "searchDepth",
      label: "Search depth",
      type: "select",
      default: "basic",
      options: [
        { value: "basic", label: "Basic (1 credit)" },
        { value: "fast", label: "Fast (1 credit)" },
        { value: "ultra-fast", label: "Ultra-fast (1 credit)" },
        { value: "advanced", label: "Advanced (2 credits, highest relevance)" },
      ],
    },
    {
      key: "topic",
      label: "Topic",
      type: "select",
      default: "general",
      options: [
        { value: "general", label: "General" },
        { value: "news", label: "News" },
        { value: "finance", label: "Finance" },
      ],
    },
    {
      key: "maxResults",
      label: "Max results",
      type: "number",
      default: 5,
      validation: { min: 0, max: 20, integer: true },
      hint: "Tavily's own default is 10; this app prefills 5.",
    },
    {
      key: "chunksPerSource",
      label: "Chunks per source",
      type: "number",
      validation: { min: 1, max: 3, integer: true },
      hint: "Snippets per result (1-3). Not available at ultra-fast depth.",
    },
    {
      key: "timeRange",
      label: "Time range",
      type: "select",
      options: [
        { value: "", label: "Any time" },
        { value: "day", label: "Past day" },
        { value: "week", label: "Past week" },
        { value: "month", label: "Past month" },
        { value: "year", label: "Past year" },
      ],
    },
    { key: "startDate", label: "Start date", type: "string", placeholder: "YYYY-MM-DD" },
    { key: "endDate", label: "End date", type: "string", placeholder: "YYYY-MM-DD" },
    {
      key: "includeAnswer",
      label: "Include answer",
      type: "select",
      options: [
        { value: "", label: "No answer" },
        { value: "basic", label: "Basic answer" },
        { value: "advanced", label: "Detailed answer" },
      ],
    },
    {
      key: "includeRawContent",
      label: "Include raw content",
      type: "select",
      options: [
        { value: "", label: "No" },
        { value: "markdown", label: "Markdown" },
        { value: "text", label: "Plain text" },
      ],
    },
    { key: "includeImages", label: "Include images", type: "boolean" },
    {
      key: "includeDomains",
      label: "Include domains",
      type: "text",
      hint: "Comma or newline separated. At most 300.",
    },
    {
      key: "excludeDomains",
      label: "Exclude domains",
      type: "text",
      hint: "Comma or newline separated. At most 150.",
    },
    {
      key: "country",
      label: "Boost country",
      type: "string",
      hint: "Lower-case country name, e.g. 'germany'. Only for the general topic.",
    },
    {
      key: "autoParameters",
      label: "Auto parameters",
      type: "boolean",
      hint: "Let Tavily choose parameters. May select advanced depth and cost 2 credits.",
    },
  ],
  output: [
    { key: "query", type: "string", label: "Query" },
    { key: "answer", type: "string", label: "LLM answer" },
    { key: "results", type: "array", label: "Results" },
    { key: "images", type: "array", label: "Images" },
    { key: "response_time", type: "number", label: "Response time (s)" },
    { key: "request_id", type: "string", label: "Request ID" },
  ],

  execute(input, ctx) {
    return new TavilyClient(ctx).post("/search", {
      query: input.query,
      search_depth: input.searchDepth,
      topic: input.topic,
      max_results: input.maxResults,
      chunks_per_source: input.chunksPerSource,
      time_range: input.timeRange,
      start_date: input.startDate,
      end_date: input.endDate,
      include_answer: input.includeAnswer,
      include_raw_content: input.includeRawContent,
      include_images: input.includeImages,
      include_domains: toList(input.includeDomains),
      exclude_domains: toList(input.excludeDomains),
      country: input.country,
      auto_parameters: input.autoParameters,
    });
  },
};

export default search;
