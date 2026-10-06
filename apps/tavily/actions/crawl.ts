import type { ActionDefinition } from "@w6w/types";
import { TavilyClient } from "../lib/client.ts";
import { siteBody, type SiteFilterInput, siteParams } from "../lib/params.ts";

/** `POST /crawl` — graph-based site traversal that also extracts each page's content. */
interface Input extends SiteFilterInput {
  chunksPerSource?: number;
  extractDepth?: string;
  format?: string;
  includeImages?: boolean;
}

const crawl: ActionDefinition<Input> = {
  key: "crawl",
  type: "read",
  resource: "site",
  title: "Crawl Site",
  description: "Traverse a website from a root URL and return the extracted content of each page.",
  params: [
    ...siteParams(),
    {
      key: "chunksPerSource",
      label: "Chunks per source",
      type: "number",
      validation: { min: 1, max: 5, integer: true },
      hint: "Only applies when instructions are given.",
    },
    {
      key: "extractDepth",
      label: "Extract depth",
      type: "select",
      default: "basic",
      options: [
        { value: "basic", label: "Basic" },
        { value: "advanced", label: "Advanced" },
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
  ],
  output: [
    { key: "base_url", type: "string", label: "Base URL" },
    { key: "results", type: "array", label: "Pages (url, raw_content)" },
    { key: "response_time", type: "number", label: "Response time (s)" },
    { key: "request_id", type: "string", label: "Request ID" },
  ],

  execute(input, ctx) {
    return new TavilyClient(ctx).post("/crawl", {
      ...siteBody(input),
      chunks_per_source: input.chunksPerSource,
      extract_depth: input.extractDepth,
      format: input.format,
      include_images: input.includeImages,
    });
  },
};

export default crawl;
