import type { ActionDefinition } from "@w6w/types";
import { joinList, PATHS, WappalyzerClient } from "../lib/client.ts";
import { creditsOutputFields } from "../lib/params.ts";

/**
 * `GET /v2/lookup/` — the core of this app: what technologies does a website run?
 *
 * Verified against the `lookupWebsites` operation in Wappalyzer's OpenAPI
 * contract and the worked examples on `docs/api/v2/lookup/` (fetched
 * 2026-09-29). Three response shapes share one array, and this action passes
 * all three through rather than picking one:
 *
 *  - **Completed** — `{url, technologies: [...]}`, optionally `technologySpend`
 *    / `trafficLevel` when `sets` includes `signals`.
 *  - **Pending** — `{url, crawl: true}` when Follow internal links triggers an
 *    asynchronous crawl (no cached record, or Scan live is on). Results land
 *    on Callback URL, or on repeating the request later.
 *  - **Error** — `{url, errors: [...]}`, per-URL, alongside successful items
 *    for the others in the same batch.
 */
interface Input {
  urls: string;
  live?: boolean;
  recursive?: boolean;
  callbackUrl?: string;
  debugEmail?: string;
  sets?: string;
  denoise?: boolean;
  minAge?: number;
  maxAge?: number;
  squash?: boolean;
}

const lookup: ActionDefinition<Input> = {
  key: "lookup",
  type: "read",
  resource: "lookup",
  title: "Look Up Website Technologies",
  description:
    "Look up the technologies detected on up to ten websites, from Wappalyzer's own dataset or " +
    "a live scan.",
  params: [
    {
      key: "urls",
      label: "URLs",
      type: "string",
      required: true,
      hint: "Between one and ten website URLs, comma separated (e.g. https://example.com," +
        "https://example.org). Multiple URLs are not supported when Follow internal links is off.",
    },
    {
      key: "live",
      label: "Scan live",
      type: "boolean",
      default: false,
      hint: "Scan the website in real time instead of returning cached results. If no cached " +
        "record is found, a live scan is used automatically regardless of this setting.",
    },
    {
      key: "recursive",
      label: "Follow internal links",
      type: "boolean",
      default: true,
      hint: "Crawl multiple pages for better coverage. When a crawl is required (no cached " +
        "record, or Scan live is on) and this stays on, the request completes asynchronously — " +
        "technologies are not in the initial response, and arrive at Callback URL or on a " +
        "repeated request within about an hour, free of charge, up to three times.",
    },
    {
      key: "callbackUrl",
      label: "Callback URL",
      type: "string",
      hint: "A public endpoint on your own server that receives a POST with the results once an " +
        "asynchronous crawl completes. Required when Scan live and Follow internal links are " +
        "both on (that combination costs 5 credits per URL instead of 1).",
    },
    {
      key: "debugEmail",
      label: "Debug email",
      type: "string",
      advanced: true,
      hint: "Sends callback troubleshooting detail to this address. For testing only — do not " +
        "use in production.",
    },
    {
      key: "sets",
      label: "Additional field sets",
      type: "string",
      advanced: true,
      hint: "Comma-separated additional result field sets (e.g. company,contact — or signals for " +
        'technologySpend/trafficLevel). Use "all" for everything. No extra cost.',
    },
    {
      key: "denoise",
      label: "Exclude low-confidence results",
      type: "boolean",
      default: true,
      advanced: true,
      hint: "Turning this off returns more results but is more likely to include false positives.",
    },
    {
      key: "minAge",
      label: "Minimum age (months)",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0 },
      hint: "Only return results verified at least this many months ago. 0 (default) means no " +
        "floor.",
    },
    {
      key: "maxAge",
      label: "Maximum age (months)",
      type: "number",
      default: 2,
      advanced: true,
      validation: { integer: true, min: 1, max: 12 },
      hint: "Only return results verified within the last this many months. Lower is fresher but " +
        "sparser; use Scan live for real-time instead.",
    },
    {
      key: "squash",
      label: "Merge monthly results",
      type: "boolean",
      default: true,
      advanced: true,
      hint: "Turn off to group results by month instead of merging them (up to 12 months per " +
        "request, together with Minimum/Maximum age) — useful for seeing stack changes over time.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Per-URL lookup results" },
    ...creditsOutputFields,
  ],

  async execute(input, ctx) {
    const client = new WappalyzerClient(ctx);
    const { data, creditsSpent, creditsRemaining } = await client.get<unknown[]>(PATHS.lookup, {
      urls: joinList(input.urls),
      live: input.live,
      recursive: input.recursive,
      callback_url: input.callbackUrl,
      debug_email: input.debugEmail,
      sets: joinList(input.sets),
      denoise: input.denoise,
      min_age: input.minAge,
      max_age: input.maxAge,
      squash: input.squash,
    });
    return { results: data ?? [], creditsSpent, creditsRemaining };
  },
};

export default lookup;
