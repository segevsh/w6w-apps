import type { ActionDefinition } from "@w6w/types";
import { BrandfetchClient, encodeSegment } from "../lib/client.ts";

interface Input {
  domain: string;
  format?: string;
  cachedOnly?: boolean;
}

/**
 * `GET /v2/context/{domain}` — the Brand Context API. The response format follows
 * the `Accept` header (`application/json` or `text/markdown`). Unlike every other
 * Brandfetch endpoint, the JSON uses snake_case field names.
 */
const getBrandContext: ActionDefinition<Input> = {
  key: "get-brand-context",
  type: "read",
  resource: "brand",
  title: "Get Brand Context",
  description: "Get a narrative brand profile for a domain: identity, positioning (value " +
    "proposition, audience, products) and brand voice and visual style, as structured JSON or " +
    "Markdown ready for an LLM prompt. Billed per call.",
  params: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      hint: "A domain, a website URL on it, or an email address on it.",
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "json",
      options: [{ value: "json", label: "JSON" }, { value: "markdown", label: "Markdown" }],
    },
    {
      key: "cachedOnly",
      label: "Cached only",
      type: "boolean",
      default: false,
      hint: "Return only an already-resolved context; otherwise `notIndexed` is true. Not billed.",
    },
  ],
  output: [
    { key: "found", type: "boolean", label: "Context returned" },
    { key: "notIndexed", type: "boolean", label: "No cached context (cachedOnly, HTTP 204)" },
    { key: "crawlQueued", type: "boolean", label: "Being collected — retry in a minute or two" },
    { key: "meta", type: "object", label: "domain, canonical_name, resolved_at (JSON format)" },
    { key: "identity", type: "object", label: "tagline, mission, description, tags (JSON format)" },
    { key: "positioning", type: "object", label: "value_proposition, target_audience, products" },
    { key: "brand", type: "object", label: "voice and style (JSON format)" },
    { key: "markdown", type: "string", label: "The context as Markdown (Markdown format)" },
  ],

  async execute(input, ctx) {
    const markdown = input.format === "markdown";
    const result = await new BrandfetchClient(ctx).request(
      `/v2/context/${encodeSegment(input.domain)}`,
      {
        query: { cachedOnly: input.cachedOnly ? "true" : undefined },
        headers: { accept: markdown ? "text/markdown" : "application/json" },
      },
    );
    if (result.status === 204) return { found: false, notIndexed: true };
    if (result.status === 404) return { found: false, crawlQueued: true };
    if (markdown) return { found: true, markdown: String(result.body ?? "") };
    const b = (result.body ?? {}) as Record<string, unknown>;
    return {
      found: true,
      meta: b.meta ?? null,
      identity: b.identity ?? null,
      positioning: b.positioning ?? null,
      brand: b.brand ?? null,
    };
  },
};

export default getBrandContext;
