import type { ActionDefinition } from "@w6w/types";
import { compact, DiffbotClient } from "../lib/client.ts";
import { shapeJob } from "../lib/crawl.ts";
import type { CrawlJob } from "../lib/crawl.ts";

interface Input {
  name: string;
  seeds: string;
  apiUrl: string;
  maxToCrawl?: number;
  maxToProcess?: number;
  maxHops?: number;
  urlCrawlPattern?: string;
  urlProcessPattern?: string;
  pageProcessPattern?: string;
  obeyRobots?: boolean;
  useProxies?: boolean;
  notifyEmail?: string;
  notifyWebhook?: string;
  repeat?: number;
}

/**
 * `POST /v3/crawl` — **form-encoded** (the vendor: "this API does not accept JSON
 * payloads"). Creating a job starts spidering immediately and bills 1 credit per
 * page successfully processed; spidering for links is free.
 */
const crawlCreate: ActionDefinition<Input> = {
  key: "crawl-create",
  type: "perform",
  resource: "crawl",
  title: "Create Crawl Job",
  description: "Start a Crawl job: spider a site from seed URLs and run every matching page " +
    "through an Extract API. Starts immediately; each processed page costs 1 credit.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Job name",
      type: "string",
      required: true,
      hint: "Unique per token. Used later to read, pause or delete the job.",
    },
    {
      key: "seeds",
      label: "Seed URLs",
      type: "text",
      required: true,
      hint: "One or more URLs separated by whitespace. A non-www subdomain seed restricts the " +
        "crawl to that subdomain.",
    },
    {
      key: "apiUrl",
      label: "Extract API URL",
      type: "string",
      required: true,
      default: "https://api.diffbot.com/v3/analyze",
      hint: "e.g. https://api.diffbot.com/v3/product?fields=meta. Must be an api.diffbot.com " +
        "Extract URL; analyze picks the page type per page.",
    },
    {
      key: "maxToCrawl",
      label: "Max pages to spider",
      type: "number",
      hint: "Vendor default 100000.",
      validation: { min: 1, integer: true },
    },
    {
      key: "maxToProcess",
      label: "Max pages to process",
      type: "number",
      hint: "Caps the credits spent. Vendor default 100000.",
      validation: { min: 1, integer: true },
    },
    {
      key: "maxHops",
      label: "Max depth",
      type: "number",
      hint: "0 = seed URLs only, 1 = pages linked from the seeds, … Vendor default -1 (any depth).",
      validation: { min: -1, integer: true },
    },
    {
      key: "urlCrawlPattern",
      label: "URL crawl pattern",
      type: "string",
      hint: "||-separated strings; only URLs containing one are spidered. !x excludes, ^ and $ " +
        "anchor. A pattern lets the crawl leave the seed domain.",
    },
    {
      key: "urlProcessPattern",
      label: "URL process pattern",
      type: "string",
      hint: "||-separated strings; only URLs containing one are extracted.",
    },
    {
      key: "pageProcessPattern",
      label: "Page content pattern",
      type: "string",
      hint: "||-separated strings; only pages whose HTML contains one are extracted.",
    },
    {
      key: "obeyRobots",
      label: "Obey robots.txt",
      type: "boolean",
      default: true,
    },
    {
      key: "useProxies",
      label: "Use proxies",
      type: "boolean",
      hint: "Proxied pages count double.",
    },
    { key: "notifyEmail", label: "Notify email", type: "string" },
    {
      key: "notifyWebhook",
      label: "Notify webhook URL",
      type: "string",
      hint: "POSTed when the job hits a limit or completes.",
    },
    {
      key: "repeat",
      label: "Repeat every N days",
      type: "number",
      hint: "Leave empty for a one-off crawl.",
      validation: { min: 0 },
    },
  ],
  output: [
    { key: "message", type: "string", label: "Vendor message" },
    { key: "job", type: "object", label: "The created job (with statusCode and statusMessage)" },
    { key: "name", type: "string", label: "Job name" },
    { key: "statusCode", type: "number", label: "Job status code" },
    { key: "statusMessage", type: "string", label: "Job status message" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "diffbot crawl create", { name: input.name });
    const { body } = await new DiffbotClient(ctx).request("/v3/crawl", {
      method: "POST",
      form: compact({
        name: input.name,
        seeds: input.seeds?.trim(),
        apiUrl: input.apiUrl,
        maxToCrawl: input.maxToCrawl,
        maxToProcess: input.maxToProcess,
        maxHops: input.maxHops,
        urlCrawlPattern: input.urlCrawlPattern,
        urlProcessPattern: input.urlProcessPattern,
        pageProcessPattern: input.pageProcessPattern,
        obeyRobots: input.obeyRobots === false ? 0 : undefined,
        useProxies: input.useProxies === true ? 1 : undefined,
        notifyEmail: input.notifyEmail,
        notifyWebhook: input.notifyWebhook,
        repeat: input.repeat,
      }) as Record<string, string | number>,
    });
    const r = (body ?? {}) as { response?: string; jobs?: CrawlJob[] };
    const job = shapeJob((r.jobs ?? []).find((j) => j.name === input.name) ?? r.jobs?.[0] ?? {});
    return {
      message: r.response,
      job,
      name: job.name,
      statusCode: job.statusCode,
      statusMessage: job.statusMessage,
    };
  },
};

export default crawlCreate;
