import type { ActionDefinition } from "@w6w/types";
import { BrowserlessClient, compact } from "../lib/client.ts";
import {
  asObject,
  buildQuery,
  type QueryInput,
  queryParams,
  requestOverridesParam,
  withOverrides,
} from "../lib/params.ts";

interface Input extends QueryInput {
  url: string;
  formats?: string[];
  onlyMainContent?: boolean;
  includeTags?: string[] | string;
  excludeTags?: string[] | string;
  headers?: Record<string, string> | string;
  waitFor?: number;
  strategyCache?: boolean;
  requestOverrides?: Record<string, unknown> | string;
}

function list(v: string[] | string | undefined): string[] | undefined {
  const items = Array.isArray(v) ? v : String(v ?? "").split(/\r?\n/);
  const out = items.map((s) => String(s).trim()).filter(Boolean);
  return out.length ? out : undefined;
}

const smartScrape: ActionDefinition<Input> = {
  key: "smart-scrape",
  type: "read",
  resource: "page",
  title: "Smart Scrape",
  description:
    "Scrape a URL to markdown, HTML, links, raw text, PDF or a screenshot. Browserless tries an " +
    "HTTP fetch first, then a proxy, then a headless browser, and returns the first that works.",
  params: [
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      placeholder: "https://example.com",
    },
    {
      key: "formats",
      label: "Formats",
      type: "multiselect",
      options: ["markdown", "html", "links", "rawText", "screenshot", "pdf"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    { key: "onlyMainContent", label: "Main content only", type: "boolean" },
    { key: "includeTags", label: "Keep selectors (one per line)", type: "text" },
    { key: "excludeTags", label: "Remove selectors (one per line)", type: "text" },
    {
      key: "headers",
      label: "Request headers (JSON)",
      type: "json",
      hint: "Sent to the target. The vendor strips host, authorization and similar.",
    },
    {
      key: "waitFor",
      label: "Wait after load (ms)",
      type: "number",
      validation: { integer: true, min: 0, max: 30000 },
    },
    {
      key: "strategyCache",
      label: "Reuse the winning strategy per host",
      type: "boolean",
    },
    ...queryParams,
    requestOverridesParam,
  ],
  output: [{ key: "data", type: "object", label: "Scrape result, as returned by Browserless" }],

  async execute(input, ctx) {
    if (!input.url?.trim()) throw new Error("URL is required");
    const body = withOverrides(
      compact({
        url: input.url.trim(),
        formats: input.formats?.length ? input.formats : undefined,
        onlyMainContent: input.onlyMainContent ? true : undefined,
        includeTags: list(input.includeTags),
        excludeTags: list(input.excludeTags),
        headers: asObject(input.headers, "Request headers"),
        waitFor: input.waitFor,
        strategyCache: input.strategyCache,
        proxy: input.proxy,
      }),
      input.requestOverrides,
    );
    const data = await new BrowserlessClient(ctx).json("/smart-scrape", {
      method: "POST",
      query: buildQuery(input),
      body,
    });
    return { data };
  },
};

export default smartScrape;
