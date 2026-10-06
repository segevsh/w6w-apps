import type { ActionDefinition, OutputField, Param } from "@w6w/types";
import { compact, DiffbotClient } from "./client.ts";

/** Top-level optional fields (`&fields=`) the vendor documents as sitting beside `objects`. */
const TOP_LEVEL_OPTIONAL = [
  "links",
  "extlinks",
  "meta",
  "querystring",
  "breadcrumb",
  "content",
  "allContent",
  "dom",
] as const;

export interface ExtractInput {
  url: string;
  fields?: string;
  timeout?: number;
  useProxy?: string;
  discussion?: boolean;
  [k: string]: unknown;
}

export const URL_PARAM: Param = {
  key: "url",
  label: "Page URL",
  type: "string",
  required: true,
  hint: "The web page to read, e.g. https://www.example.com/post",
};

export const COMMON_PARAMS: Param[] = [
  URL_PARAM,
  {
    key: "fields",
    label: "Optional fields",
    type: "string",
    hint: "Comma-separated extras, not returned by default: links, extlinks, meta, querystring, " +
      "breadcrumb (plus API-specific ones).",
  },
  {
    key: "timeout",
    label: "Fetch timeout (ms)",
    type: "number",
    hint: "How long Diffbot waits for the page. Vendor default 30000.",
    validation: { min: 1, integer: true },
  },
  {
    key: "useProxy",
    label: "Proxy",
    type: "select",
    options: [
      { value: "default", label: "Diffbot's datacenter proxy (2 credits per page)" },
      { value: "none", label: "No proxy, even if enabled for this URL" },
    ],
    hint: "Leave empty for Diffbot's own default.",
  },
];

export const EXTRACT_OUTPUT: OutputField[] = [
  { key: "type", type: "string", label: "Page type Diffbot extracted (article, product, …)" },
  { key: "title", type: "string", label: "Page title" },
  { key: "humanLanguage", type: "string", label: "Detected language" },
  { key: "count", type: "number", label: "Number of objects extracted" },
  { key: "object", type: "object", label: "First extracted object (null when none)" },
  { key: "objects", type: "array", label: "All extracted objects" },
  { key: "request", type: "object", label: "Echo of the request: pageUrl, api, version" },
  { key: "links", type: "array", label: "Links (when requested via Optional fields)" },
  { key: "meta", type: "object", label: "Meta tags (when requested via Optional fields)" },
];

/** Shape the vendor's `{request, objects, …}` document into the app's output. */
export function shapeExtract(body: unknown): Record<string, unknown> {
  const b = (body ?? {}) as Record<string, unknown>;
  const objects = Array.isArray(b.objects) ? b.objects : [];
  const out: Record<string, unknown> = {
    type: b.type ?? (objects[0] as { type?: string } | undefined)?.type,
    title: b.title,
    humanLanguage: b.humanLanguage,
    count: objects.length,
    object: objects[0] ?? null,
    objects,
    request: b.request,
  };
  for (const k of TOP_LEVEL_OPTIONAL) if (b[k] !== undefined) out[k] = b[k];
  return out;
}

/** The query shared by every Extract GET. */
export function commonQuery(
  input: ExtractInput,
): Record<string, string | number | boolean | undefined> {
  return compact({
    url: input.url,
    fields: input.fields?.replace(/\s+/g, ""),
    timeout: input.timeout,
    useProxy: input.useProxy,
    discussion: input.discussion === false ? false : undefined,
  }) as Record<string, string | number | boolean | undefined>;
}

export interface ExtractSpec {
  key: string;
  /** Path segment: `/v3/<api>`. */
  api: string;
  title: string;
  description: string;
  /** Params beyond the common four. */
  params?: Param[];
  /** Extra output fields. */
  output?: OutputField[];
  /** Extra query members read from the input. */
  extraQuery?: (input: ExtractInput) => Record<string, string | number | boolean | undefined>;
}

export function extractAction(spec: ExtractSpec): ActionDefinition<ExtractInput> {
  return {
    key: spec.key,
    type: "read",
    resource: "page",
    title: spec.title,
    description: spec.description,
    params: [...COMMON_PARAMS, ...(spec.params ?? [])],
    output: [...EXTRACT_OUTPUT, ...(spec.output ?? [])],

    async execute(input, ctx) {
      ctx.log("info", `diffbot ${spec.api} extract`, { url: input.url });
      const { body } = await new DiffbotClient(ctx).request(`/v3/${spec.api}`, {
        query: { ...commonQuery(input), ...(spec.extraQuery?.(input) ?? {}) },
      });
      return shapeExtract(body);
    },
  };
}

export const DISCUSSION_PARAM: Param = {
  key: "discussion",
  label: "Extract comments / reviews",
  type: "boolean",
  default: true,
  hint: "Turn off to skip the automatic comment/review extraction (and its extra work).",
};
