import type { ActionDefinition } from "@w6w/types";
import { FirecrawlClient } from "../lib/client.ts";
import { asJsonOrUndefined, splitList } from "../lib/params.ts";

/**
 * `POST /extract` — turn a set of pages into structured JSON, guided by a
 * natural-language prompt and/or a JSON Schema. Returns a job id immediately;
 * poll with `extract-status-get`.
 *
 * `urls` accept glob patterns per the vendor's own docs (e.g.
 * `https://example.com/blog/*`), which is why this stays a plain string list
 * rather than a strict URL validator.
 *
 * Needs a real API key — measured live on 2026-09-15, this endpoint rejects
 * an unauthenticated request with the same 401 named in `auth/api-key.ts`.
 *
 * Not idempotent: an LLM extraction is billed per run and the endpoint
 * documents no idempotency key.
 */
interface Input {
  urls: string;
  prompt?: string;
  schema?: unknown;
  enableWebSearch?: boolean;
  showSources?: boolean;
}

const extractStart: ActionDefinition<Input> = {
  key: "extract-start",
  type: "perform",
  resource: "extract",
  title: "Start Extract",
  description:
    "Extract structured data from a set of pages using a prompt and/or a JSON Schema. Returns " +
    "a job id immediately; poll Get Extract Status.",
  idempotent: false,
  params: [
    {
      key: "urls",
      label: "URLs",
      type: "text",
      required: true,
      hint: "One URL per line or comma-separated. Glob patterns are accepted, e.g. " +
        "`https://example.com/blog/*`.",
    },
    {
      key: "prompt",
      label: "Prompt",
      type: "text",
      hint: "Natural-language instructions for what to extract.",
    },
    {
      key: "schema",
      label: "JSON Schema",
      type: "json",
      hint: "A JSON Schema describing the shape of the extracted data. Optional if Prompt alone " +
        "is enough to describe it.",
    },
    {
      key: "enableWebSearch",
      label: "Enable web search",
      type: "boolean",
      hint: "Let the extraction use web search to fill in data not present on the given pages.",
    },
    {
      key: "showSources",
      label: "Show sources",
      type: "boolean",
      hint: "Include the `sources` field naming which page(s) each value came from.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Extract job ID" },
    { key: "invalidURLs", type: "array", label: "URLs rejected as invalid" },
  ],

  execute(input, ctx) {
    const urls = splitList(input.urls);
    ctx.log("info", "starting extract", { count: urls.length });
    return new FirecrawlClient(ctx).json("/extract", {
      method: "POST",
      body: {
        urls,
        prompt: input.prompt,
        schema: asJsonOrUndefined(input.schema, "JSON Schema"),
        enableWebSearch: input.enableWebSearch,
        showSources: input.showSources,
      },
    });
  },
};

export default extractStart;
