import type { ActionDefinition } from "@w6w/types";
import { TavilyClient, toList } from "../lib/client.ts";

/**
 * `POST /extract` — pull the content out of 1-20 known URLs.
 *
 * The endpoint answers HTTP 200 even when URLs fail: successes are in
 * `results`, failures in `failed_results`. A workflow must check both, so the
 * response is returned whole and unmodified.
 */
interface Input {
  urls: string;
  query?: string;
  chunksPerSource?: number;
  extractDepth?: string;
  format?: string;
  includeImages?: boolean;
  timeout?: number;
}

const extract: ActionDefinition<Input> = {
  key: "extract",
  type: "read",
  resource: "page",
  title: "Extract Page Content",
  description:
    "Extract clean content from up to 20 URLs. Per-URL failures come back in failed_results, not as an error.",
  params: [
    {
      key: "urls",
      label: "URLs",
      type: "text",
      required: true,
      hint: "One URL per line or comma separated. Between 1 and 20.",
    },
    {
      key: "query",
      label: "Query",
      type: "string",
      hint: "Optional intent used to rerank content chunks by relevance.",
    },
    {
      key: "chunksPerSource",
      label: "Chunks per source",
      type: "number",
      validation: { min: 1, max: 5, integer: true },
      hint: "Only applies when a query is given.",
    },
    {
      key: "extractDepth",
      label: "Extract depth",
      type: "select",
      default: "basic",
      options: [
        { value: "basic", label: "Basic (1 credit per 5 URLs)" },
        { value: "advanced", label: "Advanced (2 credits per 5 URLs, tables and embeds)" },
      ],
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "markdown",
      options: [
        { value: "markdown", label: "Markdown" },
        { value: "text", label: "Plain text" },
      ],
    },
    { key: "includeImages", label: "Include images", type: "boolean" },
    {
      key: "timeout",
      label: "Timeout (seconds)",
      type: "number",
      validation: { min: 1, max: 60 },
    },
  ],
  output: [
    { key: "results", type: "array", label: "Extracted pages" },
    { key: "failed_results", type: "array", label: "URLs that failed" },
    { key: "response_time", type: "number", label: "Response time (s)" },
    { key: "request_id", type: "string", label: "Request ID" },
  ],

  execute(input, ctx) {
    const urls = toList(input.urls);
    if (!urls) throw new Error("urls is required: provide between 1 and 20 URLs");
    if (urls.length > 20) {
      throw new Error(`Tavily extracts at most 20 URLs per call; got ${urls.length}`);
    }
    return new TavilyClient(ctx).post("/extract", {
      urls,
      query: input.query,
      chunks_per_source: input.chunksPerSource,
      extract_depth: input.extractDepth,
      format: input.format,
      include_images: input.includeImages,
      timeout: input.timeout,
    });
  },
};

export default extract;
