import type { Param } from "@w6w/types";
import { toList } from "./client.ts";

/** The path-selection / domain filters shared by Crawl and Map. */
export interface SiteFilterInput {
  url: string;
  instructions?: string;
  maxDepth?: number;
  maxBreadth?: number;
  limit?: number;
  selectPaths?: string;
  selectDomains?: string;
  excludePaths?: string;
  excludeDomains?: string;
  allowExternal?: boolean;
  timeout?: number;
}

export function siteParams(): Param[] {
  return [
    {
      key: "url",
      label: "Root URL",
      type: "string",
      required: true,
      placeholder: "https://docs.tavily.com",
      hint: "The URL to begin from.",
    },
    {
      key: "instructions",
      label: "Instructions",
      type: "text",
      hint:
        "Natural-language guidance for the crawler, e.g. 'Find all pages about the Python SDK'. " +
        "Setting it raises the per-page credit cost (2 credits per 10 pages instead of 1).",
    },
    {
      key: "maxDepth",
      label: "Max depth",
      type: "number",
      default: 1,
      validation: { min: 1, max: 5, integer: true },
      hint: "How far from the root URL to explore (1-5).",
    },
    {
      key: "maxBreadth",
      label: "Max breadth",
      type: "number",
      default: 20,
      validation: { min: 1, max: 500, integer: true },
      hint: "Links followed per page (1-500).",
    },
    {
      key: "limit",
      label: "Page limit",
      type: "number",
      default: 20,
      validation: { min: 1, integer: true },
      hint: "Total pages to process before stopping. Tavily's own default is 50; this app " +
        "prefills 20 to keep credit use small.",
    },
    {
      key: "selectPaths",
      label: "Select paths",
      type: "text",
      hint: "Regex patterns, comma or newline separated. Only URLs whose path matches are kept.",
    },
    {
      key: "selectDomains",
      label: "Select domains",
      type: "text",
      hint: "Regex patterns, comma or newline separated, limiting crawling to matching domains.",
    },
    {
      key: "excludePaths",
      label: "Exclude paths",
      type: "text",
      hint: "Regex patterns, comma or newline separated, for paths to skip.",
    },
    {
      key: "excludeDomains",
      label: "Exclude domains",
      type: "text",
      hint: "Regex patterns, comma or newline separated, for domains to skip.",
    },
    {
      key: "allowExternal",
      label: "Follow external links",
      type: "boolean",
      default: true,
    },
    {
      key: "timeout",
      label: "Timeout (seconds)",
      type: "number",
      validation: { min: 10, max: 150 },
      hint: "Tavily's default and maximum is 150 seconds.",
    },
  ];
}

export function siteBody(input: SiteFilterInput): Record<string, unknown> {
  return {
    url: String(input.url ?? "").trim(),
    instructions: input.instructions,
    max_depth: input.maxDepth,
    max_breadth: input.maxBreadth,
    limit: input.limit,
    select_paths: toList(input.selectPaths),
    select_domains: toList(input.selectDomains),
    exclude_paths: toList(input.excludePaths),
    exclude_domains: toList(input.excludeDomains),
    allow_external: input.allowExternal,
    timeout: input.timeout,
  };
}
