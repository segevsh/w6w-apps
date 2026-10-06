import type { ActionDefinition } from "@w6w/types";
import { compact, DiffbotClient, KG_HOST } from "../lib/client.ts";

interface Input {
  query: string;
  size?: number;
  from?: number;
  filter?: string;
  filterExclude?: string;
  jsonmode?: string;
  nonCanonicalFacts?: boolean;
}

interface DqlResponse {
  version?: number;
  hits?: number;
  results?: number;
  kgversion?: string;
  diffbot_type?: string;
  facet?: boolean;
  textFallback?: boolean;
  data?: Array<{ score?: number; entity?: unknown; entity_ctx?: unknown }>;
  rewrites?: unknown[];
}

/**
 * `POST https://kg.diffbot.com/kg/v3/dql` — search the Knowledge Graph with DQL.
 * Credits: 25 per entity downloaded, 100 per facet query; a search returning 0
 * entities is free (docs.diffbot.com/docs/credits).
 */
const kgSearch: ActionDefinition<Input> = {
  key: "kg-search",
  type: "search",
  resource: "entity",
  title: "Search Knowledge Graph (DQL)",
  description: "Search Diffbot's Knowledge Graph (organizations, people, articles, products, …) " +
    'with a DQL query such as `type:Organization locations.city.name:"San Francisco" ' +
    "nbEmployees>5000`. 25 credits per entity returned; a search with no results is free.",
  params: [
    {
      key: "query",
      label: "DQL query",
      type: "text",
      required: true,
      hint: 'e.g. type:Person employments.employer.name:"Diffbot" skills.name:"Python"',
    },
    {
      key: "size",
      label: "Max results",
      type: "number",
      default: 10,
      hint: "Each entity returned costs 25 credits. Vendor default is 50, so this app defaults " +
        "lower; -1 returns everything.",
      validation: { min: -1, integer: true },
    },
    {
      key: "from",
      label: "Offset",
      type: "number",
      hint: "Start at this result. Deprecated by the vendor for Article queries.",
      validation: { min: 0, integer: true },
    },
    {
      key: "filter",
      label: "Fields to keep",
      type: "string",
      hint: "Semicolon-separated paths, e.g. $.name;$.homepageUri;$.nbEmployees. Trims the " +
        "response and is the easiest way to keep it small.",
    },
    {
      key: "filterExclude",
      label: "Fields to drop",
      type: "string",
      hint: "Semicolon-separated paths to remove from each entity.",
    },
    {
      key: "jsonmode",
      label: "JSON mode",
      type: "select",
      options: [
        { value: "extended", label: "extended — include origin information for facts" },
        { value: "id", label: "id — only diffbotIds and origins" },
      ],
    },
    {
      key: "nonCanonicalFacts",
      label: "Include non-canonical facts",
      type: "boolean",
    },
  ],
  output: [
    { key: "hits", type: "number", label: "Total matches in the Knowledge Graph" },
    { key: "count", type: "number", label: "Results in this response" },
    { key: "kgVersion", type: "string", label: "Knowledge Graph version queried" },
    { key: "diffbotType", type: "string", label: "Entity type returned" },
    { key: "facet", type: "boolean", label: "Whether this was a facet query" },
    { key: "textFallback", type: "boolean", label: "Whether the query fell back to text search" },
    { key: "entities", type: "array", label: "Entities (null where none was returned)" },
    { key: "results", type: "array", label: "Hits: score, entity and entity_ctx" },
  ],

  async execute(input, ctx) {
    const { body } = await new DiffbotClient(ctx).request("/kg/v3/dql", {
      host: KG_HOST,
      method: "POST",
      json: compact({
        query: input.query,
        size: input.size,
        from: input.from,
        filter: input.filter,
        filterExclude: input.filterExclude,
        jsonmode: input.jsonmode,
        nonCanonicalFacts: input.nonCanonicalFacts === true ? true : undefined,
      }),
    });
    const r = (body ?? {}) as DqlResponse;
    const data = Array.isArray(r.data) ? r.data : [];
    return {
      hits: r.hits ?? 0,
      count: r.results ?? data.length,
      kgVersion: r.kgversion,
      diffbotType: r.diffbot_type,
      facet: r.facet ?? false,
      textFallback: r.textFallback ?? false,
      entities: data.map((d) => d.entity ?? null),
      results: data,
    };
  },
};

export default kgSearch;
