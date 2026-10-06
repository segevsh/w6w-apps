import type { ActionDefinition } from "@w6w/types";
import { BrowserlessClient, compact } from "../lib/client.ts";
import { buildQuery, type QueryInput, queryParams } from "../lib/params.ts";

interface Input extends QueryInput {
  url: string;
  search?: string;
  limit?: number;
  sitemap?: string;
  includeSubdomains?: boolean;
  ignoreQueryParameters?: boolean;
}

/**
 * `POST /map` discovers a site's URLs (sitemap first, page links as a supplement).
 * The vendor's body-level `proxy` defaults to `residential`, the dearest network
 * (6 units/MB); this action mirrors the proxy choice into the body so what you pick
 * is what runs.
 */
const map: ActionDefinition<Input> = {
  key: "map",
  type: "read",
  resource: "site",
  title: "Map Site URLs",
  description:
    "Discover the URLs of a website from its sitemap and page links, optionally ranked by a search term.",
  params: [
    {
      key: "url",
      label: "Site URL",
      type: "string",
      required: true,
      placeholder: "https://example.com",
    },
    { key: "search", label: "Rank by search term", type: "string" },
    {
      key: "limit",
      label: "Max links",
      type: "number",
      validation: { integer: true, min: 1, max: 5000 },
      hint: "Default and maximum 5000.",
    },
    {
      key: "sitemap",
      label: "Sitemap handling",
      type: "select",
      options: [
        { value: "include", label: "Include (default)" },
        { value: "only", label: "Only the sitemap" },
        { value: "skip", label: "Skip the sitemap" },
      ],
    },
    { key: "includeSubdomains", label: "Include subdomains", type: "boolean" },
    { key: "ignoreQueryParameters", label: "Drop URLs with query strings", type: "boolean" },
    ...queryParams,
  ],
  output: [{ key: "data", type: "object", label: "Discovered URLs, as returned by Browserless" }],

  async execute(input, ctx) {
    if (!input.url?.trim()) throw new Error("URL is required");
    const data = await new BrowserlessClient(ctx).json("/map", {
      method: "POST",
      query: buildQuery(input),
      body: compact({
        url: input.url.trim(),
        search: input.search?.trim(),
        limit: input.limit,
        sitemap: input.sitemap,
        includeSubdomains: input.includeSubdomains,
        ignoreQueryParameters: input.ignoreQueryParameters,
        proxy: input.proxy,
      }),
    });
    return { data };
  },
};

export default map;
