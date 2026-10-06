import type { ActionDefinition } from "@w6w/types";
import { BrowserlessClient, compact } from "../lib/client.ts";
import { requestOverridesParam, withOverrides } from "../lib/params.ts";

interface Input {
  url: string;
  limit?: number;
  maxDepth?: number;
  maxRetries?: number;
  allowExternalLinks?: boolean;
  allowSubdomains?: boolean;
  sitemap?: string;
  includePaths?: string[] | string;
  excludePaths?: string[] | string;
  delay?: number;
  formats?: string[];
  onlyMainContent?: boolean;
  proxy?: string;
  webhookUrl?: string;
  webhookEvents?: string[];
  requestOverrides?: Record<string, unknown> | string;
}

function lines(v: string[] | string | undefined): string[] | undefined {
  const items = Array.isArray(v) ? v : String(v ?? "").split(/\r?\n/);
  const out = items.map((s) => String(s).trim()).filter(Boolean);
  return out.length ? out : undefined;
}

const crawlStart: ActionDefinition<Input> = {
  key: "crawl-start",
  type: "perform",
  idempotent: false,
  resource: "crawl",
  title: "Start Crawl",
  description:
    "Start an asynchronous crawl that spiders a site and scrapes every page found. Returns a " +
    "crawl id to poll with Get Crawl.",
  params: [
    {
      key: "url",
      label: "Start URL",
      type: "string",
      required: true,
      placeholder: "https://example.com",
    },
    { key: "limit", label: "Max pages", type: "number", validation: { integer: true, min: 1 } },
    { key: "maxDepth", label: "Max depth", type: "number", validation: { integer: true, min: 0 } },
    {
      key: "maxRetries",
      label: "Retries per page",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    { key: "allowExternalLinks", label: "Follow external links", type: "boolean" },
    { key: "allowSubdomains", label: "Follow subdomains", type: "boolean" },
    {
      key: "sitemap",
      label: "Sitemap strategy",
      type: "select",
      options: ["auto", "force", "skip"].map((v) => ({ value: v, label: v })),
    },
    { key: "includePaths", label: "Include paths (regex, one per line)", type: "text" },
    { key: "excludePaths", label: "Exclude paths (regex, one per line)", type: "text" },
    {
      key: "delay",
      label: "Delay between requests (ms)",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    {
      key: "formats",
      label: "Page formats",
      type: "multiselect",
      options: ["markdown", "html", "rawText"].map((v) => ({ value: v, label: v })),
    },
    { key: "onlyMainContent", label: "Main content only", type: "boolean" },
    {
      key: "proxy",
      label: "Proxy",
      type: "select",
      options: [
        { value: "datacenter", label: "Datacenter (2 units/MB)" },
        { value: "residential", label: "Residential (6 units/MB)" },
      ],
      hint: "The vendor defaults to residential, the dearest network, when this is empty.",
    },
    { key: "webhookUrl", label: "Webhook URL (https)", type: "string" },
    {
      key: "webhookEvents",
      label: "Webhook events",
      type: "multiselect",
      options: ["completed", "failed", "page"].map((v) => ({ value: v, label: v })),
    },
    requestOverridesParam,
  ],
  output: [
    { key: "success", type: "boolean", label: "Accepted" },
    { key: "id", type: "string", label: "Crawl id" },
    { key: "url", type: "string", label: "Status URL" },
  ],

  async execute(input, ctx) {
    if (!input.url?.trim()) throw new Error("URL is required");
    if (input.webhookUrl && !/^https:\/\//i.test(input.webhookUrl.trim())) {
      throw new Error("Webhook URL must be https");
    }
    const scrapeOptions = compact({
      formats: input.formats?.length ? input.formats : undefined,
      onlyMainContent: input.onlyMainContent ? true : undefined,
      proxy: input.proxy,
    });
    const body = withOverrides(
      compact({
        url: input.url.trim(),
        limit: input.limit,
        maxDepth: input.maxDepth,
        maxRetries: input.maxRetries,
        allowExternalLinks: input.allowExternalLinks,
        allowSubdomains: input.allowSubdomains,
        sitemap: input.sitemap,
        includePaths: lines(input.includePaths),
        excludePaths: lines(input.excludePaths),
        delay: input.delay,
        scrapeOptions: Object.keys(scrapeOptions).length ? scrapeOptions : undefined,
        webhook: input.webhookUrl?.trim()
          ? compact({
            url: input.webhookUrl.trim(),
            events: input.webhookEvents?.length ? input.webhookEvents : undefined,
          })
          : undefined,
      }),
      input.requestOverrides,
    );
    return await new BrowserlessClient(ctx).json("/crawl", { method: "POST", body });
  },
};

export default crawlStart;
