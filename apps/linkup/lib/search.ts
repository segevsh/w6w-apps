import type { ActionDefinition, Param } from "@w6w/types";
import { compact, LinkupClient } from "./client.ts";
import { DATE_PARAMS, dateOnly, DOMAIN_PARAMS, list, required, schemaString } from "./params.ts";

export type OutputType = "searchResults" | "sourcedAnswer" | "structured";
export const DEPTHS = ["flash", "fast", "standard", "deep"] as const;

export interface SearchInput {
  q: string;
  depth?: string;
  outputType?: string;
  structuredOutputSchema?: unknown;
  includeSources?: boolean;
  includeInlineCitations?: boolean;
  includeImages?: boolean;
  maxResults?: number;
  fromDate?: string;
  toDate?: string;
  includeDomains?: string[] | string;
  excludeDomains?: string[] | string;
}

const DEPTH_HINT = "flash: a few hundred ms, ranked snippets. fast: ~1s, the recommended default " +
  "for agents. standard: one pass of agentic search for multi-topic queries. deep: several " +
  "iterations for coverage and multi-hop questions (slowest, costliest).";

const qParam: Param = {
  key: "q",
  label: "Query",
  type: "text",
  required: true,
  hint: "A natural-language question or instruction.",
};

const depthParam: Param = {
  key: "depth",
  label: "Depth",
  type: "select",
  required: true,
  default: "standard",
  options: DEPTHS.map((v) => ({ value: v, label: v })),
  hint: DEPTH_HINT,
};

const outputTypeParam: Param = {
  key: "outputType",
  label: "Output type",
  type: "select",
  required: true,
  default: "searchResults",
  options: [
    { value: "searchResults", label: "Search results (ranked sources)" },
    { value: "sourcedAnswer", label: "Sourced answer" },
    { value: "structured", label: "Structured JSON" },
  ],
};

const schemaParam: Param = {
  key: "structuredOutputSchema",
  label: "Output schema (JSON Schema)",
  type: "json",
  hint: "Required for structured output. The root must be of type object; keep it shallow.",
};

const sourcesParam: Param = {
  key: "includeSources",
  label: "Include sources (structured only)",
  type: "boolean",
  hint: "Changes the response to { data, sources }.",
};

const citationsParam: Param = {
  key: "includeInlineCitations",
  label: "Inline citations (sourced answer only)",
  type: "boolean",
};

const tailParams: Param[] = [
  { key: "includeImages", label: "Include images", type: "boolean" },
  {
    key: "maxResults",
    label: "Max results",
    type: "number",
    validation: { integer: true, min: 1 },
  },
  ...DATE_PARAMS,
  ...DOMAIN_PARAMS,
];

export const SEARCH_OUTPUT = [
  { key: "outputType", type: "string", label: "The output type that was requested" },
  { key: "results", type: "array", label: "Ranked sources (searchResults)" },
  { key: "answer", type: "string", label: "The answer (sourcedAnswer)" },
  { key: "sources", type: "array", label: "Sources behind the answer or data" },
  { key: "data", type: "object", label: "JSON matching the schema (structured)" },
] as const;

export function buildSearchBody(input: SearchInput, fixed?: OutputType): Record<string, unknown> {
  const outputType = fixed ?? (input.outputType as OutputType | undefined);
  if (!outputType || !["searchResults", "sourcedAnswer", "structured"].includes(outputType)) {
    throw new Error("outputType must be searchResults, sourcedAnswer or structured");
  }
  const depth = input.depth || "standard";
  if (!(DEPTHS as readonly string[]).includes(depth)) {
    throw new Error("depth must be flash, fast, standard or deep");
  }
  const schema = schemaString(input.structuredOutputSchema, "Output schema");
  if (outputType === "structured" && !schema) {
    throw new Error("Output schema is required when the output type is structured");
  }
  const maxResults = input.maxResults;
  if (maxResults !== undefined && maxResults !== null && !(Number(maxResults) >= 1)) {
    throw new Error("Max results must be at least 1");
  }
  return compact({
    q: required(input.q, "Query"),
    depth,
    outputType,
    structuredOutputSchema: outputType === "structured" ? schema : undefined,
    includeSources: outputType === "structured" && input.includeSources ? true : undefined,
    includeInlineCitations: outputType === "sourcedAnswer" && input.includeInlineCitations
      ? true
      : undefined,
    includeImages: input.includeImages ? true : undefined,
    maxResults,
    fromDate: dateOnly(input.fromDate, "From date"),
    toDate: dateOnly(input.toDate, "To date"),
    includeDomains: list(input.includeDomains),
    excludeDomains: list(input.excludeDomains),
  });
}

/** Normalise the three response shapes onto one set of output keys. */
export function shapeSearch(
  outputType: OutputType,
  body: Record<string, unknown>,
  includeSources: boolean,
): Record<string, unknown> {
  if (outputType === "searchResults") return { outputType, results: body?.results ?? [] };
  if (outputType === "sourcedAnswer") {
    return { outputType, answer: body?.answer, sources: body?.sources ?? [] };
  }
  // structured: the body IS the object, unless sources were requested ({ data, sources }).
  return includeSources
    ? { outputType, data: body?.data, sources: body?.sources ?? [] }
    : { outputType, data: body };
}

export function makeSearchAction(cfg: {
  key: string;
  title: string;
  description: string;
  outputType?: OutputType;
}): ActionDefinition<SearchInput, Record<string, unknown>> {
  const fixed = cfg.outputType;
  const params: Param[] = [
    qParam,
    depthParam,
    ...(fixed ? [] : [outputTypeParam]),
    ...(fixed === undefined ? [schemaParam, sourcesParam] : []),
    ...(fixed === "structured" ? [{ ...schemaParam, required: true }, sourcesParam] : []),
    ...(fixed === undefined || fixed === "sourcedAnswer" ? [citationsParam] : []),
    ...tailParams,
  ];
  return {
    key: cfg.key,
    type: "search",
    resource: "search",
    title: cfg.title,
    description: cfg.description,
    params,
    output: [...SEARCH_OUTPUT],
    async execute(input, ctx) {
      const body = buildSearchBody(input, fixed);
      const outputType = body.outputType as OutputType;
      const res = await new LinkupClient(ctx).post<Record<string, unknown>>("/v1/search", body);
      return shapeSearch(outputType, res, body.includeSources === true);
    },
  };
}
