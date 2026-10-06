import type { ActionDefinition } from "@w6w/types";
import { compact, LinkupClient } from "../lib/client.ts";
import { required, schemaObject } from "../lib/params.ts";

interface Input {
  url: string;
  renderJs?: boolean;
  mode?: string;
  includeRawContent?: boolean;
  extractImages?: boolean;
  schema?: unknown;
  instructions?: string;
}

export function buildFetchBody(input: Input): Record<string, unknown> {
  const mode = input.mode || undefined;
  if (mode && !["standard", "pro"].includes(mode)) throw new Error("mode must be standard or pro");
  const schema = schemaObject(input.schema, "Schema");
  const instructions = input.instructions?.trim();
  if (instructions && !schema) throw new Error("Instructions need a schema");
  return compact({
    url: required(input.url, "URL"),
    renderJs: input.renderJs ? true : undefined,
    mode,
    includeRawContent: input.includeRawContent ? true : undefined,
    extractImages: input.extractImages ? true : undefined,
    schema,
    instructions,
  });
}

export const FETCH_PARAMS: ActionDefinition["params"] = [
  { key: "url", label: "URL", type: "string", required: true },
  {
    key: "renderJs",
    label: "Render JavaScript",
    type: "boolean",
    hint: "For client-side-rendered pages. Slower.",
  },
  {
    key: "mode",
    label: "Retrieval mode",
    type: "select",
    options: [{ value: "standard", label: "Standard" }, { value: "pro", label: "Pro" }],
    hint: "Pro has a significantly higher success rate on hard-to-retrieve pages.",
  },
  { key: "includeRawContent", label: "Include raw content", type: "boolean" },
  { key: "extractImages", label: "Extract images", type: "boolean" },
  {
    key: "schema",
    label: "Extraction schema (JSON Schema)",
    type: "json",
    hint:
      "Also return typed JSON from this page in `data`. Fields with no grounded value are omitted.",
  },
  {
    key: "instructions",
    label: "Extraction instructions",
    type: "text",
    hint: "Guides the extraction. Requires a schema.",
  },
];

const fetchPage: ActionDefinition<Input, Record<string, unknown>> = {
  key: "fetch",
  type: "read",
  resource: "fetch",
  title: "Fetch a Page",
  description:
    "Fetch one web page (HTML up to 20 MB or PDF up to 100 MB) as clean markdown, optionally with " +
    "typed JSON extracted by a schema.",
  params: FETCH_PARAMS,
  output: [
    { key: "markdown", type: "string", label: "Page as markdown" },
    { key: "favicon", type: "string", label: "Favicon URL" },
    { key: "data", type: "object", label: "Extracted JSON (when a schema was given)" },
    { key: "images", type: "array", label: "Images (when requested)" },
    { key: "rawContent", type: "string", label: "Raw content (when requested)" },
    { key: "contentType", type: "string", label: "Content type of the raw content" },
  ],

  async execute(input, ctx) {
    const body = await new LinkupClient(ctx).post<Record<string, unknown>>(
      "/v1/fetch",
      buildFetchBody(input),
    );
    return {
      markdown: body?.markdown,
      favicon: body?.favicon,
      data: body?.data,
      images: body?.images,
      rawContent: body?.rawContent,
      contentType: body?.contentType,
    };
  },
};

export default fetchPage;
